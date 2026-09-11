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
// 6. Point 1 — Axes d'amélioration pour une catégorie verte (Cas A, Cas B, Cas C)
// ----------------------------------------------------
// CAS A — Vert réellement favorable : final_score 12-24, toutes dimensions < 2.50
const res_cas_a_12 = engine.score(config, answers_12); // score 12, all dim_mean = 1.00 < 2.50
assert.equal(res_cas_a_12.calculated_category, "BIEN_ETRE_FAVORABLE", "Cas A (12): calculated is BIEN_ETRE_FAVORABLE");
assert.equal(res_cas_a_12.displayed_category, "BIEN_ETRE_FAVORABLE", "Cas A (12): displayed is BIEN_ETRE_FAVORABLE");
const cas_a_eligible_axes_12 = res_cas_a_12.dimensions.filter(d => (d.raw_score / 2) >= 2.50);
assert.equal(cas_a_eligible_axes_12.length, 0, "Cas A (12): exactly 0 axes eligible (all dim_mean < 2.50)");

const res_cas_a_24 = engine.score(config, answers_24); // score 24, all dim_mean = 2.00 < 2.50
assert.equal(res_cas_a_24.calculated_category, "BIEN_ETRE_FAVORABLE", "Cas A (24): calculated is BIEN_ETRE_FAVORABLE");
assert.equal(res_cas_a_24.displayed_category, "BIEN_ETRE_FAVORABLE", "Cas A (24): displayed is BIEN_ETRE_FAVORABLE");
const cas_a_eligible_axes_24 = res_cas_a_24.dimensions.filter(d => (d.raw_score / 2) >= 2.50);
assert.equal(cas_a_eligible_axes_24.length, 0, "Cas A (24): exactly 0 axes eligible (all dim_mean < 2.50)");

// CAS B — Vert avec faiblesse modérée : final_score 12-24, au moins une dimension avec 2.50 <= mean < 4.00, les autres < 2.50
// Satisfaction = 3 + 3 = 6 (mean 3.00), others = 1 + 1 = 2 (mean 1.00). Total = 6 + 10 = 16
const answers_cas_b = { ...answers_12, BE01: "3", BE02: "3" };
const res_cas_b = engine.score(config, answers_cas_b);
assert.equal(res_cas_b.final_score, 16, "Cas B: final_score is 16");
assert.equal(res_cas_b.calculated_category, "BIEN_ETRE_FAVORABLE", "Cas B: calculated is BIEN_ETRE_FAVORABLE");
assert.equal(res_cas_b.displayed_category, "BIEN_ETRE_FAVORABLE", "Cas B: displayed is BIEN_ETRE_FAVORABLE (no guardrail)");
assert.equal(res_cas_b.applied_classification_rules.length, 0, "Cas B: no guardrail classification rules triggered");
const cas_b_eligible_axes = res_cas_b.dimensions.filter(d => (d.raw_score / 2) >= 2.50);
assert.equal(cas_b_eligible_axes.length, 1, "Cas B: exactly 1 axis eligible with mean >= 2.50");
assert.equal(cas_b_eligible_axes[0].id, "satisfaction-globale-quotidien", "Cas B: eligible axis is satisfaction");
const cas_b_non_eligible = res_cas_b.dimensions.filter(d => (d.raw_score / 2) < 2.50);
assert.equal(cas_b_non_eligible.length, 5, "Cas B: 5 dimensions with mean < 2.50 not selected as weaknesses");

// CAS C — Vert avec garde-fou : dimension_mean >= 4.00 avec score global vert (18)
// Satisfaction = 4 + 4 = 8 (mean 4.00), others = 1 + 1 = 2 (mean 1.00). Total = 8 + 10 = 18 <= 24
const answers_cas_c = { ...answers_12, BE01: "4", BE02: "4" };
const res_cas_c = engine.score(config, answers_cas_c);
assert.equal(res_cas_c.final_score, 18, "Cas C: final_score is 18 (unchanged)");
assert.equal(res_cas_c.calculated_category, "BIEN_ETRE_FAVORABLE", "Cas C: calculated is BIEN_ETRE_FAVORABLE");
assert.equal(res_cas_c.displayed_category, "BIEN_ETRE_A_RENFORCER", "Cas C: displayed capped to BIEN_ETRE_A_RENFORCER (orange)");
assert.ok(res_cas_c.applied_classification_rules.includes("BE_GUARDRAIL_SATISFACTION"), "Cas C: BE_GUARDRAIL_SATISFACTION triggered");
assert.equal(res_cas_c.weakest_dimensions[0], "satisfaction-globale-quotidien", "Cas C: responsible dimension is in weakest_dimensions");

// ----------------------------------------------------
// 7. Point 2 — CTAs Verification & Frontend Rendering
// ----------------------------------------------------
assert.ok(Array.isArray(config.result_ctas), "result_ctas must be an array");
assert.equal(config.result_ctas.length, 2, "Must have exactly 2 result CTAs");
assert.equal(config.result_ctas[0].label, "Je veux faire un bilan", "Primary CTA label is 'Je veux faire un bilan'");
assert.equal(config.result_ctas[0].url, "https://lifemetrics.fr/formulaire-bilan/", "Primary CTA URL is 'https://lifemetrics.fr/formulaire-bilan/'");
assert.equal(config.result_ctas[0].variant, "primary", "Primary CTA variant is primary");
assert.equal(config.result_ctas[0].enabled, true, "Primary CTA is enabled");
assert.equal(config.result_ctas[1].label, "Découvrir les autres questionnaires", "Secondary CTA label is 'Découvrir les autres questionnaires'");
assert.equal(config.result_ctas[1].url, "/tests-sante/", "Secondary CTA URL is '/tests-sante/'");
assert.equal(config.result_ctas[1].variant, "secondary", "Secondary CTA variant is secondary");
assert.equal(config.result_ctas[1].enabled, true, "Secondary CTA is enabled");

// Funnel metadata check
assert.equal(config.funnel.partner_cta_label, "Suivre l'évolution de mon bien-être", "Funnel partner_cta_label is descriptive metadata");

// Mock DOM rendering test with questionnaire-ui.js
const fs = require("node:fs");
const vm = require("node:vm");
const uiSource = fs.readFileSync(path.resolve(__dirname, "..", "assets", "js", "questionnaire-ui.js"), "utf8");

function createMockElement(tag, customProps = {}) {
  const el = {
    tag,
    className: "",
    hidden: customProps.hidden !== undefined ? customProps.hidden : false,
    classes: customProps.classes ? [...customProps.classes] : [],
    setAttribute: function(k, v) { this[k] = v; },
    getAttribute: function(k) { return this[k]; },
    appendChild: function(c) { this.children = this.children || []; this.children.push(c); },
    set innerHTML(v) { this.children = []; },
    focus: function() {}, addEventListener: function() {},
    children: [],
    ...customProps
  };
  el.classList = {
    add: function(cls) { if (!el.classes.includes(cls)) el.classes.push(cls); },
    remove: function(cls) { el.classes = el.classes.filter(c => c !== cls); },
    toggle: function(cls, force) {
      const has = this.contains(cls);
      const shouldAdd = force !== undefined ? force : !has;
      if (shouldAdd) this.add(cls); else this.remove(cls);
    },
    contains: function(c) { return el.classes && el.classes.includes(c); }
  };
  return el;
}

function createMockRoot(id, qConfig) {
  const elements = {
    "[data-lmq-config]": { textContent: JSON.stringify(qConfig) },
    "[data-lmq-submit-url]": null,
    '[data-lmq-section="intro"]': createMockElement("section", { getAttribute: () => "intro" }),
    '[data-lmq-section="test"]': createMockElement("section", { getAttribute: () => "test" }),
    '[data-lmq-section="result"]': createMockElement("section", { getAttribute: () => "result" }),
    '[data-lmq-role="intro-title"]': createMockElement("h1"),
    '[data-lmq-role="intro-text"]': createMockElement("div"),
    '[data-lmq-role="start"]': createMockElement("button"),
    '[data-lmq-role="test-question"]': createMockElement("h2"),
    '[data-lmq-role="answers"]': createMockElement("div"),
    '[data-lmq-role="progress-label"]': createMockElement("p"),
    '[data-lmq-role="progress-bar"]': createMockElement("div", { style: {} }),
    '[data-lmq-role="back"]': createMockElement("button"),
    ".result-score__value": createMockElement("span"),
    '[data-lmq-role="analysis-text"]': createMockElement("p"),
    '[data-lmq-role="safety-messages"]': createMockElement("div"),
    '[data-lmq-role="classification-messages"]': createMockElement("div"),
    '[data-lmq-role="dimensions"]': createMockElement("div"),
    '[data-lmq-role="save-alert"]': createMockElement("div"),
    '[data-lmq-role="ctas"]': createMockElement("div"),
    '[data-lmq-role="modal-overlay"]': createMockElement("div"),
    '[data-lmq-role="learn-more"]': createMockElement("a"),
    '[data-lmq-role="modal-close"]': createMockElement("button"),
    '[data-lmq-role="modal-title"]': createMockElement("h3"),
    '[data-lmq-role="modal-content"]': createMockElement("div"),
    '[data-lmq-role="retry"]': createMockElement("button")
  };
  return {
    id,
    _attributes: {},
    getAttribute: function(k) { return this._attributes[k]; },
    setAttribute: function(k, v) { this._attributes[k] = v; },
    classList: { add: () => {}, remove: () => {} },
    querySelector: function(sel) { return elements[sel] || null; },
    querySelectorAll: function(sel) {
      if (sel === "[data-lmq-section]") return [elements['[data-lmq-section="intro"]'], elements['[data-lmq-section="test"]'], elements['[data-lmq-section="result"]']];
      return [];
    },
    _elements: elements
  };
}

const mockRoot = createMockRoot("lmq-bien-etre", config);
const domContext = {
  document: {
    readyState: "complete",
    addEventListener: function() {},
    removeEventListener: function() {},
    querySelectorAll: function(sel) {
      if (sel === ".lmq-questionnaire-root") return [mockRoot];
      return [];
    },
    createElement: function(tag) { return createMockElement(tag); }
  },
  LifeMetricsQuestionnaireEngine: engine,
  window: {},
  console: console,
  setTimeout: function(cb) { cb(); return 1; },
  clearTimeout: function() {}
};
domContext.window = domContext;
vm.createContext(domContext);
vm.runInContext(uiSource, domContext);

// Simulate full answer sequence to reach result screen
const startBtn = mockRoot.querySelector('[data-lmq-role="start"]');
startBtn.onclick();

for (let i = 0; i < 12; i++) {
  const answersContainer = mockRoot.querySelector('[data-lmq-role="answers"]');
  assert.ok(answersContainer.children.length > 0, `Question ${i + 1} has answers`);
  const btn = answersContainer.children[0];
  assert.equal(btn.tag, "button", `Answer element is button`);
  btn.onclick();
}

// Result screen should now be rendered
const ctasContainer = mockRoot.querySelector('[data-lmq-role="ctas"]');
assert.ok(ctasContainer, "CTAs container exists");
const links = ctasContainer.children.filter(c => c.tag === "a");
assert.equal(links.length, 2, "Result screen renders exactly 2 main action links");
assert.equal(links[0].textContent, "Je veux faire un bilan");
assert.equal(links[0].href, "https://lifemetrics.fr/formulaire-bilan/");
assert.equal(links[1].textContent, "Découvrir les autres questionnaires");
assert.equal(links[1].href, "/tests-sante/");

// Confirm no 3rd link from funnel
const allLinkTexts = links.map(l => l.textContent);
assert.ok(!allLinkTexts.includes("Suivre l'évolution de mon bien-être"), "Funnel partner_cta_label is NOT rendered as a 3rd link");

console.log("Questionnaire Bien-être JS Unit & Scoring Tests: ALL PASSED.");


