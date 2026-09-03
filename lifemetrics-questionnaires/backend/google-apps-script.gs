/**
 * PSS-10 Google Apps Script Web App.
 * Public endpoint: validates one completed questionnaire and appends one row.
 */

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
  var text = String(value);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
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

    var qKeys = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'q10'];
    var sum = 0;
    var validatedAnswers = [];
    for (var i = 0; i < qKeys.length; i++) {
      var value = data[qKeys[i]];
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
    if (cache.get(rateLimitKey)) {
      return jsonResponse({ ok: false, code: 'rate_limited', error: 'Too many requests' });
    }
    cache.put(rateLimitKey, '1', 5);

    hasLock = lock.tryLock(10000);
    if (!hasLock) {
      return jsonResponse({ ok: false, code: 'lock_timeout', error: 'Storage is busy' });
    }

    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = spreadsheet.getSheetByName('results') || spreadsheet.getSheets()[0];
    var lastRow = sheet.getLastRow();

    if (lastRow > 1) {
      var existingSessions = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
      for (var rowIndex = 0; rowIndex < existingSessions.length; rowIndex++) {
        if (String(existingSessions[rowIndex][0]) === data.session_id) {
          // Idempotent success: the same session still occupies only one row.
          return jsonResponse({ ok: true, duplicate: true });
        }
      }
    }

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

    return jsonResponse({ ok: true, duplicate: false });
  } catch (error) {
    console.error(error);
    return jsonResponse({ ok: false, code: 'internal_error', error: 'Internal storage error' });
  } finally {
    if (hasLock) lock.releaseLock();
  }
}
