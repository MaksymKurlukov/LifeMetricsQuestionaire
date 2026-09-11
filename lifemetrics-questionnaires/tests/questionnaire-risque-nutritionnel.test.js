const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const path = require("node:path");
const engine = require("../assets/js/questionnaire-engine.js");

// ----------------------------------------------------
// 1. Authoritative Canonical Configuration Loading
// ----------------------------------------------------
const phpConfigPath = path.resolve(__dirname, "..", "questionnaires", "risque-nutritionnel", "questionnaire.php");
const phpScript = "echo json_encode(require $argv[1]);";
const configJson = execFileSync("php", ["-r", phpScript, phpConfigPath], { encoding: "utf8" });
const config = JSON.parse(configJson);

// ----------------------------------------------------
// 2. Parity & Configuration Guard
// ----------------------------------------------------
assert.equal(config.schema_version, "2.0.0", "Schema version must be 2.0.0");
assert.equal(config.id, "risque-nutritionnel", "ID must be risque-nutritionnel");
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
assert.deepEqual(questionIds, ["RN01", "RN02", "RN03", "RN04", "RN05", "RN06", "RN07", "RN08", "RN09", "RN10", "RN11", "RN12"]);

// Check all questions have points 1 to 5
config.questions.forEach(q => {
  assert.equal(q.answers.length, 5, `Question ${q.id} must have 5 answers`);
  assert.equal(q.answers[0].points, 1, `Question ${q.id} answer 1 must have 1 point`);
  assert.equal(q.answers[4].points, 5, `Question ${q.id} answer 5 must have 5 points`);
});

// Dimensions verification
assert.equal(config.dimensions.length, 6, "Must have exactly 6 dimensions");
const expectedDimIds = [
  "appetit-satiete",
  "reduction-apports-alimentaires",
  "evolution-ponderale-involontaire",
  "difficultes-alimenter",
  "symptomes-limitant-alimentation",
  "acces-autonomie-continuite-repas"
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
    { code: "RISQUE_FAIBLE", min: 12, max: 24 },
    { code: "RISQUE_A_SURVEILLER", min: 25, max: 32 },
    { code: "RISQUE_IMPORTANT", min: 33, max: 60 }
  ]
);

// Safety questions verification
assert.equal(config.safety_questions.length, 4, "Must have 4 safety questions");
assert.deepEqual(config.safety_questions.map(q => q.id), ["RNSF01", "RNSF02", "RNSF03", "RNSF04"]);
config.safety_questions.forEach(q => {
  const yesAnswer = q.answers.find(a => a.value === "yes");
  assert.deepEqual(yesAnswer.triggers, ["RN_SAFETY_MESSAGE"]);
});

// Guardrail rules verification (RN03, RN04, RN05, RN08 >= 4)
assert.equal(config.classification_rules.length, 4, "Must have 4 guardrail classification rules");
assert.deepEqual(
  config.classification_rules.map(r => ({ q: r.question_id, op: r.operator, val: r.value, max: r.max_category })),
  [
    { q: "RN03", op: ">=", val: 4, max: "RISQUE_A_SURVEILLER" },
    { q: "RN04", op: ">=", val: 4, max: "RISQUE_A_SURVEILLER" },
    { q: "RN05", op: ">=", val: 4, max: "RISQUE_A_SURVEILLER" },
    { q: "RN08", op: ">=", val: 4, max: "RISQUE_A_SURVEILLER" }
  ]
);

// ----------------------------------------------------
// 3. Scoring Engine Boundaries (12, 24, 25, 32, 33, 60)
// ----------------------------------------------------
const baseSafety = { RNSF01: "no", RNSF02: "no", RNSF03: "no", RNSF04: "no" };

// Score 12 Boundary: All min answers (1s)
const answers_12 = { ...baseSafety };
for (let i = 1; i <= 12; i++) {
  const qId = "RN" + (i < 10 ? "0" + i : i);
  answers_12[qId] = "1";
}
const res_12 = engine.score(config, answers_12);
assert.equal(res_12.final_score, 12);
assert.equal(res_12.calculated_category, "RISQUE_FAIBLE");
assert.equal(res_12.displayed_category, "RISQUE_FAIBLE");
assert.equal(res_12.dimensions.find(d => d.id === "appetit-satiete").raw_score, 2);

// Score 24 Boundary (all 2s)
const answers_24 = { ...baseSafety };
for (let i = 1; i <= 12; i++) {
  const qId = "RN" + (i < 10 ? "0" + i : i);
  answers_24[qId] = "2";
}
const res_24 = engine.score(config, answers_24);
assert.equal(res_24.final_score, 24);
assert.equal(res_24.calculated_category, "RISQUE_FAIBLE");
assert.equal(res_24.displayed_category, "RISQUE_FAIBLE");

// Score 25 Boundary
const answers_25 = { ...answers_24, RN01: "3" };
const res_25 = engine.score(config, answers_25);
assert.equal(res_25.final_score, 25);
assert.equal(res_25.calculated_category, "RISQUE_A_SURVEILLER");
assert.equal(res_25.displayed_category, "RISQUE_A_SURVEILLER");

// Score 32 Boundary (RN03,04,05,08 <= 3)
const answers_32 = {
  ...baseSafety,
  RN01: "3", RN02: "3",
  RN03: "3", RN04: "3",
  RN05: "3", RN06: "3",
  RN07: "3", RN08: "3",
  RN09: "2", RN10: "2",
  RN11: "2", RN12: "2"
};
const res_32 = engine.score(config, answers_32);
assert.equal(res_32.final_score, 32);
assert.equal(res_32.calculated_category, "RISQUE_A_SURVEILLER");
assert.equal(res_32.displayed_category, "RISQUE_A_SURVEILLER");

// Score 33 Boundary
const answers_33 = { ...answers_32, RN09: "3" };
const res_33 = engine.score(config, answers_33);
assert.equal(res_33.final_score, 33);
assert.equal(res_33.calculated_category, "RISQUE_IMPORTANT");
assert.equal(res_33.displayed_category, "RISQUE_IMPORTANT");

// Score 60 Boundary: All max answers (5s)
const answers_60 = { ...baseSafety };
for (let i = 1; i <= 12; i++) {
  const qId = "RN" + (i < 10 ? "0" + i : i);
  answers_60[qId] = "5";
}
const res_60 = engine.score(config, answers_60);
assert.equal(res_60.final_score, 60);
assert.equal(res_60.calculated_category, "RISQUE_IMPORTANT");
assert.equal(res_60.displayed_category, "RISQUE_IMPORTANT");
assert.equal(res_60.dimensions.find(d => d.id === "appetit-satiete").raw_score, 10);

// ----------------------------------------------------
// 4. Guardrail Verification (RN03, RN04, RN05, RN08 >= 4)
// ----------------------------------------------------
// RN03 = 4 with otherwise min answers -> score 15 (green) capped to orange (RISQUE_A_SURVEILLER)
const res_gr_3 = engine.score(config, { ...answers_12, RN03: "4" });
assert.equal(res_gr_3.final_score, 15, "Score is unchanged");
assert.equal(res_gr_3.calculated_category, "RISQUE_FAIBLE", "Calculated is green");
assert.equal(res_gr_3.displayed_category, "RISQUE_A_SURVEILLER", "Displayed is capped to orange");
assert.ok(res_gr_3.applied_classification_rules.includes("RN_GUARDRAIL_RN03"));

// RN04 = 4
const res_gr_4 = engine.score(config, { ...answers_12, RN04: "4" });
assert.equal(res_gr_4.final_score, 15);
assert.equal(res_gr_4.calculated_category, "RISQUE_FAIBLE");
assert.equal(res_gr_4.displayed_category, "RISQUE_A_SURVEILLER");
assert.ok(res_gr_4.applied_classification_rules.includes("RN_GUARDRAIL_RN04"));

// RN05 = 4
const res_gr_5 = engine.score(config, { ...answers_12, RN05: "4" });
assert.equal(res_gr_5.final_score, 15);
assert.equal(res_gr_5.calculated_category, "RISQUE_FAIBLE");
assert.equal(res_gr_5.displayed_category, "RISQUE_A_SURVEILLER");
assert.ok(res_gr_5.applied_classification_rules.includes("RN_GUARDRAIL_RN05"));

// RN08 = 4
const res_gr_8 = engine.score(config, { ...answers_12, RN08: "4" });
assert.equal(res_gr_8.final_score, 15);
assert.equal(res_gr_8.calculated_category, "RISQUE_FAIBLE");
assert.equal(res_gr_8.displayed_category, "RISQUE_A_SURVEILLER");
assert.ok(res_gr_8.applied_classification_rules.includes("RN_GUARDRAIL_RN08"));

// ----------------------------------------------------
// 5. Dimension Averages & Safety Separation
// ----------------------------------------------------
const answers_dim = {
  ...answers_12,
  RN01: "3", RN02: "5", // D1 avg = 4.0
  RN03: "1", RN04: "2", // D2 avg = 1.5
  RN05: "2", RN06: "4", // D3 avg = 3.0
  RN07: "1", RN08: "1", // D4 avg = 1.0
  RN09: "5", RN10: "5", // D5 avg = 5.0
  RN11: "2", RN12: "2"  // D6 avg = 2.0
};
const res_dim = engine.score(config, answers_dim);
assert.equal(res_dim.final_score, 33);
assert.equal(res_dim.calculated_category, "RISQUE_IMPORTANT");
assert.deepEqual(res_dim.weakest_dimensions, ["symptomes-limitant-alimentation", "appetit-satiete"]);

// Safety triggers independent of score
const res_sf = engine.score(config, {
  ...answers_12,
  RNSF01: "yes",
  RNSF04: "yes"
});
assert.equal(res_sf.final_score, 12, "Safety flags do not alter numeric score");
assert.equal(res_sf.calculated_category, "RISQUE_FAIBLE", "Safety flags do not alter category");
assert.deepEqual(res_sf.safety_flag_codes, ["RN_SAFETY_MESSAGE"]);

console.log("Questionnaire Risque nutritionnel JS Unit & Scoring Tests: ALL PASSED.");
