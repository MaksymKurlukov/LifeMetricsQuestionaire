const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const engine = require('../assets/js/questionnaire-engine.js');

// ----------------------------------------------------
// 1. Authoritative Canonical Configuration Loading
// ----------------------------------------------------
const phpConfigPath = path.resolve(__dirname, '..', 'questionnaires', 'pieds-confort-postural', 'questionnaire.php');
const phpScript = 'echo json_encode(require $argv[1]);';
const configJson = execFileSync('php', ['-r', phpScript, phpConfigPath], { encoding: 'utf8' });
const config = JSON.parse(configJson);

// ----------------------------------------------------
// 2. Parity & Configuration Guard
// ----------------------------------------------------
assert.equal(config.schema_version, '2.0.0', 'Schema version must be 2.0.0');
assert.equal(config.id, 'pieds-confort-postural', 'ID must be pieds-confort-postural');
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
assert.deepEqual(questionIds, ['PF01', 'PF02', 'PF03', 'PF04', 'PF05', 'PF06', 'PF07', 'PF08', 'PF09', 'PF10', 'PF11', 'PF12']);

// Safety questions verification
assert.equal(config.safety_questions.length, 4, 'Must have exactly 4 safety questions');
assert.deepEqual(config.safety_questions.map(sf => sf.id), ['PFSF01', 'PFSF02', 'PFSF03', 'PFSF04']);
config.safety_questions.forEach(sf => {
  assert.equal(sf.answers.length, 2);
  assert.equal(sf.answers[0].value, 'yes');
  assert.deepEqual(sf.answers[0].triggers, ['PIEDS_SAFETY_MESSAGE']);
  assert.equal(sf.answers[1].value, 'no');
  assert.deepEqual(sf.answers[1].triggers, []);
});

// Dimensions verification
assert.equal(config.dimensions.length, 6, 'Must have exactly 6 dimensions');
const expectedDimIds = [
  'douleur-inconfort-pieds',
  'marche-station-debout',
  'stabilite-appuis-ressentis',
  'chaussage-pressions',
  'retentissement-fonctionnel',
  'recuperation-confort-global'
];
assert.deepEqual(config.dimensions.map(d => d.id), expectedDimIds);
config.dimensions.forEach(dim => {
  assert.equal(dim.calculation_mode, 'average');
  assert.equal(dim.weakest_eligible, true);
});

// Result levels verification
assert.equal(config.result_levels.length, 3, 'Must have exactly 3 result levels');
assert.deepEqual(
  config.result_levels.map(l => ({ code: l.code, min: l.min, max: l.max })),
  [
    { code: 'CONFORT_FAVORABLE', min: 12, max: 24 },
    { code: 'CONFORT_A_AMELIORER', min: 25, max: 32 },
    { code: 'INCONFORT_IMPORTANT', min: 33, max: 60 }
  ]
);

// Weakest dimensions config
assert.equal(config.weakest_dimensions.count, 2);
assert.equal(config.weakest_dimensions.tie_break, 'configuration_order');

// ----------------------------------------------------
// 3. Scoring Engine Boundaries Tests
// ----------------------------------------------------
// Min score (all 1s) -> 12/60 -> CONFORT_FAVORABLE
const answers_min = {
  PF01: '1', PF02: '1', PF03: '1', PF04: '1',
  PF05: '1', PF06: '1', PF07: '1', PF08: '1',
  PF09: '1', PF10: '1', PF11: '1', PF12: '1',
  PFSF01: 'no', PFSF02: 'no', PFSF03: 'no', PFSF04: 'no'
};
const res_12 = engine.score(config, answers_min);
assert.equal(res_12.final_score, 12);
assert.equal(res_12.calculated_category, 'CONFORT_FAVORABLE');
assert.equal(res_12.displayed_category, 'CONFORT_FAVORABLE');

// Max score (all 5s) -> 60/60 -> INCONFORT_IMPORTANT
const answers_max = {
  PF01: '5', PF02: '5', PF03: '5', PF04: '5',
  PF05: '5', PF06: '5', PF07: '5', PF08: '5',
  PF09: '5', PF10: '5', PF11: '5', PF12: '5',
  PFSF01: 'no', PFSF02: 'no', PFSF03: 'no', PFSF04: 'no'
};
const res_60 = engine.score(config, answers_max);
assert.equal(res_60.final_score, 60);
assert.equal(res_60.calculated_category, 'INCONFORT_IMPORTANT');
assert.equal(res_60.displayed_category, 'INCONFORT_IMPORTANT');

// Boundary 24 -> CONFORT_FAVORABLE
const answers_24 = {
  PF01: '2', PF02: '2', PF03: '2', PF04: '2',
  PF05: '2', PF06: '2', PF07: '2', PF08: '2',
  PF09: '2', PF10: '2', PF11: '2', PF12: '2',
  PFSF01: 'no', PFSF02: 'no', PFSF03: 'no', PFSF04: 'no'
};
const res_24 = engine.score(config, answers_24);
assert.equal(res_24.final_score, 24);
assert.equal(res_24.calculated_category, 'CONFORT_FAVORABLE');
assert.equal(res_24.displayed_category, 'CONFORT_FAVORABLE');

// Boundary 25 -> CONFORT_A_AMELIORER
const answers_25 = { ...answers_24, PF12: '3' };
const res_25 = engine.score(config, answers_25);
assert.equal(res_25.final_score, 25);
assert.equal(res_25.calculated_category, 'CONFORT_A_AMELIORER');
assert.equal(res_25.displayed_category, 'CONFORT_A_AMELIORER');

// Boundary 32 -> CONFORT_A_AMELIORER
const answers_32 = {
  PF01: '3', PF02: '3', PF03: '3', PF04: '3',
  PF05: '3', PF06: '3', PF07: '3', PF08: '3',
  PF09: '2', PF10: '2', PF11: '2', PF12: '2',
  PFSF01: 'no', PFSF02: 'no', PFSF03: 'no', PFSF04: 'no'
};
const res_32 = engine.score(config, answers_32);
assert.equal(res_32.final_score, 32);
assert.equal(res_32.calculated_category, 'CONFORT_A_AMELIORER');
assert.equal(res_32.displayed_category, 'CONFORT_A_AMELIORER');

// Boundary 33 -> INCONFORT_IMPORTANT
const answers_33 = { ...answers_32, PF09: '3' };
const res_33 = engine.score(config, answers_33);
assert.equal(res_33.final_score, 33);
assert.equal(res_33.calculated_category, 'INCONFORT_IMPORTANT');
assert.equal(res_33.displayed_category, 'INCONFORT_IMPORTANT');

// ----------------------------------------------------
// 4. Guardrail Functional PF09 / PF10 Verification
// ----------------------------------------------------
// PF09 = 4, others = 1 -> Total = 15 -> CONFORT_FAVORABLE capped to CONFORT_A_AMELIORER
const answers_gr_pf09 = { ...answers_min, PF09: '4' };
const res_gr_pf09 = engine.score(config, answers_gr_pf09);
assert.equal(res_gr_pf09.final_score, 15);
assert.equal(res_gr_pf09.calculated_category, 'CONFORT_FAVORABLE');
assert.equal(res_gr_pf09.displayed_category, 'CONFORT_A_AMELIORER');
assert.deepEqual(res_gr_pf09.applied_classification_rules, ['GUARDRAIL_PF09_LIMITATION']);
assert.deepEqual(res_gr_pf09.classification_message_codes, ['PIEDS_GUARDRAIL_MESSAGE']);

// PF10 = 4, others = 1 -> Total = 15
const answers_gr_pf10 = { ...answers_min, PF10: '4' };
const res_gr_pf10 = engine.score(config, answers_gr_pf10);
assert.equal(res_gr_pf10.final_score, 15);
assert.equal(res_gr_pf10.calculated_category, 'CONFORT_FAVORABLE');
assert.equal(res_gr_pf10.displayed_category, 'CONFORT_A_AMELIORER');
assert.deepEqual(res_gr_pf10.applied_classification_rules, ['GUARDRAIL_PF10_ADAPTATION']);

// Both PF09 = 5, PF10 = 4 -> Total = 19
const answers_gr_both = { ...answers_min, PF09: '5', PF10: '4' };
const res_gr_both = engine.score(config, answers_gr_both);
assert.equal(res_gr_both.final_score, 19);
assert.equal(res_gr_both.calculated_category, 'CONFORT_FAVORABLE');
assert.equal(res_gr_both.displayed_category, 'CONFORT_A_AMELIORER');
assert.deepEqual(res_gr_both.applied_classification_rules, ['GUARDRAIL_PF09_LIMITATION', 'GUARDRAIL_PF10_ADAPTATION']);
assert.deepEqual(res_gr_both.classification_message_codes, ['PIEDS_GUARDRAIL_MESSAGE']);

// Red score remains red
const answers_gr_red = { ...answers_max, PF09: '4' };
const res_gr_red = engine.score(config, answers_gr_red);
assert.equal(res_gr_red.final_score, 59);
assert.equal(res_gr_red.calculated_category, 'INCONFORT_IMPORTANT');
assert.equal(res_gr_red.displayed_category, 'INCONFORT_IMPORTANT');

// ----------------------------------------------------
// 5. Safety Questions Verification
// ----------------------------------------------------
['PFSF01', 'PFSF02', 'PFSF03', 'PFSF04'].forEach(sfId => {
  const answers_sf = { ...answers_min, [sfId]: 'yes' };
  const res_sf = engine.score(config, answers_sf);
  assert.equal(res_sf.final_score, 12);
  assert.equal(res_sf.displayed_category, 'CONFORT_FAVORABLE');
  assert.deepEqual(res_sf.safety_flag_codes, ['PIEDS_SAFETY_MESSAGE']);
});

// ----------------------------------------------------
// 6. Weakest Dimensions Selection
// ----------------------------------------------------
const answers_weak = {
  ...answers_min,
  PF01: '3', PF02: '3', // D1: avg 3.0
  PF09: '5', PF10: '4'  // D5: avg 4.5
};
const res_weak = engine.score(config, answers_weak);
assert.deepEqual(res_weak.weakest_dimensions, ['retentissement-fonctionnel', 'douleur-inconfort-pieds']);

console.log('Questionnaire Pieds & Confort Postural JS Unit & Parity Tests: ALL PASSED.');
