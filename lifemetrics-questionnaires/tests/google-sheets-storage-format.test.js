const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== LifeMetrics Refined Google Apps Script Storage Format Tests (JS) ===');

// Load generic-google-apps-script.gs and parse definitions
const gasCode = fs.readFileSync(path.join(__dirname, '../backend/generic-google-apps-script.gs'), 'utf-8');

// Evaluate the schema definition and helper functions in a sandbox environment
const sandbox = {
  console: console,
  ContentService: {
    MimeType: { JSON: 'application/json' },
    createTextOutput: (text) => ({
      text,
      mime: '',
      setMimeType(m) { this.mime = m; return this; }
    })
  },
  SpreadsheetApp: {},
  LockService: {
    getScriptLock: () => ({
      tryLock: () => true,
      releaseLock: () => {}
    })
  },
  CacheService: {
    getScriptCache: () => ({
      get: () => null,
      put: () => {}
    })
  }
};

const scriptFn = new Function(
  'SpreadsheetApp', 'LockService', 'CacheService', 'ContentService', 'console',
  gasCode + '\nreturn { QUESTIONNAIRE_SCHEMAS, getHeaderList, getSchema, getTargetSheetName, safeSheetText, isValidSessionId, isValidTimestamp, extractAnswerData, doPost };'
);

const gasEnv = scriptFn(
  sandbox.SpreadsheetApp,
  sandbox.LockService,
  sandbox.CacheService,
  sandbox.ContentService,
  sandbox.console
);

const schemas = gasEnv.QUESTIONNAIRE_SCHEMAS;

const expectedSchemas = {
  'sedentarite': { sheet: 'Sedentarite', scoredCount: 12, safetyCount: 0, hasSafety: false, totalCols: 31 },
  'hydratation': { sheet: 'Hydratation', scoredCount: 12, safetyCount: 3, hasSafety: true, totalCols: 35 },
  'fatigue-recuperation': { sheet: 'Fatigue', scoredCount: 12, safetyCount: 3, hasSafety: true, totalCols: 35 },
  'sommeil': { sheet: 'Sommeil', scoredCount: 12, safetyCount: 3, hasSafety: true, totalCols: 35 },
  'nutrition': { sheet: 'Nutrition', scoredCount: 12, safetyCount: 3, hasSafety: true, totalCols: 35 },
  'activite-physique': { sheet: 'Activite_Physique', scoredCount: 12, safetyCount: 0, hasSafety: false, totalCols: 31 },
  'pieds-confort-postural': { sheet: 'Pieds_Confort', scoredCount: 12, safetyCount: 4, hasSafety: true, totalCols: 36 }
};

// 1. Verify schema definitions and physical column layouts for all 7 proprietary questionnaires
for (const [id, exp] of Object.entries(expectedSchemas)) {
  const schema = schemas[id];
  assert(schema, `Schema defined for ${id}`);
  assert.strictEqual(schema.sheetName, exp.sheet, `Sheet name matches for ${id}`);
  assert.strictEqual(schema.scoredQuestions.length, exp.scoredCount, `Scored count matches for ${id}`);
  assert.strictEqual(schema.safetyQuestions.length, exp.safetyCount, `Safety count matches for ${id}`);
  assert.strictEqual(schema.hasSafety, exp.hasSafety, `hasSafety matches for ${id}`);

  const headers = gasEnv.getHeaderList(schema);
  assert.strictEqual(headers.length, exp.totalCols, `Total physical columns match for ${id} (expected ${exp.totalCols}, got ${headers.length})`);
  
  // Metadata columns (3 columns)
  assert.strictEqual(headers[0], 'completed_at');
  assert.strictEqual(headers[1], 'session_id');
  assert.strictEqual(headers[2], 'questionnaire_version');

  // Verify removed technical columns are NOT in headers
  assert(!headers.includes('questionnaire_id'), `questionnaire_id removed from ${id}`);
  assert(!headers.includes('source_page'), `source_page removed from ${id}`);
  assert(!headers.includes('client_version'), `client_version removed from ${id}`);
  assert(!headers.includes('locale'), `locale removed from ${id}`);
  assert(!headers.includes('available_min'), `available_min removed from ${id}`);
  assert(!headers.includes('dimensions_json'), `dimensions_json removed from ${id}`);
  assert(!headers.includes('safety_flags_json'), `safety_flags_json removed from ${id}`);
  assert(!headers.includes('calculated_category'), `calculated_category removed from physical header in ${id}`);

  // Scored question columns: adjacent "<ID> - <TEXT>" and "<ID> — Points"
  let colIdx = 3;
  for (let i = 0; i < schema.scoredQuestions.length; i++) {
    const q = schema.scoredQuestions[i];
    assert.strictEqual(headers[colIdx], q.id + ' - ' + q.text, `Scored header col 1 matches for ${q.id}`);
    assert.strictEqual(headers[colIdx + 1], q.id + ' — Points', `Scored header col 2 matches for ${q.id}`);
    colIdx += 2;
  }

  // Safety question columns: "<ID> - <TEXT>" (no points column)
  for (let j = 0; j < schema.safetyQuestions.length; j++) {
    const sq = schema.safetyQuestions[j];
    assert.strictEqual(headers[colIdx], sq.id + ' - ' + sq.text, `Safety header matches for ${sq.id}`);
    colIdx++;
  }

  // Score summary
  assert.strictEqual(headers[colIdx++], 'raw_score');
  assert.strictEqual(headers[colIdx++], 'available_max');
  assert.strictEqual(headers[colIdx++], 'final_score');

  // Human-facing category
  assert.strictEqual(headers[colIdx++], 'category');

  // Safety attention summary
  if (exp.hasSafety) {
    assert.strictEqual(headers[colIdx++], 'safety_attention');
  }

  assert.strictEqual(colIdx, exp.totalCols, `Header traversal ended at column ${exp.totalCols}`);
}

// 2. Mock Spreadsheet for doPost tests
class MockSheet {
  constructor(name) {
    this.name = name;
    this.rows = [];
  }
  getLastRow() {
    return this.rows.length;
  }
  getLastColumn() {
    return this.rows.length > 0 ? this.rows[0].length : 0;
  }
  appendRow(row) {
    this.rows.push([...row]);
  }
  getRange(row, col, numRows, numCols) {
    const data = [];
    for (let r = row - 1; r < row - 1 + numRows; r++) {
      const rowData = [];
      const sourceRow = this.rows[r] || [];
      for (let c = col - 1; c < col - 1 + numCols; c++) {
        rowData.push(sourceRow[c] !== undefined ? sourceRow[c] : '');
      }
      data.push(rowData);
    }
    return {
      getValues: () => data
    };
  }
}

class MockSpreadsheet {
  constructor() {
    this.sheets = {};
    for (const exp of Object.values(expectedSchemas)) {
      this.sheets[exp.sheet] = new MockSheet(exp.sheet);
    }
  }
  getSheetByName(name) {
    return this.sheets[name] || null;
  }
}

const mockSpreadsheet = new MockSpreadsheet();
sandbox.SpreadsheetApp.getActiveSpreadsheet = () => mockSpreadsheet;

// Test A: Empty sheet receives auto-generated headers + data row with adjacent Réponse/Points
const testPayloadSed = {
  session_id: '12345678-1234-4234-8234-123456789abc',
  completed_at: '2026-09-09T11:00:00Z',
  questionnaire_id: 'sedentarite',
  questionnaire_version: '1.0.0',
  source_page: '/test-sedentarite',
  answers: {
    'SD01': { value: '4_6h', label: '4 à 6 heures', points: 3, applicable: true },
    'SD02': { value: '3_4j', label: '3 à 4 jours', points: 2, applicable: true },
    'SD07': { value: 'na', label: 'Non concerné', points: 0, applicable: false } // N/A question
  },
  raw_score: 24,
  available_max: 48,
  final_score: 24,
  calculated_category: 'Modéré',
  displayed_category: 'Sédentarité modérée'
};

let res = JSON.parse(gasEnv.doPost({ postData: { contents: JSON.stringify(testPayloadSed) } }).text);
assert.strictEqual(res.ok, true);
assert.strictEqual(res.duplicate, false);

const sedSheet = mockSpreadsheet.getSheetByName('Sedentarite');
assert.strictEqual(sedSheet.getLastRow(), 2, 'Header row + 1 data row created');
assert.strictEqual(sedSheet.rows[0].length, 31, 'Header row has 31 columns');
assert.strictEqual(sedSheet.rows[1].length, 31, 'Data row has 31 columns');

// Verify metadata (cols 0..2)
assert.strictEqual(sedSheet.rows[0][0], 'completed_at');
assert.strictEqual(sedSheet.rows[0][1], 'session_id');
assert.strictEqual(sedSheet.rows[0][2], 'questionnaire_version');
assert.strictEqual(sedSheet.rows[1][0], '2026-09-09T11:00:00Z');
assert.strictEqual(sedSheet.rows[1][1], '12345678-1234-4234-8234-123456789abc');
assert.strictEqual(sedSheet.rows[1][2], '1.0.0');

// Verify SD01 (cols 3, 4)
assert.strictEqual(sedSheet.rows[0][3], "SD01 - Au cours des 14 derniers jours, combien de temps avez-vous passé en moyenne assis ou allongé pendant vos heures d'éveil ?");
assert.strictEqual(sedSheet.rows[0][4], 'SD01 — Points');
assert.strictEqual(sedSheet.rows[1][3], '4 à 6 heures', 'SD01 answer label');
assert.strictEqual(sedSheet.rows[1][4], 3, 'SD01 numeric Points');

// Verify SD07 N/A (cols 15, 16)
assert.strictEqual(sedSheet.rows[0][15], 'SD07 - Pendant vos périodes de travail ou d\'études, à quelle fréquence alternez-vous volontairement les périodes assises avec des moments debout ou en mouvement ?');
assert.strictEqual(sedSheet.rows[0][16], 'SD07 — Points');
assert.strictEqual(sedSheet.rows[1][15], 'Non concerné', 'SD07 N/A label');
assert.strictEqual(sedSheet.rows[1][16], '', 'SD07 N/A Points is blank');

// Verify Scores & Category (cols 27..30)
assert.strictEqual(sedSheet.rows[0][27], 'raw_score');
assert.strictEqual(sedSheet.rows[1][27], 24);
assert.strictEqual(sedSheet.rows[0][28], 'available_max');
assert.strictEqual(sedSheet.rows[1][28], 48);
assert.strictEqual(sedSheet.rows[0][29], 'final_score');
assert.strictEqual(sedSheet.rows[1][29], 24);
assert.strictEqual(sedSheet.rows[0][30], 'category');
assert.strictEqual(sedSheet.rows[1][30], 'Sédentarité modérée');

// Test B: Hydratation with safety questions and safety_attention = "Oui"
const testHydraSafety = {
  session_id: '88887777-6666-4555-8444-333322221111',
  completed_at: '2026-09-09T11:05:00Z',
  questionnaire_id: 'hydratation',
  questionnaire_version: '1.0.0',
  answers: {
    'HY01': { value: 3, label: 'Principale boisson', points: 3, applicable: true }
  },
  safety_answers: {
    'HYSF01': { value: 'oui', label: 'Oui', triggers: ['ALERT'] }
  },
  raw_score: 30,
  available_max: 48,
  final_score: 30,
  calculated_category: 'Bon',
  displayed_category: 'Bonne hydratation',
  safety_flags: ['ALERT']
};

let hydraRes = JSON.parse(gasEnv.doPost({ postData: { contents: JSON.stringify(testHydraSafety) } }).text);
assert.strictEqual(hydraRes.ok, true);

const hydraSheet = mockSpreadsheet.getSheetByName('Hydratation');
assert.strictEqual(hydraSheet.getLastRow(), 2, 'Header row + 1 data row created');
assert.strictEqual(hydraSheet.rows[0].length, 35, 'Header row has 35 columns');

// Verify HYSF01 (col 27)
assert.strictEqual(hydraSheet.rows[0][27], 'HYSF01 - Un professionnel de santé vous a-t-il demandé de limiter, contrôler ou adapter précisément votre consommation de liquides ?');
assert.strictEqual(hydraSheet.rows[1][27], 'Oui', 'HYSF01 answer');

// Verify category (col 33) and safety_attention (last col 34)
assert.strictEqual(hydraSheet.rows[0][33], 'category');
assert.strictEqual(hydraSheet.rows[1][33], 'Bonne hydratation');
assert.strictEqual(hydraSheet.rows[0][34], 'safety_attention');
assert.strictEqual(hydraSheet.rows[1][34], 'Oui', 'safety_attention is Oui');

// Test C: Conflicting headers in sheet fail safely (no silent corruption)
const conflictSheet = mockSpreadsheet.getSheetByName('Nutrition');
conflictSheet.rows.push(['old_col1', 'old_col2', 'old_col3']); // Incompatible 3 columns

const testNut = {
  session_id: '99998888-7777-4666-8555-444433332222',
  completed_at: '2026-09-09T11:10:00Z',
  questionnaire_id: 'nutrition',
  questionnaire_version: '1.0.0',
  final_score: 30,
  calculated_category: 'Bon',
  answers: {}
};

let conflictRes = JSON.parse(gasEnv.doPost({ postData: { contents: JSON.stringify(testNut) } }).text);
assert.strictEqual(conflictRes.ok, false);
assert.strictEqual(conflictRes.code, 'schema_conflict');
assert(conflictRes.error.includes('conflicting column headers'));
assert.strictEqual(conflictSheet.getLastRow(), 1, 'Incompatible sheet was not modified');

// Test D: Idempotent duplicate check
let dupRes = JSON.parse(gasEnv.doPost({ postData: { contents: JSON.stringify(testPayloadSed) } }).text);
assert.strictEqual(dupRes.ok, true);
assert.strictEqual(dupRes.duplicate, true);
assert.strictEqual(sedSheet.getLastRow(), 2, 'No duplicate row added');

// Test E: Formula injection protection
const testFormulaPayload = {
  session_id: '87654321-4321-4321-8321-cba987654321',
  completed_at: '2026-09-09T11:15:00Z',
  questionnaire_id: 'sedentarite',
  questionnaire_version: '1.0.0',
  answers: {
    'SD01': { value: '=CMD()', label: '+SUM(1,2)', points: 0, applicable: true }
  },
  raw_score: 0,
  available_max: 48,
  final_score: 0,
  calculated_category: '-DANGEROUS',
  displayed_category: '@INJECTION'
};

let formulaRes = JSON.parse(gasEnv.doPost({ postData: { contents: JSON.stringify(testFormulaPayload) } }).text);
assert.strictEqual(formulaRes.ok, true);
const formulaRow = sedSheet.rows[2];
assert(formulaRow[3].startsWith("'+"), 'Formula in answer label escaped with single quote');
assert(formulaRow[30].startsWith("'@"), 'Formula in displayed_category escaped with single quote');

console.log('ALL REFINED GOOGLE APPS SCRIPT STORAGE FORMAT JAVASCRIPT TESTS PASSED.');
