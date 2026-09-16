/**
 * PSS-10 Google Apps Script Web App.
 * Public endpoint: validates one completed questionnaire and appends one row.
 *
 * Storage Architecture:
 * - Worksheet: "PSS10" (fallback: "results", or first sheet)
 * - Human-readable, enriched column layout (24 columns):
 *   - Metadata: created_at, session_id (Columns 1-2)
 *   - For each question (Q1..Q10):
 *     - "Q<N> - <CANONICAL QUESTION TEXT>" (Selected answer label: 'Jamais', 'Presque jamais', 'Parfois', 'Assez souvent', 'Très souvent')
 *     - "Q<N> — Points" (Points used in calculation: 1 to 5, taking into account reverse scoring for Q4, Q5, Q7, Q8)
 *   - Summary scores: final_score (10 to 50), category ('Stress bas', 'Stress assez élevé', 'Stress très élevé')
 * - Idempotency via session_id deduplication on Column 2
 * - Formula injection protection (escaping '=+-@')
 * - Concurrency locking and rate limiting
 */

var PSS10_QUESTIONS = [
  { id: 'Q1', key: 'q1', isReverse: false, text: "Avez-vous été dérangé par un événement inattendu ?" },
  { id: 'Q2', key: 'q2', isReverse: false, text: "Vous a-t-il semblé difficile de contrôler les choses importantes de votre quotidien ?" },
  { id: 'Q3', key: 'q3', isReverse: false, text: "Vous êtes-vous senti nerveux et stressé ?" },
  { id: 'Q4', key: 'q4', isReverse: true,  text: "Vous êtes-vous senti confiant dans vos capacités à prendre en main vos problèmes personnels ?" },
  { id: 'Q5', key: 'q5', isReverse: true,  text: "Avez-vous senti que les choses allaient comme vous le vouliez ?" },
  { id: 'Q6', key: 'q6', isReverse: false, text: "Avez-vous pensé que vous ne pouviez pas assumer toutes les choses que vous deviez faire ?" },
  { id: 'Q7', key: 'q7', isReverse: true,  text: "Avez-vous été capable de maîtriser votre énervement ?" },
  { id: 'Q8', key: 'q8', isReverse: true,  text: "Avez-vous senti que vous contrôliez la situation ?" },
  { id: 'Q9', key: 'q9', isReverse: false, text: "Vous êtes-vous senti irrité parce que les événements échappaient à votre contrôle ?" },
  { id: 'Q10', key: 'q10', isReverse: false, text: "Avez-vous trouvé que les difficultés s'accumulaient à un tel point que vous ne pouviez plus les surmonter ?" }
];

var PSS10_ANSWER_LABELS = {
  1: 'Jamais',
  2: 'Presque jamais',
  3: 'Parfois',
  4: 'Assez souvent',
  5: 'Très souvent'
};

function getPss10HeaderList() {
  var headers = [
    'created_at',
    'session_id'
  ];
  for (var i = 0; i < PSS10_QUESTIONS.length; i++) {
    var q = PSS10_QUESTIONS[i];
    headers.push(q.id + ' - ' + q.text);
    headers.push(q.id + ' — Points');
  }
  headers.push('final_score');
  headers.push('category');
  return headers;
}

function getPss10AnswerDetails(data, qDef) {
  var points = data[qDef.key];
  var choiceVal = qDef.isReverse ? (6 - points) : points;
  var label = PSS10_ANSWER_LABELS[choiceVal] || '';

  if (data.answers && typeof data.answers === 'object') {
    var raw = data.answers[qDef.id] !== undefined ? data.answers[qDef.id] : data.answers[qDef.key];
    if (raw) {
      if (typeof raw === 'object' && raw.label) {
        label = String(raw.label);
      } else if (typeof raw === 'string' && isNaN(Number(raw))) {
        label = raw;
      }
    }
  }

  return {
    label: label,
    points: points
  };
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function validationError(message) {
  return jsonResponse({ ok: false, code: 'validation_error', error: message });
}

function categoryFromScore(finalScore) {
  // Intentionally preserves the source project's current 10-50 thresholds.
  if (finalScore >= 27) return 'Stress très élevé';
  if (finalScore >= 21) return 'Stress assez élevé';
  return 'Stress bas';
}

function safeSheetText(value) {
  if (value === null || value === undefined) return '';
  var text = String(value);
  if (text === '') return '';
  if (/^'[\t\r\n ]*[=+\-@]/.test(text)) return text;
  if (/^[\t\r\n ]*[=+\-@]/.test(text)) return "'" + text;
  return text;
}

function isValidSessionId(value) {
  return typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isValidCreatedAt(value) {
  return typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?Z$/.test(value) &&
    !isNaN(Date.parse(value));
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  var hasLock = false;

  try {
    if (!e || !e.postData || !e.postData.contents) {
      return validationError('Missing JSON body');
    }

    var data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch (parseError) {
      return validationError('Invalid JSON body');
    }

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return validationError('JSON body must be an object');
    }
    if (!isValidSessionId(data.session_id)) {
      return validationError('Invalid session_id');
    }
    if (!isValidCreatedAt(data.created_at)) {
      return validationError('Invalid created_at');
    }
    if (typeof data.category !== 'string' || data.category.length > 64) {
      return validationError('Invalid category');
    }

    var sum = 0;
    var validatedAnswers = [];
    for (var i = 0; i < PSS10_QUESTIONS.length; i++) {
      var qKey = PSS10_QUESTIONS[i].key;
      var value = data[qKey];
      if (typeof value !== 'number' || value % 1 !== 0 || value < 1 || value > 5) {
        return validationError('q1..q10 must be integers from 1 to 5');
      }
      validatedAnswers.push(value);
      sum += value;
    }

    if (
      typeof data.final_score !== 'number' ||
      data.final_score % 1 !== 0 ||
      data.final_score < 10 ||
      data.final_score > 50 ||
      data.final_score !== sum
    ) {
      return validationError('final_score must equal sum(q1..q10) and be between 10 and 50');
    }

    var expectedCategory = categoryFromScore(data.final_score);

    // This rate limit only dampens accidental rapid repeats. It is not auth.
    var rateLimitKey = 'rl_' + data.session_id;
    var cache = CacheService.getScriptCache();
    if (cache && cache.get(rateLimitKey)) {
      return jsonResponse({ ok: false, code: 'rate_limited', error: 'Too many requests' });
    }
    if (cache) {
      cache.put(rateLimitKey, '1', 5);
    }

    hasLock = lock.tryLock(10000);
    if (!hasLock) {
      return jsonResponse({ ok: false, code: 'lock_timeout', error: 'Storage is busy' });
    }

    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = spreadsheet.getSheetByName('PSS10') ||
                spreadsheet.getSheetByName('results') ||
                spreadsheet.getSheets()[0];
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    var expectedHeaders = getPss10HeaderList();

    if (lastRow === 0) {
      sheet.appendRow(expectedHeaders);
      lastRow = 1;
      lastCol = expectedHeaders.length;
    } else if (lastRow === 1 && lastCol === 14) {
      sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
      lastCol = expectedHeaders.length;
    }

    if (lastRow > 1) {
      var existingSessions = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
      for (var rowIndex = 0; rowIndex < existingSessions.length; rowIndex++) {
        if (String(existingSessions[rowIndex][0]) === data.session_id) {
          // Idempotent success: the same session still occupies only one row.
          return jsonResponse({ ok: true, duplicate: true });
        }
      }
    }

    if (lastCol === 14 && lastRow > 1) {
      // Legacy 14-column backward compatibility for existing sheets with historic data rows
      sheet.appendRow([
        safeSheetText(data.created_at),
        safeSheetText(data.session_id),
        validatedAnswers[0],
        validatedAnswers[1],
        validatedAnswers[2],
        validatedAnswers[3],
        validatedAnswers[4],
        validatedAnswers[5],
        validatedAnswers[6],
        validatedAnswers[7],
        validatedAnswers[8],
        validatedAnswers[9],
        data.final_score,
        safeSheetText(expectedCategory)
      ]);
    } else {
      // Enriched 24-column storage (Response label + Points per question)
      var enrichedRow = [
        safeSheetText(data.created_at),
        safeSheetText(data.session_id)
      ];

      for (var j = 0; j < PSS10_QUESTIONS.length; j++) {
        var ansDetails = getPss10AnswerDetails(data, PSS10_QUESTIONS[j]);
        enrichedRow.push(safeSheetText(ansDetails.label));
        enrichedRow.push(ansDetails.points);
      }

      enrichedRow.push(data.final_score);
      enrichedRow.push(safeSheetText(expectedCategory));

      sheet.appendRow(enrichedRow);
    }

    return jsonResponse({ ok: true, duplicate: false });
  } catch (error) {
    console.error(error);
    return jsonResponse({ ok: false, code: 'internal_error', error: 'Internal storage error' });
  } finally {
    if (hasLock) lock.releaseLock();
  }
}
