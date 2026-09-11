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
assert.equal(config.scoring_direction, 'lower_is_better', 'Scoring direction must be lower_is_better');
assert.equal(config.score.target_min, 12, 'Target min must be 12');
assert.equal(config.score.target_max, 60, 'Target max must be 60');
assert.equal(config.score.normalize_when_unavailable, false, 'Normalize must be false');
assert.equal(config.score.rounding, 'half_up', 'Rounding must be half_up');

// Question count & IDs verification
assert.equal(config.questions.length, 12, 'Must have exactly 12 scored questions');
const questionIds = config.questions.map(q => q.id);
assert.deepEqual(questionIds, ['AP01', 'AP02', 'AP03', 'AP04', 'AP05', 'AP06', 'AP07', 'AP08', 'AP09', 'AP10', 'AP11', 'AP12']);

// AP04 (Renforcement musculaire) duplicate 1-point verification
const q4 = config.questions.find(q => q.id === 'AP04');
assert.equal(q4.answers[0].value, '3_plus');
assert.equal(q4.answers[0].points, 1);
assert.equal(q4.answers[1].value, '2_days');
assert.equal(q4.answers[1].points, 1); // [DUPLICATE 1 PT]
assert.equal(q4.answers[2].value, '1_day');
assert.equal(q4.answers[2].points, 3);
assert.equal(q4.answers[3].value, 'less_1');
assert.equal(q4.answers[3].points, 4);
assert.equal(q4.answers[4].value, 'never');
assert.equal(q4.answers[4].points, 5);

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
assert.equal(config.result_levels.length, 3, 'Must have exactly 3 result levels');
assert.deepEqual(
  config.result_levels.map(l => ({ code: l.code, min: l.min, max: l.max })),
  [
    { code: 'SATISFAISANTE', min: 12, max: 24 },
    { code: 'A_RENFORCER', min: 25, max: 32 },
    { code: 'INSUFFISANTE', min: 33, max: 60 }
  ]
);

// Weakest dimensions config
assert.equal(config.weakest_dimensions.count, 2);
assert.equal(config.weakest_dimensions.tie_break, 'configuration_order');

// ----------------------------------------------------
// 3. Scoring Engine Boundaries (12, 24, 25, 32, 33, 60)
// ----------------------------------------------------
// Min score (all best answers = 1) -> 12/60 -> SATISFAISANTE
const answers_min = {
  AP01: '5_plus', AP02: '300_plus', AP03: 'almost_always',
  AP04: '3_plus', AP05: 'whole_body',
  AP06: '6_7_days', AP07: 'very_regularly',
  AP08: 'less_3h', AP09: 'every_30min',
  AP10: '5_plus_days', AP11: '4_weeks', AP12: '0_days'
};
const res_12 = engine.score(config, answers_min);
assert.equal(res_12.final_score, 12);
assert.equal(res_12.calculated_category, 'SATISFAISANTE');
assert.equal(res_12.displayed_category, 'SATISFAISANTE');

// Max score (all worst answers = 5) -> 60/60 -> INSUFFISANTE
const answers_max = {
  AP01: '0_days', AP02: 'less_30', AP03: 'never',
  AP04: 'never', AP05: 'almost_none',
  AP06: '0_days', AP07: 'almost_never',
  AP08: 'more_9h', AP09: 'after_2h',
  AP10: 'rarely_active', AP11: 'none', AP12: '6_7_days'
};
const res_60 = engine.score(config, answers_max);
assert.equal(res_60.final_score, 60);
assert.equal(res_60.calculated_category, 'INSUFFISANTE');
assert.equal(res_60.displayed_category, 'INSUFFISANTE');

// Boundary 24 -> SATISFAISANTE
const answers_24 = {
  AP01: '4_days', AP02: '150_299', AP03: 'often',       // 2, 2, 2
  AP04: '2_days', AP05: 'some_groups',                   // 1, 3
  AP06: '4_5_days', AP07: 'multiple_times',               // 2, 2
  AP08: '3_to_5h', AP09: 'every_30_60min',               // 2, 2
  AP10: '3_4_days', AP11: '3_weeks', AP12: '1_2_days'   // 2, 2, 2 -> total = 24
};
const res_24 = engine.score(config, answers_24);
assert.equal(res_24.final_score, 24);
assert.equal(res_24.calculated_category, 'SATISFAISANTE');

// Boundary 25 -> A_RENFORCER (+1 pt)
const answers_25 = { ...answers_24, AP01: '2_3_days' }; // 3 pts (+1)
const res_25 = engine.score(config, answers_25);
assert.equal(res_25.final_score, 25);
assert.equal(res_25.calculated_category, 'A_RENFORCER');

// Boundary 32 -> A_RENFORCER
const answers_32 = {
  AP01: '2_3_days', AP02: '60_149', AP03: 'sometimes',  // 3, 3, 3
  AP04: '1_day', AP05: 'some_groups',                    // 3, 3
  AP06: '2_3_days', AP07: 'from_time_to_time',          // 3, 3
  AP08: '5_to_7h', AP09: 'every_30_60min',              // 3, 2
  AP10: '3_4_days', AP11: '3_weeks', AP12: '1_2_days'   // 2, 2, 2 -> total = 32
};
const res_32 = engine.score(config, answers_32);
assert.equal(res_32.final_score, 32);
assert.equal(res_32.calculated_category, 'A_RENFORCER');

// Boundary 33 -> INSUFFISANTE (+1 pt)
const answers_33 = { ...answers_32, AP12: '3_days' }; // 3 pts (+1) -> total = 33
const res_33 = engine.score(config, answers_33);
assert.equal(res_33.final_score, 33);
assert.equal(res_33.calculated_category, 'INSUFFISANTE');

// ----------------------------------------------------
// 4. Weakest Dimensions & Deterministic Ties
// ----------------------------------------------------
// Under lower_is_better, higher score/percentage = worse dimension.
const answers_weakest = {
  AP01: '0_days', AP02: 'less_30', AP03: 'never', // D1: 5+5+5 = 15/15 (100%)
  AP04: 'less_1', AP05: 'single_zone',            // D2: 4+4 = 8/10 (75%)
  AP06: '2_3_days', AP07: 'from_time_to_time',    // D3: 3+3 = 6/10 (50%)
  AP08: '3_to_5h', AP09: 'every_30_60min',        // D4: 2+2 = 4/10 (25%)
  AP10: '5_plus_days', AP11: '4_weeks', AP12: '0_days' // D5: 1+1+1 = 3/15 (0%)
};
const res_weak = engine.score(config, answers_weakest);
assert.deepEqual(res_weak.weakest_dimensions, ['activite-endurance', 'renforcement-mobilite']);

console.log('Questionnaire Activité Physique JS Unit & Parity Tests: ALL PASSED.');
