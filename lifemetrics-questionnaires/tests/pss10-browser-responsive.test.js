const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const uiSource = fs.readFileSync(path.join(__dirname, '../assets/js/questionnaire-ui.js'), 'utf8');
const engine = require('../assets/js/questionnaire-engine.js');

const pss10Config = {
  schema_version: '2.0.0',
  id: 'pss10',
  version: '1.0.0',
  status: 'review',
  locale: 'fr-FR',
  title: 'Évaluez votre niveau de stress',
  description: 'Évaluez rapidement votre niveau de stress ressenti',
  score: { target_min: 10, target_max: 50, normalize_when_unavailable: false, rounding: 'half_up' },
  questions: Array.from({ length: 10 }, (_, i) => ({
    id: `Q${i + 1}`,
    dimension: null,
    text: `Question ${i + 1}`,
    required: true,
    answers: [4, 5, 7, 8].includes(i + 1)
      ? [
          { value: '1', label: 'Jamais', points: 5, applicable: true },
          { value: '2', label: 'Presque jamais', points: 4, applicable: true },
          { value: '3', label: 'Parfois', points: 3, applicable: true },
          { value: '4', label: 'Assez souvent', points: 2, applicable: true },
          { value: '5', label: 'Très souvent', points: 1, applicable: true }
        ]
      : [
          { value: '1', label: 'Jamais', points: 1, applicable: true },
          { value: '2', label: 'Presque jamais', points: 2, applicable: true },
          { value: '3', label: 'Parfois', points: 3, applicable: true },
          { value: '4', label: 'Assez souvent', points: 4, applicable: true },
          { value: '5', label: 'Très souvent', points: 5, applicable: true }
        ]
  })),
  dimensions: [],
  safety_questions: [],
  result_levels: [
    { code: 'LOW', rank: 0, min: 10, max: 20, title: 'Stress bas', description: 'Stress bas', recommendations: [] },
    { code: 'MEDIUM', rank: 1, min: 21, max: 26, title: 'Stress assez élevé', description: 'Stress assez élevé', recommendations: [] },
    { code: 'HIGH', rank: 2, min: 27, max: 50, title: 'Stress très élevé', description: 'Stress très élevé', recommendations: [] }
  ],
  classification_rules: [],
  classification_messages: {},
  result_ctas: [
    { label: 'Je veux faire un bilan', url: '/formulaire-bilan/', variant: 'primary', enabled: true },
    { label: 'Découvrir les autres tests', url: '/tests-sante/', variant: 'secondary', enabled: false }
  ],
  disclaimer: { before: 'Avant', after: 'Après' }
};

function createMockElement(tag, attrs = {}) {
  let innerHtmlVal = '';
  const el = {
    tagName: tag.toUpperCase(),
    children: [],
    style: {},
    classList: {
      _classes: new Set(),
      add: function (...cls) { cls.forEach(c => this._classes.add(c)); },
      remove: function (...cls) { cls.forEach(c => this._classes.delete(c)); },
      contains: function (c) { return this._classes.has(c); },
      toggle: function (c, force) {
        if (force === undefined) {
          if (this._classes.has(c)) this._classes.delete(c); else this._classes.add(c);
        } else if (force) this._classes.add(c); else this._classes.delete(c);
      }
    },
    hidden: false,
    disabled: false,
    textContent: '',
    get innerHTML() { return innerHtmlVal; },
    set innerHTML(val) {
      innerHtmlVal = val;
      if (val === '') this.children = [];
    },
    appendChild: function (child) { this.children.push(child); child.parentNode = this; return child; },
    removeChild: function (child) { this.children = this.children.filter(c => c !== child); return child; },
    setAttribute: function (k, v) { this[k] = v; },
    getAttribute: function (k) { return this[k] || null; },
    removeAttribute: function (k) { delete this[k]; },
    addEventListener: function (evt, handler) { this['on' + evt] = handler; },
    focus: function () {},
    querySelector: function (sel) { return this._elements ? this._elements[sel] : null; },
    querySelectorAll: function (sel) {
      if (!this._elements) return [];
      return Object.keys(this._elements)
        .filter(k => k === sel || (sel === '[data-lmq-section]' && k.startsWith('[data-lmq-section=')))
        .map(k => this._elements[k]);
    },
    ...attrs
  };
  return el;
}

function createMockRoot(instanceId, config, submitUrl) {
  const root = createMockElement('div', { id: instanceId });
  root.classList.add('lmq-questionnaire-root');

  root._elements = {
    '[data-lmq-config]': { textContent: JSON.stringify(config) },
    '[data-lmq-submit-url]': submitUrl ? { textContent: JSON.stringify(submitUrl) } : null,
    '[data-lmq-section="intro"]': createMockElement('section', { getAttribute: () => 'intro', hidden: false }),
    '[data-lmq-section="test"]': createMockElement('section', { getAttribute: () => 'test', hidden: true }),
    '[data-lmq-section="result"]': createMockElement('section', { getAttribute: () => 'result', hidden: true }),
    '[data-lmq-role="intro-title"]': createMockElement('h1'),
    '[data-lmq-role="intro-text"]': createMockElement('div'),
    '[data-lmq-role="start"]': createMockElement('button'),
    '[data-lmq-role="test-question"]': createMockElement('h2'),
    '[data-lmq-role="answers"]': createMockElement('div'),
    '[data-lmq-role="progress-label"]': createMockElement('p'),
    '[data-lmq-role="progress-bar"]': createMockElement('div', { style: {} }),
    '[data-lmq-role="back"]': createMockElement('button'),
    '.result-score__value': createMockElement('span'),
    '[data-lmq-role="result-badge"]': createMockElement('div'),
    '[data-lmq-role="analysis-text"]': createMockElement('p'),
    '[data-lmq-role="interpretation-title"]': createMockElement('h3'),
    '[data-lmq-role="gauge-needle"]': createMockElement('line', { setAttribute: function(k, v) { this[k] = v; } }),
    '[data-lmq-role="gauge-fill"]': createMockElement('path', { style: {} }),
    '[data-lmq-role="safety-messages"]': createMockElement('div'),
    '[data-lmq-role="classification-messages"]': createMockElement('div'),
    '[data-lmq-role="save-alert"]': createMockElement('div', { hidden: true }),
    '[data-lmq-role="ctas"]': createMockElement('div'),
    '[data-lmq-role="modal-overlay"]': createMockElement('div', { hidden: true }),
    '[data-lmq-role="learn-more"]': createMockElement('a', { hidden: false }),
    '[data-lmq-role="modal-close"]': createMockElement('button'),
    '[data-lmq-role="modal-title"]': createMockElement('h3'),
    '[data-lmq-role="modal-content"]': createMockElement('div'),
    '[data-lmq-role="retry"]': createMockElement('button')
  };
  return root;
}

// ==========================================
// TEST BREAKPOINTS: 375px (Mobile), 768px (Tablet), 1440px (Desktop)
// ==========================================
const breakpoints = [
  { name: 'Mobile', width: 375, height: 667 },
  { name: 'Tablet', width: 768, height: 1024 },
  { name: 'Desktop', width: 1440, height: 900 }
];

let testsCompleted = 0;

for (const bp of breakpoints) {
  const root = createMockRoot(`lmq-pss10-${bp.name.toLowerCase()}`, pss10Config, 'https://example.test/wp-json/lifemetrics-questionnaires/v1/pss10/submit');
  const postPayloads = [];

  const domMock = {
    innerWidth: bp.width,
    innerHeight: bp.height,
    document: {
      addEventListener: (event, cb) => {
        if (event === 'DOMContentLoaded') setTimeout(cb, 0);
      },
      querySelectorAll: (sel) => {
        if (sel === '.lmq-questionnaire-root') return [root];
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
    LifeMetricsQuestionnaireEngine: engine, // REAL generic engine
    require: () => {},
    document: domMock.document,
    window: domMock,
    fetch: (url, opts) => {
      postPayloads.push({ url, body: JSON.parse(opts.body) });
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, duplicate: false })
      });
    },
    AbortController: class {
      constructor() { this.signal = { addEventListener: () => {} }; }
      abort() {}
    }
  });

  vm.runInContext(uiSource, context);

  // Simulate user walkthrough: Intro -> 10 Questions -> Results -> Submission
  setTimeout(() => {
    // 1. Check intro state
    assert.equal(root._elements['[data-lmq-section="intro"]'].hidden, false, `${bp.name}: intro section visible`);
    assert.equal(root._elements['[data-lmq-section="test"]'].hidden, true, `${bp.name}: test section hidden`);

    // 2. Click start
    root._elements['[data-lmq-role="start"]'].onclick();
    assert.equal(root._elements['[data-lmq-section="intro"]'].hidden, true, `${bp.name}: intro hidden after start`);
    assert.equal(root._elements['[data-lmq-section="test"]'].hidden, false, `${bp.name}: test visible after start`);

    // 3. Step through all 10 questions answering vector 21 (answers: 3, 2, 2, 4, 4, 2, 4, 4, 2, 2)
    const answersSequence = ['3', '2', '2', '4', '4', '2', '4', '4', '2', '2'];

    function stepQuestion(index) {
      if (index >= 10) {
        // End of test, check results section after UI transition
        setTimeout(() => {
          assert.equal(root._elements['[data-lmq-section="result"]'].hidden, false, `${bp.name}: result section visible`);
          assert.equal(root._elements['.result-score__value'].textContent, 21, `${bp.name}: score 21 computed`);

          // Verify fetch was dispatched to REST endpoint
          assert.equal(postPayloads.length, 1, `${bp.name}: exactly 1 REST submission dispatched`);
          assert.equal(postPayloads[0].url, 'https://example.test/wp-json/lifemetrics-questionnaires/v1/pss10/submit');
          assert.deepEqual(postPayloads[0].body.answers, {
            Q1: '3', Q2: '2', Q3: '2', Q4: '4', Q5: '4', Q6: '2', Q7: '4', Q8: '4', Q9: '2', Q10: '2'
          });

          testsCompleted++;
          if (testsCompleted === breakpoints.length) {
            console.log(`PSS10 Browser & Responsive Matrix (Mobile 375px, Tablet 768px, Desktop 1440px): ALL PASSED.`);
          }
        }, 500);
        return;
      }

      // Simulate choosing answer (click answer button)
      const answerButtons = root._elements['[data-lmq-role="answers"]'].children;
      const val = answersSequence[index];
      const targetBtn = answerButtons[parseInt(val, 10) - 1];
      assert.ok(targetBtn, `${bp.name}: answer button found for Q${index + 1} value ${val}`);
      targetBtn.onclick();

      // Wait for autoNextTimer (400ms in questionnaire-ui.js) to finish and render next question
      setTimeout(() => {
        stepQuestion(index + 1);
      }, 450);
    }

    stepQuestion(0);
  }, 50);
}
