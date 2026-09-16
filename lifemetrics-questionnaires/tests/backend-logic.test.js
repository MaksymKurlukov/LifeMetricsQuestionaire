const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// 1. PSS10 Legacy Google Apps Script
const backendPath = path.join(__dirname, '..', 'backend', 'google-apps-script.gs');
const backend = fs.readFileSync(backendPath, 'utf8');

class MockPss10Sheet {
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
      getValues: () => data,
      setValues: (vals) => {
        for (let r = 0; r < vals.length; r++) {
          const targetR = row - 1 + r;
          if (!this.rows[targetR]) this.rows[targetR] = [];
          for (let c = 0; c < vals[r].length; c++) {
            this.rows[targetR][col - 1 + c] = vals[r][c];
          }
        }
      }
    };
  }
}

const pss10MockSheet = new MockPss10Sheet('PSS10');
const pss10CacheStore = {};
const context = {
  console,
  ContentService: {
    MimeType: { JSON: 'application/json' },
    createTextOutput: (text) => ({
      text,
      mime: '',
      setMimeType(m) { this.mime = m; return this; }
    })
  },
  SpreadsheetApp: {
    getActiveSpreadsheet: () => ({
      getSheetByName: (name) => (name === 'PSS10' ? pss10MockSheet : null),
      getSheets: () => [pss10MockSheet]
    })
  },
  LockService: {
    getScriptLock: () => ({
      tryLock: () => true,
      releaseLock: () => {}
    })
  },
  CacheService: {
    getScriptCache: () => ({
      get: (k) => pss10CacheStore[k] || null,
      put: (k, v) => { pss10CacheStore[k] = v; }
    })
  }
};

vm.createContext(context);
vm.runInContext(backend, context);

// Threshold and validation checks
assert.equal(context.categoryFromScore(20), 'Stress bas');
assert.equal(context.categoryFromScore(21), 'Stress assez élevé');
assert.equal(context.categoryFromScore(26), 'Stress assez élevé');
assert.equal(context.categoryFromScore(27), 'Stress très élevé');
assert.equal(context.safeSheetText('normal'), 'normal');
assert.equal(context.safeSheetText('=IMPORTXML("x")'), "'=IMPORTXML(\"x\")");
assert.equal(context.safeSheetText('\t+12345'), "'\t+12345");
assert.equal(context.safeSheetText('-CMD("calc")'), "'-CMD(\"calc\")");
assert.equal(context.safeSheetText('@SUM(A1:A10)'), "'@SUM(A1:A10)");
assert.equal(context.isValidSessionId('123e4567-e89b-42d3-a456-426614174000'), true);
assert.equal(context.isValidSessionId('../../bad'), false);
assert.equal(context.isValidCreatedAt('2026-09-03T08:00:00.000Z'), true);

// PSS-10 Enriched Schema & Headers verification (24 columns total)
const pss10Headers = context.getPss10HeaderList();
assert.equal(pss10Headers.length, 24, 'PSS-10 enriched header has exactly 24 columns');
assert.equal(pss10Headers[0], 'created_at');
assert.equal(pss10Headers[1], 'session_id');
assert.equal(pss10Headers[2], 'Q1 - Avez-vous été dérangé par un événement inattendu ?');
assert.equal(pss10Headers[3], 'Q1 — Points');
assert.equal(pss10Headers[8], 'Q4 - Vous êtes-vous senti confiant dans vos capacités à prendre en main vos problèmes personnels ?');
assert.equal(pss10Headers[9], 'Q4 — Points');
assert.equal(pss10Headers[10], 'Q5 - Avez-vous senti que les choses allaient comme vous le vouliez ?');
assert.equal(pss10Headers[11], 'Q5 — Points');
assert.equal(pss10Headers[14], 'Q7 - Avez-vous été capable de maîtriser votre énervement ?');
assert.equal(pss10Headers[15], 'Q7 — Points');
assert.equal(pss10Headers[16], 'Q8 - Avez-vous senti que vous contrôliez la situation ?');
assert.equal(pss10Headers[17], 'Q8 — Points');
assert.equal(pss10Headers[20], "Q10 - Avez-vous trouvé que les difficultés s'accumulaient à un tel point que vous ne pouviez plus les surmonter ?");
assert.equal(pss10Headers[21], 'Q10 — Points');
assert.equal(pss10Headers[22], 'final_score');
assert.equal(pss10Headers[23], 'category');

// Question count and reverse scoring flags
assert.equal(context.PSS10_QUESTIONS.length, 10, 'PSS-10 has 10 questions');
assert.equal(context.PSS10_QUESTIONS[0].isReverse, false, 'Q1 is regular');
assert.equal(context.PSS10_QUESTIONS[1].isReverse, false, 'Q2 is regular');
assert.equal(context.PSS10_QUESTIONS[2].isReverse, false, 'Q3 is regular');
assert.equal(context.PSS10_QUESTIONS[3].isReverse, true, 'Q4 is reverse');
assert.equal(context.PSS10_QUESTIONS[4].isReverse, true, 'Q5 is reverse');
assert.equal(context.PSS10_QUESTIONS[5].isReverse, false, 'Q6 is regular');
assert.equal(context.PSS10_QUESTIONS[6].isReverse, true, 'Q7 is reverse');
assert.equal(context.PSS10_QUESTIONS[7].isReverse, true, 'Q8 is reverse');
assert.equal(context.PSS10_QUESTIONS[8].isReverse, false, 'Q9 is regular');
assert.equal(context.PSS10_QUESTIONS[9].isReverse, false, 'Q10 is regular');

// PSS-10 Answer label & points resolution
// Regular question (Q1): choice 1 => points 1, choice 5 => points 5
const q1_1 = context.getPss10AnswerDetails({ q1: 1 }, context.PSS10_QUESTIONS[0]);
assert.equal(q1_1.label, 'Jamais');
assert.equal(q1_1.points, 1);
const q1_3 = context.getPss10AnswerDetails({ q1: 3 }, context.PSS10_QUESTIONS[0]);
assert.equal(q1_3.label, 'Parfois');
assert.equal(q1_3.points, 3);
const q1_5 = context.getPss10AnswerDetails({ q1: 5 }, context.PSS10_QUESTIONS[0]);
assert.equal(q1_5.label, 'Très souvent');
assert.equal(q1_5.points, 5);

// Reverse question (Q4):
// points 5 => selected 'Jamais' (choice 1)
// points 4 => selected 'Presque jamais' (choice 2)
// points 3 => selected 'Parfois' (choice 3)
// points 2 => selected 'Assez souvent' (choice 4)
// points 1 => selected 'Très souvent' (choice 5)
const q4_5 = context.getPss10AnswerDetails({ q4: 5 }, context.PSS10_QUESTIONS[3]);
assert.equal(q4_5.label, 'Jamais');
assert.equal(q4_5.points, 5);
const q4_4 = context.getPss10AnswerDetails({ q4: 4 }, context.PSS10_QUESTIONS[3]);
assert.equal(q4_4.label, 'Presque jamais');
assert.equal(q4_4.points, 4);
const q4_3 = context.getPss10AnswerDetails({ q4: 3 }, context.PSS10_QUESTIONS[3]);
assert.equal(q4_3.label, 'Parfois');
assert.equal(q4_3.points, 3);
const q4_2 = context.getPss10AnswerDetails({ q4: 2 }, context.PSS10_QUESTIONS[3]);
assert.equal(q4_2.label, 'Assez souvent');
assert.equal(q4_2.points, 2);
const q4_1 = context.getPss10AnswerDetails({ q4: 1 }, context.PSS10_QUESTIONS[3]);
assert.equal(q4_1.label, 'Très souvent');
assert.equal(q4_1.points, 1);

// Reverse questions Q5, Q7, Q8
const q5_5 = context.getPss10AnswerDetails({ q5: 5 }, context.PSS10_QUESTIONS[4]);
assert.equal(q5_5.label, 'Jamais');
assert.equal(q5_5.points, 5);
const q7_4 = context.getPss10AnswerDetails({ q7: 4 }, context.PSS10_QUESTIONS[6]);
assert.equal(q7_4.label, 'Presque jamais');
assert.equal(q7_4.points, 4);
const q8_1 = context.getPss10AnswerDetails({ q8: 1 }, context.PSS10_QUESTIONS[7]);
assert.equal(q8_1.label, 'Très souvent');
assert.equal(q8_1.points, 1);

// PSS-10 doPost end-to-end execution on fresh sheet
const pss10SamplePayload = {
  created_at: '2026-09-16T10:00:00.000Z',
  session_id: '123e4567-e89b-42d3-a456-426614174001',
  q1: 3,  // Parfois (3 pts)
  q2: 4,  // Assez souvent (4 pts)
  q3: 2,  // Presque jamais (2 pts)
  q4: 5,  // REVERSE: Jamais (5 pts)
  q5: 4,  // REVERSE: Presque jamais (4 pts)
  q6: 3,  // Parfois (3 pts)
  q7: 2,  // REVERSE: Assez souvent (2 pts)
  q8: 1,  // REVERSE: Très souvent (1 pt)
  q9: 2,  // Presque jamais (2 pts)
  q10: 2, // Presque jamais (2 pts)
  final_score: 28, // 3+4+2+5+4+3+2+1+2+2 = 28
  category: 'Stress très élevé'
};

assert.equal(pss10MockSheet.getLastRow(), 0, 'PSS-10 mock sheet starts empty');
const pss10Res1 = JSON.parse(context.doPost({ postData: { contents: JSON.stringify(pss10SamplePayload) } }).text);
assert.equal(pss10Res1.ok, true, 'PSS-10 doPost succeeds');
assert.equal(pss10Res1.duplicate, false, 'First submission is not a duplicate');
assert.equal(pss10MockSheet.getLastRow(), 2, 'Sheet has header row + 1 data row');
assert.equal(pss10MockSheet.rows[0].length, 24, 'Header has 24 columns');
assert.equal(pss10MockSheet.rows[1].length, 24, 'Data row has 24 columns');

const pss10DataRow = pss10MockSheet.rows[1];
assert.equal(pss10DataRow[0], '2026-09-16T10:00:00.000Z', 'created_at stored in Col 1');
assert.equal(pss10DataRow[1], '123e4567-e89b-42d3-a456-426614174001', 'session_id stored in Col 2');
assert.equal(pss10DataRow[2], 'Parfois', 'Q1 label is Parfois');
assert.equal(pss10DataRow[3], 3, 'Q1 points is 3');
assert.equal(pss10DataRow[4], 'Assez souvent', 'Q2 label is Assez souvent');
assert.equal(pss10DataRow[5], 4, 'Q2 points is 4');
assert.equal(pss10DataRow[8], 'Jamais', 'Q4 reverse choice is Jamais');
assert.equal(pss10DataRow[9], 5, 'Q4 points is 5');
assert.equal(pss10DataRow[10], 'Presque jamais', 'Q5 reverse choice is Presque jamais');
assert.equal(pss10DataRow[11], 4, 'Q5 points is 4');
assert.equal(pss10DataRow[14], 'Assez souvent', 'Q7 reverse choice is Assez souvent');
assert.equal(pss10DataRow[15], 2, 'Q7 points is 2');
assert.equal(pss10DataRow[16], 'Très souvent', 'Q8 reverse choice is Très souvent');
assert.equal(pss10DataRow[17], 1, 'Q8 points is 1');
assert.equal(pss10DataRow[22], 28, 'final_score is 28');
assert.equal(pss10DataRow[23], 'Stress très élevé', 'category is Stress très élevé');

// Idempotent duplicate check: same session_id should return duplicate: true and not append
delete pss10CacheStore['rl_' + pss10SamplePayload.session_id];
const pss10Res2 = JSON.parse(context.doPost({ postData: { contents: JSON.stringify(pss10SamplePayload) } }).text);
assert.equal(pss10Res2.ok, true, 'PSS-10 duplicate request succeeds idempotently');
assert.equal(pss10Res2.duplicate, true, 'Marked duplicate: true');
assert.equal(pss10MockSheet.getLastRow(), 2, 'No duplicate row appended');

// 2. Central Multi-Worksheet Google Apps Script
const genericPath = path.join(__dirname, '..', 'backend', 'generic-google-apps-script.gs');
const genericBackend = fs.readFileSync(genericPath, 'utf8');
const genericContext = { console };

vm.createContext(genericContext);
vm.runInContext(genericBackend, genericContext);

// Allowlist routing checks (Single Spreadsheet -> dedicated worksheets)
assert.equal(genericContext.getTargetSheetName('pss10'), 'PSS10');
assert.equal(genericContext.getTargetSheetName('sedentarite'), 'Sedentarite');
assert.equal(genericContext.getTargetSheetName('hydratation'), 'Hydratation');
assert.equal(genericContext.getTargetSheetName('fatigue'), 'Fatigue');
assert.equal(genericContext.getTargetSheetName('fatigue-recuperation'), 'Fatigue');
assert.equal(genericContext.getTargetSheetName('sommeil'), 'Sommeil');
assert.equal(genericContext.getTargetSheetName('nutrition'), 'Nutrition');
assert.equal(genericContext.getTargetSheetName('activite_physique'), 'Activite_Physique');
assert.equal(genericContext.getTargetSheetName('activite-physique'), 'Activite_Physique');
assert.equal(genericContext.getTargetSheetName('pieds_confort'), 'Pieds_Confort');
assert.equal(genericContext.getTargetSheetName('pieds-confort-postural'), 'Pieds_Confort');
assert.equal(genericContext.getTargetSheetName('risque_nutritionnel'), 'Risque_Nutritionnel');
assert.equal(genericContext.getTargetSheetName('risque-nutritionnel'), 'Risque_Nutritionnel');
assert.equal(genericContext.getTargetSheetName('bien_etre'), 'Bien_Etre');
assert.equal(genericContext.getTargetSheetName('bien-etre'), 'Bien_Etre');
assert.notEqual(genericContext.getSchema('risque-nutritionnel'), null);
assert.notEqual(genericContext.getSchema('bien-etre'), null);

// Unknown IDs must be rejected
assert.equal(genericContext.getTargetSheetName('unknown_test'), null);
assert.equal(genericContext.getTargetSheetName('Dashboard_Global'), null);
assert.equal(genericContext.getTargetSheetName('../../malicious_sheet'), null);
assert.equal(genericContext.getTargetSheetName(123), null);

// Formula injection protection checks
assert.equal(genericContext.safeSheetText('simple text'), 'simple text');
assert.equal(genericContext.safeSheetText('+12345'), "'+12345");
assert.equal(genericContext.safeSheetText('-CMD("calc")'), "'-CMD(\"calc\")");
assert.equal(genericContext.safeSheetText('@SUM(A1:A10)'), "'@SUM(A1:A10)");
assert.equal(genericContext.safeSheetText('=IMAGE("https://example.com/bad.png")'), "'=IMAGE(\"https://example.com/bad.png\")");
assert.equal(genericContext.safeSheetText('=HYPERLINK("https://evil.com","Click")'), "'=HYPERLINK(\"https://evil.com\",\"Click\")");
assert.equal(genericContext.safeSheetText('=IMPORTXML("https://attacker.com","//a")'), "'=IMPORTXML(\"https://attacker.com\",\"//a\")");
assert.equal(genericContext.safeSheetText('=cmd|\' /C calc\'!A0'), "'=cmd|' /C calc'!A0");
assert.equal(genericContext.safeSheetText('+cmd|\' /C calc\'!A0'), "'+cmd|' /C calc'!A0");
assert.equal(genericContext.safeSheetText('-2+3+cmd|\' /C calc\'!A0'), "'-2+3+cmd|' /C calc'!A0");
assert.equal(genericContext.safeSheetText('@SUM(A1:A100)'), "'@SUM(A1:A100)");

// Formula injection with leading whitespace, spaces, tabs and newlines
assert.equal(genericContext.safeSheetText('  =SUM(1,2)'), "'  =SUM(1,2)");
assert.equal(genericContext.safeSheetText('   +12345'), "'   +12345");
assert.equal(genericContext.safeSheetText(' -CMD("calc")'), "' -CMD(\"calc\")");
assert.equal(genericContext.safeSheetText('  @SUM(A1:A10)'), "'  @SUM(A1:A10)");
assert.equal(genericContext.safeSheetText('\t=IMPORTXML("x")'), "'\t=IMPORTXML(\"x\")");
assert.equal(genericContext.safeSheetText('\n-12345'), "'\n-12345");
assert.equal(genericContext.safeSheetText('\r+99999'), "'\r+99999");
assert.equal(genericContext.safeSheetText('\r\n@ALERT()'), "'\r\n@ALERT()");

// Safe texts that must NOT be prefixed
assert.equal(genericContext.safeSheetText('Option 1 - description standard'), 'Option 1 - description standard');
assert.equal(genericContext.safeSheetText('Score : 12 points'), 'Score : 12 points');
assert.equal(genericContext.safeSheetText('Stress bas'), 'Stress bas');
assert.equal(genericContext.safeSheetText('Bien-être satisfaisant'), 'Bien-être satisfaisant');
assert.equal(genericContext.safeSheetText('Oui'), 'Oui');
assert.equal(genericContext.safeSheetText('Non'), 'Non');
assert.equal(genericContext.safeSheetText('7 à 9 heures'), '7 à 9 heures');

// Already escaped texts must not be double escaped
assert.equal(genericContext.safeSheetText("'=ALREADY_ESCAPED"), "'=ALREADY_ESCAPED");
assert.equal(genericContext.safeSheetText("'+ALREADY_ESCAPED"), "'+ALREADY_ESCAPED");
assert.equal(genericContext.safeSheetText("'-ALREADY_ESCAPED"), "'-ALREADY_ESCAPED");
assert.equal(genericContext.safeSheetText("'@ALREADY_ESCAPED"), "'@ALREADY_ESCAPED");

// Null, undefined, empty, numbers, objects
assert.equal(genericContext.safeSheetText(null), '');
assert.equal(genericContext.safeSheetText(undefined), '');
assert.equal(genericContext.safeSheetText(''), '');
assert.equal(genericContext.safeSheetText(123), '123');
assert.equal(genericContext.safeSheetText({ Q1: '2', Q2: '3' }), '{"Q1":"2","Q2":"3"}');

// Session ID and timestamp validations
assert.equal(genericContext.isValidSessionId('123e4567-e89b-42d3-a456-426614174000'), true);
assert.equal(genericContext.isValidSessionId('invalid-uuid'), false);
assert.equal(genericContext.isValidTimestamp('2026-09-09T09:00:00.000Z'), true);
assert.equal(genericContext.isValidTimestamp('invalid-date'), false);

console.log('backend logic smoke test: OK');
