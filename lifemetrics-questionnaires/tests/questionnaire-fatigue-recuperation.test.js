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
assert.equal(config.scoring_direction, 'higher_is_better', 'Scoring direction must be higher_is_better');
assert.equal(config.score.target_min, 0, 'Target min must be 0');
assert.equal(config.score.target_max, 48, 'Target max must be 48');
assert.equal(config.score.normalize_when_unavailable, false, 'Normalize must be false');
assert.equal(config.score.rounding, 'half_up', 'Rounding must be half_up');

// Question count & reverse scoring verification
assert.equal(config.questions.length, 12, 'Must have exactly 12 scored questions');
const questionIds = config.questions.map(q => q.id);
assert.deepEqual(questionIds, ['FR01', 'FR02', 'FR03', 'FR04', 'FR05', 'FR06', 'FR07', 'FR08', 'FR09', 'FR10', 'FR11', 'FR12']);

// Reverse scored questions verification (FR05, FR06, FR10)
const fr05 = config.questions.find(q => q.id === 'FR05');
assert.equal(fr05.answers[0].value, '0');
assert.equal(fr05.answers[0].points, 0); // Presque tous les jours = 0
assert.equal(fr05.answers[4].value, '4');
assert.equal(fr05.answers[4].points, 4); // Jamais ou presque jamais = 4

const fr06 = config.questions.find(q => q.id === 'FR06');
assert.equal(fr06.answers[0].points, 0); // Presque tous les jours = 0
assert.equal(fr06.answers[4].points, 4); // Jamais ou presque jamais = 4

const fr10 = config.questions.find(q => q.id === 'FR10');
assert.equal(fr10.answers[0].points, 0); // Presque tous les jours = 0
assert.equal(fr10.answers[4].points, 4); // Jamais ou presque jamais = 4

// Direct scored questions verification (e.g. FR01, FR02)
const fr01 = config.questions.find(q => q.id === 'FR01');
assert.equal(fr01.answers[0].points, 0); // Jamais ou presque jamais = 0
assert.equal(fr01.answers[4].points, 4); // Presque tous les jours = 4

// Dimensions verification
assert.equal(config.dimensions.length, 6, 'Must have exactly 6 dimensions');
const expectedDimIds = [
  'energie-recuperation-reveil',
  'energie-fonctionnement-journee',
  'retentissement-fatigue',
  'recuperation-effort',
  'efficacite-repos',
  'stabilite-recuperation-globale'
];
assert.deepEqual(config.dimensions.map(d => d.id), expectedDimIds);

// All 6 dimensions must have attention rule with metric=score, operator='<=', value=2
config.dimensions.forEach(dim => {
  assert.equal(dim.question_ids.length, 2, `Dimension ${dim.id} must have 2 questions`);
  assert.ok(dim.weakest_eligible, `Dimension ${dim.id} must be weakest eligible`);
  assert.ok(dim.attention, `Dimension ${dim.id} must have attention rule`);
  assert.equal(dim.attention.metric, 'score');
  assert.equal(dim.attention.operator, '<=');
  assert.equal(dim.attention.value, 2);
});

// Result levels verification
assert.equal(config.result_levels.length, 4, 'Must have exactly 4 result levels');
assert.deepEqual(
  config.result_levels.map(l => ({ code: l.code, min: l.min, max: l.max })),
  [
    { code: 'FATIGUE_IMPORTANTE_RECUPERATION_INSUFFISANTE', min: 0, max: 15 },
    { code: 'RECUPERATION_A_RENFORCER', min: 16, max: 27 },
    { code: 'RECUPERATION_GLOBALEMENT_FAVORABLE', min: 28, max: 38 },
    { code: 'TRES_BON_PROFIL_RECUPERATION', min: 39, max: 48 }
  ]
);

// Safety questions verification
assert.equal(config.safety_questions.length, 3, 'Must have 3 safety questions');
assert.deepEqual(config.safety_questions.map(q => q.id), ['FRSF01', 'FRSF02', 'FRSF03']);
config.safety_questions.forEach(q => {
  const yesAnswer = q.answers.find(a => a.value === 'yes');
  assert.deepEqual(yesAnswer.triggers, ['FATIGUE_ATTENTION_MESSAGE']);
});

// Weakest dimensions config
assert.equal(config.weakest_dimensions.count, 2);
assert.equal(config.weakest_dimensions.tie_break, 'configuration_order');

// ----------------------------------------------------
// 3. Scoring Engine Boundaries & Direct/Reverse Logic
// ----------------------------------------------------
const baseSafety = { FRSF01: 'no', FRSF02: 'no', FRSF03: 'no' };

// Score 0 Boundary: All min answers
const answers_min = { ...baseSafety };
for (let i = 1; i <= 12; i++) {
  const qId = 'FR' + (i < 10 ? '0' + i : i);
  answers_min[qId] = '0';
}
const res_0 = engine.score(config, answers_min);
assert.equal(res_0.final_score, 0);
assert.equal(res_0.calculated_category, 'FATIGUE_IMPORTANTE_RECUPERATION_INSUFFISANTE');
assert.equal(res_0.displayed_category, 'FATIGUE_IMPORTANTE_RECUPERATION_INSUFFISANTE');
assert.equal(res_0.dimensions.find(d => d.id === 'energie-recuperation-reveil').raw_score, 0);
assert.equal(res_0.classification_message_codes.length, 6, 'All 6 dimensions trigger attention at score 0');

// Score 48 Boundary: All max answers
const answers_max = { ...baseSafety };
for (let i = 1; i <= 12; i++) {
  const qId = 'FR' + (i < 10 ? '0' + i : i);
  answers_max[qId] = '4';
}
const res_48 = engine.score(config, answers_max);
assert.equal(res_48.final_score, 48);
assert.equal(res_48.calculated_category, 'TRES_BON_PROFIL_RECUPERATION');
assert.equal(res_48.displayed_category, 'TRES_BON_PROFIL_RECUPERATION');
assert.equal(res_48.dimensions.find(d => d.id === 'energie-recuperation-reveil').raw_score, 8);
assert.equal(res_48.classification_message_codes.length, 0, 'No attention messages at max score');
assert.equal(res_48.safety_flag_codes.length, 0);

// Boundary 15 -> FATIGUE_IMPORTANTE_RECUPERATION_INSUFFISANTE
const answers_15 = {
  ...baseSafety,
  FR01: '2', FR02: '1', // D1 = 3
  FR03: '2', FR04: '1', // D2 = 3
  FR05: '2', FR06: '1', // D3 = 3
  FR07: '2', FR08: '1', // D4 = 3
  FR09: '2', FR10: '1', // D5 = 3
  FR11: '0', FR12: '0'  // D6 = 0 -> Total = 15
};
const res_15 = engine.score(config, answers_15);
assert.equal(res_15.final_score, 15);
assert.equal(res_15.calculated_category, 'FATIGUE_IMPORTANTE_RECUPERATION_INSUFFISANTE');

// Boundary 16 -> RECUPERATION_A_RENFORCER
const answers_16 = { ...answers_15, FR11: '1' }; // Total = 16
const res_16 = engine.score(config, answers_16);
assert.equal(res_16.final_score, 16);
assert.equal(res_16.calculated_category, 'RECUPERATION_A_RENFORCER');

// Boundary 27 -> RECUPERATION_A_RENFORCER
const answers_27 = {
  ...baseSafety,
  FR01: '3', FR02: '2', // D1 = 5
  FR03: '3', FR04: '2', // D2 = 5
  FR05: '3', FR06: '2', // D3 = 5
  FR07: '3', FR08: '2', // D4 = 5
  FR09: '3', FR10: '2', // D5 = 5
  FR11: '1', FR12: '1'  // D6 = 2 -> Total = 27
};
const res_27 = engine.score(config, answers_27);
assert.equal(res_27.final_score, 27);
assert.equal(res_27.calculated_category, 'RECUPERATION_A_RENFORCER');

// Boundary 28 -> RECUPERATION_GLOBALEMENT_FAVORABLE
const answers_28 = { ...answers_27, FR12: '2' }; // Total = 28
const res_28 = engine.score(config, answers_28);
assert.equal(res_28.final_score, 28);
assert.equal(res_28.calculated_category, 'RECUPERATION_GLOBALEMENT_FAVORABLE');

// Boundary 38 -> RECUPERATION_GLOBALEMENT_FAVORABLE
const answers_38 = {
  ...baseSafety,
  FR01: '4', FR02: '3', // D1 = 7
  FR03: '4', FR04: '3', // D2 = 7
  FR05: '4', FR06: '3', // D3 = 7
  FR07: '4', FR08: '3', // D4 = 7
  FR09: '3', FR10: '3', // D5 = 6
  FR11: '2', FR12: '2'  // D6 = 4 -> Total = 38
};
const res_38 = engine.score(config, answers_38);
assert.equal(res_38.final_score, 38);
assert.equal(res_38.calculated_category, 'RECUPERATION_GLOBALEMENT_FAVORABLE');

// Boundary 39 -> TRES_BON_PROFIL_RECUPERATION
const answers_39 = { ...answers_38, FR09: '4' }; // Total = 39
const res_39 = engine.score(config, answers_39);
assert.equal(res_39.final_score, 39);
assert.equal(res_39.calculated_category, 'TRES_BON_PROFIL_RECUPERATION');

// ----------------------------------------------------
// 4. Dimension Attention & Safety Separation
// ----------------------------------------------------
// Dimension attention trigger: D1 <= 2/8 (e.g. score 2)
const res_att = engine.score(config, {
  ...answers_max,
  FR01: '1', FR02: '1' // D1 = 2
});
assert.equal(res_att.final_score, 42);
assert.equal(res_att.calculated_category, 'TRES_BON_PROFIL_RECUPERATION');
assert.ok(res_att.classification_message_codes.includes('ATTENTION_ENERGIE_REVEIL'));
assert.equal(res_att.safety_flag_codes.length, 0, 'Dimension attention does NOT trigger safety flag');

// Safety triggers independent of score
const res_sf = engine.score(config, {
  ...answers_max,
  FRSF01: 'yes',
  FRSF03: 'yes'
});
assert.equal(res_sf.final_score, 48, 'Safety flags do not alter numeric score');
assert.equal(res_sf.calculated_category, 'TRES_BON_PROFIL_RECUPERATION', 'Safety flags do not alter category');
assert.deepEqual(res_sf.safety_flag_codes, ['FATIGUE_ATTENTION_MESSAGE']);

// ----------------------------------------------------
// 5. Authoritative Synthetic Profiles from PDF (Section 14)
// ----------------------------------------------------
// Profile 1: Très fatigué, mais organise bien son repos (14/48 -> Fatigue importante / récupération insuffisante)
const profile_1 = {
  ...baseSafety,
  FR01: '0', FR02: '0', // D1 = 0
  FR03: '1', FR04: '1', // D2 = 2
  FR05: '1', FR06: '1', // D3 = 2
  FR07: '1', FR08: '1', // D4 = 2
  FR09: '4', FR10: '0', // D5 = 4
  FR11: '2', FR12: '2'  // D6 = 4 -> Total = 0+2+2+2+4+4 = 14
};
const res_p1 = engine.score(config, profile_1);
assert.equal(res_p1.final_score, 14);
assert.equal(res_p1.calculated_category, 'FATIGUE_IMPORTANTE_RECUPERATION_INSUFFISANTE');

// Profile 2: Énergie élevée, mauvaise récupération après effort (34/48 -> Récupération globalement favorable)
const profile_2 = {
  ...baseSafety,
  FR01: '4', FR02: '4', // D1 = 8
  FR03: '4', FR04: '4', // D2 = 8
  FR05: '4', FR06: '4', // D3 = 8
  FR07: '1', FR08: '1', // D4 = 2 (mauvaise récupération après effort)
  FR09: '2', FR10: '2', // D5 = 4
  FR11: '2', FR12: '2'  // D6 = 4 -> Total = 8+8+8+2+4+4 = 34
};
const res_p2 = engine.score(config, profile_2);
assert.equal(res_p2.final_score, 34);
assert.equal(res_p2.calculated_category, 'RECUPERATION_GLOBALEMENT_FAVORABLE');
assert.ok(res_p2.weakest_dimensions.includes('recuperation-effort'));
assert.ok(res_p2.classification_message_codes.includes('ATTENTION_RECUPERATION_EFFORT'));

// Profile 3: Bon profil global (45/48 -> Très bon profil de récupération)
const profile_3 = {
  ...baseSafety,
  FR01: '4', FR02: '4', // D1 = 8
  FR03: '4', FR04: '4', // D2 = 8
  FR05: '4', FR06: '4', // D3 = 8
  FR07: '3', FR08: '4', // D4 = 7
  FR09: '4', FR10: '4', // D5 = 8
  FR11: '3', FR12: '3'  // D6 = 6 -> Total = 45
};
const res_p3 = engine.score(config, profile_3);
assert.equal(res_p3.final_score, 45);
assert.equal(res_p3.calculated_category, 'TRES_BON_PROFIL_RECUPERATION');

// Profile 4: Fatigue modérée et irrégulière (24/48 -> Récupération à renforcer)
const profile_4 = {
  ...baseSafety,
  FR01: '2', FR02: '2', // D1 = 4
  FR03: '2', FR04: '2', // D2 = 4
  FR05: '2', FR06: '2', // D3 = 4
  FR07: '2', FR08: '2', // D4 = 4
  FR09: '2', FR10: '2', // D5 = 4
  FR11: '2', FR12: '2'  // D6 = 4 -> Total = 24
};
const res_p4 = engine.score(config, profile_4);
assert.equal(res_p4.final_score, 24);
assert.equal(res_p4.calculated_category, 'RECUPERATION_A_RENFORCER');

// Profile 5: Fatigue importante + repos inefficace (5/48 -> Fatigue importante / récupération insuffisante)
const profile_5 = {
  ...baseSafety,
  FR01: '0', FR02: '0', // D1 = 0
  FR03: '0', FR04: '1', // D2 = 1
  FR05: '0', FR06: '1', // D3 = 1
  FR07: '0', FR08: '1', // D4 = 1
  FR09: '0', FR10: '1', // D5 = 1
  FR11: '0', FR12: '1'  // D6 = 1 -> Total = 5
};
const res_p5 = engine.score(config, profile_5);
assert.equal(res_p5.final_score, 5);
assert.equal(res_p5.calculated_category, 'FATIGUE_IMPORTANTE_RECUPERATION_INSUFFISANTE');

// Profile 6: Haute énergie mais énergie instable (37/48 -> Récupération globalement favorable)
const profile_6 = {
  ...baseSafety,
  FR01: '4', FR02: '4', // D1 = 8
  FR03: '4', FR04: '4', // D2 = 8
  FR05: '4', FR06: '4', // D3 = 8
  FR07: '4', FR08: '3', // D4 = 7
  FR09: '2', FR10: '2', // D5 = 4
  FR11: '1', FR12: '1'  // D6 = 2 -> Total = 37
};
const res_p6 = engine.score(config, profile_6);
assert.equal(res_p6.final_score, 37);
assert.equal(res_p6.calculated_category, 'RECUPERATION_GLOBALEMENT_FAVORABLE');
assert.equal(res_p6.weakest_dimensions[0], 'stabilite-recuperation-globale');
assert.ok(res_p6.classification_message_codes.includes('ATTENTION_STABILITE_RECUPERATION'));

// Profile 7: Faible énergie au réveil, excellente journée ensuite (42/48 -> Très bon profil de récupération)
const profile_7 = {
  ...baseSafety,
  FR01: '1', FR02: '1', // D1 = 2
  FR03: '4', FR04: '4', // D2 = 8
  FR05: '4', FR06: '4', // D3 = 8
  FR07: '4', FR08: '4', // D4 = 8
  FR09: '4', FR10: '4', // D5 = 8
  FR11: '4', FR12: '4'  // D6 = 8 -> Total = 42
};
const res_p7 = engine.score(config, profile_7);
assert.equal(res_p7.final_score, 42);
assert.equal(res_p7.calculated_category, 'TRES_BON_PROFIL_RECUPERATION');
assert.equal(res_p7.weakest_dimensions[0], 'energie-recuperation-reveil');
assert.ok(res_p7.classification_message_codes.includes('ATTENTION_ENERGIE_REVEIL'));

console.log('Questionnaire Fatigue & Récupération JS Unit & Scoring Tests: ALL PASSED.');
