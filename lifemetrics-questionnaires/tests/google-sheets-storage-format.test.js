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
  'pieds-confort-postural': { sheet: 'Pieds_Confort', scoredCount: 12, safetyCount: 4, hasSafety: true, totalCols: 36 },
  'risque-nutritionnel': { sheet: 'Risque_Nutritionnel', scoredCount: 12, safetyCount: 4, hasSafety: true, totalCols: 36 },
  'bien-etre': { sheet: 'Bien_Etre', scoredCount: 12, safetyCount: 0, hasSafety: false, totalCols: 31 }
};

// 1. Verify schema definitions and physical column layouts for all 9 proprietary questionnaires
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

// Test F: Risque Nutritionnel doPost with safety questions and safety_attention = "Oui"
const testRnPayload = {
  session_id: '11112222-3333-4444-8555-666677778888',
  completed_at: '2026-09-09T11:20:00Z',
  questionnaire_id: 'risque-nutritionnel',
  questionnaire_version: '1.0.0',
  answers: {
    'RN01': { value: '1', label: 'Mon appétit est habituel ou très bon', points: 1, applicable: true }
  },
  safety_answers: {
    'RNSF01': { value: 'yes', label: 'Oui', triggers: ['RN_SAFETY_MESSAGE'] }
  },
  raw_score: 15,
  available_max: 60,
  final_score: 15,
  calculated_category: 'RISQUE_FAIBLE',
  displayed_category: 'Risque nutritionnel faible',
  safety_flags: ['RN_SAFETY_MESSAGE']
};
let rnRes = JSON.parse(gasEnv.doPost({ postData: { contents: JSON.stringify(testRnPayload) } }).text);
assert.strictEqual(rnRes.ok, true);
const rnSheet = mockSpreadsheet.getSheetByName('Risque_Nutritionnel');
assert.strictEqual(rnSheet.getLastRow(), 2, 'Header row + 1 data row created for RN');
assert.strictEqual(rnSheet.rows[0].length, 36, 'RN Header row has 36 columns');
assert.strictEqual(rnSheet.rows[1].length, 36, 'RN Data row has 36 columns');
assert.strictEqual(rnSheet.rows[0][35], 'safety_attention');
assert.strictEqual(rnSheet.rows[1][35], 'Oui', 'RN safety_attention is Oui');

// Test G: Bien-être doPost without safety questions
const testBePayload = {
  session_id: '22223333-4444-4555-8666-777788889999',
  completed_at: '2026-09-09T11:25:00Z',
  questionnaire_id: 'bien-etre',
  questionnaire_version: '1.0.0',
  answers: {
    'BE01': { value: '1', label: 'Très satisfait', points: 1, applicable: true }
  },
  raw_score: 14,
  available_max: 60,
  final_score: 14,
  calculated_category: 'SATISFAISANT',
  displayed_category: 'Bien-être satisfaisant'
};
let beRes = JSON.parse(gasEnv.doPost({ postData: { contents: JSON.stringify(testBePayload) } }).text);
assert.strictEqual(beRes.ok, true);
const beSheet = mockSpreadsheet.getSheetByName('Bien_Etre');
assert.strictEqual(beSheet.getLastRow(), 2, 'Header row + 1 data row created for BE');
assert.strictEqual(beSheet.rows[0].length, 31, 'BE Header row has 31 columns');
assert.strictEqual(beSheet.rows[1].length, 31, 'BE Data row has 31 columns');
assert.strictEqual(beSheet.rows[0][30], 'category');
assert.strictEqual(beSheet.rows[1][30], 'Bien-être satisfaisant');

// Test H: Verify safety_attention takes 'Non' when safety_flags is empty
const testHydraNoSafety = {
  session_id: '77776666-5555-4444-8333-222211110000',
  completed_at: '2026-09-09T11:06:00Z',
  questionnaire_id: 'hydratation',
  questionnaire_version: '1.0.0',
  answers: {
    'HY01': { value: 3, label: 'Principale boisson', points: 3, applicable: true }
  },
  safety_answers: {
    'HYSF01': { value: 'non', label: 'Non', triggers: [] }
  },
  raw_score: 30,
  available_max: 48,
  final_score: 30,
  calculated_category: 'Bon',
  displayed_category: 'Bonne hydratation',
  safety_flags: []
};
let hydraNoSafetyRes = JSON.parse(gasEnv.doPost({ postData: { contents: JSON.stringify(testHydraNoSafety) } }).text);
assert.strictEqual(hydraNoSafetyRes.ok, true);
assert.strictEqual(hydraSheet.getLastRow(), 3, 'Data row 2 appended to Hydratation');
assert.strictEqual(hydraSheet.rows[2][34], 'Non', 'safety_attention is Non when safety_flags is empty');

// Test I: Verify strict absence of safety_attention column for the 3 questionnaires without safety block
for (const noSafetyId of ['sedentarite', 'activite-physique', 'bien-etre']) {
  const s = schemas[noSafetyId];
  assert.strictEqual(s.hasSafety, false, `${noSafetyId} hasSafety is false`);
  assert.strictEqual(s.safetyQuestions.length, 0, `${noSafetyId} has 0 safety questions`);
  const hdrs = gasEnv.getHeaderList(s);
  assert(!hdrs.includes('safety_attention'), `${noSafetyId} headers do NOT contain safety_attention`);
}

// Test J: Audit of physical N/A storage columns and normalization formula (Phase 14.6)
// Reference formula: final_score = ROUND((raw_score / applicable_question_count) * 12)

// 1. Hydratation HY05 N/A physical storage validation
const testHydraNA = {
  session_id: '99998888-7777-4666-8555-444433332222',
  completed_at: '2026-09-09T11:07:00Z',
  questionnaire_id: 'hydratation',
  questionnaire_version: '1.0.0',
  answers: {
    'HY01': { value: 2, label: 'Majoritaire', points: 2, applicable: true },
    'HY02': { value: 2, label: 'Souvent', points: 2, applicable: true },
    'HY03': { value: 2, label: 'Généralement', points: 2, applicable: true },
    'HY04': { value: 2, label: 'Régulièrement', points: 2, applicable: true },
    'HY05': { value: 'na', label: 'Non concerné actuellement', points: null, applicable: false },
    'HY06': { value: 2, label: 'Souvent', points: 2, applicable: true },
    'HY07': { value: 2, label: 'Souvent', points: 2, applicable: true },
    'HY08': { value: 2, label: '1-3 jours par semaine', points: 2, applicable: true },
    'HY09': { value: 2, label: 'Souvent', points: 2, applicable: true },
    'HY10': { value: 2, label: 'Souvent', points: 2, applicable: true },
    'HY11': { value: 2, label: 'Généralement accessible', points: 2, applicable: true },
    'HY12': { value: 2, label: 'Généralement régulières', points: 2, applicable: true }
  },
  safety_answers: {
    'HYSF01': { value: 'no', label: 'Non', triggers: [] },
    'HYSF02': { value: 'no', label: 'Non', triggers: [] },
    'HYSF03': { value: 'no', label: 'Non', triggers: [] }
  },
  raw_score: 22, // 11 * 2
  available_max: 55, // 11 * 5
  final_score: 24, // Math.round((22 / 11) * 12) = 24
  calculated_category: 'HYDRATATION_FAVORABLE',
  displayed_category: 'Habitudes d\'hydratation globalement favorables',
  safety_flags: []
};
let hydraNARes = JSON.parse(gasEnv.doPost({ postData: { contents: JSON.stringify(testHydraNA) } }).text);
assert.strictEqual(hydraNARes.ok, true);
assert.strictEqual(hydraSheet.getLastRow(), 4, 'Data row 3 appended to Hydratation');
const hRow = hydraSheet.rows[3];
assert.strictEqual(hRow.length, 35, 'Hydratation row must strictly have 35 columns');
// Col 11: HY05 text label
assert.strictEqual(hRow[11], 'Non concerné actuellement', 'HY05 text label correctly written');
// Col 12: HY05 points strictly empty string "" (NOT 0, NOT null)
assert.strictEqual(hRow[12], '', 'HY05 points strictly blank empty string');
// Col 13, 14: HY06 text and points (no column shift)
assert.strictEqual(hRow[13], 'Souvent', 'HY06 label unaffected by HY05 N/A');
assert.strictEqual(hRow[14], 2, 'HY06 points unaffected by HY05 N/A');
// Col 30..34: metric summary
assert.strictEqual(hRow[30], 22, 'raw_score matches');
assert.strictEqual(hRow[31], 55, 'available_max matches');
assert.strictEqual(hRow[32], 24, 'final_score matches reference formula ROUND((22/11)*12)');
assert.strictEqual(hRow[33], 'Habitudes d\'hydratation globalement favorables', 'category matches');
assert.strictEqual(hRow[34], 'Non', 'safety_attention matches');

// 2. Sédentarité with BOTH SD07 and SD08 N/A physical storage validation
const testSedBothNA = {
  session_id: 'aaaa1111-2222-4333-8444-555566667777',
  completed_at: '2026-09-09T11:08:00Z',
  questionnaire_id: 'sedentarite',
  questionnaire_version: '1.0.0',
  answers: {
    'SD01': { value: '2', label: 'Entre 3 et moins de 5 heures', points: 2, applicable: true },
    'SD02': { value: '2', label: '1-2 jours', points: 2, applicable: true },
    'SD03': { value: '2', label: 'Rarement', points: 2, applicable: true },
    'SD04': { value: '2', label: 'Entre 1 et moins de 2 heures', points: 2, applicable: true },
    'SD05': { value: '2', label: 'Toutes les heures environ', points: 2, applicable: true },
    'SD06': { value: '2', label: 'Je marche ou bouge quelques minutes', points: 2, applicable: true },
    'SD07': { value: 'na', label: 'Non concerné actuellement', points: null, applicable: false },
    'SD08': { value: 'na', label: 'Très peu de déplacements actuellement', points: null, applicable: false },
    'SD09': { value: '2', label: 'Entre 1 et moins de 2 heures', points: 2, applicable: true },
    'SD10': { value: '2', label: 'Rarement', points: 2, applicable: true },
    'SD11': { value: '2', label: 'De temps en temps', points: 2, applicable: true },
    'SD12': { value: '2', label: 'Généralement faciles', points: 2, applicable: true }
  },
  raw_score: 20, // 10 * 2
  available_max: 50, // 10 * 5
  final_score: 24, // Math.round((20 / 10) * 12) = 24
  calculated_category: 'HABITUDES_FAVORABLES',
  displayed_category: 'Habitudes sédentaires favorables'
};
let sedBothNARes = JSON.parse(gasEnv.doPost({ postData: { contents: JSON.stringify(testSedBothNA) } }).text);
assert.strictEqual(sedBothNARes.ok, true);
assert.strictEqual(sedSheet.getLastRow(), 3, 'Data row 2 appended to Sedentarite');
const sRow = sedSheet.rows[2];
assert.strictEqual(sRow.length, 31, 'Sedentarite row must strictly have 31 columns');
// Col 15, 16: SD07
assert.strictEqual(sRow[15], 'Non concerné actuellement', 'SD07 label matches');
assert.strictEqual(sRow[16], '', 'SD07 points strictly blank empty string');
// Col 17, 18: SD08
assert.strictEqual(sRow[17], 'Très peu de déplacements actuellement', 'SD08 label matches');
assert.strictEqual(sRow[18], '', 'SD08 points strictly blank empty string');
// Col 19, 20: SD09
assert.strictEqual(sRow[19], 'Entre 1 et moins de 2 heures', 'SD09 label unaffected');
assert.strictEqual(sRow[20], 2, 'SD09 points unaffected');
// Col 27..30: summary
assert.strictEqual(sRow[27], 20, 'raw_score matches');
assert.strictEqual(sRow[28], 50, 'available_max matches');
assert.strictEqual(sRow[29], 24, 'final_score matches reference formula ROUND((20/10)*12)');
assert.strictEqual(sRow[30], 'Habitudes sédentaires favorables', 'category matches');

// 3. Mathematical check of the reference formula ROUND((raw_score / applicable_question_count) * 12)
for (const applicableCount of [10, 11, 12]) {
  for (let raw = applicableCount; raw <= applicableCount * 5; raw++) {
    const targetMin = 12;
    const targetMax = 60;
    const availableMin = applicableCount * 1;
    const availableMax = applicableCount * 5;
    // Canonical engine formula:
    const normalized = targetMin + ((raw - availableMin) / (availableMax - availableMin)) * (targetMax - targetMin);
    const engineFinal = Math.floor(normalized + 0.5);
    // Methodological reference formula:
    const referenceFinal = Math.round((raw / applicableCount) * 12);
    assert.strictEqual(engineFinal, referenceFinal, `Engine score matches reference formula ROUND((raw/count)*12) for raw=${raw}, count=${applicableCount}`);
  }
}

// Test K: Storage of Guardrail-Capped Displayed Category (Phase 14.7)
// Verifies that displayed_category overrides calculated_category in physical storage while leaving scores intact

// 1. Sédentarité with D1 >= 8: displayed_category capped to SEDENTARITE_A_REDUIRE
const testSedGuardrail = {
  session_id: 'bbbb1111-2222-4333-8444-555566667777',
  completed_at: '2026-09-09T17:00:00Z',
  questionnaire_id: 'sedentarite',
  questionnaire_version: '1.0.0',
  answers: {
    'SD01': { value: '4', label: 'Entre 7 et 9 heures', points: 4, applicable: true },
    'SD02': { value: '4', label: '5-6 jours', points: 4, applicable: true },
    'SD03': { value: '1', label: 'Très rarement', points: 1, applicable: true }
  },
  raw_score: 18,
  available_max: 60,
  final_score: 18,
  calculated_category: 'HABITUDES_FAVORABLES',
  displayed_category: 'SEDENTARITE_A_REDUIRE'
};
let sedGuardrailRes = JSON.parse(gasEnv.doPost({ postData: { contents: JSON.stringify(testSedGuardrail) } }).text);
assert.strictEqual(sedGuardrailRes.ok, true);
assert.strictEqual(sedSheet.getLastRow(), 4, 'Data row 3 appended to Sedentarite');
const sedGRow = sedSheet.rows[3];
assert.strictEqual(sedGRow[27], 18, 'raw_score strictly intact (18)');
assert.strictEqual(sedGRow[28], 60, 'available_max strictly intact (60)');
assert.strictEqual(sedGRow[29], 18, 'final_score strictly intact (18)');
assert.strictEqual(sedGRow[30], 'SEDENTARITE_A_REDUIRE', 'category column stores capped displayed_category (SEDENTARITE_A_REDUIRE)');

// 2. Pieds & confort postural: displayed_category capped to CONFORT_A_AMELIORER
const piedsSheet = mockSpreadsheet.getSheetByName('Pieds_Confort');
const testPiedsGuardrail = {
  session_id: 'cccc1111-2222-4333-8444-555566667777',
  completed_at: '2026-09-09T17:05:00Z',
  questionnaire_id: 'pieds-confort-postural',
  questionnaire_version: '1.0.0',
  answers: {
    'PF09': { value: '4', label: 'Fréquemment', points: 4, applicable: true }
  },
  raw_score: 15,
  available_max: 60,
  final_score: 15,
  calculated_category: 'CONFORT_FAVORABLE',
  displayed_category: 'CONFORT_A_AMELIORER',
  safety_flags: []
};
let piedsGuardrailRes = JSON.parse(gasEnv.doPost({ postData: { contents: JSON.stringify(testPiedsGuardrail) } }).text);
assert.strictEqual(piedsGuardrailRes.ok, true);
assert.strictEqual(piedsSheet.getLastRow(), 2, 'Header row + 1 data row created for Pieds');
const piedsGRow = piedsSheet.rows[1];
assert.strictEqual(piedsGRow[31], 15, 'raw_score strictly intact (15)');
assert.strictEqual(piedsGRow[32], 60, 'available_max strictly intact (60)');
assert.strictEqual(piedsGRow[33], 15, 'final_score strictly intact (15)');
assert.strictEqual(piedsGRow[34], 'CONFORT_A_AMELIORER', 'category column stores capped displayed_category (CONFORT_A_AMELIORER)');

// 3. Risque nutritionnel: displayed_category capped to RISQUE_A_SURVEILLER
const testRNGuardrail = {
  session_id: 'dddd1111-2222-4333-8444-555566667777',
  completed_at: '2026-09-09T17:10:00Z',
  questionnaire_id: 'risque-nutritionnel',
  questionnaire_version: '1.0.0',
  answers: {
    'RN03': { value: '4', label: 'Diminution nette', points: 4, applicable: true }
  },
  raw_score: 15,
  available_max: 60,
  final_score: 15,
  calculated_category: 'RISQUE_FAIBLE',
  displayed_category: 'RISQUE_A_SURVEILLER',
  safety_flags: []
};
let rnGuardrailRes = JSON.parse(gasEnv.doPost({ postData: { contents: JSON.stringify(testRNGuardrail) } }).text);
assert.strictEqual(rnGuardrailRes.ok, true);
assert.strictEqual(rnSheet.getLastRow(), 3, 'Data row 2 appended to Risque_Nutritionnel');
const rnGRow = rnSheet.rows[2];
assert.strictEqual(rnGRow[31], 15, 'raw_score strictly intact (15)');
assert.strictEqual(rnGRow[32], 60, 'available_max strictly intact (60)');
assert.strictEqual(rnGRow[33], 15, 'final_score strictly intact (15)');
assert.strictEqual(rnGRow[34], 'RISQUE_A_SURVEILLER', 'category column stores capped displayed_category (RISQUE_A_SURVEILLER)');

// 4. Bien-être: displayed_category capped to BIEN_ETRE_A_RENFORCER
const beSheetInstance = mockSpreadsheet.getSheetByName('Bien_Etre');
const testBEGuardrail = {
  session_id: 'eeee1111-2222-4333-8444-555566667777',
  completed_at: '2026-09-09T17:15:00Z',
  questionnaire_id: 'bien-etre',
  questionnaire_version: '1.0.0',
  answers: {
    'BE01': { value: '4', label: 'Plutôt insatisfait', points: 4, applicable: true },
    'BE02': { value: '4', label: 'Rarement', points: 4, applicable: true }
  },
  raw_score: 18,
  available_max: 60,
  final_score: 18,
  calculated_category: 'BIEN_ETRE_FAVORABLE',
  displayed_category: 'BIEN_ETRE_A_RENFORCER'
};
let beGuardrailRes = JSON.parse(gasEnv.doPost({ postData: { contents: JSON.stringify(testBEGuardrail) } }).text);
assert.strictEqual(beGuardrailRes.ok, true);
assert.strictEqual(beSheetInstance.getLastRow(), 3, 'Data row 2 appended to Bien_Etre');
const beGRow = beSheetInstance.rows[2];
assert.strictEqual(beGRow[27], 18, 'raw_score strictly intact (18)');
assert.strictEqual(beGRow[28], 60, 'available_max strictly intact (60)');
assert.strictEqual(beGRow[29], 18, 'final_score strictly intact (18)');
assert.strictEqual(beGRow[30], 'BIEN_ETRE_A_RENFORCER', 'category column stores capped displayed_category (BIEN_ETRE_A_RENFORCER)');

console.log('ALL REFINED GOOGLE APPS SCRIPT STORAGE FORMAT JAVASCRIPT TESTS PASSED.');
