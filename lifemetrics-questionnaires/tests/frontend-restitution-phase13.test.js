const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { execFileSync } = require("node:child_process");

const cssPath = path.resolve(__dirname, "..", "assets", "css", "questionnaire.css");
const uiPath = path.resolve(__dirname, "..", "assets", "js", "questionnaire-ui.js");
const enginePath = path.resolve(__dirname, "..", "assets", "js", "questionnaire-engine.js");

const cssContent = fs.readFileSync(cssPath, "utf8");
const uiSource = fs.readFileSync(uiPath, "utf8");
const engineSource = fs.readFileSync(enginePath, "utf8");

const engineContext = {};
vm.runInNewContext(engineSource, engineContext);
const engine = engineContext.LifeMetricsQuestionnaireEngine;

function loadConfig(slug) {
  const phpPath = path.resolve(__dirname, "..", "questionnaires", slug, "questionnaire.php");
  const phpScript = "echo json_encode(require $argv[1]);";
  const json = execFileSync("php", ["-r", phpScript, phpPath], { encoding: "utf8" });
  return JSON.parse(json);
}

function createMockElement(tag, customProps = {}) {
  const el = {
    tag,
    className: "",
    hidden: customProps.hidden !== undefined ? customProps.hidden : false,
    classes: customProps.classes ? [...customProps.classes] : [],
    attributes: {},
    setAttribute: function(k, v) { this.attributes[k] = v; this[k] = v; },
    getAttribute: function(k) { return this.attributes[k] || this[k]; },
    appendChild: function(c) { this.children = this.children || []; this.children.push(c); },
    set innerHTML(v) { 
      this._innerHTML = v;
      this.children = [];
      if (typeof v === 'string' && v.includes('<svg')) {
        this.children.push(createMockElement('svg'));
      }
      if (typeof v === 'string' && v.includes('<span')) {
        const textMatch = v.match(/<span>(.*?)<\/span>/);
        const spanEl = createMockElement('span');
        spanEl.textContent = textMatch ? textMatch[1] : '';
        this.children.push(spanEl);
      }
    },
    get innerHTML() { return this._innerHTML || ""; },
    focus: function() {}, addEventListener: function() {},
    children: [],
    ...customProps
  };
  el.classList = {
    add: function(...cls) { 
      cls.forEach(c => { if (!el.classes.includes(c)) el.classes.push(c); });
    },
    remove: function(...cls) { 
      el.classes = el.classes.filter(c => !cls.includes(c)); 
    },
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
    '[data-lmq-role="badges"]': createMockElement("div"),
    '[data-lmq-role="start"]': createMockElement("button"),
    '[data-lmq-role="test-prefix"]': createMockElement("p"),
    '[data-lmq-role="test-question"]': createMockElement("h2"),
    '[data-lmq-role="answers"]': createMockElement("div"),
    '[data-lmq-role="progress-label"]': createMockElement("p"),
    '[data-lmq-role="progress-bar"]': createMockElement("div", { style: {} }),
    '[data-lmq-role="safety-badge"]': createMockElement("span", { hidden: true }),
    '[data-lmq-role="back"]': createMockElement("button"),
    ".card--result": createMockElement("div", { classes: ["card", "card--result"] }),
    ".result-score__value": createMockElement("span"),
    ".gauge-score__max": createMockElement("span"),
    '[data-lmq-role="result-badge"]': createMockElement("div"),
    '[data-lmq-role="interpretation-title"]': createMockElement("h3"),
    '[data-lmq-role="score-meta"]': createMockElement("p"),
    '[data-lmq-role="gauge-wrap"]': createMockElement("div"),
    '[data-lmq-role="gauge-fill"]': createMockElement("path"),
    '[data-lmq-role="gauge-needle"]': createMockElement("line"),
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

function runSimulatedTest(config, answerValues) {
  const mockRoot = createMockRoot("lmq-" + config.id, config);
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

  const startBtn = mockRoot.querySelector('[data-lmq-role="start"]');
  startBtn.onclick();

  for (let i = 0; i < config.questions.length; i++) {
    const qId = config.questions[i].id;
    const ansVal = answerValues[qId] || "1";
    const answersContainer = mockRoot.querySelector('[data-lmq-role="answers"]');
    const targetBtn = answersContainer.children.find(c => c.textContent.includes(ansVal) || c) || answersContainer.children[0];
    
    // find matching answer index
    const ansIndex = config.questions[i].answers.findIndex(a => a.value === ansVal);
    const clickIndex = ansIndex >= 0 ? ansIndex : 0;
    answersContainer.children[clickIndex].onclick();
  }

  return mockRoot;
}

// ----------------------------------------------------
// 1. CSS Verification Tests (No-underline, Typography, Colors)
// ----------------------------------------------------
assert.ok(cssContent.includes(".lmq-questionnaire .result-actions a.btn"), "CSS targets result action anchor buttons");
assert.ok(cssContent.includes("text-decoration: none !important;"), "CSS enforces text-decoration: none !important");
assert.ok(cssContent.includes(".lmq-questionnaire .test-question"), "CSS defines test-question typography");
assert.ok(cssContent.includes(".lmq-questionnaire .card--result .result-title"), "CSS defines distinctive result title hierarchy");
assert.ok(cssContent.includes(".result-badge--favorable") || cssContent.includes(".result-badge--rank-1"), "CSS includes green/favorable category styles");
assert.ok(cssContent.includes(".result-badge--intermediate") || cssContent.includes(".result-badge--rank-2"), "CSS includes orange/intermediate category styles");
assert.ok(cssContent.includes(".result-badge--unfavorable") || cssContent.includes(".result-badge--rank-3"), "CSS includes red/unfavorable category styles");
assert.ok(cssContent.includes(".result-title:focus") && cssContent.includes("outline: none;"), "CSS suppresses parasitic focus outline on result title");
assert.ok(cssContent.includes(".lmq-questionnaire *:focus") && cssContent.includes(".lmq-questionnaire *:focus:not(:focus-visible)"), "CSS defines global focus reset on mouse/programmatic focus");
assert.ok(cssContent.includes(".lmq-questionnaire [tabindex=\"-1\"]:focus"), "CSS suppresses focus outline on programmatic non-interactive targets");
assert.ok(cssContent.includes(".lmq-questionnaire .analysis-toggle:focus-visible") && cssContent.includes(".lmq-questionnaire button:focus-visible"), "CSS defines accessible focus-visible for analysis toggle and buttons");
assert.ok(cssContent.includes("outline: 2px solid var(--color-primary);") && cssContent.includes("outline-offset: 2px;"), "CSS applies 2px solid orange outline with 2px offset for keyboard accessibility");

// Also verify PSS-10 global focus strategy
const pss10CssPath = path.resolve(__dirname, "..", "questionnaires", "pss10", "assets", "css", "style.css");
const pss10CssContent = fs.readFileSync(pss10CssPath, "utf-8");
assert.ok(pss10CssContent.includes(".lmq-pss10 *:focus") && pss10CssContent.includes(".lmq-pss10 *:focus:not(:focus-visible)"), "PSS-10 CSS defines global focus reset on mouse/programmatic focus");
assert.ok(pss10CssContent.includes(".lmq-pss10 button:focus-visible") && pss10CssContent.includes("outline: 2px solid var(--color-primary);"), "PSS-10 CSS defines accessible focus-visible for keyboard navigation");

// ----------------------------------------------------
// 2. Mock DOM: Green Result (Rank 1)
// ----------------------------------------------------
const configBE = loadConfig("bien-etre");
const answersGreen = {};
for (let i = 1; i <= 12; i++) {
  answersGreen["BE" + (i < 10 ? "0" + i : i)] = "1";
}
const rootGreen = runSimulatedTest(configBE, answersGreen);
const badgeGreen = rootGreen.querySelector('[data-lmq-role="result-badge"]');
assert.ok(badgeGreen.className.includes("result-badge--rank-1"), "Green result has rank-1 badge");
assert.ok(badgeGreen.className.includes("result-badge--favorable"), "Green result has favorable semantic class");
const titleGreen = rootGreen.querySelector('[data-lmq-role="interpretation-title"]');
assert.ok(titleGreen.className.includes("interpretation-title--favorable"), "Green interpretation title is favorable");
assert.equal(titleGreen.hidden, true, "Category title is not repeated below the identical result badge");
assert.equal(rootGreen.querySelector('[data-lmq-role="dimensions"]').hidden, true, "Axes without validated user content stay hidden");
assert.equal(rootGreen.querySelector('[data-lmq-role="safety-badge"]').hidden, true, "Unvalidated safety badge stays hidden on ordinary questions");

const gaugeScores = [12, 14, 24, 25, 32, 33, 60];
const gaugeOffsets = gaugeScores.map(targetScore => {
  const answers = {};
  let remaining = targetScore - 12;
  for (let layer = 1; layer <= 4; layer++) {
    for (let i = 1; i <= 12; i++) {
      const id = "BE" + (i < 10 ? "0" + i : i);
      const current = Number(answers[id] || "1");
      if (remaining > 0) {
        answers[id] = String(current + 1);
        remaining--;
      } else if (!answers[id]) {
        answers[id] = "1";
      }
    }
  }
  const root = runSimulatedTest(configBE, answers);
  return Number(root.querySelector('[data-lmq-role="gauge-fill"]').getAttribute('stroke-dashoffset'));
});
const circumference = Math.PI * 80;
const expectedMinimumOffset = circumference * (1 - 0.08);
assert.ok(Math.abs(gaugeOffsets[0] - expectedMinimumOffset) < 0.001, "12/60 keeps an 8% visible gauge segment");
for (let i = 1; i < gaugeOffsets.length; i++) {
  assert.ok(gaugeOffsets[i] < gaugeOffsets[i - 1], `${gaugeScores[i]}/60 advances the gauge beyond ${gaugeScores[i - 1]}/60`);
}
assert.equal(gaugeOffsets.at(-1), 0, "60/60 fills the complete semicircle");

// ----------------------------------------------------
// 3. Mock DOM: Orange Result (Rank 2)
// ----------------------------------------------------
const answersOrange = {};
for (let i = 1; i <= 12; i++) {
  answersOrange["BE" + (i < 10 ? "0" + i : i)] = i <= 6 ? "3" : "2"; // 6*3 + 6*2 = 18 + 12 = 30 (range 25-32)
}
const rootOrange = runSimulatedTest(configBE, answersOrange);
const badgeOrange = rootOrange.querySelector('[data-lmq-role="result-badge"]');
assert.ok(badgeOrange.className.includes("result-badge--rank-2"), "Orange result has rank-2 badge");
assert.ok(badgeOrange.className.includes("result-badge--intermediate"), "Orange result has intermediate semantic class");
const titleOrange = rootOrange.querySelector('[data-lmq-role="interpretation-title"]');
assert.ok(titleOrange.className.includes("interpretation-title--intermediate"), "Orange interpretation title is intermediate");

// ----------------------------------------------------
// 4. Mock DOM: Red Result (Rank 3)
// ----------------------------------------------------
const answersRed = {};
for (let i = 1; i <= 12; i++) {
  answersRed["BE" + (i < 10 ? "0" + i : i)] = "5"; // score 60
}
const rootRed = runSimulatedTest(configBE, answersRed);
const badgeRed = rootRed.querySelector('[data-lmq-role="result-badge"]');
assert.ok(badgeRed.className.includes("result-badge--rank-3"), "Red result has rank-3 badge");
assert.ok(badgeRed.className.includes("result-badge--unfavorable"), "Red result has unfavorable semantic class");
const titleRed = rootRed.querySelector('[data-lmq-role="interpretation-title"]');
assert.ok(titleRed.className.includes("interpretation-title--unfavorable"), "Red interpretation title is unfavorable");

// ----------------------------------------------------
// 4b. Zero-based ranks still resolve from category severity
// ----------------------------------------------------
const configPss = loadConfig("pss10");
const answersPssHigh = {};
for (let i = 1; i <= 10; i++) answersPssHigh["Q" + i] = "3";
const rootPssHigh = runSimulatedTest(configPss, answersPssHigh);
const badgePssHigh = rootPssHigh.querySelector('[data-lmq-role="result-badge"]');
assert.ok(badgePssHigh.className.includes("result-badge--unfavorable"), "PSS-10 high result is visually unfavorable despite rank 2");
const pssLinks = rootPssHigh.querySelector('[data-lmq-role="ctas"]').children.filter(c => c.tag === "a");
assert.equal(pssLinks.length, 2, "PSS-10 common preview renders both primary CTAs");
assert.equal(pssLinks[0].href, "https://lifemetrics.fr/formulaire-bilan/");
assert.equal(pssLinks[1].textContent, "Découvrir les autres questionnaires");

// ----------------------------------------------------
// 5. Mock DOM: Guardrail Transition (Calculated Green -> Displayed Orange)
// ----------------------------------------------------
// D1 at 4+4=8 (mean 4.00), others at 1 (total = 8 + 10 = 18 <= 24 calculated green, but guardrail triggers displayed orange)
const answersGuardrail = { ...answersGreen, BE01: "4", BE02: "4" };
const rootGuardrail = runSimulatedTest(configBE, answersGuardrail);
const badgeGuardrail = rootGuardrail.querySelector('[data-lmq-role="result-badge"]');
assert.ok(badgeGuardrail.className.includes("result-badge--rank-2"), "Guardrail-capped displayed category gets rank-2 (orange)");
assert.ok(badgeGuardrail.className.includes("result-badge--intermediate"), "Guardrail-capped displayed category gets intermediate semantic class");
const titleGuardrail = rootGuardrail.querySelector('[data-lmq-role="interpretation-title"]');
assert.ok(titleGuardrail.className.includes("interpretation-title--intermediate"), "Guardrail-capped interpretation title gets intermediate class");
const guardrailGauge = rootGuardrail.querySelector('[data-lmq-role="gauge-fill"]');
assert.ok(guardrailGauge.classes.includes("gauge-fill--intermediate"), "Guardrail gauge uses displayed intermediate category");
assert.ok(guardrailGauge.classes.includes("gauge-fill--guardrail"), "Guardrail gauge keeps a distinct displayed-category treatment");
assert.ok(Number(guardrailGauge.getAttribute('stroke-dashoffset')) < expectedMinimumOffset, "Guardrail gauge keeps the raw score position above the minimum segment");

// ----------------------------------------------------
// 6. Badges & CTA verification
// ----------------------------------------------------
const badgesContainer = rootGreen.querySelector('[data-lmq-role="badges"]');
assert.ok(badgesContainer.children[0].children.filter(c => c.className === 'badge-item').length === 3, "3 badges with SVG icons rendered");
const durationItem = badgesContainer.children[0].children.filter(c => c.className === 'badge-item')[2];
assert.equal(durationItem.children.at(-1).textContent, "2–3 minutes", "Configured duration uses an en dash without an approximate prefix");

const configAP = loadConfig("activite-physique");
const answersAP = Object.fromEntries(configAP.questions.map(q => [q.id, q.answers[0].value]));
const rootAP = runSimulatedTest(configAP, answersAP);
const durationAP = rootAP.querySelector('[data-lmq-role="badges"]').children[0].children.filter(c => c.className === 'badge-item')[2];
assert.equal(durationAP.children.at(-1).textContent, "2–3 minutes", "The visual duration removes Environ while preserving configuration content");

const ctasContainer = rootGreen.querySelector('[data-lmq-role="ctas"]');
const links = ctasContainer.children.filter(c => c.tag === "a");
assert.equal(links.length, 2, "Exactly 2 main CTAs rendered on result page");
assert.equal(links[0].textContent, "Je veux faire un bilan");
assert.equal(links[0].href, "https://lifemetrics.fr/formulaire-bilan/");
assert.equal(links[1].textContent, "Découvrir les autres questionnaires");
assert.equal(links[1].href, "/tests-sante/");

console.log("Phase 13 Frontend Restitution & Visual Regression Tests: ALL PASSED.");
