const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const path = require("node:path");
const engine = require("../assets/js/questionnaire-engine.js");

// ----------------------------------------------------
// 1. Authoritative Canonical Configuration Loading
// ----------------------------------------------------
const phpConfigPath = path.resolve(__dirname, "..", "questionnaires", "bien-etre", "questionnaire.php");
const phpScript = "echo json_encode(require $argv[1]);";
const configJson = execFileSync("php", ["-r", phpScript, phpConfigPath], { encoding: "utf8" });
const config = JSON.parse(configJson);

// ----------------------------------------------------
// 2. Parity & Configuration Guard
// ----------------------------------------------------
assert.equal(config.schema_version, "2.0.0", "Schema version must be 2.0.0");
assert.equal(config.id, "bien-etre", "ID must be bien-etre");
assert.equal(config.version, "1.0.0", "Version must be 1.0.0");
assert.equal(config.status, "review", "Status must be review");
assert.equal(config.locale, "fr-FR", "Locale must be fr-FR");
assert.equal(config.scoring_direction, "lower_is_better", "Scoring direction must be lower_is_better");
assert.equal(config.score.target_min, 12, "Target min must be 12");
assert.equal(config.score.target_max, 60, "Target max must be 60");
assert.equal(config.score.normalize_when_unavailable, false, "Normalize must be false");
assert.equal(config.score.rounding, "half_up", "Rounding must be half_up");

// Question count verification
assert.equal(config.questions.length, 12, "Must have exactly 12 scored questions");
const questionIds = config.questions.map(q => q.id);
assert.deepEqual(questionIds, ["BE01", "BE02", "BE03", "BE04", "BE05", "BE06", "BE07", "BE08", "BE09", "BE10", "BE11", "BE12"]);

// Check all questions have points 1 to 5
config.questions.forEach(q => {
  assert.equal(q.answers.length, 5, `Question ${q.id} must have 5 answers`);
  assert.equal(q.answers[0].points, 1, `Question ${q.id} answer 1 must have 1 point`);
  assert.equal(q.answers[4].points, 5, `Question ${q.id} answer 5 must have 5 points`);
});

// Dimensions verification
assert.equal(config.dimensions.length, 6, "Must have exactly 6 dimensions");
const expectedDimIds = [
  "satisfaction-globale-quotidien",
  "equilibre-emotionnel",
  "engagement-interet-quotidien",
  "maitrise-capacite-faire-face",
  "sens-accomplissement-personnel",
  "connexion-sociale-ressentie"
];
assert.deepEqual(config.dimensions.map(d => d.id), expectedDimIds);

// All 6 dimensions must have calculation_mode average
config.dimensions.forEach(dim => {
  assert.equal(dim.question_ids.length, 2, `Dimension ${dim.id} must have 2 questions`);
  assert.equal(dim.calculation_mode, "average", `Dimension ${dim.id} must have calculation_mode average`);
});

// Result levels verification
assert.equal(config.result_levels.length, 3, "Must have exactly 3 result levels");
assert.deepEqual(
  config.result_levels.map(l => ({ code: l.code, min: l.min, max: l.max })),
  [
    { code: "BIEN_ETRE_FAVORABLE", min: 12, max: 24 },
    { code: "BIEN_ETRE_A_RENFORCER", min: 25, max: 32 },
    { code: "BIEN_ETRE_FRAGILISE", min: 33, max: 60 }
  ]
);

// Safety block must be completely empty
assert.equal(config.safety_questions.length, 0, "Must have NO safety questions");
assert.equal(Object.keys(config.safety_messages).length, 0, "Must have NO safety messages");

// Guardrail classification rules verification (all 6 dimensions with raw_score >= 8 / mean >= 4.00)
assert.equal(config.classification_rules.length, 6, "Must have 6 guardrail classification rules");
config.classification_rules.forEach(rule => {
  assert.equal(rule.type, "category_cap");
  assert.equal(rule.metric, "dimension_score");
  assert.equal(rule.operator, ">=");
  assert.equal(rule.value, 8);
  assert.equal(rule.max_category, "BIEN_ETRE_A_RENFORCER");
});

// ----------------------------------------------------
// 3. Scoring Engine Boundaries (12, 24, 25, 32, 33, 60)
// ----------------------------------------------------
// Score 12 Boundary: All min answers (1s)
const answers_12 = {};
for (let i = 1; i <= 12; i++) {
  const qId = "BE" + (i < 10 ? "0" + i : i);
  answers_12[qId] = "1";
}
const res_12 = engine.score(config, answers_12);
assert.equal(res_12.final_score, 12);
assert.equal(res_12.calculated_category, "BIEN_ETRE_FAVORABLE");
assert.equal(res_12.displayed_category, "BIEN_ETRE_FAVORABLE");
assert.equal(res_12.dimensions.find(d => d.id === "satisfaction-globale-quotidien").raw_score, 2);
assert.equal(res_12.safety_flag_codes.length, 0);

// Score 24 Boundary (all 2s)
const answers_24 = {};
for (let i = 1; i <= 12; i++) {
  const qId = "BE" + (i < 10 ? "0" + i : i);
  answers_24[qId] = "2";
}
const res_24 = engine.score(config, answers_24);
assert.equal(res_24.final_score, 24);
assert.equal(res_24.calculated_category, "BIEN_ETRE_FAVORABLE");
assert.equal(res_24.displayed_category, "BIEN_ETRE_FAVORABLE");

// Score 25 Boundary
const answers_25 = { ...answers_24, BE01: "3" };
const res_25 = engine.score(config, answers_25);
assert.equal(res_25.final_score, 25);
assert.equal(res_25.calculated_category, "BIEN_ETRE_A_RENFORCER");
assert.equal(res_25.displayed_category, "BIEN_ETRE_A_RENFORCER");

// Score 32 Boundary (all dimensions <= 6/10)
const answers_32 = {
  BE01: "3", BE02: "3",
  BE03: "3", BE04: "3",
  BE05: "3", BE06: "3",
  BE07: "3", BE08: "3",
  BE09: "2", BE10: "2",
  BE11: "2", BE12: "2"
};
const res_32 = engine.score(config, answers_32);
assert.equal(res_32.final_score, 32);
assert.equal(res_32.calculated_category, "BIEN_ETRE_A_RENFORCER");
assert.equal(res_32.displayed_category, "BIEN_ETRE_A_RENFORCER");

// Score 33 Boundary
const answers_33 = { ...answers_32, BE09: "3" };
const res_33 = engine.score(config, answers_33);
assert.equal(res_33.final_score, 33);
assert.equal(res_33.calculated_category, "BIEN_ETRE_FRAGILISE");
assert.equal(res_33.displayed_category, "BIEN_ETRE_FRAGILISE");

// Score 60 Boundary: All max answers (5s)
const answers_60 = {};
for (let i = 1; i <= 12; i++) {
  const qId = "BE" + (i < 10 ? "0" + i : i);
  answers_60[qId] = "5";
}
const res_60 = engine.score(config, answers_60);
assert.equal(res_60.final_score, 60);
assert.equal(res_60.calculated_category, "BIEN_ETRE_FRAGILISE");
assert.equal(res_60.displayed_category, "BIEN_ETRE_FRAGILISE");
assert.equal(res_60.dimensions.find(d => d.id === "satisfaction-globale-quotidien").raw_score, 10);

// ----------------------------------------------------
// 4. Dimensional Guardrail Verification
// ----------------------------------------------------
// D1 >= 4.00 (raw_score 8) with green score (total 18) -> capped to orange
const res_gr_1 = engine.score(config, { ...answers_12, BE01: "4", BE02: "4" });
assert.equal(res_gr_1.final_score, 18);
assert.equal(res_gr_1.calculated_category, "BIEN_ETRE_FAVORABLE");
assert.equal(res_gr_1.displayed_category, "BIEN_ETRE_A_RENFORCER");
assert.ok(res_gr_1.applied_classification_rules.includes("BE_GUARDRAIL_SATISFACTION"));
assert.equal(res_gr_1.weakest_dimensions[0], "satisfaction-globale-quotidien");

// D2 >= 4.00
const res_gr_2 = engine.score(config, { ...answers_12, BE03: "4", BE04: "4" });
assert.equal(res_gr_2.final_score, 18);
assert.equal(res_gr_2.calculated_category, "BIEN_ETRE_FAVORABLE");
assert.equal(res_gr_2.displayed_category, "BIEN_ETRE_A_RENFORCER");
assert.ok(res_gr_2.applied_classification_rules.includes("BE_GUARDRAIL_EMOTIONNEL"));
assert.equal(res_gr_2.weakest_dimensions[0], "equilibre-emotionnel");

// D3 >= 4.00
const res_gr_3 = engine.score(config, { ...answers_12, BE05: "4", BE06: "4" });
assert.equal(res_gr_3.final_score, 18);
assert.equal(res_gr_3.calculated_category, "BIEN_ETRE_FAVORABLE");
assert.equal(res_gr_3.displayed_category, "BIEN_ETRE_A_RENFORCER");
assert.ok(res_gr_3.applied_classification_rules.includes("BE_GUARDRAIL_ENGAGEMENT"));
assert.equal(res_gr_3.weakest_dimensions[0], "engagement-interet-quotidien");

// D4 >= 4.00
const res_gr_4 = engine.score(config, { ...answers_12, BE07: "4", BE08: "4" });
assert.equal(res_gr_4.final_score, 18);
assert.equal(res_gr_4.calculated_category, "BIEN_ETRE_FAVORABLE");
assert.equal(res_gr_4.displayed_category, "BIEN_ETRE_A_RENFORCER");
assert.ok(res_gr_4.applied_classification_rules.includes("BE_GUARDRAIL_MAITRISE"));
assert.equal(res_gr_4.weakest_dimensions[0], "maitrise-capacite-faire-face");

// D5 >= 4.00
const res_gr_5 = engine.score(config, { ...answers_12, BE09: "4", BE10: "4" });
assert.equal(res_gr_5.final_score, 18);
assert.equal(res_gr_5.calculated_category, "BIEN_ETRE_FAVORABLE");
assert.equal(res_gr_5.displayed_category, "BIEN_ETRE_A_RENFORCER");
assert.ok(res_gr_5.applied_classification_rules.includes("BE_GUARDRAIL_SENS"));
assert.equal(res_gr_5.weakest_dimensions[0], "sens-accomplissement-personnel");

// D6 >= 4.00
const res_gr_6 = engine.score(config, { ...answers_12, BE11: "4", BE12: "4" });
assert.equal(res_gr_6.final_score, 18);
assert.equal(res_gr_6.calculated_category, "BIEN_ETRE_FAVORABLE");
assert.equal(res_gr_6.displayed_category, "BIEN_ETRE_A_RENFORCER");
assert.ok(res_gr_6.applied_classification_rules.includes("BE_GUARDRAIL_CONNEXION"));
assert.equal(res_gr_6.weakest_dimensions[0], "connexion-sociale-ressentie");

// ----------------------------------------------------
// 5. Dimension Averages & Selection
// ----------------------------------------------------
const answers_dim = {
  ...answers_12,
  BE01: "3", BE02: "5", // D1 avg = 4.0
  BE03: "1", BE04: "2", // D2 avg = 1.5
  BE05: "2", BE06: "4", // D3 avg = 3.0
  BE07: "1", BE08: "1", // D4 avg = 1.0
  BE09: "5", BE10: "5", // D5 avg = 5.0
  BE11: "2", BE12: "2"  // D6 avg = 2.0
};
const res_dim = engine.score(config, answers_dim);
assert.equal(res_dim.final_score, 33);
assert.equal(res_dim.calculated_category, "BIEN_ETRE_FRAGILISE");
assert.deepEqual(res_dim.weakest_dimensions, ["sens-accomplissement-personnel", "satisfaction-globale-quotidien"]);

console.log("Questionnaire Bien-être JS Unit & Scoring Tests: ALL PASSED.");
