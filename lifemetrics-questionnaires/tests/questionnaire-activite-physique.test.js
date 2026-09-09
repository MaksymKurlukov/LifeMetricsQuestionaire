const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const engine = require('../assets/js/questionnaire-engine.js');

// ----------------------------------------------------
// 1. Authoritative Canonical Configuration Loading
// ----------------------------------------------------
// Dynamically load the canonical questionnaire.php to ensure zero desynchronization risk
const phpConfigPath = path.resolve(__dirname, '..', 'questionnaires', 'activite-physique', 'questionnaire.php');
const phpScript = 'echo json_encode(require $argv[1]);';
const configJson = execFileSync('php', ['-r', phpScript, phpConfigPath], { encoding: 'utf8' });
const config = JSON.parse(configJson);

// ----------------------------------------------------
// 2. Parity & Configuration Guard
// ----------------------------------------------------
assert.equal(config.schema_version, '2.0.0', 'Schema version must be 2.0.0');
assert.equal(config.id, 'activite-physique', 'ID must be activite-physique');
assert.equal(config.version, '1.0.0', 'Version must be 1.0.0');
assert.equal(config.status, 'review', 'Status must be review');
assert.equal(config.locale, 'fr-FR', 'Locale must be fr-FR');
assert.equal(config.scoring_direction, 'higher_is_better', 'Scoring direction must be higher_is_better');
assert.equal(config.score.target_min, 0, 'Target min must be 0');
assert.equal(config.score.target_max, 48, 'Target max must be 48');
assert.equal(config.score.normalize_when_unavailable, false, 'Normalize must be false');
assert.equal(config.score.rounding, 'half_up', 'Rounding must be half_up');

// Question count & IDs verification
assert.equal(config.questions.length, 12, 'Must have exactly 12 scored questions');
const questionIds = config.questions.map(q => q.id);
assert.deepEqual(questionIds, ['AP01', 'AP02', 'AP03', 'AP04', 'AP05', 'AP06', 'AP07', 'AP08', 'AP09', 'AP10', 'AP11', 'AP12']);

// AP04 (Renforcement musculaire) duplicate 4-point verification
const q4 = config.questions.find(q => q.id === 'AP04');
assert.equal(q4.answers[0].value, '0');
assert.equal(q4.answers[0].points, 0); // Jamais
assert.equal(q4.answers[1].value, '1');
assert.equal(q4.answers[1].points, 1); // Moins d'une fois/sem
assert.equal(q4.answers[2].value, '2');
assert.equal(q4.answers[2].points, 2); // 1 jour/sem
assert.equal(q4.answers[3].value, '3');
assert.equal(q4.answers[3].points, 4); // 2 jours/sem = 4 pts [DUPLICATE MAX]
assert.equal(q4.answers[4].value, '4');
assert.equal(q4.answers[4].points, 4); // 3 jours ou plus/sem = 4 pts [DUPLICATE MAX]

// Dimensions verification
assert.equal(config.dimensions.length, 5, 'Must have exactly 5 dimensions');
const expectedDimIds = [
  'activite-endurance',
  'renforcement-mobilite',
  'mouvement-quotidien',
  'sedentarite',
  'regularite'
];
assert.deepEqual(config.dimensions.map(d => d.id), expectedDimIds);

// Dimensions question mappings
assert.deepEqual(config.dimensions[0].question_ids, ['AP01', 'AP02', 'AP03']);
assert.deepEqual(config.dimensions[1].question_ids, ['AP04', 'AP05']);
assert.deepEqual(config.dimensions[2].question_ids, ['AP06', 'AP07']);
assert.deepEqual(config.dimensions[3].question_ids, ['AP08', 'AP09']);
assert.deepEqual(config.dimensions[4].question_ids, ['AP10', 'AP11', 'AP12']);

// Result levels verification
assert.equal(config.result_levels.length, 4, 'Must have exactly 4 result levels');
assert.deepEqual(
  config.result_levels.map(l => ({ code: l.code, min: l.min, max: l.max })),
  [
    { code: 'ACTIVITE_INSUFFISANTE', min: 0, max: 15 },
    { code: 'ACTIVITE_A_RENFORCER', min: 16, max: 27 },
    { code: 'NIVEAU_FAVORABLE', min: 28, max: 39 },
    { code: 'TRES_BON_NIVEAU', min: 40, max: 48 }
  ]
);

// Weakest dimensions config
assert.equal(config.weakest_dimensions.count, 2);
assert.equal(config.weakest_dimensions.tie_break, 'configuration_order');

// ----------------------------------------------------
// 3. Scoring Engine Boundaries & Duplicate Max Tests
// ----------------------------------------------------
// Score 0 Boundary: All min answers
const answers_min = {};
for (let i = 1; i <= 12; i++) {
  const qId = 'AP' + (i < 10 ? '0' + i : i);
  answers_min[qId] = '0';
}
const res_0 = engine.score(config, answers_min);
assert.equal(res_0.final_score, 0);
assert.equal(res_0.calculated_category, 'ACTIVITE_INSUFFISANTE');
assert.equal(res_0.displayed_category, 'ACTIVITE_INSUFFISANTE');

// Score 48 Boundary: All max answers
const answers_max = {
  AP01: '4', AP02: '4', AP03: '4', AP04: '3', // AP04 '3' is 4 pts
  AP05: '4', AP06: '4', AP07: '4', AP08: '4',
  AP09: '4', AP10: '4', AP11: '4', AP12: '4'
};
const res_48 = engine.score(config, answers_max);
assert.equal(res_48.final_score, 48);
assert.equal(res_48.calculated_category, 'TRES_BON_NIVEAU');
assert.equal(res_48.displayed_category, 'TRES_BON_NIVEAU');

// Score 48 Boundary with alternative duplicate max answer (AP04='4')
const answers_max_alt = {
  ...answers_max,
  AP04: '4'
};
const res_48_alt = engine.score(config, answers_max_alt);
assert.equal(res_48_alt.final_score, 48);
assert.equal(res_48_alt.calculated_category, 'TRES_BON_NIVEAU');

// Boundary 15 -> ACTIVITE_INSUFFISANTE
const answers_15 = {
  AP01: '1', AP02: '1', AP03: '1', // D1: 1+1+1=3
  AP04: '1', AP05: '1',             // D2: 1+1=2
  AP06: '1', AP07: '1',             // D3: 1+1=2
  AP08: '1', AP09: '1',             // D4: 1+1=2
  AP10: '2', AP11: '2', AP12: '2'  // D5: 2+2+2=6 -> Total = 15
};
const res_15 = engine.score(config, answers_15);
assert.equal(res_15.final_score, 15);
assert.equal(res_15.calculated_category, 'ACTIVITE_INSUFFISANTE');

// Boundary 16 -> ACTIVITE_A_RENFORCER
const answers_16 = { ...answers_15, AP09: '2' }; // +1 pt -> 16
const res_16 = engine.score(config, answers_16);
assert.equal(res_16.final_score, 16);
assert.equal(res_16.calculated_category, 'ACTIVITE_A_RENFORCER');

// Boundary 27 -> ACTIVITE_A_RENFORCER
const answers_27 = {
  AP01: '3', AP02: '2', AP03: '2', // D1: 3+2+2=7
  AP04: '2', AP05: '2',             // D2: 2+2=4
  AP06: '2', AP07: '2',             // D3: 2+2=4
  AP08: '2', AP09: '2',             // D4: 2+2=4
  AP10: '3', AP11: '3', AP12: '2'  // D5: 3+3+2=8 -> Total = 27
};
const res_27 = engine.score(config, answers_27);
assert.equal(res_27.final_score, 27);
assert.equal(res_27.calculated_category, 'ACTIVITE_A_RENFORCER');

// Boundary 28 -> NIVEAU_FAVORABLE
const answers_28 = { ...answers_27, AP07: '3' }; // +1 pt -> 28
const res_28 = engine.score(config, answers_28);
assert.equal(res_28.final_score, 28);
assert.equal(res_28.calculated_category, 'NIVEAU_FAVORABLE');

// Boundary 39 -> NIVEAU_FAVORABLE
const answers_39 = {
  AP01: '4', AP02: '3', AP03: '3', // D1: 4+3+3=10
  AP04: '3', AP05: '2',             // D2: 4+2=6 (AP04 '3' is 4 pts)
  AP06: '4', AP07: '3',             // D3: 4+3=7
  AP08: '3', AP09: '3',             // D4: 3+3=6
  AP10: '4', AP11: '3', AP12: '3'  // D5: 4+3+3=10 -> Total = 39
};
const res_39 = engine.score(config, answers_39);
assert.equal(res_39.final_score, 39);
assert.equal(res_39.calculated_category, 'NIVEAU_FAVORABLE');

// Boundary 40 -> TRES_BON_NIVEAU
const answers_40 = { ...answers_39, AP05: '3' }; // +1 pt -> 40
const res_40 = engine.score(config, answers_40);
assert.equal(res_40.final_score, 40);
assert.equal(res_40.calculated_category, 'TRES_BON_NIVEAU');

// ----------------------------------------------------
// 4. Weakest Dimensions & Deterministic Ties
// ----------------------------------------------------
// In res_15: D1 (3/12=25%), D2 (2/8=25%), D3 (2/8=25%), D4 (2/8=25%), D5 (6/12=50%)
// Tied lowest at 25% among D1, D2, D3, D4.
// Configuration order picks D1 and D2.
assert.deepEqual(res_15.weakest_dimensions, ['activite-endurance', 'renforcement-mobilite']);

console.log('Questionnaire Activité Physique JS Unit & Parity Tests: ALL PASSED.');
