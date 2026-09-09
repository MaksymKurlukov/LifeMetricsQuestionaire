/**
 * LifeMetrics Generic Questionnaire Google Apps Script Web App.
 * Public endpoint: validates one completed canonical questionnaire payload and appends one row.
 */

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function validationError(message) {
  return jsonResponse({ ok: false, code: 'validation_error', error: message });
}

function safeSheetText(value) {
  if (value === null || value === undefined) return '';
  var text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function isValidSessionId(value) {
  return typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isValidTimestamp(value) {
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
    if (!isValidTimestamp(data.completed_at)) {
      return validationError('Invalid completed_at');
    }
    if (typeof data.questionnaire_id !== 'string' || !data.questionnaire_id) {
      return validationError('Invalid questionnaire_id');
    }
    if (typeof data.questionnaire_version !== 'string' || !data.questionnaire_version) {
      return validationError('Invalid questionnaire_version');
    }
    if (typeof data.final_score !== 'number' || isNaN(data.final_score)) {
      return validationError('Invalid final_score');
    }
    if (typeof data.calculated_category !== 'string') {
      return validationError('Invalid calculated_category');
    }

    // Rate-limit rapid duplicate calls per session_id
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
    var sheet = spreadsheet.getSheetByName('submissions') || spreadsheet.getSheets()[0];
    var lastRow = sheet.getLastRow();

    if (lastRow > 1) {
      // Column 2 is session_id
      var existingSessions = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
      for (var rowIndex = 0; rowIndex < existingSessions.length; rowIndex++) {
        if (String(existingSessions[rowIndex][0]) === data.session_id) {
          // Idempotent duplicate success
          return jsonResponse({ ok: true, duplicate: true });
        }
      }
    }

    // Ensure header row exists if empty sheet
    if (lastRow === 0) {
      sheet.appendRow([
        'completed_at',
        'session_id',
        'questionnaire_id',
        'questionnaire_version',
        'client_version',
        'locale',
        'source_page',
        'raw_score',
        'available_min',
        'available_max',
        'final_score',
        'calculated_category',
        'displayed_category',
        'answers_json',
        'dimensions_json',
        'safety_flags_json'
      ]);
    }

    sheet.appendRow([
      safeSheetText(data.completed_at),
      safeSheetText(data.session_id),
      safeSheetText(data.questionnaire_id),
      safeSheetText(data.questionnaire_version),
      safeSheetText(data.client_version || ''),
      safeSheetText(data.locale || ''),
      safeSheetText(data.source_page || ''),
      data.raw_score !== undefined ? data.raw_score : '',
      data.available_min !== undefined ? data.available_min : '',
      data.available_max !== undefined ? data.available_max : '',
      data.final_score,
      safeSheetText(data.calculated_category),
      safeSheetText(data.displayed_category || ''),
      safeSheetText(data.answers || {}),
      safeSheetText(data.dimensions || {}),
      safeSheetText(data.safety_flags || [])
    ]);

    return jsonResponse({ ok: true, duplicate: false });
  } catch (error) {
    console.error(error);
    return jsonResponse({ ok: false, code: 'internal_error', error: 'Internal storage error' });
  } finally {
    if (hasLock) lock.releaseLock();
  }
}
