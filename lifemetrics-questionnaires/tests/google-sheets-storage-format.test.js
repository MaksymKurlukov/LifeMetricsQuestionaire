const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== LifeMetrics Google Apps Script doPost & Storage Format Tests (JS) ===');

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
  gasCode + '\nreturn { QUESTIONNAIRE_SCHEMAS, getHeaderList, getSchema, safeSheetText, isValidSessionId, isValidTimestamp, extractAnswerLabel, doPost };'
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
  'sedentarite': { sheet: 'Sedentarite', scoredCount: 12, safetyCount: 0, totalCols: 27 },
  'hydratation': { sheet: 'Hydratation', scoredCount: 12, safetyCount: 3, totalCols: 30 },
  'fatigue-recuperation': { sheet: 'Fatigue', scoredCount: 12, safetyCount: 3, totalCols: 30 },
  'sommeil': { sheet: 'Sommeil', scoredCount: 12, safetyCount: 3, totalCols: 30 },
  'nutrition': { sheet: 'Nutrition', scoredCount: 12, safetyCount: 3, totalCols: 30 },
  'activite-physique': { sheet: 'Activite_Physique', scoredCount: 12, safetyCount: 0, totalCols: 27 },
  'pieds-confort-postural': { sheet: 'Pieds_Confort', scoredCount: 12, safetyCount: 4, totalCols: 31 }
};

// 1. Verify schema definitions
for (const [id, exp] of Object.entries(expectedSchemas)) {
  const schema = schemas[id];
  assert(schema, `Schema defined for ${id}`);
  assert.strictEqual(schema.sheetName, exp.sheet, `Sheet name matches for ${id}`);
  assert.strictEqual(schema.scoredQuestions.length, exp.scoredCount, `Scored count matches for ${id}`);
  assert.strictEqual(schema.safetyQuestions.length, exp.safetyCount, `Safety count matches for ${id}`);

  const headers = gasEnv.getHeaderList(schema);
  assert.strictEqual(headers.length, exp.totalCols, `Total columns match for ${id}`);
  assert.strictEqual(headers[0], 'completed_at');
  assert.strictEqual(headers[1], 'session_id');
  assert.strictEqual(headers[2], 'questionnaire_id');
  assert.strictEqual(headers[3], 'questionnaire_version');
  assert.strictEqual(headers[4], 'client_version');
  assert.strictEqual(headers[5], 'locale');
  assert.strictEqual(headers[6], 'source_page');

  // Verify scored question headers start with question ID
  for (let i = 0; i < schema.scoredQuestions.length; i++) {
    const q = schema.scoredQuestions[i];
    assert.strictEqual(headers[7 + i], q.text);
    assert(q.text.startsWith(q.id + ' — '), `Header format for ${q.id}`);
  }

  // Verify safety question headers start with safety question ID
  for (let j = 0; j < schema.safetyQuestions.length; j++) {
    const sq = schema.safetyQuestions[j];
    assert.strictEqual(headers[7 + schema.scoredQuestions.length + j], sq.text);
    assert(sq.text.startsWith(sq.id + ' — '), `Safety header format for ${sq.id}`);
  }

  // Verify trailing score/metric headers
  const endHeaders = headers.slice(-8);
  assert.deepStrictEqual(endHeaders, [
    'raw_score',
    'available_min',
    'available_max',
    'final_score',
    'calculated_category',
    'displayed_category',
    'dimensions_json',
    'safety_flags_json'
  ]);
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

// Test A: Empty sheet receives auto-generated headers + data row
const testPayloadSed = {
  session_id: '12345678-1234-4234-8234-123456789abc',
  completed_at: '2026-09-09T11:00:00Z',
  questionnaire_id: 'sedentarite',
  questionnaire_version: '1.0.0',
  client_version: '1.0.0',
  locale: 'fr-FR',
  source_page: 'https://example.com/sed',
  answers: {
    'SD01': { value: '4_6h', label: '4 à 6 heures', points: 3, applicable: true },
    'SD02': { value: '3_4j', label: '3 à 4 jours', points: 2, applicable: true },
  },
  raw_score: 24,
  available_min: 0,
  available_max: 48,
  final_score: 24,
  calculated_category: 'Modéré',
  displayed_category: 'Sédentarité modérée',
  dimensions: { temps_assis: 12, pauses: 12 },
  safety_flags: []
};

let res = JSON.parse(gasEnv.doPost({ postData: { contents: JSON.stringify(testPayloadSed) } }).text);
assert.strictEqual(res.ok, true);
assert.strictEqual(res.duplicate, false);

const sedSheet = mockSpreadsheet.getSheetByName('Sedentarite');
assert.strictEqual(sedSheet.getLastRow(), 2, 'Header row + 1 data row created');
assert.strictEqual(sedSheet.rows[0].length, 27, 'Header row has 27 columns');
assert.strictEqual(sedSheet.rows[1].length, 27, 'Data row has 27 columns');
assert.strictEqual(sedSheet.rows[1][7], '4 à 6 heures', 'Human-readable answer label stored in SD01 column');
assert.strictEqual(sedSheet.rows[1][8], '3 à 4 jours', 'Human-readable answer label stored in SD02 column');

// Test B: Idempotent duplicate check
let dupRes = JSON.parse(gasEnv.doPost({ postData: { contents: JSON.stringify(testPayloadSed) } }).text);
assert.strictEqual(dupRes.ok, true);
assert.strictEqual(dupRes.duplicate, true);
assert.strictEqual(sedSheet.getLastRow(), 2, 'No duplicate row added');

// Test C: Formula injection protection
const testFormulaPayload = {
  session_id: '87654321-4321-4321-8321-cba987654321',
  completed_at: '2026-09-09T11:05:00Z',
  questionnaire_id: 'sedentarite',
  questionnaire_version: '1.0.0',
  client_version: '1.0.0',
  locale: 'fr-FR',
  source_page: '=HYPERLINK("http://malicious.com")',
  answers: {
    'SD01': { value: '=CMD()', label: '+SUM(1,2)', points: 0, applicable: true }
  },
  raw_score: 0,
  available_min: 0,
  available_max: 48,
  final_score: 0,
  calculated_category: '-DANGEROUS',
  displayed_category: '@INJECTION',
  dimensions: {},
  safety_flags: []
};

let formulaRes = JSON.parse(gasEnv.doPost({ postData: { contents: JSON.stringify(testFormulaPayload) } }).text);
assert.strictEqual(formulaRes.ok, true);
const formulaRow = sedSheet.rows[2];
assert(formulaRow[6].startsWith("'="), 'Formula in source_page escaped with single quote');
assert(formulaRow[7].startsWith("'+"), 'Formula in answer label escaped with single quote');
assert(formulaRow[23].startsWith("'-"), 'Formula in calculated_category escaped with single quote');
assert(formulaRow[24].startsWith("'@"), 'Formula in displayed_category escaped with single quote');

// Test D: Conflicting headers in sheet fail safely (no silent corruption)
const conflictSheet = mockSpreadsheet.getSheetByName('Hydratation');
conflictSheet.rows.push(['old_col1', 'old_col2', 'old_col3']); // Incompatible 3 columns

const testHydra = {
  session_id: '99998888-7777-4666-8555-444433332222',
  completed_at: '2026-09-09T11:10:00Z',
  questionnaire_id: 'hydratation',
  questionnaire_version: '1.0.0',
  final_score: 30,
  calculated_category: 'Bon',
  answers: {}
};

let conflictRes = JSON.parse(gasEnv.doPost({ postData: { contents: JSON.stringify(testHydra) } }).text);
assert.strictEqual(conflictRes.ok, false);
assert.strictEqual(conflictRes.code, 'schema_conflict');
assert(conflictRes.error.includes('conflicting column headers'));
assert.strictEqual(conflictSheet.getLastRow(), 1, 'Incompatible sheet was not modified');

// Test E: Unknown questionnaire ID rejected
const testUnknown = {
  session_id: '11112222-3333-4444-8555-666677778888',
  completed_at: '2026-09-09T11:15:00Z',
  questionnaire_id: 'arbitrary_fake_id',
  questionnaire_version: '1.0.0',
  final_score: 10,
  calculated_category: 'X'
};

let unknownRes = JSON.parse(gasEnv.doPost({ postData: { contents: JSON.stringify(testUnknown) } }).text);
assert.strictEqual(unknownRes.ok, false);
assert(unknownRes.error.includes('Unknown questionnaire_id'));

console.log('ALL GOOGLE APPS SCRIPT STORAGE FORMAT JAVASCRIPT TESTS PASSED.');
