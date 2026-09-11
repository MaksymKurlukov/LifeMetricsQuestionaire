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
assert.equal(config.scoring_direction, 'lower_is_better', 'Scoring direction must be lower_is_better');
assert.equal(config.score.target_min, 12, 'Target min must be 12');
assert.equal(config.score.target_max, 60, 'Target max must be 60');
assert.equal(config.score.normalize_when_unavailable, false, 'Normalize must be false');
assert.equal(config.score.rounding, 'half_up', 'Rounding must be half_up');

// Question count & IDs verification
assert.equal(config.questions.length, 12, 'Must have exactly 12 scored questions');
const questionIds = config.questions.map(q => q.id);
assert.deepEqual(questionIds, ['SL01', 'SL02', 'SL03', 'SL04', 'SL05', 'SL06', 'SL07', 'SL08', 'SL09', 'SL10', 'SL11', 'SL12']);

// Non-linear Q1 (SL01) points verification
const q1 = config.questions.find(q => q.id === 'SL01');
assert.equal(q1.answers[0].value, '7_to_9h');
assert.equal(q1.answers[0].points, 1); // 7h à 9h = 1 pt [OPTIMAL]
assert.equal(q1.answers[1].value, 'more_9h');
assert.equal(q1.answers[1].points, 2); // >9h = 2 pts [NON-LINEAR]
assert.equal(q1.answers[2].value, '6_to_7h');
assert.equal(q1.answers[2].points, 3);
assert.equal(q1.answers[3].value, '5_to_6h');
assert.equal(q1.answers[3].points, 4);
assert.equal(q1.answers[4].value, 'less_5h');
assert.equal(q1.answers[4].points, 5);

// Dimensions verification
assert.equal(config.dimensions.length, 5, 'Must have exactly 5 dimensions');
const expectedDimIds = [
  'duree-suffisance-sommeil',
  'endormissement-continuite',
  'regularite-rythme',
  'recuperation-fonctionnement-diurne',
  'habitudes-favorables-sommeil'
];
assert.deepEqual(config.dimensions.map(d => d.id), expectedDimIds);

// Dimensions question mappings
assert.deepEqual(config.dimensions[0].question_ids, ['SL01', 'SL02']);
assert.deepEqual(config.dimensions[1].question_ids, ['SL03', 'SL04', 'SL05']);
assert.deepEqual(config.dimensions[2].question_ids, ['SL06', 'SL07']);
assert.deepEqual(config.dimensions[3].question_ids, ['SL08', 'SL09', 'SL10']);
assert.deepEqual(config.dimensions[4].question_ids, ['SL11', 'SL12']);

// Result levels verification
assert.equal(config.result_levels.length, 3, 'Must have exactly 3 result levels');
assert.deepEqual(
  config.result_levels.map(l => ({ code: l.code, min: l.min, max: l.max })),
  [
    { code: 'SATISFAISANT', min: 12, max: 24 },
    { code: 'ENCORE_FRAGILE', min: 25, max: 32 },
    { code: 'PERTURBE', min: 33, max: 60 }
  ]
);

// Safety questions verification
assert.equal(config.safety_questions.length, 3, 'Must have 3 safety questions');
assert.deepEqual(config.safety_questions.map(q => q.id), ['SLSF01', 'SLSF02', 'SLSF03']);
config.safety_questions.forEach(q => {
  const yesAnswer = q.answers.find(a => a.value === 'yes');
  assert.deepEqual(yesAnswer.triggers, ['SOMMEIL_SAFETY_MESSAGE']);
});

// Global Result CTAs verification
assert.equal(config.result_ctas.length, 2, 'Must have exactly 2 result CTAs');
assert.equal(config.result_ctas[0].label, 'Je veux faire un bilan');
assert.equal(config.result_ctas[0].url, 'https://lifemetrics.fr/formulaire-bilan/');
assert.equal(config.result_ctas[0].variant, 'primary');
assert.equal(config.result_ctas[0].enabled, true);
assert.equal(config.result_ctas[1].variant, 'secondary');
assert.equal(config.result_ctas[1].url, '/tests-sante/');

// Weakest dimensions config
assert.equal(config.weakest_dimensions.count, 2);
assert.equal(config.weakest_dimensions.tie_break, 'configuration_order');

// ----------------------------------------------------
// 3. Scoring Engine Boundaries (12, 24, 25, 32, 33, 60)
// ----------------------------------------------------
const baseSafety = { SLSF01: 'no', SLSF02: 'no', SLSF03: 'no' };

// Min score (all best answers = 1) -> 12/60 -> SATISFAISANT
const answers_min = {
  ...baseSafety,
  SL01: '7_to_9h', SL02: 'almost_always',
  SL03: '15_min_or_less', SL04: 'rarely_never', SL05: 'very_easily',
  SL06: 'very_regular', SL07: 'very_little',
  SL08: 'almost_every_day', SL09: 'almost_never', SL10: 'almost_always',
  SL11: 'almost_every_evening', SL12: 'almost_always',
};
const res_12 = engine.score(config, answers_min);
assert.equal(res_12.final_score, 12);
assert.equal(res_12.calculated_category, 'SATISFAISANT');
assert.equal(res_12.displayed_category, 'SATISFAISANT');
assert.equal(res_12.safety_flag_codes.length, 0);

// Max score (all worst answers = 5) -> 60/60 -> PERTURBE
const answers_max = {
  ...baseSafety,
  SL01: 'less_5h', SL02: 'almost_never',
  SL03: 'more_60_min', SL04: 'almost_every_night', SL05: 'very_difficult',
  SL06: 'very_irregular', SL07: 'more_3h',
  SL08: 'almost_never', SL09: 'almost_every_day', SL10: 'almost_never',
  SL11: 'never', SL12: 'almost_never',
};
const res_60 = engine.score(config, answers_max);
assert.equal(res_60.final_score, 60);
assert.equal(res_60.calculated_category, 'PERTURBE');
assert.equal(res_60.displayed_category, 'PERTURBE');
assert.equal(res_60.safety_flag_codes.length, 0);

// Boundary 24 -> SATISFAISANT (12 questions with 2 pts each)
const answers_24 = {
  ...baseSafety,
  SL01: 'more_9h', SL02: 'often',
  SL03: '16_to_30_min', SL04: '1_night_week', SL05: 'easily',
  SL06: 'generally_regular', SL07: 'about_1h',
  SL08: 'often', SL09: 'rarely', SL10: 'often',
  SL11: 'often', SL12: 'often',
};
const res_24 = engine.score(config, answers_24);
assert.equal(res_24.final_score, 24);
assert.equal(res_24.calculated_category, 'SATISFAISANT');

// Boundary 25 -> ENCORE_FRAGILE (+1 pt)
const answers_25 = { ...answers_24, SL01: '6_to_7h' }; // 3 pts (+1)
const res_25 = engine.score(config, answers_25);
assert.equal(res_25.final_score, 25);
assert.equal(res_25.calculated_category, 'ENCORE_FRAGILE');

// Boundary 32 -> ENCORE_FRAGILE (8 questions with 3 pts, 4 questions with 2 pts = 32)
const answers_32 = {
  ...baseSafety,
  SL01: '6_to_7h', SL02: 'half_time',
  SL03: '31_to_45_min', SL04: '2_3_nights_week', SL05: 'depends',
  SL06: 'variable', SL07: '1h30_to_2h',
  SL08: 'half_time', SL09: 'rarely', SL10: 'often',
  SL11: 'often', SL12: 'often',
};
const res_32 = engine.score(config, answers_32);
assert.equal(res_32.final_score, 32);
assert.equal(res_32.calculated_category, 'ENCORE_FRAGILE');

// Boundary 33 -> PERTURBE (+1 pt)
const answers_33 = { ...answers_32, SL12: 'half_time' }; // 3 pts (+1)
const res_33 = engine.score(config, answers_33);
assert.equal(res_33.final_score, 33);
assert.equal(res_33.calculated_category, 'PERTURBE');

// ----------------------------------------------------
// 4. Testing Q1 Non-Linearity Directly
// ----------------------------------------------------
const q1_opt1 = { ...answers_min, SL01: '7_to_9h' };
const res_q1_opt1 = engine.score(config, q1_opt1);
assert.equal(res_q1_opt1.final_score, 12, 'SL01 7-9h gives 1 pt (total 12)');

const q1_opt2 = { ...answers_min, SL01: 'more_9h' };
const res_q1_opt2 = engine.score(config, q1_opt2);
assert.equal(res_q1_opt2.final_score, 13, 'SL01 >9h gives 2 pts (total 13)');
assert.ok(res_q1_opt1.final_score < res_q1_opt2.final_score, 'Non-linear ordering: 7-9h (1 pt) is more favorable than >9h (2 pts) under lower_is_better');

// ----------------------------------------------------
// 5. Weakest Dimensions & Deterministic Ties
// ----------------------------------------------------
// Under lower_is_better, higher score/percentage = worse dimension.
const answers_weak = {
  ...baseSafety,
  SL01: 'less_5h', SL02: 'almost_never', // D1: 5+5 = 10/10 (100%)
  SL03: '46_to_60_min', SL04: '4_5_nights_week', SL05: 'difficult', // D2: 4+4+4 = 12/15 (75%)
  SL06: 'variable', SL07: '1h30_to_2h', // D3: 3+3 = 6/10 (50%)
  SL08: 'often', SL09: 'rarely', SL10: 'often', // D4: 2+2+2 = 6/15 (25%)
  SL11: 'almost_every_evening', SL12: 'almost_always', // D5: 1+1 = 2/10 (0%)
};
const res_weak = engine.score(config, answers_weak);
assert.deepEqual(res_weak.weakest_dimensions, ['duree-suffisance-sommeil', 'endormissement-continuite']);

// ----------------------------------------------------
// 6. Safety Questions Independence
// ----------------------------------------------------
// SLSF01 alone
const res_sf1 = engine.score(config, { ...answers_max, SLSF01: 'yes' });
assert.equal(res_sf1.final_score, 60, 'Safety does not alter score (60)');
assert.equal(res_sf1.calculated_category, 'PERTURBE', 'Safety does not alter category');
assert.deepEqual(res_sf1.safety_flag_codes, ['SOMMEIL_SAFETY_MESSAGE']);

// SLSF02 alone
const res_sf2 = engine.score(config, { ...answers_max, SLSF02: 'yes' });
assert.deepEqual(res_sf2.safety_flag_codes, ['SOMMEIL_SAFETY_MESSAGE']);

// SLSF03 alone
const res_sf3 = engine.score(config, { ...answers_max, SLSF03: 'yes' });
assert.deepEqual(res_sf3.safety_flag_codes, ['SOMMEIL_SAFETY_MESSAGE']);

// SLSF01 unsure (Je ne sais pas) -> no trigger
const res_sf_unk = engine.score(config, { ...answers_max, SLSF01: 'unsure' });
assert.deepEqual(res_sf_unk.safety_flag_codes, []);

// Multiple simultaneous safety triggers
const res_sf_all = engine.score(config, { ...answers_max, SLSF01: 'yes', SLSF02: 'yes', SLSF03: 'yes' });
assert.equal(res_sf_all.final_score, 60, 'Score unaffected by multiple safety flags');
assert.deepEqual(res_sf_all.safety_flag_codes, ['SOMMEIL_SAFETY_MESSAGE']);

console.log('Questionnaire Sommeil JS Unit & Scoring Tests: ALL PASSED.');
