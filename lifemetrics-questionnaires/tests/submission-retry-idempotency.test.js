const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const uiPath = path.resolve(__dirname, '..', 'assets', 'js', 'questionnaire-ui.js');
const enginePath = path.resolve(__dirname, '..', 'assets', 'js', 'questionnaire-engine.js');
const uiSource = fs.readFileSync(uiPath, 'utf8');
const engineSource = fs.readFileSync(enginePath, 'utf8');

const engineContext = {};
vm.runInNewContext(engineSource, engineContext);
const engine = engineContext.LifeMetricsQuestionnaireEngine;

function createMockElement(tag, customProps = {}) {
  const el = {
    tag,
    className: '',
    hidden: customProps.hidden !== undefined ? customProps.hidden : false,
    disabled: customProps.disabled !== undefined ? customProps.disabled : false,
    classes: customProps.classes ? [...customProps.classes] : [],
    attributes: {},
    setAttribute: function (k, v) { this.attributes[k] = v; this[k] = v; },
    getAttribute: function (k) { return this.attributes[k] || this[k]; },
    appendChild: function (c) { this.children = this.children || []; this.children.push(c); },
    set innerHTML(v) { this._innerHTML = v; },
    get innerHTML() { return this._innerHTML || ''; },
    focus: function () {},
    addEventListener: function () {},
    children: [],
    style: {},
    ...customProps
  };
  el.classList = {
    add: function (cls) { if (!el.classes.includes(cls)) el.classes.push(cls); },
    remove: function (cls) { el.classes = el.classes.filter(c => c !== cls); },
    toggle: function (cls, force) {
      const has = this.contains(cls);
      const shouldAdd = force !== undefined ? force : !has;
      if (shouldAdd) this.add(cls); else this.remove(cls);
    },
    contains: function (c) { return el.classes.includes(c); }
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
    '[data-lmq-role="gauge-track"]': createMockElement('path'),
    '[data-lmq-role="gauge-marker"]': createMockElement('circle'),
    '[data-lmq-role="gauge-gradient"]': createMockElement('linearGradient'),
    '[data-lmq-role="interpretation-title"]': createMockElement('h3'),
    '[data-lmq-role="analysis-text"]': createMockElement('p'),
    '[data-lmq-role="score-meta"]': createMockElement('p'),
    '[data-lmq-role="dimensions"]': createMockElement('div'),
    '[data-lmq-role="safety-messages"]': createMockElement('div'),
    '[data-lmq-role="classification-messages"]': createMockElement('div'),
    '[data-lmq-role="save-alert"]': createMockElement('div', { hidden: true }),
    '[data-lmq-role="ctas"]': createMockElement('div'),
    '[data-lmq-role="modal-overlay"]': createMockElement('div'),
    '[data-lmq-role="modal-title"]': createMockElement('h3'),
    '[data-lmq-role="modal-content"]': createMockElement('div'),
    '[data-lmq-role="modal-close"]': createMockElement('button'),
    '[data-lmq-role="restart"]': createMockElement('button'),
    '[data-lmq-role="retry"]': createMockElement('button'),
  };

  const root = {
    id: `lmq-${config.id}-resilience-test`,
    _attributes: {},
    getAttribute: function (k) { return this._attributes[k]; },
    setAttribute: function (k, v) { this._attributes[k] = v; },
    querySelector: function (sel) { return elements[sel] || null; },
    querySelectorAll: function (sel) {
      if (sel === '[data-lmq-section]') return [introSection, testSection, resultSection];
      return [];
    },
    _elements: elements
  };

  return root;
}

const testConfig = {
  schema_version: '2.0.0',
  id: 'fatigue-recuperation',
  version: '1.0.0',
  status: 'review',
  locale: 'fr-FR',
  title: 'Score Fatigue & Récupération',
  description: 'Évaluation de la fatigue.',
  score: { target_min: 0, target_max: 4, normalize_when_unavailable: true, rounding: 'half_up' },
  questions: [
    {
      id: 'FR01',
      dimension: null,
      text: 'Niveau d énergie ?',
      answers: [
        { value: '0', label: 'Faible', points: 0, applicable: true },
        { value: '4', label: 'Optimal', points: 4, applicable: true }
      ]
    }
  ],
  result_levels: [
    { code: 'optimal', rank: 1, min: 0, max: 4, title: 'Optimal', description: 'Très bon niveau' }
  ]
};

const capturedFetches = [];
let fetchCallCount = 0;

const submitUrl = 'https://example.test/wp-json/lifemetrics-questionnaires/v1/fatigue-recuperation/submit';
const rootNode = createDOMForQuestionnaire(testConfig, submitUrl);

const domMock = {
  document: {
    addEventListener: (event, cb) => {
      if (event === 'DOMContentLoaded') setTimeout(cb, 0);
    },
    querySelectorAll: (sel) => {
      if (sel === '.lmq-questionnaire-root') return [rootNode];
      return [];
    },
    createElement: (tag) => createMockElement(tag),
    activeElement: { focus: () => {} }
  },
  innerWidth: 1024,
  innerHeight: 768
};

const context = vm.createContext({
  console,
  setTimeout,
  clearTimeout,
  LifeMetricsQuestionnaireEngine: engine,
  require: () => {},
  document: domMock.document,
  window: domMock,
  fetch: (url, opts) => {
    fetchCallCount++;
    const reqBody = JSON.parse(opts.body);
    capturedFetches.push({ url, opts, body: reqBody, callIndex: fetchCallCount });

    if (fetchCallCount === 1) {
      // Simulate Call 1: Upstream timeout returning 502 Bad Gateway
      return Promise.resolve({
        ok: false,
        status: 502,
        json: () => Promise.resolve({
          code: 'lmq_upstream_network_error',
          message: 'Questionnaire storage is temporarily unavailable.',
          data: { status: 502 }
        })
      });
    }

    // Simulate Call 2 (Retry): Upstream duplicate response returning 200 OK
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        success: true,
        duplicate: true
      })
    });
  },
  AbortController: class {
    constructor() {
      this.signal = { addEventListener: () => {} };
    }
    abort() {}
  }
});

vm.runInContext(uiSource, context);

// Execute UI walkthrough
setTimeout(() => {
  // 1. Start questionnaire
  rootNode._elements['[data-lmq-role="start"]'].onclick();

  // 2. Answer question
  const answers = rootNode._elements['[data-lmq-role="answers"]'];
  assert.ok(answers.children.length > 0, 'Answer buttons rendered');
  answers.children[0].onclick();

  // Wait for submission transition
  setTimeout(() => {
    // 3. First submission should have fired and failed with 502
    assert.equal(capturedFetches.length, 1, 'First fetch was executed');
    const firstReq = capturedFetches[0];
    const initialSessionId = firstReq.body.session_id;
    assert.ok(initialSessionId, 'First request has session_id');

    const alertBox = rootNode._elements['[data-lmq-role="save-alert"]'];
    const retryBtn = rootNode._elements['[data-lmq-role="retry"]'];

    assert.equal(alertBox.hidden, false, 'Save alert is visible after 502 error');
    assert.equal(retryBtn.disabled, false, 'Retry button is enabled');

    // 4. Click Retry: simulates user clicking "Réessayer"
    retryBtn.onclick();

    setTimeout(() => {
      // 5. Second fetch should have fired with the SAME session_id
      assert.equal(capturedFetches.length, 2, 'Second fetch was executed on retry');
      const secondReq = capturedFetches[1];
      assert.equal(
        secondReq.body.session_id,
        initialSessionId,
        'Retry sends the exact same session_id for idempotency'
      );

      // 6. Alert box should now be HIDDEN because { success: true, duplicate: true } is treated as success
      assert.equal(alertBox.hidden, true, 'Save alert is hidden after idempotent duplicate retry success');

      console.log('Submission Retry & Idempotent Duplicate Recovery Test (JS): ALL PASSED.');
    }, 100);
  }, 700);
}, 50);
