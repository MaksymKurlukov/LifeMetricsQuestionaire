/**
 * LifeMetrics Questionnaires Central Google Apps Script Web App.
 *
 * Physical Storage Architecture:
 * - ONE central Google Spreadsheet: "LifeMetrics — Questionnaires"
 * - Separate physical worksheets per proprietary questionnaire (Sedentarite, Hydratation, etc.)
 * - Flat, human-readable column layout:
 *   - Metadata: completed_at, session_id, questionnaire_id, questionnaire_version, source_page
 *   - For each scored question: "<ID> — Réponse" and "<ID> — Points" (adjacent)
 *   - For each safety question (if present): "<ID> — Réponse"
 *   - Summary scores: raw_score, available_max, final_score
 *   - Flattened dimension scores: "D<n> — <label>"
 *   - Categories: calculated_category, displayed_category
 *   - Safety attention summary: "safety_attention" (Oui / Non, for questionnaires with safety questions)
 * - Header schema validation with fail-safe rejection on conflict
 * - Idempotency via session_id deduplication on Column 2
 * - Formula injection protection (escaping '=+-@')
 * - Concurrency locking and rate limiting
 */

var QUESTIONNAIRE_SCHEMAS = {
  'sedentarite': {
    sheetName: 'Sedentarite',
    hasSafety: false,
    scoredQuestions: ['SD01', 'SD02', 'SD03', 'SD04', 'SD05', 'SD06', 'SD07', 'SD08', 'SD09', 'SD10', 'SD11', 'SD12'],
    safetyQuestions: [],
    dimensions: [
      { id: 'temps-sedentaire-quotidien', label: 'D1 — Temps sédentaire quotidien' },
      { id: 'continuite-periodes-assises', label: 'D2 — Continuité des périodes assises' },
      { id: 'ruptures-sedentarite', label: 'D3 — Ruptures de sédentarité' },
      { id: 'travail-etudes-deplacements', label: 'D4 — Travail / études et déplacements' },
      { id: 'loisirs-sedentaires', label: 'D5 — Loisirs sédentaires' },
      { id: 'mouvement-quotidien-regularite', label: 'D6 — Mouvement quotidien et régularité' }
    ]
  },
  'hydratation': {
    sheetName: 'Hydratation',
    hasSafety: true,
    scoredQuestions: ['HY01', 'HY02', 'HY03', 'HY04', 'HY05', 'HY06', 'HY07', 'HY08', 'HY09', 'HY10', 'HY11', 'HY12'],
    safetyQuestions: ['HYSF01', 'HYSF02', 'HYSF03'],
    dimensions: [
      { id: 'place-eau', label: 'D1 — Place de l\'eau' },
      { id: 'repartition-hydratation', label: 'D2 — Répartition de l\'hydratation' },
      { id: 'adaptation-activite-chaleur', label: 'D3 — Adaptation à l\'activité et à la chaleur' },
      { id: 'choix-boissons', label: 'D4 — Choix des boissons' },
      { id: 'alimentation-environnement', label: 'D5 — Alimentation et environnement' },
      { id: 'anticipation-regularite', label: 'D6 — Anticipation et régularité' }
    ]
  },
  'fatigue-recuperation': {
    sheetName: 'Fatigue',
    hasSafety: true,
    scoredQuestions: ['FR01', 'FR02', 'FR03', 'FR04', 'FR05', 'FR06', 'FR07', 'FR08', 'FR09', 'FR10', 'FR11', 'FR12'],
    safetyQuestions: ['FRSF01', 'FRSF02', 'FRSF03'],
    dimensions: [
      { id: 'energie-recuperation-reveil', label: 'D1 — Énergie et récupération au réveil' },
      { id: 'energie-fonctionnement-journee', label: 'D2 — Énergie et fonctionnement dans la journée' },
      { id: 'retentissement-fatigue', label: 'D3 — Retentissement de la fatigue' },
      { id: 'recuperation-effort', label: 'D4 — Récupération après l\'effort' },
      { id: 'efficacite-repos', label: 'D5 — Efficacité du repos' },
      { id: 'stabilite-recuperation-globale', label: 'D6 — Stabilité et récupération globale' }
    ]
  },
  'sommeil': {
    sheetName: 'Sommeil',
    hasSafety: true,
    scoredQuestions: ['SL01', 'SL02', 'SL03', 'SL04', 'SL05', 'SL06', 'SL07', 'SL08', 'SL09', 'SL10', 'SL11', 'SL12'],
    safetyQuestions: ['SLSF01', 'SLSF02', 'SLSF03'],
    dimensions: [
      { id: 'duree-suffisance', label: 'D1 — Durée et suffisance du sommeil' },
      { id: 'endormissement-continuite', label: 'D2 — Endormissement et continuité' },
      { id: 'regularite-rythme', label: 'D3 — Régularité du rythme' },
      { id: 'recuperation-fonctionnement-diurne', label: 'D4 — Récupération et fonctionnement diurne' },
      { id: 'habitudes-favorables', label: 'D5 — Habitudes favorables au sommeil' }
    ]
  },
  'nutrition': {
    sheetName: 'Nutrition',
    hasSafety: true,
    scoredQuestions: ['NT01', 'NT02', 'NT03', 'NT04', 'NT05', 'NT06', 'NT07', 'NT08', 'NT09', 'NT10', 'NT11', 'NT12'],
    safetyQuestions: ['NTSF01', 'NTSF02', 'NTSF03'],
    dimensions: [
      { id: 'fruits-legumes-diversite', label: 'D1 — Fruits, légumes et diversité végétale' },
      { id: 'fibres-glucides-qualite', label: 'D2 — Fibres et glucides de qualité' },
      { id: 'proteines-variete', label: 'D3 — Protéines et variété alimentaire' },
      { id: 'matieres-grasses-qualite', label: 'D4 — Matières grasses et qualité des aliments' },
      { id: 'produits-a-limiter', label: 'D5 — Produits à limiter' },
      { id: 'organisation-equilibre-global', label: 'D6 — Organisation et équilibre global' }
    ]
  },
  'activite-physique': {
    sheetName: 'Activite_Physique',
    hasSafety: false,
    scoredQuestions: ['AP01', 'AP02', 'AP03', 'AP04', 'AP05', 'AP06', 'AP07', 'AP08', 'AP09', 'AP10', 'AP11', 'AP12'],
    safetyQuestions: [],
    dimensions: [
      { id: 'activite-endurance', label: 'D1 — Activité d\'endurance' },
      { id: 'renforcement-mobilite', label: 'D2 — Renforcement et mobilité' },
      { id: 'mouvement-quotidien', label: 'D3 — Mouvement au quotidien' },
      { id: 'sedentarite', label: 'D4 — Sédentarité' },
      { id: 'regularite', label: 'D5 — Régularité' }
    ]
  },
  'pieds-confort-postural': {
    sheetName: 'Pieds_Confort',
    hasSafety: true,
    scoredQuestions: ['PF01', 'PF02', 'PF03', 'PF04', 'PF05', 'PF06', 'PF07', 'PF08', 'PF09', 'PF10', 'PF11', 'PF12'],
    safetyQuestions: ['PFSF01', 'PFSF02', 'PFSF03', 'PFSF04'],
    dimensions: [
      { id: 'douleur-inconfort', label: 'D1 — Douleur et inconfort des pieds' },
      { id: 'marche-station-debout', label: 'D2 — Marche et station debout' },
      { id: 'stabilite-appuis', label: 'D3 — Stabilité et appuis ressentis' },
      { id: 'chaussage-pressions', label: 'D4 — Chaussage et pressions' },
      { id: 'retentissement-fonctionnel', label: 'D5 — Retentissement fonctionnel' },
      { id: 'recuperation-confort-global', label: 'D6 — Récupération et confort global' }
    ]
  }
};

var QUESTIONNAIRE_ALIASES = {
  'fatigue': 'fatigue-recuperation',
  'activite_physique': 'activite-physique',
  'pieds_confort': 'pieds-confort-postural'
};

function getSchema(questionnaireId) {
  if (typeof questionnaireId !== 'string') return null;
  var key = questionnaireId.toLowerCase().trim();
  if (QUESTIONNAIRE_ALIASES.hasOwnProperty(key)) {
    key = QUESTIONNAIRE_ALIASES[key];
  }
  return QUESTIONNAIRE_SCHEMAS.hasOwnProperty(key) ? QUESTIONNAIRE_SCHEMAS[key] : null;
}

function getTargetSheetName(questionnaireId) {
  if (typeof questionnaireId !== 'string') return null;
  var key = questionnaireId.toLowerCase().trim();
  if (key === 'pss10') return 'PSS10';
  var schema = getSchema(questionnaireId);
  return schema ? schema.sheetName : null;
}

function getHeaderList(schema) {
  var headers = [
    'completed_at',
    'session_id',
    'questionnaire_id',
    'questionnaire_version',
    'source_page'
  ];

  // Scored questions: adjacent Réponse and Points columns
  for (var i = 0; i < schema.scoredQuestions.length; i++) {
    var qId = schema.scoredQuestions[i];
    headers.push(qId + ' — Réponse');
    headers.push(qId + ' — Points');
  }

  // Safety questions: Réponse only (no points)
  for (var j = 0; j < schema.safetyQuestions.length; j++) {
    var sqId = schema.safetyQuestions[j];
    headers.push(sqId + ' — Réponse');
  }

  // Scores
  headers.push('raw_score');
  headers.push('available_max');
  headers.push('final_score');

  // Flattened dimension score columns
  for (var k = 0; k < schema.dimensions.length; k++) {
    headers.push(schema.dimensions[k].label);
  }

  // Categories
  headers.push('calculated_category');
  headers.push('displayed_category');

  // Safety attention summary (if applicable)
  if (schema.hasSafety) {
    headers.push('safety_attention');
  }

  return headers;
}

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

function extractAnswerData(answersObj, questionId) {
  if (!answersObj || typeof answersObj !== 'object') return { label: '', points: '' };
  var answer = answersObj[questionId];
  if (answer === null || answer === undefined) return { label: '', points: '' };
  
  if (typeof answer === 'object') {
    var label = '';
    if (answer.label !== undefined && answer.label !== null && String(answer.label).trim() !== '') {
      label = String(answer.label);
    } else if (answer.value !== undefined && answer.value !== null) {
      label = String(answer.value);
    }

    var points = '';
    if (answer.applicable === false) {
      points = ''; // N/A receives blank points
    } else if (typeof answer.points === 'number') {
      points = answer.points;
    }

    return { label: label, points: points };
  }

  return { label: String(answer), points: '' };
}

function extractDimensionScore(dimensionsObj, dimensionId) {
  if (!dimensionsObj) return '';
  if (Array.isArray(dimensionsObj)) {
    for (var i = 0; i < dimensionsObj.length; i++) {
      if (dimensionsObj[i] && dimensionsObj[i].id === dimensionId) {
        return typeof dimensionsObj[i].raw_score === 'number' ? dimensionsObj[i].raw_score : '';
      }
    }
    return '';
  }
  if (typeof dimensionsObj === 'object') {
    if (dimensionsObj[dimensionId] !== undefined) {
      var dVal = dimensionsObj[dimensionId];
      if (typeof dVal === 'number') return dVal;
      if (typeof dVal === 'object' && dVal !== null && typeof dVal.raw_score === 'number') return dVal.raw_score;
    }
  }
  return '';
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

    // Strictly validate questionnaire_id against trusted schema definitions
    var schema = getSchema(data.questionnaire_id);
    if (!schema) {
      return validationError('Unknown questionnaire_id: ' + data.questionnaire_id);
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
    var sheet = spreadsheet.getSheetByName(schema.sheetName);

    // Fail safely if the designated worksheet does not exist
    if (!sheet) {
      return jsonResponse({
        ok: false,
        code: 'sheet_not_found',
        error: 'Designated worksheet "' + schema.sheetName + '" not found in spreadsheet'
      });
    }

    var expectedHeaders = getHeaderList(schema);
    var lastRow = sheet.getLastRow();

    if (lastRow === 0) {
      // Initialize empty sheet with deterministic schema headers
      sheet.appendRow(expectedHeaders);
    } else {
      // Validate that existing row 1 matches expected header schema
      var lastCol = sheet.getLastColumn();
      var existingHeaders = lastCol > 0 ? sheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];
      
      var isCompatible = existingHeaders.length === expectedHeaders.length;
      if (isCompatible) {
        for (var hIdx = 0; hIdx < expectedHeaders.length; hIdx++) {
          if (String(existingHeaders[hIdx]).trim() !== String(expectedHeaders[hIdx]).trim()) {
            isCompatible = false;
            break;
          }
        }
      }

      if (!isCompatible) {
        return jsonResponse({
          ok: false,
          code: 'schema_conflict',
          error: 'Worksheet "' + schema.sheetName + '" has conflicting column headers. Expected ' +
                 expectedHeaders.length + ' columns (' + expectedHeaders[5] + '...), but found ' +
                 existingHeaders.length + ' columns (' + (existingHeaders[5] || 'none') + ').'
        });
      }

      // Check session_id in Column 2 for idempotent duplicate
      if (lastRow > 1) {
        var existingSessions = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
        for (var rowIndex = 0; rowIndex < existingSessions.length; rowIndex++) {
          if (String(existingSessions[rowIndex][0]) === data.session_id) {
            return jsonResponse({ ok: true, duplicate: true });
          }
        }
      }
    }

    // Build row values matching expected physical columns exactly
    var row = [
      safeSheetText(data.completed_at),
      safeSheetText(data.session_id),
      safeSheetText(data.questionnaire_id),
      safeSheetText(data.questionnaire_version),
      safeSheetText(data.source_page || '')
    ];

    // Scored question columns: Réponse and Points
    for (var qIdx = 0; qIdx < schema.scoredQuestions.length; qIdx++) {
      var qId = schema.scoredQuestions[qIdx];
      var qData = extractAnswerData(data.answers, qId);
      row.push(safeSheetText(qData.label));
      row.push(qData.points !== '' ? qData.points : '');
    }

    // Safety question columns: Réponse only
    for (var sqIdx = 0; sqIdx < schema.safetyQuestions.length; sqIdx++) {
      var sqId = schema.safetyQuestions[sqIdx];
      var sqData = extractAnswerData(data.safety_answers || data.answers, sqId);
      row.push(safeSheetText(sqData.label));
    }

    // Metric and score summary
    row.push(data.raw_score !== undefined ? data.raw_score : '');
    row.push(data.available_max !== undefined ? data.available_max : '');
    row.push(data.final_score);

    // Flattened dimension scores
    for (var dIdx = 0; dIdx < schema.dimensions.length; dIdx++) {
      var dim = schema.dimensions[dIdx];
      var dimScore = extractDimensionScore(data.dimensions, dim.id);
      row.push(dimScore !== '' ? dimScore : '');
    }

    // Calculated and displayed categories
    row.push(safeSheetText(data.calculated_category));
    row.push(safeSheetText(data.displayed_category || ''));

    // Safety attention summary (Oui / Non)
    if (schema.hasSafety) {
      var hasAttention = false;
      if (data.safety_flags && Array.isArray(data.safety_flags) && data.safety_flags.length > 0) {
        hasAttention = true;
      }
      row.push(hasAttention ? 'Oui' : 'Non');
    }

    sheet.appendRow(row);

    return jsonResponse({ ok: true, duplicate: false });
  } catch (error) {
    console.error(error);
    return jsonResponse({ ok: false, code: 'internal_error', error: 'Internal storage error: ' + error.message });
  } finally {
    if (hasLock) lock.releaseLock();
  }
}
