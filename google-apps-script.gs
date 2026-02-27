/**
 * PSS-10 — Google Apps Script (Web App)
 * Collez ce code dans : Google Sheet > Extensions > Apps Script
 * Déployez en "Web app" (Execute as: Me, Who has access: Anyone).
 * L'app envoie un seul POST JSON en fin de test (body : created_at, session_id, q1..q10, final_score, category).
 */

function doPost(e) {
  try {
    var data = null;
    if (e && e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else if (e && e.parameter) {
      data = {
        created_at: e.parameter.created_at || "",
        session_id: e.parameter.session_id || "",
        q1: e.parameter.q1 !== undefined ? e.parameter.q1 : null,
        q2: e.parameter.q2 !== undefined ? e.parameter.q2 : null,
        q3: e.parameter.q3 !== undefined ? e.parameter.q3 : null,
        q4: e.parameter.q4 !== undefined ? e.parameter.q4 : null,
        q5: e.parameter.q5 !== undefined ? e.parameter.q5 : null,
        q6: e.parameter.q6 !== undefined ? e.parameter.q6 : null,
        q7: e.parameter.q7 !== undefined ? e.parameter.q7 : null,
        q8: e.parameter.q8 !== undefined ? e.parameter.q8 : null,
        q9: e.parameter.q9 !== undefined ? e.parameter.q9 : null,
        q10: e.parameter.q10 !== undefined ? e.parameter.q10 : null,
        final_score: e.parameter.final_score !== undefined ? e.parameter.final_score : null,
        category: e.parameter.category || "",
        _secret: e.parameter._secret || null
      };
    }
    if (!data) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: false, error: "Bad request: no body or parameters" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 1) SECRET CHECK (optionnel)
    const secretExpected = PropertiesService.getScriptProperties().getProperty("PSS_SECRET");
    if (secretExpected) {
      const secretGot = data._secret;
      if (!secretGot || secretGot !== secretExpected) {
        return ContentService
          .createTextOutput(JSON.stringify({ ok: false, error: "Unauthorized" }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }

    // 2) RATE LIMIT (anti-spam : même session_id bloqué 5 s)
    const key = "rl_" + (data.session_id || "unknown");
    const cache = CacheService.getScriptCache();
    if (cache.get(key)) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: false, error: "Too many requests" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    cache.put(key, "1", 5);

    // 3) Validation des champs requis (final_score peut être 0)
    if (!data.session_id || !data.created_at || (data.final_score === undefined || data.final_score === null) || !data.category) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: false, error: "Bad request: missing fields" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const row = [
      data.created_at,
      data.session_id,
      data.q1 != null ? data.q1 : "",
      data.q2 != null ? data.q2 : "",
      data.q3 != null ? data.q3 : "",
      data.q4 != null ? data.q4 : "",
      data.q5 != null ? data.q5 : "",
      data.q6 != null ? data.q6 : "",
      data.q7 != null ? data.q7 : "",
      data.q8 != null ? data.q8 : "",
      data.q9 != null ? data.q9 : "",
      data.q10 != null ? data.q10 : "",
      data.final_score != null ? data.final_score : "",
      data.category || ""
    ];

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("results") || ss.getSheets()[0];
    sheet.appendRow(row);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err.message || err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
