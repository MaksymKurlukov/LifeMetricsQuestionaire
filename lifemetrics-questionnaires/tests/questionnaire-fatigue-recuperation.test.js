const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const engine = require('../assets/js/questionnaire-engine.js');

// ----------------------------------------------------
// 1. Authoritative Canonical Configuration Loading
// ----------------------------------------------------
// Dynamically load the canonical questionnaire.php to ensure zero desynchronization risk
const phpConfigPath = path.resolve(__dirname, '..', 'questionnaires', 'fatigue-recuperation', 'questionnaire.php');
const phpScript = 'echo json_encode(require $argv[1]);';
const configJson = execFileSync('php', ['-r', phpScript, phpConfigPath], { encoding: 'utf8' });
const config = JSON.parse(configJson);

// ----------------------------------------------------
// 2. Parity & Configuration Guard
// ----------------------------------------------------
assert.equal(config.schema_version, '2.0.0', 'Schema version must be 2.0.0');
assert.equal(config.id, 'fatigue-recuperation', 'ID must be fatigue-recuperation');
assert.equal(config.version, '1.0.0', 'Version must be 1.0.0');
assert.equal(config.status, 'review', 'Status must be review');
assert.equal(config.locale, 'fr-FR', 'Locale must be fr-FR');
assert.equal(config.scoring_direction, 'lower_is_better', 'Scoring direction must be lower_is_better');
assert.equal(config.score.target_min, 12, 'Target min must be 12');
assert.equal(config.score.target_max, 60, 'Target max must be 60');
assert.equal(config.score.normalize_when_unavailable, false, 'Normalize must be false');
assert.equal(config.score.rounding, 'half_up', 'Rounding must be half_up');

// Question count verification
assert.equal(config.questions.length, 12, 'Must have exactly 12 scored questions');
const questionIds = config.questions.map(q => q.id);
assert.deepEqual(questionIds, ['FR01', 'FR02', 'FR03', 'FR04', 'FR05', 'FR06', 'FR07', 'FR08', 'FR09', 'FR10', 'FR11', 'FR12']);

// Check all questions have points 1 to 5
config.questions.forEach(q => {
  assert.equal(q.answers.length, 5, `Question ${q.id} must have 5 answers`);
  assert.equal(q.answers[0].points, 1, `Question ${q.id} answer 1 must have 1 point`);
  assert.equal(q.answers[4].points, 5, `Question ${q.id} answer 5 must have 5 points`);
});

// Dimensions verification
assert.equal(config.dimensions.length, 6, 'Must have exactly 6 dimensions');
const expectedDimIds = [
  'energie-recuperation-reveil',
  'energie-fonctionnement-journee',
  'retentissement-fatigue',
  'recuperation-apres-effort',
  'efficacite-repos',
  'stabilite-recuperation-globale'
];
assert.deepEqual(config.dimensions.map(d => d.id), expectedDimIds);

// All 6 dimensions must have calculation_mode average
config.dimensions.forEach(dim => {
  assert.equal(dim.question_ids.length, 2, `Dimension ${dim.id} must have 2 questions`);
  assert.equal(dim.calculation_mode, 'average', `Dimension ${dim.id} must have calculation_mode average`);
});

// Result levels verification
assert.equal(config.result_levels.length, 3, 'Must have exactly 3 result levels');
assert.deepEqual(
  config.result_levels.map(l => ({ code: l.code, min: l.min, max: l.max })),
  [
    { code: 'RECUPERATION_FAVORABLE', min: 12, max: 24 },
    { code: 'RECUPERATION_FRAGILE', min: 25, max: 32 },
    { code: 'FATIGUE_IMPORTANTE', min: 33, max: 60 }
  ]
);

// Safety questions verification
assert.equal(config.safety_questions.length, 3, 'Must have 3 safety questions');
assert.deepEqual(config.safety_questions.map(q => q.id), ['FRSF01', 'FRSF02', 'FRSF03']);
config.safety_questions.forEach(q => {
  const yesAnswer = q.answers.find(a => a.value === 'yes');
  assert.deepEqual(yesAnswer.triggers, ['FATIGUE_SAFETY_MESSAGE']);
});

// Weakest dimensions config
assert.equal(config.weakest_dimensions.count, 2);
assert.equal(config.weakest_dimensions.tie_break, 'configuration_order');

// ----------------------------------------------------
// 3. Scoring Engine Boundaries (12, 24, 25, 32, 33, 60)
// ----------------------------------------------------
const baseSafety = { FRSF01: 'no', FRSF02: 'no', FRSF03: 'no' };

// Score 12 Boundary: All min answers (1s)
const answers_12 = { ...baseSafety };
for (let i = 1; i <= 12; i++) {
  const qId = 'FR' + (i < 10 ? '0' + i : i);
  answers_12[qId] = '1';
}
const res_12 = engine.score(config, answers_12);
assert.equal(res_12.final_score, 12);
assert.equal(res_12.calculated_category, 'RECUPERATION_FAVORABLE');
assert.equal(res_12.displayed_category, 'RECUPERATION_FAVORABLE');
assert.equal(res_12.dimensions.find(d => d.id === 'energie-recuperation-reveil').raw_score, 2);

// Score 24 Boundary
const answers_24 = { ...answers_12 };
for (let i = 1; i <= 12; i++) {
  const qId = 'FR' + (i < 10 ? '0' + i : i);
  answers_24[qId] = '2';
}
const res_24 = engine.score(config, answers_24);
assert.equal(res_24.final_score, 24);
assert.equal(res_24.calculated_category, 'RECUPERATION_FAVORABLE');

// Score 25 Boundary
const answers_25 = { ...answers_24, FR12: '3' };
const res_25 = engine.score(config, answers_25);
assert.equal(res_25.final_score, 25);
assert.equal(res_25.calculated_category, 'RECUPERATION_FRAGILE');

// Score 32 Boundary
const answers_32 = {
  ...baseSafety,
  FR01: '3', FR02: '3', FR03: '3', FR04: '3',
  FR05: '3', FR06: '3', FR07: '3', FR08: '3',
  FR09: '2', FR10: '2', FR11: '2', FR12: '2'
};
const res_32 = engine.score(config, answers_32);
assert.equal(res_32.final_score, 32);
assert.equal(res_32.calculated_category, 'RECUPERATION_FRAGILE');

// Score 33 Boundary
const answers_33 = { ...answers_32, FR12: '3' };
const res_33 = engine.score(config, answers_33);
assert.equal(res_33.final_score, 33);
assert.equal(res_33.calculated_category, 'FATIGUE_IMPORTANTE');

// Score 60 Boundary: All max answers (5s)
const answers_60 = { ...baseSafety };
for (let i = 1; i <= 12; i++) {
  const qId = 'FR' + (i < 10 ? '0' + i : i);
  answers_60[qId] = '5';
}
const res_60 = engine.score(config, answers_60);
assert.equal(res_60.final_score, 60);
assert.equal(res_60.calculated_category, 'FATIGUE_IMPORTANTE');
assert.equal(res_60.displayed_category, 'FATIGUE_IMPORTANTE');
assert.equal(res_60.dimensions.find(d => d.id === 'energie-recuperation-reveil').raw_score, 10);

// ----------------------------------------------------
// 4. Dimension Averages & Safety Separation
// ----------------------------------------------------
const answers_dim = {
  ...answers_12,
  FR01: '3', FR02: '5', // D1 avg = 4.0
  FR03: '1', FR04: '2', // D2 avg = 1.5
  FR05: '2', FR06: '4', // D3 avg = 3.0
  FR07: '1', FR08: '1', // D4 avg = 1.0
  FR09: '5', FR10: '5', // D5 avg = 5.0
  FR11: '2', FR12: '2'  // D6 avg = 2.0
};
const res_dim = engine.score(config, answers_dim);
assert.equal(res_dim.final_score, 33);
assert.equal(res_dim.calculated_category, 'FATIGUE_IMPORTANTE');
assert.deepEqual(res_dim.weakest_dimensions, ['efficacite-repos', 'energie-recuperation-reveil']);

// Safety triggers independent of score
const res_sf = engine.score(config, {
  ...answers_12,
  FRSF01: 'yes',
  FRSF03: 'yes'
});
assert.equal(res_sf.final_score, 12, 'Safety flags do not alter numeric score');
assert.equal(res_sf.calculated_category, 'RECUPERATION_FAVORABLE', 'Safety flags do not alter category');
assert.deepEqual(res_sf.safety_flag_codes, ['FATIGUE_SAFETY_MESSAGE']);

console.log('Questionnaire Fatigue & Récupération JS Unit & Scoring Tests: ALL PASSED.');
