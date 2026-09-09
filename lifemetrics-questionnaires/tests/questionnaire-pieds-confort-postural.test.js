const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const engine = require('../assets/js/questionnaire-engine.js');

// ----------------------------------------------------
// 1. Authoritative Canonical Configuration Loading
// ----------------------------------------------------
// Dynamically load the canonical questionnaire.php to ensure zero desynchronization risk
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
assert.equal(config.scoring_direction, 'higher_is_better', 'Scoring direction must be higher_is_better');
assert.equal(config.score.target_min, 0, 'Target min must be 0');
assert.equal(config.score.target_max, 48, 'Target max must be 48');
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
  assert.equal(sf.answers[0].value, 'no');
  assert.deepEqual(sf.answers[0].triggers, []);
  assert.equal(sf.answers[1].value, 'yes');
  assert.deepEqual(sf.answers[1].triggers, ['PIEDS_ATTENTION_MESSAGE']);
});

// Dimensions verification
assert.equal(config.dimensions.length, 6, 'Must have exactly 6 dimensions');
const expectedDimIds = [
  'douleur-inconfort',
  'marche-station-debout',
  'stabilite-appuis',
  'chaussage-pressions',
  'retentissement-fonctionnel',
  'recuperation-confort-global'
];
assert.deepEqual(config.dimensions.map(d => d.id), expectedDimIds);

// Dimensions question mappings
assert.deepEqual(config.dimensions[0].question_ids, ['PF01', 'PF02']);
assert.deepEqual(config.dimensions[1].question_ids, ['PF03', 'PF04']);
assert.deepEqual(config.dimensions[2].question_ids, ['PF05', 'PF06']);
assert.deepEqual(config.dimensions[3].question_ids, ['PF07', 'PF08']);
assert.deepEqual(config.dimensions[4].question_ids, ['PF09', 'PF10']);
assert.deepEqual(config.dimensions[5].question_ids, ['PF11', 'PF12']);

// Result levels verification
assert.equal(config.result_levels.length, 4, 'Must have exactly 4 result levels');
assert.deepEqual(
  config.result_levels.map(l => ({ code: l.code, min: l.min, max: l.max })),
  [
    { code: 'INCONFORT_PODAL_IMPORTANT', min: 0, max: 15 },
    { code: 'CONFORT_PIEDS_A_AMELIORER', min: 16, max: 27 },
    { code: 'CONFORT_GLOBALEMENT_FAVORABLE', min: 28, max: 38 },
    { code: 'TRES_BON_CONFORT_PODAL', min: 39, max: 48 }
  ]
);

// Weakest dimensions config
assert.equal(config.weakest_dimensions.count, 2);
assert.equal(config.weakest_dimensions.tie_break, 'configuration_order');

// ----------------------------------------------------
// 3. Scoring Engine Boundaries Tests
// ----------------------------------------------------
// Score 0 Boundary: All min answers
const answers_min = {
  PF01: '0', PF02: '0', PF03: '0', PF04: '0',
  PF05: '0', PF06: '0', PF07: '0', PF08: '0',
  PF09: '0', PF10: '0', PF11: '0', PF12: '0',
  PFSF01: 'no', PFSF02: 'no', PFSF03: 'no', PFSF04: 'no'
};
const res_0 = engine.score(config, answers_min);
assert.equal(res_0.final_score, 0);
assert.equal(res_0.calculated_category, 'INCONFORT_PODAL_IMPORTANT');
assert.equal(res_0.displayed_category, 'INCONFORT_PODAL_IMPORTANT');

// Score 48 Boundary: All max answers
const answers_max = {
  PF01: '4', PF02: '4', PF03: '4', PF04: '4',
  PF05: '4', PF06: '4', PF07: '4', PF08: '4',
  PF09: '4', PF10: '4', PF11: '4', PF12: '4',
  PFSF01: 'no', PFSF02: 'no', PFSF03: 'no', PFSF04: 'no'
};
const res_48 = engine.score(config, answers_max);
assert.equal(res_48.final_score, 48);
assert.equal(res_48.calculated_category, 'TRES_BON_CONFORT_PODAL');
assert.equal(res_48.displayed_category, 'TRES_BON_CONFORT_PODAL');
assert.deepEqual(res_48.classification_message_codes, []);

// Boundary 15 -> INCONFORT_PODAL_IMPORTANT
const answers_15 = {
  PF01: '1', PF02: '1', // D1: 2/8
  PF03: '1', PF04: '1', // D2: 2/8
  PF05: '1', PF06: '1', // D3: 2/8
  PF07: '2', PF08: '1', // D4: 3/8
  PF09: '2', PF10: '1', // D5: 3/8
  PF11: '2', PF12: '1', // D6: 3/8 -> Total = 15
  PFSF01: 'no', PFSF02: 'no', PFSF03: 'no', PFSF04: 'no'
};
const res_15 = engine.score(config, answers_15);
assert.equal(res_15.final_score, 15);
assert.equal(res_15.calculated_category, 'INCONFORT_PODAL_IMPORTANT');

// Boundary 16 -> CONFORT_PIEDS_A_AMELIORER
const answers_16 = { ...answers_15, PF12: '2' }; // +1 pt -> 16
const res_16 = engine.score(config, answers_16);
assert.equal(res_16.final_score, 16);
assert.equal(res_16.calculated_category, 'CONFORT_PIEDS_A_AMELIORER');

// Boundary 27 -> CONFORT_PIEDS_A_AMELIORER
const answers_27 = {
  PF01: '2', PF02: '2', // D1: 4
  PF03: '2', PF04: '2', // D2: 4
  PF05: '2', PF06: '2', // D3: 4
  PF07: '3', PF08: '2', // D4: 5
  PF09: '3', PF10: '2', // D5: 5
  PF11: '3', PF12: '2', // D6: 5 -> Total = 27
  PFSF01: 'no', PFSF02: 'no', PFSF03: 'no', PFSF04: 'no'
};
const res_27 = engine.score(config, answers_27);
assert.equal(res_27.final_score, 27);
assert.equal(res_27.calculated_category, 'CONFORT_PIEDS_A_AMELIORER');

// Boundary 28 -> CONFORT_GLOBALEMENT_FAVORABLE
const answers_28 = { ...answers_27, PF08: '3' }; // +1 pt -> 28
const res_28 = engine.score(config, answers_28);
assert.equal(res_28.final_score, 28);
assert.equal(res_28.calculated_category, 'CONFORT_GLOBALEMENT_FAVORABLE');

// Boundary 38 -> CONFORT_GLOBALEMENT_FAVORABLE
const answers_38 = {
  PF01: '3', PF02: '3', // D1: 6
  PF03: '3', PF04: '3', // D2: 6
  PF05: '3', PF06: '3', // D3: 6
  PF07: '3', PF08: '3', // D4: 6
  PF09: '4', PF10: '3', // D5: 7
  PF11: '4', PF12: '3', // D6: 7 -> Total = 38
  PFSF01: 'no', PFSF02: 'no', PFSF03: 'no', PFSF04: 'no'
};
const res_38 = engine.score(config, answers_38);
assert.equal(res_38.final_score, 38);
assert.equal(res_38.calculated_category, 'CONFORT_GLOBALEMENT_FAVORABLE');

// Boundary 39 -> TRES_BON_CONFORT_PODAL
const answers_39 = { ...answers_38, PF08: '4' }; // +1 pt -> 39
const res_39 = engine.score(config, answers_39);
assert.equal(res_39.final_score, 39);
assert.equal(res_39.calculated_category, 'TRES_BON_CONFORT_PODAL');

// ----------------------------------------------------
// 4. Dimension Attention Rule
// ----------------------------------------------------
// D1 <= 2 triggers ATTENTION_DOULEUR_INCONFORT, but does NOT alter category
const answers_attention = {
  PF01: '1', PF02: '1', // D1: 2/8
  PF03: '4', PF04: '4',
  PF05: '4', PF06: '4',
  PF07: '4', PF08: '4',
  PF09: '4', PF10: '4',
  PF11: '4', PF12: '4',
  PFSF01: 'no', PFSF02: 'no', PFSF03: 'no', PFSF04: 'no'
};
const res_att = engine.score(config, answers_attention);
assert.equal(res_att.final_score, 42);
assert.equal(res_att.calculated_category, 'TRES_BON_CONFORT_PODAL');
assert.equal(res_att.displayed_category, 'TRES_BON_CONFORT_PODAL');
assert.ok(res_att.classification_message_codes.includes('ATTENTION_DOULEUR_INCONFORT'));

// ----------------------------------------------------
// 5. Safety Questions Block Independence
// ----------------------------------------------------
const answers_sf1 = { ...answers_max, PFSF01: 'yes' };
const res_sf1 = engine.score(config, answers_sf1);
assert.equal(res_sf1.final_score, 48);
assert.equal(res_sf1.displayed_category, 'TRES_BON_CONFORT_PODAL');
assert.deepEqual(res_sf1.safety_flag_codes, ['PIEDS_ATTENTION_MESSAGE']);

const answers_sf_all = {
  ...answers_max,
  PFSF01: 'yes', PFSF02: 'yes', PFSF03: 'yes', PFSF04: 'yes'
};
const res_sf_all = engine.score(config, answers_sf_all);
assert.deepEqual(res_sf_all.safety_flag_codes, ['PIEDS_ATTENTION_MESSAGE']);

// ----------------------------------------------------
// 6. Profile E & Guardrails Verification
// ----------------------------------------------------
const answers_profile_e = {
  PF01: '4', PF02: '4', // D1: 8/8
  PF03: '4', PF04: '4', // D2: 8/8
  PF05: '4', PF06: '4', // D3: 8/8
  PF07: '4', PF08: '4', // D4: 8/8
  PF09: '0', PF10: '0', // D5: 0/8
  PF11: '4', PF12: '4', // D6: 8/8
  PFSF01: 'no', PFSF02: 'no', PFSF03: 'no', PFSF04: 'no'
};
const res_profile_e = engine.score(config, answers_profile_e);
assert.equal(res_profile_e.final_score, 40);
assert.equal(res_profile_e.calculated_category, 'TRES_BON_CONFORT_PODAL');
assert.equal(res_profile_e.displayed_category, 'TRES_BON_CONFORT_PODAL');
assert.deepEqual(res_profile_e.applied_classification_rules, []);
assert.ok(res_profile_e.classification_message_codes.includes('ATTENTION_RETENTISSEMENT_FONCTIONNEL'));

// ----------------------------------------------------
// 7. Weakest Dimensions & Deterministic Ties
// ----------------------------------------------------
// In res_15: D1 (25%), D2 (25%), D3 (25%), D4 (37.5%), D5 (37.5%), D6 (37.5%)
// Tied lowest at 25% among D1, D2, D3.
// Configuration order picks D1 and D2.
assert.deepEqual(res_15.weakest_dimensions, ['douleur-inconfort', 'marche-station-debout']);

console.log('Questionnaire Pieds & Confort Postural JS Unit & Parity Tests: ALL PASSED.');
