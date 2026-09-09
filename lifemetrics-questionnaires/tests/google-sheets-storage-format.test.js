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
  gasCode + '\nreturn { QUESTIONNAIRE_SCHEMAS, getHeaderList, getSchema, getTargetSheetName, safeSheetText, isValidSessionId, isValidTimestamp, extractAnswerData, extractDimensionScore, doPost };'
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
  'sedentarite': { sheet: 'Sedentarite', scoredCount: 12, safetyCount: 0, dimsCount: 6, hasSafety: false, totalCols: 40 },
  'hydratation': { sheet: 'Hydratation', scoredCount: 12, safetyCount: 3, dimsCount: 6, hasSafety: true, totalCols: 44 },
  'fatigue-recuperation': { sheet: 'Fatigue', scoredCount: 12, safetyCount: 3, dimsCount: 6, hasSafety: true, totalCols: 44 },
  'sommeil': { sheet: 'Sommeil', scoredCount: 12, safetyCount: 3, dimsCount: 5, hasSafety: true, totalCols: 43 },
  'nutrition': { sheet: 'Nutrition', scoredCount: 12, safetyCount: 3, dimsCount: 6, hasSafety: true, totalCols: 44 },
  'activite-physique': { sheet: 'Activite_Physique', scoredCount: 12, safetyCount: 0, dimsCount: 5, hasSafety: false, totalCols: 39 },
  'pieds-confort-postural': { sheet: 'Pieds_Confort', scoredCount: 12, safetyCount: 4, dimsCount: 6, hasSafety: true, totalCols: 45 }
};

// 1. Verify schema definitions and physical column layouts
for (const [id, exp] of Object.entries(expectedSchemas)) {
  const schema = schemas[id];
  assert(schema, `Schema defined for ${id}`);
  assert.strictEqual(schema.sheetName, exp.sheet, `Sheet name matches for ${id}`);
  assert.strictEqual(schema.scoredQuestions.length, exp.scoredCount, `Scored count matches for ${id}`);
  assert.strictEqual(schema.safetyQuestions.length, exp.safetyCount, `Safety count matches for ${id}`);
  assert.strictEqual(schema.dimensions.length, exp.dimsCount, `Dimensions count matches for ${id}`);
  assert.strictEqual(schema.hasSafety, exp.hasSafety, `hasSafety matches for ${id}`);

  const headers = gasEnv.getHeaderList(schema);
  assert.strictEqual(headers.length, exp.totalCols, `Total physical columns match for ${id} (expected ${exp.totalCols}, got ${headers.length})`);
  
  // Metadata columns (5 columns)
  assert.strictEqual(headers[0], 'completed_at');
  assert.strictEqual(headers[1], 'session_id');
  assert.strictEqual(headers[2], 'questionnaire_id');
  assert.strictEqual(headers[3], 'questionnaire_version');
  assert.strictEqual(headers[4], 'source_page');

  // Verify removed columns are NOT in headers
  assert(!headers.includes('client_version'), `client_version removed from ${id}`);
  assert(!headers.includes('locale'), `locale removed from ${id}`);
  assert(!headers.includes('available_min'), `available_min removed from ${id}`);
  assert(!headers.includes('dimensions_json'), `dimensions_json removed from ${id}`);
  assert(!headers.includes('safety_flags_json'), `safety_flags_json removed from ${id}`);

  // Scored question columns: adjacent Réponse and Points
  let colIdx = 5;
  for (let i = 0; i < schema.scoredQuestions.length; i++) {
    const qId = schema.scoredQuestions[i];
    assert.strictEqual(headers[colIdx], qId + ' — Réponse');
    assert.strictEqual(headers[colIdx + 1], qId + ' — Points');
    colIdx += 2;
  }

  // Safety question columns: Réponse only
  for (let j = 0; j < schema.safetyQuestions.length; j++) {
    const sqId = schema.safetyQuestions[j];
    assert.strictEqual(headers[colIdx], sqId + ' — Réponse');
    colIdx++;
  }

  // Score summary
  assert.strictEqual(headers[colIdx++], 'raw_score');
  assert.strictEqual(headers[colIdx++], 'available_max');
  assert.strictEqual(headers[colIdx++], 'final_score');

  // Flattened dimension columns
  for (let k = 0; k < schema.dimensions.length; k++) {
    assert.strictEqual(headers[colIdx++], schema.dimensions[k].label);
  }

  // Categories
  assert.strictEqual(headers[colIdx++], 'calculated_category');
  assert.strictEqual(headers[colIdx++], 'displayed_category');

  // Safety attention
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

// Test A: Empty sheet receives auto-generated headers + data row with adjacent Réponse/Points and flattened dimensions
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
  displayed_category: 'Sédentarité modérée',
  dimensions: [
    { id: 'temps-sedentaire-quotidien', raw_score: 5 },
    { id: 'continuite-periodes-assises', raw_score: 4 },
    { id: 'ruptures-sedentarite', raw_score: 3 },
    { id: 'travail-etudes-deplacements', raw_score: 4 },
    { id: 'loisirs-sedentaires', raw_score: 4 },
    { id: 'mouvement-quotidien-regularite', raw_score: 4 }
  ]
};

let res = JSON.parse(gasEnv.doPost({ postData: { contents: JSON.stringify(testPayloadSed) } }).text);
assert.strictEqual(res.ok, true);
assert.strictEqual(res.duplicate, false);

const sedSheet = mockSpreadsheet.getSheetByName('Sedentarite');
assert.strictEqual(sedSheet.getLastRow(), 2, 'Header row + 1 data row created');
assert.strictEqual(sedSheet.rows[0].length, 40, 'Header row has 40 columns');
assert.strictEqual(sedSheet.rows[1].length, 40, 'Data row has 40 columns');

// Verify SD01 (cols 5, 6)
assert.strictEqual(sedSheet.rows[0][5], 'SD01 — Réponse');
assert.strictEqual(sedSheet.rows[0][6], 'SD01 — Points');
assert.strictEqual(sedSheet.rows[1][5], '4 à 6 heures', 'SD01 Réponse label');
assert.strictEqual(sedSheet.rows[1][6], 3, 'SD01 Points');

// Verify SD07 N/A (cols 17, 18)
assert.strictEqual(sedSheet.rows[0][17], 'SD07 — Réponse');
assert.strictEqual(sedSheet.rows[0][18], 'SD07 — Points');
assert.strictEqual(sedSheet.rows[1][17], 'Non concerné', 'SD07 N/A label');
assert.strictEqual(sedSheet.rows[1][18], '', 'SD07 N/A Points is blank');

// Verify Dimensions (cols 32..37)
assert.strictEqual(sedSheet.rows[0][32], 'D1 — Temps sédentaire quotidien');
assert.strictEqual(sedSheet.rows[1][32], 5, 'D1 dimension score');

// Test B: Hydratation with safety questions and safety_attention = "Oui"
const testHydraSafety = {
  session_id: '88887777-6666-4555-8444-333322221111',
  completed_at: '2026-09-09T11:05:00Z',
  questionnaire_id: 'hydratation',
  questionnaire_version: '1.0.0',
  source_page: '/test-hydratation',
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
  dimensions: [
    { id: 'place-eau', raw_score: 6 },
    { id: 'repartition-hydratation', raw_score: 5 },
    { id: 'adaptation-activite-chaleur', raw_score: 5 },
    { id: 'choix-boissons', raw_score: 5 },
    { id: 'alimentation-environnement', raw_score: 5 },
    { id: 'anticipation-regularite', raw_score: 4 }
  ],
  safety_flags: ['ALERT']
};

let hydraRes = JSON.parse(gasEnv.doPost({ postData: { contents: JSON.stringify(testHydraSafety) } }).text);
assert.strictEqual(hydraRes.ok, true);

const hydraSheet = mockSpreadsheet.getSheetByName('Hydratation');
assert.strictEqual(hydraSheet.getLastRow(), 2, 'Header row + 1 data row created');
assert.strictEqual(hydraSheet.rows[0].length, 44, 'Header row has 44 columns');

// Verify HYSF01 (col 29)
assert.strictEqual(hydraSheet.rows[0][29], 'HYSF01 — Réponse');
assert.strictEqual(hydraSheet.rows[1][29], 'Oui', 'HYSF01 answer');

// Verify safety_attention (last col 43)
assert.strictEqual(hydraSheet.rows[0][43], 'safety_attention');
assert.strictEqual(hydraSheet.rows[1][43], 'Oui', 'safety_attention is Oui');

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
  source_page: '=HYPERLINK("http://malicious.com")',
  answers: {
    'SD01': { value: '=CMD()', label: '+SUM(1,2)', points: 0, applicable: true }
  },
  raw_score: 0,
  available_max: 48,
  final_score: 0,
  calculated_category: '-DANGEROUS',
  displayed_category: '@INJECTION',
  dimensions: []
};

let formulaRes = JSON.parse(gasEnv.doPost({ postData: { contents: JSON.stringify(testFormulaPayload) } }).text);
assert.strictEqual(formulaRes.ok, true);
const formulaRow = sedSheet.rows[2];
assert(formulaRow[4].startsWith("'="), 'Formula in source_page escaped with single quote');
assert(formulaRow[5].startsWith("'+"), 'Formula in answer label escaped with single quote');
assert(formulaRow[38].startsWith("'-"), 'Formula in calculated_category escaped with single quote');
assert(formulaRow[39].startsWith("'@"), 'Formula in displayed_category escaped with single quote');

console.log('ALL REFINED GOOGLE APPS SCRIPT STORAGE FORMAT JAVASCRIPT TESTS PASSED.');
