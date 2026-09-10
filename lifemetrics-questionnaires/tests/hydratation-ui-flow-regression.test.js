const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const uiPath = path.join(__dirname, '..', 'assets', 'js', 'questionnaire-ui.js');
const enginePath = path.join(__dirname, '..', 'assets', 'js', 'questionnaire-engine.js');

const uiSource = fs.readFileSync(uiPath, 'utf8');
const engineSource = fs.readFileSync(enginePath, 'utf8');

const globalObj = {};
vm.runInNewContext(engineSource, globalObj);
const engine = globalObj.LifeMetricsQuestionnaireEngine;

function createMockElement(tag, customProps = {}) {
  const el = {
    tag,
    className: '',
    hidden: customProps.hidden !== undefined ? customProps.hidden : false,
    classes: customProps.classes ? [...customProps.classes] : [],
    setAttribute: function(k, v) { this[k] = v; },
    getAttribute: function(k) { return this[k]; },
    appendChild: function(c) { this.children = this.children || []; this.children.push(c); },
    set innerHTML(v) { this.children = []; },
    focus: function() {},
    addEventListener: function() {},
    children: [],
    style: {},
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
    contains: function(c) { return el.classes.includes(c); }
  };
  return el;
}

function createDOMForQuestionnaire(config, submitUrl) {
  const introSection = createMockElement('section', {
    classes: ['section', 'section--active'],
    hidden: false,
    'data-lmq-section': 'intro',
    getAttribute: (attr) => attr === 'data-lmq-section' ? 'intro' : null
  });
  const testSection = createMockElement('section', {
    classes: ['section'],
    hidden: true,
    'data-lmq-section': 'test',
    getAttribute: (attr) => attr === 'data-lmq-section' ? 'test' : null
  });
  const resultSection = createMockElement('section', {
    classes: ['section'],
    hidden: true,
    'data-lmq-section': 'result',
    getAttribute: (attr) => attr === 'data-lmq-section' ? 'result' : null
  });

  const elements = {
    '[data-lmq-config]': { textContent: JSON.stringify(config) },
    '[data-lmq-submit-url]': submitUrl ? { textContent: JSON.stringify(submitUrl) } : null,
    '[data-lmq-section="intro"]': introSection,
    '[data-lmq-section="test"]': testSection,
    '[data-lmq-section="result"]': resultSection,
    '[data-lmq-role="intro-title"]': createMockElement('h1'),
    '[data-lmq-role="intro-text"]': createMockElement('div'),
    '[data-lmq-role="badges"]': createMockElement('div'),
    '[data-lmq-role="start"]': createMockElement('button'),
    '[data-lmq-role="learn-more"]': createMockElement('a'),
    '[data-lmq-role="test-prefix"]': createMockElement('p'),
    '[data-lmq-role="test-question"]': createMockElement('h2'),
    '[data-lmq-role="answers"]': createMockElement('div'),
    '[data-lmq-role="progress-label"]': createMockElement('p'),
    '[data-lmq-role="progress-bar"]': createMockElement('div'),
    '[data-lmq-role="back"]': createMockElement('button'),
    '[data-lmq-role="result-header"]': createMockElement('h2'),
    '[data-lmq-role="result-badge"]': createMockElement('div'),
    '.result-score__value': createMockElement('span'),
    '.gauge-score__max': createMockElement('span'),
    '[data-lmq-role="gauge-fill"]': createMockElement('path'),
    '[data-lmq-role="gauge-needle"]': createMockElement('line'),
    '[data-lmq-role="interpretation-title"]': createMockElement('h3'),
    '[data-lmq-role="analysis-text"]': createMockElement('p'),
    '[data-lmq-role="dimensions"]': createMockElement('div'),
    '[data-lmq-role="safety-messages"]': createMockElement('div'),
    '[data-lmq-role="classification-messages"]': createMockElement('div'),
    '[data-lmq-role="save-alert"]': createMockElement('div'),
    '[data-lmq-role="ctas"]': createMockElement('div'),
    '[data-lmq-role="modal-overlay"]': createMockElement('div'),
    '[data-lmq-role="modal-title"]': createMockElement('h3'),
    '[data-lmq-role="modal-content"]': createMockElement('div'),
    '[data-lmq-role="modal-close"]': createMockElement('button'),
    '[data-lmq-role="restart"]': createMockElement('button'),
    '[data-lmq-role="retry"]': createMockElement('button'),
  };

  const root = {
    id: `lmq-${config.id}-test`,
    _attributes: {},
    getAttribute: function(k) { return this._attributes[k]; },
    setAttribute: function(k, v) { this._attributes[k] = v; },
    querySelector: function(sel) { return elements[sel] || null; },
    querySelectorAll: function(sel) {
      if (sel === '[data-lmq-section]') return [introSection, testSection, resultSection];
      return [];
    },
    _elements: elements
  };

  return root;
}

// Hydratation questionnaire config fixture
const hydratationConfig = {
  schema_version: '2.0.0',
  id: 'hydratation',
  version: '1.0.0',
  status: 'review',
  locale: 'fr-FR',
  title: 'Score LifeMetrics - Hydratation',
  description: "Évaluez vos habitudes quotidiennes d'hydratation.",
  population: 'Adultes de 18 à 64 ans',
  recall_period: '14 derniers jours',
  estimated_duration: '2-3 minutes',
  scoring_direction: 'higher_is_better',
  score: { target_min: 0, target_max: 8, normalize_when_unavailable: true, rounding: 'half_up' },
  questions: [
    {
      id: 'HY01',
      dimension: 'place-eau',
      text: "Au cours des 14 derniers jours, quelle place l'eau a-t-elle occupée parmi les boissons que vous consommez pour vous hydrater ?",
      help: "L'eau peut être plate ou gazeuse.",
      required: true,
      answers: [
        { value: '0', label: 'Très faible', points: 0, applicable: true },
        { value: '1', label: 'Faible', points: 1, applicable: true },
        { value: '2', label: 'Environ la moitié de mes boissons', points: 2, applicable: true },
        { value: '3', label: 'Majoritaire', points: 3, applicable: true },
        { value: '4', label: "L'eau est clairement ma boisson principale", points: 4, applicable: true }
      ]
    },
    {
      id: 'HY02',
      dimension: 'place-eau',
      text: "Au cours des 14 derniers jours, à quelle fréquence avez-vous eu l'impression de boire suffisamment pour vos besoins au cours de la journée ?",
      required: true,
      answers: [
        { value: '0', label: 'Jamais ou presque jamais', points: 0, applicable: true },
        { value: '1', label: 'Rarement', points: 1, applicable: true },
        { value: '2', label: 'Environ la moitié du temps', points: 2, applicable: true },
        { value: '3', label: 'Souvent', points: 3, applicable: true },
        { value: '4', label: 'Presque tous les jours', points: 4, applicable: true }
      ]
    }
  ],
  dimensions: [{ id: 'place-eau', label: "Place de l'eau", question_ids: ['HY01', 'HY02'], weakest_eligible: true }],
  result_levels: [
    { code: 'optimal', rank: 1, min: 6, max: 8, title: 'Habitudes très favorables', description: 'Vos habitudes sont très favorables.' },
    { code: 'acceptable', rank: 2, min: 4, max: 5, title: 'Habitudes correctes', description: 'Vos habitudes sont correctes.' },
    { code: 'vigilance', rank: 3, min: 0, max: 3, title: 'Points d\'attention', description: 'Des points de vigilance existent.' }
  ]
};

// Sédentarité questionnaire config fixture (second generic questionnaire test)
const sedentariteConfig = {
  schema_version: '2.0.0',
  id: 'sedentarite',
  version: '1.0.0',
  status: 'review',
  locale: 'fr-FR',
  title: 'Score LifeMetrics - Sédentarité',
  description: 'Évaluez vos temps assis.',
  score: { target_min: 0, target_max: 48, normalize_when_unavailable: true, rounding: 'half_up' },
  questions: [
    {
      id: 'SED01',
      dimension: 'temps-assis-quotidien',
      text: 'Combien de temps passez-vous assis par jour ?',
      answers: [
        { value: '0', label: 'Plus de 10 heures', points: 0, applicable: true },
        { value: '4', label: 'Moins de 4 heures', points: 4, applicable: true }
      ]
    }
  ],
  result_levels: [
    { code: 'favorable', rank: 1, min: 36, max: 48, title: 'Sédentarité faible', description: 'Faible niveau.' }
  ]
};

const hydraRoot = createDOMForQuestionnaire(hydratationConfig, 'https://example.test/wp-json/lifemetrics-questionnaires/v1/hydratation/submit');
const sedRoot = createDOMForQuestionnaire(sedentariteConfig, 'https://example.test/wp-json/lifemetrics-questionnaires/v1/sedentarite/submit');

const domMock = {
  document: {
    readyState: 'complete',
    addEventListener: function() {},
    querySelectorAll: (sel) => {
      if (sel === '.lmq-questionnaire-root') return [hydraRoot, sedRoot];
      return [];
    },
    createElement: (tag) => createMockElement(tag),
    activeElement: { focus: function() {} }
  }
};

const context = vm.createContext({
  console,
  setTimeout,
  clearTimeout,
  LifeMetricsQuestionnaireEngine: engine,
  document: domMock.document,
  window: domMock,
  fetch: (url, opts) => Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) }),
  AbortController: class {
    constructor() { this.signal = { addEventListener: () => {} }; }
    abort() {}
  }
});

vm.runInContext(uiSource, context);

// ----------------------------------------------------
// 1. Initial State: Intro is active and visible
// ----------------------------------------------------
const introSec = hydraRoot._elements['[data-lmq-section="intro"]'];
const testSec = hydraRoot._elements['[data-lmq-section="test"]'];
const resultSec = hydraRoot._elements['[data-lmq-section="result"]'];

assert.equal(introSec.hidden, false, 'Intro section is not hidden on initial load');
assert.equal(introSec.classList.contains('section--active'), true, 'Intro section has section--active on initial load');
assert.equal(testSec.hidden, true, 'Test section is hidden on initial load');
assert.equal(testSec.classList.contains('section--active'), false, 'Test section does NOT have section--active on initial load');
assert.equal(resultSec.hidden, true, 'Result section is hidden on initial load');

// Check intro content
assert.equal(hydraRoot._elements['[data-lmq-role="intro-title"]'].textContent, 'Score LifeMetrics - Hydratation');
assert.equal(hydraRoot._elements['[data-lmq-role="intro-text"]'].textContent, "Évaluez vos habitudes quotidiennes d'hydratation.");

// ----------------------------------------------------
// 2. Click COMMENCER -> Transition to Question 1
// ----------------------------------------------------
const startBtn = hydraRoot._elements['[data-lmq-role="start"]'];
assert.ok(startBtn.onclick, 'COMMENCER button has onclick handler');
startBtn.onclick();

// Verify screen transition
assert.equal(introSec.hidden, true, 'Intro section is hidden after clicking COMMENCER');
assert.equal(introSec.classList.contains('section--active'), false, 'Intro section loses section--active');
assert.equal(testSec.hidden, false, 'Test section is NOT hidden after clicking COMMENCER');
assert.equal(testSec.classList.contains('section--active'), true, 'Test section HAS section--active after clicking COMMENCER');

// ----------------------------------------------------
// 3. Verify Question 1 Rendering
// ----------------------------------------------------
const questionTitle = hydraRoot._elements['[data-lmq-role="test-question"]'];
assert.equal(
  questionTitle.textContent,
  "Au cours des 14 derniers jours, quelle place l'eau a-t-elle occupée parmi les boissons que vous consommez pour vous hydrater ?",
  'Question 1 prompt is correctly rendered'
);

const questionHelp = hydraRoot._elements['[data-lmq-role="test-prefix"]'];
assert.equal(questionHelp.hidden, false, 'Help text is visible when defined');
assert.equal(questionHelp.textContent, "L'eau peut être plate ou gazeuse.");

const progressLabel = hydraRoot._elements['[data-lmq-role="progress-label"]'];
assert.equal(progressLabel.textContent, 'Question 1/2', 'Progress label shows Question 1/2');

const answersContainer = hydraRoot._elements['[data-lmq-role="answers"]'];
assert.equal(answersContainer.children.length, 5, 'Question 1 has exactly 5 answer buttons');
assert.equal(answersContainer.children[0].textContent, 'Très faible');
assert.equal(answersContainer.children[1].textContent, 'Faible');
assert.equal(answersContainer.children[2].textContent, 'Environ la moitié de mes boissons');
assert.equal(answersContainer.children[3].textContent, 'Majoritaire');
assert.equal(answersContainer.children[4].textContent, "L'eau est clairement ma boisson principale");

// Back button should be disabled on Question 1
const backBtn = hydraRoot._elements['[data-lmq-role="back"]'];
assert.equal(backBtn.disabled, true, 'Back button is disabled on Question 1');

// ----------------------------------------------------
// 4. Answer Question 1 and advance to Question 2
// ----------------------------------------------------
answersContainer.children[4].onclick(); // Select '4'

setTimeout(() => {
  assert.equal(progressLabel.textContent, 'Question 2/2', 'Progress advances to Question 2/2');
  assert.equal(
    questionTitle.textContent,
    "Au cours des 14 derniers jours, à quelle fréquence avez-vous eu l'impression de boire suffisamment pour vos besoins au cours de la journée ?"
  );
  assert.equal(backBtn.disabled, false, 'Back button is enabled on Question 2');

  // Test Back button
  backBtn.onclick();
  assert.equal(progressLabel.textContent, 'Question 1/2', 'Back button returns to Question 1');
  assert.equal(backBtn.disabled, true, 'Back button is disabled again on Question 1');

  // Re-advance to Question 2 and finish
  answersContainer.children[4].onclick();
  setTimeout(() => {
    assert.equal(progressLabel.textContent, 'Question 2/2');
    const answersQ2 = hydraRoot._elements['[data-lmq-role="answers"]'];
    answersQ2.children[4].onclick(); // Select '4' on Q2

    setTimeout(() => {
      // ----------------------------------------------------
      // 5. Result section is now active
      // ----------------------------------------------------
      assert.equal(testSec.hidden, true, 'Test section is hidden after test completion');
      assert.equal(testSec.classList.contains('section--active'), false, 'Test section loses section--active');
      assert.equal(resultSec.hidden, false, 'Result section is NOT hidden after completion');
      assert.equal(resultSec.classList.contains('section--active'), true, 'Result section HAS section--active');

      const scoreVal = hydraRoot._elements['.result-score__value'];
      assert.equal(String(scoreVal.textContent), '8', 'Score computed correctly for Hydratation');

      // ----------------------------------------------------
      // 6. Test second questionnaire (Sédentarité)
      // ----------------------------------------------------
      const sedIntro = sedRoot._elements['[data-lmq-section="intro"]'];
      const sedTest = sedRoot._elements['[data-lmq-section="test"]'];
      assert.equal(sedIntro.classList.contains('section--active'), true);
      assert.equal(sedTest.hidden, true);

      sedRoot._elements['[data-lmq-role="start"]'].onclick();
      assert.equal(sedIntro.classList.contains('section--active'), false);
      assert.equal(sedTest.hidden, false);
      assert.equal(sedTest.classList.contains('section--active'), true);
      assert.equal(sedRoot._elements['[data-lmq-role="test-question"]'].textContent, 'Combien de temps passez-vous assis par jour ?');
      assert.equal(sedRoot._elements['[data-lmq-role="answers"]'].children.length, 2);

      console.log('Hydratation UI flow regression tests: ALL PASSED.');
    }, 450);
  }, 450);
}, 450);
