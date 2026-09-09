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
assert.equal(config.scoring_direction, 'higher_is_better', 'Scoring direction must be higher_is_better');
assert.equal(config.score.target_min, 0, 'Target min must be 0');
assert.equal(config.score.target_max, 48, 'Target max must be 48');
assert.equal(config.score.normalize_when_unavailable, false, 'Normalize must be false');
assert.equal(config.score.rounding, 'half_up', 'Rounding must be half_up');

// Question count & IDs verification
assert.equal(config.questions.length, 12, 'Must have exactly 12 scored questions');
const questionIds = config.questions.map(q => q.id);
assert.deepEqual(questionIds, ['NT01', 'NT02', 'NT03', 'NT04', 'NT05', 'NT06', 'NT07', 'NT08', 'NT09', 'NT10', 'NT11', 'NT12']);

// Non-linear NT02 (Fruits) points verification
const q2 = config.questions.find(q => q.id === 'NT02');
assert.equal(q2.answers[0].value, '0');
assert.equal(q2.answers[0].points, 0);
assert.equal(q2.answers[1].value, '1');
assert.equal(q2.answers[1].points, 1);
assert.equal(q2.answers[2].value, '2');
assert.equal(q2.answers[2].points, 2);
assert.equal(q2.answers[3].value, '3');
assert.equal(q2.answers[3].points, 4); // 2 fruits = 4 pts (max)
assert.equal(q2.answers[4].value, '4');
assert.equal(q2.answers[4].points, 3); // 3+ fruits = 3 pts (non-linear)

// Duplicate 4 pts on NT03 (Légumes secs)
const q3 = config.questions.find(q => q.id === 'NT03');
assert.equal(q3.answers[0].points, 0);
assert.equal(q3.answers[1].points, 1);
assert.equal(q3.answers[2].points, 2);
assert.equal(q3.answers[3].points, 4); // 2x/sem = 4 pts
assert.equal(q3.answers[4].points, 4); // 3x+/sem = 4 pts

// Duplicate 4 pts on NT06 (Poisson & alternatives)
const q6 = config.questions.find(q => q.id === 'NT06');
assert.equal(q6.answers[0].points, 0);
assert.equal(q6.answers[1].points, 1);
assert.equal(q6.answers[2].points, 2);
assert.equal(q6.answers[3].points, 4); // ~2x/sem = 4 pts
assert.equal(q6.answers[4].points, 4); // >2x/sem = 4 pts

// Reverse scoring on NT09 (Boissons sucrées)
const q9 = config.questions.find(q => q.id === 'NT09');
assert.equal(q9.answers[0].points, 0); // Plusieurs fois/j
assert.equal(q9.answers[1].points, 1); // 1x/j
assert.equal(q9.answers[2].points, 2); // 3-5x/sem
assert.equal(q9.answers[3].points, 3); // 1-2x/sem
assert.equal(q9.answers[4].points, 4); // Rarement ou jamais

// Reverse scoring on NT10 (Produits transformés)
const q10 = config.questions.find(q => q.id === 'NT10');
assert.equal(q10.answers[0].points, 0); // Plusieurs fois/j
assert.equal(q10.answers[1].points, 1); // Au moins 1x/j
assert.equal(q10.answers[2].points, 2); // 4-6x/sem
assert.equal(q10.answers[3].points, 3); // 2-3x/sem
assert.equal(q10.answers[4].points, 4); // Rarement

// Dimensions verification
assert.equal(config.dimensions.length, 6, 'Must have exactly 6 dimensions');
const expectedDimIds = [
  'fruits-legumes-diversite',
  'fibres-glucides-qualite',
  'proteines-variete',
  'matieres-grasses-qualite',
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
assert.equal(config.result_levels.length, 4, 'Must have exactly 4 result levels');
assert.deepEqual(
  config.result_levels.map(l => ({ code: l.code, min: l.min, max: l.max })),
  [
    { code: 'HABITUDES_A_AMELIORER', min: 0, max: 15 },
    { code: 'EQUILIBRE_A_RENFORCER', min: 16, max: 27 },
    { code: 'PROFIL_GLOBALEMENT_FAVORABLE', min: 28, max: 38 },
    { code: 'HABITUDES_TRES_FAVORABLES', min: 39, max: 48 }
  ]
);

// Safety questions verification
assert.equal(config.safety_questions.length, 3, 'Must have 3 safety questions');
assert.deepEqual(config.safety_questions.map(q => q.id), ['NTSF01', 'NTSF02', 'NTSF03']);
config.safety_questions.forEach(q => {
  const yesAnswer = q.answers.find(a => a.value === 'yes');
  assert.deepEqual(yesAnswer.triggers, ['NUTRITION_ATTENTION_MESSAGE']);
});

// Weakest dimensions config
assert.equal(config.weakest_dimensions.count, 2);
assert.equal(config.weakest_dimensions.tie_break, 'configuration_order');

// ----------------------------------------------------
// 3. Scoring Engine Boundaries & Direct/Reverse Logic
// ----------------------------------------------------
const baseSafety = { NTSF01: 'no', NTSF02: 'no', NTSF03: 'no' };

// Score 0 Boundary: All min answers
const answers_min = { ...baseSafety };
for (let i = 1; i <= 12; i++) {
  const qId = 'NT' + (i < 10 ? '0' + i : i);
  answers_min[qId] = '0';
}
const res_0 = engine.score(config, answers_min);
assert.equal(res_0.final_score, 0);
assert.equal(res_0.calculated_category, 'HABITUDES_A_AMELIORER');
assert.equal(res_0.displayed_category, 'HABITUDES_A_AMELIORER');

// Score 48 Boundary: All max answers
const answers_max = {
  ...baseSafety,
  NT01: '4', NT02: '3', NT03: '3', NT04: '4',
  NT05: '4', NT06: '3', NT07: '4', NT08: '4',
  NT09: '4', NT10: '4', NT11: '4', NT12: '4'
};
const res_48 = engine.score(config, answers_max);
assert.equal(res_48.final_score, 48);
assert.equal(res_48.calculated_category, 'HABITUDES_TRES_FAVORABLES');
assert.equal(res_48.displayed_category, 'HABITUDES_TRES_FAVORABLES');

// Score 48 Boundary with alternate duplicate max answers (NT03='4', NT06='4')
const answers_max_alt = {
  ...answers_max,
  NT03: '4',
  NT06: '4'
};
const res_48_alt = engine.score(config, answers_max_alt);
assert.equal(res_48_alt.final_score, 48);
assert.equal(res_48_alt.calculated_category, 'HABITUDES_TRES_FAVORABLES');

// Boundary 15 -> HABITUDES_A_AMELIORER
const answers_15 = {
  ...baseSafety,
  NT01: '2', NT02: '1', // D1: 2+1=3
  NT03: '1', NT04: '1', // D2: 1+1=2
  NT05: '2', NT06: '1', // D3: 2+1=3
  NT07: '1', NT08: '1', // D4: 1+1=2
  NT09: '2', NT10: '1', // D5: 2+1=3
  NT11: '1', NT12: '1'  // D6: 1+1=2 -> Total = 15
};
const res_15 = engine.score(config, answers_15);
assert.equal(res_15.final_score, 15);
assert.equal(res_15.calculated_category, 'HABITUDES_A_AMELIORER');

// Boundary 16 -> EQUILIBRE_A_RENFORCER
const answers_16 = { ...answers_15, NT12: '2' }; // +1 pt
const res_16 = engine.score(config, answers_16);
assert.equal(res_16.final_score, 16);
assert.equal(res_16.calculated_category, 'EQUILIBRE_A_RENFORCER');

// Boundary 27 -> EQUILIBRE_A_RENFORCER
const answers_27 = {
  ...baseSafety,
  NT01: '3', NT02: '2', // D1: 3+2=5
  NT03: '2', NT04: '2', // D2: 2+2=4
  NT05: '3', NT06: '2', // D3: 3+2=5
  NT07: '2', NT08: '2', // D4: 2+2=4
  NT09: '3', NT10: '2', // D5: 3+2=5
  NT11: '2', NT12: '2'  // D6: 2+2=4 -> Total = 27
};
const res_27 = engine.score(config, answers_27);
assert.equal(res_27.final_score, 27);
assert.equal(res_27.calculated_category, 'EQUILIBRE_A_RENFORCER');

// Boundary 28 -> PROFIL_GLOBALEMENT_FAVORABLE
const answers_28 = { ...answers_27, NT04: '3' }; // +1 pt
const res_28 = engine.score(config, answers_28);
assert.equal(res_28.final_score, 28);
assert.equal(res_28.calculated_category, 'PROFIL_GLOBALEMENT_FAVORABLE');

// Boundary 38 -> PROFIL_GLOBALEMENT_FAVORABLE
const answers_38 = {
  ...baseSafety,
  NT01: '4', NT02: '4', // D1: 4+3=7 (NT02 '4' is 3pts)
  NT03: '3', NT04: '3', // D2: 4+3=7 (NT03 '3' is 4pts)
  NT05: '3', NT06: '3', // D3: 3+4=7 (NT06 '3' is 4pts)
  NT07: '3', NT08: '3', // D4: 3+3=6
  NT09: '4', NT10: '2', // D5: 4+2=6
  NT11: '3', NT12: '2'  // D6: 3+2=5 -> Total = 38
};
const res_38 = engine.score(config, answers_38);
assert.equal(res_38.final_score, 38);
assert.equal(res_38.calculated_category, 'PROFIL_GLOBALEMENT_FAVORABLE');

// Boundary 39 -> HABITUDES_TRES_FAVORABLES
const answers_39 = { ...answers_38, NT12: '3' }; // +1 pt
const res_39 = engine.score(config, answers_39);
assert.equal(res_39.final_score, 39);
assert.equal(res_39.calculated_category, 'HABITUDES_TRES_FAVORABLES');

// ----------------------------------------------------
// 4. Weakest Dimensions & Deterministic Ties
// ----------------------------------------------------
// In res_15: D2 (25%), D4 (25%), D6 (25%) are tied for lowest.
// Configuration order picks D2 and D4.
assert.deepEqual(res_15.weakest_dimensions, ['fibres-glucides-qualite', 'matieres-grasses-qualite']);

// ----------------------------------------------------
// 5. Safety Questions Independence
// ----------------------------------------------------
const res_sf1 = engine.score(config, { ...answers_max, NTSF01: 'yes' });
assert.equal(res_sf1.final_score, 48);
assert.deepEqual(res_sf1.safety_flag_codes, ['NUTRITION_ATTENTION_MESSAGE']);

const res_sf2 = engine.score(config, { ...answers_max, NTSF02: 'yes' });
assert.equal(res_sf2.final_score, 48);
assert.deepEqual(res_sf2.safety_flag_codes, ['NUTRITION_ATTENTION_MESSAGE']);

const res_sf3 = engine.score(config, { ...answers_max, NTSF03: 'yes' });
assert.equal(res_sf3.final_score, 48);
assert.deepEqual(res_sf3.safety_flag_codes, ['NUTRITION_ATTENTION_MESSAGE']);

const res_sf_all = engine.score(config, { ...answers_max, NTSF01: 'yes', NTSF02: 'yes', NTSF03: 'yes' });
assert.equal(res_sf_all.final_score, 48);
assert.deepEqual(res_sf_all.safety_flag_codes, ['NUTRITION_ATTENTION_MESSAGE']);

console.log('Questionnaire Nutrition JS Unit & Parity Tests: ALL PASSED.');
