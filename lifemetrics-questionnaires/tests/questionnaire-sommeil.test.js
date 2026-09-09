const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const engine = require('../assets/js/questionnaire-engine.js');

// ----------------------------------------------------
// 1. Authoritative Canonical Configuration Loading
// ----------------------------------------------------
// Dynamically load the canonical questionnaire.php to ensure zero desynchronization risk
const phpConfigPath = path.resolve(__dirname, '..', 'questionnaires', 'sommeil', 'questionnaire.php');
const phpScript = 'echo json_encode(require $argv[1]);';
const configJson = execFileSync('php', ['-r', phpScript, phpConfigPath], { encoding: 'utf8' });
const config = JSON.parse(configJson);

// ----------------------------------------------------
// 2. Parity & Configuration Guard
// ----------------------------------------------------
assert.equal(config.schema_version, '2.0.0', 'Schema version must be 2.0.0');
assert.equal(config.id, 'sommeil', 'ID must be sommeil');
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
assert.deepEqual(questionIds, ['SL01', 'SL02', 'SL03', 'SL04', 'SL05', 'SL06', 'SL07', 'SL08', 'SL09', 'SL10', 'SL11', 'SL12']);

// Non-linear Q1 (SL01) points verification
const q1 = config.questions.find(q => q.id === 'SL01');
assert.equal(q1.answers[0].value, '0');
assert.equal(q1.answers[0].points, 0); // <5h = 0
assert.equal(q1.answers[1].value, '1');
assert.equal(q1.answers[1].points, 1); // 5h à <6h = 1
assert.equal(q1.answers[2].value, '2');
assert.equal(q1.answers[2].points, 2); // 6h à <7h = 2
assert.equal(q1.answers[3].value, '3');
assert.equal(q1.answers[3].points, 4); // 7h à 9h = 4
assert.equal(q1.answers[4].value, '4');
assert.equal(q1.answers[4].points, 3); // >9h = 3 (non-linear: less than 7-9h)

// Dimensions verification
assert.equal(config.dimensions.length, 5, 'Must have exactly 5 dimensions');
const expectedDimIds = [
  'duree-suffisance',
  'endormissement-continuite',
  'regularite-rythme',
  'recuperation-fonctionnement-diurne',
  'habitudes-favorables'
];
assert.deepEqual(config.dimensions.map(d => d.id), expectedDimIds);

// Dimensions question mappings
assert.deepEqual(config.dimensions[0].question_ids, ['SL01', 'SL02']);
assert.deepEqual(config.dimensions[1].question_ids, ['SL03', 'SL04', 'SL05']);
assert.deepEqual(config.dimensions[2].question_ids, ['SL06', 'SL07']);
assert.deepEqual(config.dimensions[3].question_ids, ['SL08', 'SL09', 'SL10']);
assert.deepEqual(config.dimensions[4].question_ids, ['SL11', 'SL12']);

// Result levels verification
assert.equal(config.result_levels.length, 4, 'Must have exactly 4 result levels');
assert.deepEqual(
  config.result_levels.map(l => ({ code: l.code, min: l.min, max: l.max })),
  [
    { code: 'SOMMEIL_TRES_PERTURBE', min: 0, max: 15 },
    { code: 'SOMMEIL_A_AMELIORER', min: 16, max: 27 },
    { code: 'SOMMEIL_GLOBALEMENT_SATISFAISANT', min: 28, max: 38 },
    { code: 'SOMMEIL_FAVORABLE', min: 39, max: 48 }
  ]
);

// Safety questions verification
assert.equal(config.safety_questions.length, 3, 'Must have 3 safety questions');
assert.deepEqual(config.safety_questions.map(q => q.id), ['SLSF01', 'SLSF02', 'SLSF03']);
config.safety_questions.forEach(q => {
  const yesAnswer = q.answers.find(a => a.value === 'yes');
  assert.deepEqual(yesAnswer.triggers, ['HEALTH_ATTENTION_MESSAGE']);
});

// Weakest dimensions config
assert.equal(config.weakest_dimensions.count, 2);
assert.equal(config.weakest_dimensions.tie_break, 'configuration_order');

// ----------------------------------------------------
// 3. Scoring Engine Boundaries & Direct/Reverse Logic
// ----------------------------------------------------
const baseSafety = { SLSF01: 'no', SLSF02: 'no', SLSF03: 'no' };

// Score 0 Boundary: All min answers
const answers_min = { ...baseSafety };
for (let i = 1; i <= 12; i++) {
  const qId = 'SL' + (i < 10 ? '0' + i : i);
  answers_min[qId] = '0';
}
const res_0 = engine.score(config, answers_min);
assert.equal(res_0.final_score, 0);
assert.equal(res_0.calculated_category, 'SOMMEIL_TRES_PERTURBE');
assert.equal(res_0.displayed_category, 'SOMMEIL_TRES_PERTURBE');
assert.equal(res_0.safety_flag_codes.length, 0);

// Score 48 Boundary: All max answers (SL01='3', rest='4')
const answers_max = { ...baseSafety };
for (let i = 1; i <= 12; i++) {
  const qId = 'SL' + (i < 10 ? '0' + i : i);
  answers_max[qId] = '4';
}
answers_max['SL01'] = '3'; // Option 3 is 4 pts (max)
const res_48 = engine.score(config, answers_max);
assert.equal(res_48.final_score, 48);
assert.equal(res_48.calculated_category, 'SOMMEIL_FAVORABLE');
assert.equal(res_48.displayed_category, 'SOMMEIL_FAVORABLE');
assert.equal(res_48.safety_flag_codes.length, 0);

// Boundary 15 -> SOMMEIL_TRES_PERTURBE
const answers_15 = {
  ...baseSafety,
  SL01: '1', SL02: '1', // D1: 1+1=2
  SL03: '1', SL04: '1', SL05: '1', // D2: 1+1+1=3
  SL06: '1', SL07: '1', // D3: 1+1=2
  SL08: '2', SL09: '2', SL10: '2', // D4: 2+2+2=6
  SL11: '1', SL12: '1'  // D5: 1+1=2 -> Total = 15
};
const res_15 = engine.score(config, answers_15);
assert.equal(res_15.final_score, 15);
assert.equal(res_15.calculated_category, 'SOMMEIL_TRES_PERTURBE');

// Boundary 16 -> SOMMEIL_A_AMELIORER
const answers_16 = { ...answers_15, SL11: '2' }; // +1 pt -> 16
const res_16 = engine.score(config, answers_16);
assert.equal(res_16.final_score, 16);
assert.equal(res_16.calculated_category, 'SOMMEIL_A_AMELIORER');

// Boundary 27 -> SOMMEIL_A_AMELIORER
const answers_27 = {
  ...baseSafety,
  SL01: '2', SL02: '2', // D1: 2+2=4
  SL03: '2', SL04: '2', SL05: '2', // D2: 2+2+2=6
  SL06: '3', SL07: '2', // D3: 3+2=5
  SL08: '3', SL09: '2', SL10: '2', // D4: 3+2+2=7
  SL11: '3', SL12: '2'  // D5: 3+2=5 -> Total = 27
};
const res_27 = engine.score(config, answers_27);
assert.equal(res_27.final_score, 27);
assert.equal(res_27.calculated_category, 'SOMMEIL_A_AMELIORER');

// Boundary 28 -> SOMMEIL_GLOBALEMENT_SATISFAISANT
const answers_28 = { ...answers_27, SL01: '4' }; // SL01 value '4' is 3 pts (+1 pt) -> 28
const res_28 = engine.score(config, answers_28);
assert.equal(res_28.final_score, 28);
assert.equal(res_28.calculated_category, 'SOMMEIL_GLOBALEMENT_SATISFAISANT');

// Boundary 38 -> SOMMEIL_GLOBALEMENT_SATISFAISANT
const answers_38 = {
  ...baseSafety,
  SL01: '3', SL02: '3', // D1: 4+3=7
  SL03: '3', SL04: '3', SL05: '3', // D2: 3+3+3=9
  SL06: '3', SL07: '3', // D3: 3+3=6
  SL08: '3', SL09: '4', SL10: '3', // D4: 3+4+3=10
  SL11: '3', SL12: '3'  // D5: 3+3=6 -> Total = 38
};
const res_38 = engine.score(config, answers_38);
assert.equal(res_38.final_score, 38);
assert.equal(res_38.calculated_category, 'SOMMEIL_GLOBALEMENT_SATISFAISANT');

// Boundary 39 -> SOMMEIL_FAVORABLE
const answers_39 = { ...answers_38, SL02: '4' }; // +1 pt -> 39
const res_39 = engine.score(config, answers_39);
assert.equal(res_39.final_score, 39);
assert.equal(res_39.calculated_category, 'SOMMEIL_FAVORABLE');

// ----------------------------------------------------
// 4. Testing Q1 Non-Linearity Directly
// ----------------------------------------------------
const q1_opt3 = { ...answers_min, SL01: '3' };
const res_q1_opt3 = engine.score(config, q1_opt3);
assert.equal(res_q1_opt3.final_score, 4, 'SL01 option 3 gives 4 pts');

const q1_opt4 = { ...answers_min, SL01: '4' };
const res_q1_opt4 = engine.score(config, q1_opt4);
assert.equal(res_q1_opt4.final_score, 3, 'SL01 option 4 gives 3 pts');
assert.ok(res_q1_opt3.final_score > res_q1_opt4.final_score, 'Non-linear ordering: opt 3 (7-9h) scores higher than opt 4 (>9h)');

// ----------------------------------------------------
// 5. Weakest Dimensions & Deterministic Ties
// ----------------------------------------------------
// D1=2/8 (25%), D2=3/12 (25%), D3=2/8 (25%), D4=6/12 (50%), D5=2/8 (25%)
// Ties broken by configuration order: weakest 2 must be D1 (duree-suffisance) and D2 (endormissement-continuite)
assert.deepEqual(res_15.weakest_dimensions, ['duree-suffisance', 'endormissement-continuite']);

// ----------------------------------------------------
// 6. Safety Questions Independence
// ----------------------------------------------------
// SLSF01 alone
const res_sf1 = engine.score(config, { ...answers_max, SLSF01: 'yes' });
assert.equal(res_sf1.final_score, 48, 'Safety does not alter score (48)');
assert.equal(res_sf1.calculated_category, 'SOMMEIL_FAVORABLE', 'Safety does not alter category');
assert.deepEqual(res_sf1.safety_flag_codes, ['HEALTH_ATTENTION_MESSAGE']);

// SLSF02 alone
const res_sf2 = engine.score(config, { ...answers_max, SLSF02: 'yes' });
assert.deepEqual(res_sf2.safety_flag_codes, ['HEALTH_ATTENTION_MESSAGE']);

// SLSF03 alone
const res_sf3 = engine.score(config, { ...answers_max, SLSF03: 'yes' });
assert.deepEqual(res_sf3.safety_flag_codes, ['HEALTH_ATTENTION_MESSAGE']);

// SLSF01 unknown (Je ne sais pas) -> no trigger
const res_sf_unk = engine.score(config, { ...answers_max, SLSF01: 'unknown' });
assert.deepEqual(res_sf_unk.safety_flag_codes, []);

// Multiple simultaneous safety triggers
const res_sf_all = engine.score(config, { ...answers_max, SLSF01: 'yes', SLSF02: 'yes', SLSF03: 'yes' });
assert.equal(res_sf_all.final_score, 48, 'Score unaffected by multiple safety flags');
assert.deepEqual(res_sf_all.safety_flag_codes, ['HEALTH_ATTENTION_MESSAGE']);

console.log('Questionnaire Sommeil JS Unit & Scoring Tests: ALL PASSED.');
