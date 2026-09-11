const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const engine = require('../assets/js/questionnaire-engine.js');

// ----------------------------------------------------
// 1. Authoritative Canonical Configuration Loading
// ----------------------------------------------------
// Dynamically load the canonical questionnaire.php to ensure zero desynchronization risk
const phpConfigPath = path.resolve(__dirname, '..', 'questionnaires', 'nutrition', 'questionnaire.php');
const phpScript = 'echo json_encode(require $argv[1]);';
const configJson = execFileSync('php', ['-r', phpScript, phpConfigPath], { encoding: 'utf8' });
const config = JSON.parse(configJson);

// ----------------------------------------------------
// 2. Parity & Configuration Guard
// ----------------------------------------------------
assert.equal(config.schema_version, '2.0.0', 'Schema version must be 2.0.0');
assert.equal(config.id, 'nutrition', 'ID must be nutrition');
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
assert.deepEqual(questionIds, ['NT01', 'NT02', 'NT03', 'NT04', 'NT05', 'NT06', 'NT07', 'NT08', 'NT09', 'NT10', 'NT11', 'NT12']);

// NT03 (Légumes secs) plateau & point mapping
const q3 = config.questions.find(q => q.id === 'NT03');
assert.equal(q3.answers[0].value, '3_or_more_week');
assert.equal(q3.answers[0].points, 1);
assert.equal(q3.answers[1].value, '2_week');
assert.equal(q3.answers[1].points, 1); // 2x/sem = 1 pt [PLATEAU]
assert.equal(q3.answers[2].value, 'about_1_week');
assert.equal(q3.answers[2].points, 3);
assert.equal(q3.answers[3].value, 'less_1_week');
assert.equal(q3.answers[3].points, 4);
assert.equal(q3.answers[4].value, 'almost_never');
assert.equal(q3.answers[4].points, 5);

// NT06 (Poisson et alternatives) plateau & point mapping
const q6 = config.questions.find(q => q.id === 'NT06');
assert.equal(q6.answers[0].value, 'more_2_week');
assert.equal(q6.answers[0].points, 1);
assert.equal(q6.answers[1].value, 'about_2_week');
assert.equal(q6.answers[1].points, 1); // ~2x/sem = 1 pt [PLATEAU]
assert.equal(q6.answers[2].value, 'about_1_week');
assert.equal(q6.answers[2].points, 3);
assert.equal(q6.answers[3].value, 'less_1_week');
assert.equal(q6.answers[3].points, 4);
assert.equal(q6.answers[4].value, 'never');
assert.equal(q6.answers[4].points, 5);

// Dimensions verification
assert.equal(config.dimensions.length, 6, 'Must have exactly 6 dimensions');
const expectedDimIds = [
  'fruits-legumes-diversite-vegetale',
  'fibres-glucides-qualite',
  'proteines-variete-alimentaire',
  'matieres-grasses-qualite-aliments',
  'produits-a-limiter',
  'organisation-equilibre-global'
];
assert.deepEqual(config.dimensions.map(d => d.id), expectedDimIds);

// Dimensions question mappings
assert.deepEqual(config.dimensions[0].question_ids, ['NT01', 'NT02']);
assert.deepEqual(config.dimensions[1].question_ids, ['NT03', 'NT04']);
assert.deepEqual(config.dimensions[2].question_ids, ['NT05', 'NT06']);
assert.deepEqual(config.dimensions[3].question_ids, ['NT07', 'NT08']);
assert.deepEqual(config.dimensions[4].question_ids, ['NT09', 'NT10']);
assert.deepEqual(config.dimensions[5].question_ids, ['NT11', 'NT12']);

// Result levels verification
assert.equal(config.result_levels.length, 3, 'Must have exactly 3 result levels');
assert.deepEqual(
  config.result_levels.map(l => ({ code: l.code, min: l.min, max: l.max })),
  [
    { code: 'HABITUDES_FAVORABLES', min: 12, max: 24 },
    { code: 'EQUILIBRE_FRAGILE', min: 25, max: 32 },
    { code: 'HABITUDES_INSUFFISANTES', min: 33, max: 60 }
  ]
);

// Safety questions verification
assert.equal(config.safety_questions.length, 3, 'Must have 3 safety questions');
assert.deepEqual(config.safety_questions.map(q => q.id), ['NTSF01', 'NTSF02', 'NTSF03']);
config.safety_questions.forEach(q => {
  const yesAnswer = q.answers.find(a => a.value === 'yes');
  assert.deepEqual(yesAnswer.triggers, ['NUTRITION_SAFETY_MESSAGE']);
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
const baseSafety = { NTSF01: 'no', NTSF02: 'no', NTSF03: 'no' };

// Min score (all best answers = 1 pt) -> 12/60 -> HABITUDES_FAVORABLES
const answers_min = {
  ...baseSafety,
  NT01: '5_portions_or_more', NT02: 'very_varied',
  NT03: '3_or_more_week', NT04: 'almost_always',
  NT05: 'great_variety', NT06: 'more_2_week',
  NT07: 'almost_always', NT08: 'very_important',
  NT09: 'rarely_never', NT10: 'rarely',
  NT11: 'almost_always', NT12: 'almost_always'
};
const res_12 = engine.score(config, answers_min);
assert.equal(res_12.final_score, 12);
assert.equal(res_12.calculated_category, 'HABITUDES_FAVORABLES');
assert.equal(res_12.displayed_category, 'HABITUDES_FAVORABLES');
assert.equal(res_12.safety_flag_codes.length, 0);

// Min score with plateau answers (NT03 = '2_week', NT06 = 'about_2_week')
const answers_min_plateau = {
  ...answers_min,
  NT03: '2_week',
  NT06: 'about_2_week'
};
const res_12_plateau = engine.score(config, answers_min_plateau);
assert.equal(res_12_plateau.final_score, 12);
assert.equal(res_12_plateau.calculated_category, 'HABITUDES_FAVORABLES');

// Max score (all worst answers = 5 pts) -> 60/60 -> HABITUDES_INSUFFISANTES
const answers_max = {
  ...baseSafety,
  NT01: 'less_1_portion_per_day', NT02: 'very_little_varied',
  NT03: 'almost_never', NT04: 'almost_never',
  NT05: 'almost_always_same', NT06: 'never',
  NT07: 'almost_never', NT08: 'very_low',
  NT09: 'several_day', NT10: 'several_day',
  NT11: 'almost_never', NT12: 'almost_never'
};
const res_60 = engine.score(config, answers_max);
assert.equal(res_60.final_score, 60);
assert.equal(res_60.calculated_category, 'HABITUDES_INSUFFISANTES');
assert.equal(res_60.displayed_category, 'HABITUDES_INSUFFISANTES');
assert.equal(res_60.safety_flag_codes.length, 0);

// Boundary 24 -> HABITUDES_FAVORABLES
const answers_24 = {
  ...baseSafety,
  NT01: 'about_4_portions', NT02: 'fairly_varied',
  NT03: '3_or_more_week', NT04: 'half_time',
  NT05: 'several_sources', NT06: 'more_2_week',
  NT07: 'often', NT08: 'important',
  NT09: '1_3_week', NT10: '1_3_week',
  NT11: 'often', NT12: 'half_time'
};
const res_24 = engine.score(config, answers_24);
assert.equal(res_24.final_score, 24);
assert.equal(res_24.calculated_category, 'HABITUDES_FAVORABLES');

// Boundary 25 -> EQUILIBRE_FRAGILE (+1 pt)
const answers_25 = { ...answers_24, NT01: 'about_3_portions' }; // 3 pts (+1)
const res_25 = engine.score(config, answers_25);
assert.equal(res_25.final_score, 25);
assert.equal(res_25.calculated_category, 'EQUILIBRE_FRAGILE');

// Boundary 32 -> EQUILIBRE_FRAGILE
const answers_32 = {
  ...baseSafety,
  NT01: 'about_3_portions', NT02: 'moderately_varied',
  NT03: 'about_1_week', NT04: 'half_time',
  NT05: 'few_sources', NT06: 'about_1_week',
  NT07: 'half_time', NT08: 'half_diet',
  NT09: '1_3_week', NT10: '1_3_week',
  NT11: 'often', NT12: 'often'
};
const res_32 = engine.score(config, answers_32);
assert.equal(res_32.final_score, 32);
assert.equal(res_32.calculated_category, 'EQUILIBRE_FRAGILE');

// Boundary 33 -> HABITUDES_INSUFFISANTES (+1 pt)
const answers_33 = { ...answers_32, NT09: '4_6_week' }; // 3 pts (+1)
const res_33 = engine.score(config, answers_33);
assert.equal(res_33.final_score, 33);
assert.equal(res_33.calculated_category, 'HABITUDES_INSUFFISANTES');

// ----------------------------------------------------
// 4. Weakest Dimensions & Deterministic Ties
// ----------------------------------------------------
const answers_weak = {
  ...baseSafety,
  NT01: 'less_1_portion_per_day', NT02: 'very_little_varied', // D1: 5+5 = 10/10 (100%)
  NT03: 'less_1_week', NT04: 'rarely', // D2: 4+4 = 8/10 (75%)
  NT05: 'few_sources', NT06: 'about_1_week', // D3: 3+3 = 6/10 (50%)
  NT07: 'often', NT08: 'important', // D4: 2+2 = 4/10 (25%)
  NT09: 'rarely_never', NT10: 'rarely', // D5: 1+1 = 2/10 (0%)
  NT11: 'almost_always', NT12: 'almost_always' // D6: 1+1 = 2/10 (0%)
};
const res_weak = engine.score(config, answers_weak);
assert.deepEqual(res_weak.weakest_dimensions, ['fruits-legumes-diversite-vegetale', 'fibres-glucides-qualite']);

// ----------------------------------------------------
// 5. Safety Questions Independence
// ----------------------------------------------------
const res_sf1 = engine.score(config, { ...answers_max, NTSF01: 'yes' });
assert.equal(res_sf1.final_score, 60);
assert.equal(res_sf1.calculated_category, 'HABITUDES_INSUFFISANTES');
assert.deepEqual(res_sf1.safety_flag_codes, ['NUTRITION_SAFETY_MESSAGE']);

const res_sf2 = engine.score(config, { ...answers_max, NTSF02: 'yes' });
assert.deepEqual(res_sf2.safety_flag_codes, ['NUTRITION_SAFETY_MESSAGE']);

const res_sf3 = engine.score(config, { ...answers_max, NTSF03: 'yes' });
assert.deepEqual(res_sf3.safety_flag_codes, ['NUTRITION_SAFETY_MESSAGE']);

const res_sf_all = engine.score(config, { ...answers_max, NTSF01: 'yes', NTSF02: 'yes', NTSF03: 'yes' });
assert.equal(res_sf_all.final_score, 60);
assert.deepEqual(res_sf_all.safety_flag_codes, ['NUTRITION_SAFETY_MESSAGE']);

console.log('Questionnaire Nutrition JS Unit & Parity Tests: ALL PASSED.');
