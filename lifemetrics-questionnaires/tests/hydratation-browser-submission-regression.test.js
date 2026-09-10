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

const hydratationConfig = {
  schema_version: '2.0.0',
  id: 'hydratation',
  version: '1.0.0',
  status: 'review',
  locale: 'fr-FR',
  title: 'Score LifeMetrics - Hydratation',
  description: "Évaluez vos habitudes d'hydratation.",
  score: { target_min: 0, target_max: 4, normalize_when_unavailable: true, rounding: 'half_up' },
  questions: [
    {
      id: 'HY01',
      dimension: null,
      text: "Place de l'eau ?",
      answers: [
        { value: '0', label: 'Faible', points: 0, applicable: true },
        { value: '4', label: 'Principale', points: 4, applicable: true }
      ]
    }
  ],
  result_levels: [
    { code: 'optimal', rank: 1, min: 0, max: 4, title: 'Optimal', description: 'Très bien' }
  ]
};

const capturedRequests = [];
let abortTriggered = false;

const hydraRoot = createDOMForQuestionnaire(hydratationConfig, 'https://example.test/wp-json/lifemetrics-questionnaires/v1/hydratation/submit');

const domMock = {
  document: {
    readyState: 'complete',
    addEventListener: function() {},
    querySelectorAll: (sel) => sel === '.lmq-questionnaire-root' ? [hydraRoot] : [],
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
  fetch: (url, opts) => {
    capturedRequests.push({ url, opts, body: JSON.parse(opts.body) });
    if (opts.signal) {
      opts.signal.addEventListener('abort', () => { abortTriggered = true; });
    }
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: true, duplicate: false })
    });
  },
  AbortController: class {
    constructor() {
      this.signal = {
        addEventListener: (event, cb) => {
          if (event === 'abort') this._onAbort = cb;
        }
      };
    }
    abort() {
      if (this.signal._onAbort) this.signal._onAbort();
    }
  }
});

vm.runInContext(uiSource, context);

// 1. Start test
const startBtn = hydraRoot._elements['[data-lmq-role="start"]'];
startBtn.onclick();

// 2. Answer question HY01
const answers = hydraRoot._elements['[data-lmq-role="answers"]'];
answers.children[0].onclick();

setTimeout(() => {
  // 3. Verify submission happened
  assert.equal(capturedRequests.length, 1, 'Exactly one fetch request was executed');
  const req = capturedRequests[0];
  assert.equal(req.url, 'https://example.test/wp-json/lifemetrics-questionnaires/v1/hydratation/submit');
  assert.equal(req.opts.method, 'POST');
  assert.equal(req.opts.credentials, 'same-origin');
  assert.ok(req.body.session_id, 'session_id is generated and included in payload');
  assert.match(req.body.session_id, /^[0-9a-f-]{36}$/i, 'session_id is a valid UUID format');
  assert.deepEqual(req.body.answers, { HY01: '0' }, 'answers payload is present');

  // 4. Verify save-alert is hidden on success
  const alertBox = hydraRoot._elements['[data-lmq-role="save-alert"]'];
  assert.equal(alertBox.hidden, true, 'Save alert remains hidden when response is success');

  // 5. Test retry handler resends the SAME session_id
  const originalSessionId = req.body.session_id;
  const retryBtn = hydraRoot._elements['[data-lmq-role="retry"]'];
  retryBtn.onclick();

  setTimeout(() => {
    assert.equal(capturedRequests.length, 2, 'Retry fires second fetch request');
    assert.equal(capturedRequests[1].body.session_id, originalSessionId, 'Retry preserves original session_id for idempotency');
    assert.equal(alertBox.hidden, true);
    console.log('Hydratation browser submission regression tests: ALL PASSED.');
  }, 100);
}, 500);
