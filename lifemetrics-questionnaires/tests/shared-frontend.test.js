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
  return {
    tag,
    className: '',
    hidden: customProps.hidden !== undefined ? customProps.hidden : false,
    classList: {
      add: function(cls) { this.classes = this.classes || []; this.classes.push(cls); },
      remove: function(cls) { if(this.classes) this.classes = this.classes.filter(c => c !== cls); },
      contains: function(c) { return this.classes && this.classes.includes(c); }
    },
    setAttribute: function(k, v) { this[k] = v; },
    getAttribute: function(k) { return this[k]; },
    appendChild: function(c) { this.children = this.children || []; this.children.push(c); },
    set innerHTML(v) { this.children = []; },
    focus: function() {}, addEventListener: function() {},
    children: [],
    ...customProps
  };
}

function createMockRoot(id, config, submitUrl) {
  const root = {
    id,
    classList: { add: () => {}, remove: () => {} },
    querySelector: function(sel) { return this._elements[sel] || null; },
    querySelectorAll: function(sel) {
        if (sel === '[data-lmq-section]') return [this._elements['[data-lmq-section="intro"]'], this._elements['[data-lmq-section="test"]'], this._elements['[data-lmq-section="result"]']];
        return [];
    },
    _elements: {
      '[data-lmq-config]': { textContent: JSON.stringify(config) },
      '[data-lmq-submit-url]': submitUrl ? { textContent: JSON.stringify(submitUrl) } : null,
      '[data-lmq-section="intro"]': createMockElement('section', { getAttribute: () => 'intro' }),
      '[data-lmq-section="test"]': createMockElement('section', { getAttribute: () => 'test' }),
      '[data-lmq-section="result"]': createMockElement('section', { getAttribute: () => 'result' }),
      '[data-lmq-role="intro-title"]': createMockElement('h1'),
      '[data-lmq-role="intro-text"]': createMockElement('div'),
      '[data-lmq-role="start"]': createMockElement('button'),
      '[data-lmq-role="test-question"]': createMockElement('h2'),
      '[data-lmq-role="answers"]': createMockElement('div'),
      '[data-lmq-role="progress-label"]': createMockElement('p'),
      '[data-lmq-role="progress-bar"]': createMockElement('div', { style: {} }),
      '[data-lmq-role="back"]': createMockElement('button'),
      '.result-score__value': createMockElement('span'),
      '[data-lmq-role="analysis-text"]': createMockElement('p'),
      '[data-lmq-role="safety-messages"]': createMockElement('div'),
      '[data-lmq-role="classification-messages"]': createMockElement('div'),
      '[data-lmq-role="save-alert"]': createMockElement('div'),
      '[data-lmq-role="ctas"]': createMockElement('div'),
      '[data-lmq-role="modal-overlay"]': createMockElement('div'),
      '[data-lmq-role="learn-more"]': createMockElement('a'),
      '[data-lmq-role="modal-close"]': createMockElement('button'),
      '[data-lmq-role="modal-title"]': createMockElement('h3'),
      '[data-lmq-role="modal-content"]': createMockElement('div'),
      '[data-lmq-role="retry"]': createMockElement('button')
    }
  };
  return root;
}

const config1 = {
  id: "test-q1",
  title: "Test Q1",
  description: "<script>alert('xss1')</script>",
  questions: [
    { id: "q1", text: "Q1?", dimension: null, answers: [{ value: 1, label: "Yes", points: 1, applicable: true }, { value: 0, label: "No", points: 0, applicable: true }] }
  ],
  safety_questions: [
    { id: "sq1", text: "Safety?", dimension: null, answers: [{ value: 1, label: "SYes", points: 0, applicable: true }, { value: 0, label: "SNo", points: 0, applicable: true }] }
  ],
  dimensions: [],
  classification_rules: [],
  classification_messages: {},
  safety_messages: { "SFLAG": { title: "Safety Alert", text: "<script>alert('xss2')</script>" } },
  result_ctas: [],
  score: { target_min: 0, target_max: 1, normalize_when_unavailable: false, rounding: "half_up" },
  result_levels: [
    { code: "low", rank: 1, min: 0, max: 1, title: "Low", description: "Low Desc", recommendations: [] }
  ],
  disclaimer: { before: "Before info", after: "After info" }
};

// Fake engine to just return a score and a safety flag if SYes is chosen
const fakeEngine = {
  score: function(cfg, answers) {
    let score = answers.q1 === 1 ? 1 : 0;
    let flags = answers.sq1 === 1 ? ["SFLAG"] : [];
    return {
      final_score: score,
      displayed_category: "low",
      safety_flag_codes: flags,
      classification_message_codes: [],
      weakest_dimensions: []
    };
  }
};

const root1 = createMockRoot('root-1', config1, '/submit/test1');
const root2 = createMockRoot('root-2', { ...config1, id: "test-q2" }, null);

let fetchedUrls = [];
let abortCalled = false;

const domMock = {
  document: {
    addEventListener: (event, cb) => {
      if (event === 'DOMContentLoaded') setTimeout(cb, 0);
    },
    querySelectorAll: (sel) => {
      if (sel === '.lmq-questionnaire-root') return [root1, root2];
      return [];
    },
    createElement: (tag) => createMockElement(tag),
    activeElement: { focus: function() {} }
  }
};

// Next tick testing
setTimeout(() => {
  // --- TEST XSS ---
  assert.equal(root1._elements['[data-lmq-role="intro-text"]'].textContent, "<script>alert('xss1')</script>");
  assert.equal(root1._elements['[data-lmq-role="intro-text"]'].innerHTML, undefined); // We didn't set innerHTML

  // --- TEST MULTI-INSTANCE ISOLATION ---
  assert.equal(root1._elements['[data-lmq-role="intro-title"]'].textContent, "Test Q1");
  assert.equal(root2._elements['[data-lmq-role="intro-title"]'].textContent, "Test Q1"); // Config2 has same title

  // Start Root 1
  root1._elements['[data-lmq-role="start"]'].onclick();
  assert.equal(root1._elements['[data-lmq-section="test"]'].hidden, false);
  assert.equal(root2._elements['[data-lmq-section="test"]'].hidden, true); // Root 2 still intro

  // Answer Root 1 Q1
  const answers1 = root1._elements['[data-lmq-role="answers"]'].children;
  answers1[0].onclick(); // 1

  setTimeout(() => {
    // Now Root 1 is at SQ1 (Safety Question)
    assert.equal(root1._elements['[data-lmq-role="test-question"]'].textContent, "Safety?");

    // Root 2 is still at Intro
    assert.equal(root2._elements['[data-lmq-section="test"]'].hidden, true);

    // Answer Root 1 SQ1
    const sAnswers1 = root1._elements['[data-lmq-role="answers"]'].children;
    sAnswers1[0].onclick(); // SYes -> Triggers SFLAG

    setTimeout(() => {
      // Root 1 should now be at Results and Submit
      assert.equal(root1._elements['[data-lmq-section="result"]'].hidden, false);
      assert.equal(root1._elements['.result-score__value'].textContent, 1);

      // Safety flag should be rendered
      const sContainer = root1._elements['[data-lmq-role="safety-messages"]'];
      const sMsg = sContainer.children[0];
      assert.equal(sMsg.children[0].textContent, "Safety Alert");
      assert.equal(sMsg.children[1].textContent, "<script>alert('xss2')</script>"); // Safe!

      // --- TEST MODAL ---
      const learnMore = root1._elements['[data-lmq-role="learn-more"]'];
      assert.equal(learnMore.hidden, false); // unhidden because config has disclaimer
      learnMore.onclick({ preventDefault: () => {} });
      assert.equal(root1._elements['[data-lmq-role="modal-overlay"]'].hidden, false);

      const mContent = root1._elements['[data-lmq-role="modal-content"]'];
      assert.equal(mContent.children[0].textContent, "Before info");

      root1._elements['[data-lmq-role="modal-close"]'].onclick();
      assert.equal(root1._elements['[data-lmq-role="modal-overlay"]'].hidden, true);

      // --- TEST TIMEOUT / RETRY / DUPLICATE ---
      // We expect 1 fetch to have been fired by now.
      assert.equal(fetchedUrls.length, 1);
      assert.equal(fetchedUrls[0], '/submit/test1');

      // Click retry to force another fetch (should be blocked if still submitting, but since fetch is mocked as instantaneous, it's not submitting)
      // Let's redefine fetch to hang
      let resolveFetch;
      const fetchPromise = new Promise((res) => { resolveFetch = res; });
      globalObj.fetch = () => { fetchedUrls.push('hung'); return fetchPromise; };

      root1._elements['[data-lmq-role="retry"]'].onclick();
      assert.equal(fetchedUrls.length, 2); // 'hung' added

      // Click again, should be blocked by duplicate guard
      root1._elements['[data-lmq-role="retry"]'].onclick();
      assert.equal(fetchedUrls.length, 2); // Still 2!

      console.log('Shared UI functional tests passed.');
    }, 450);
  }, 450);
}, 50);

const context = vm.createContext({
  console,
  setTimeout,
  clearTimeout,
  LifeMetricsQuestionnaireEngine: fakeEngine, // use fake engine to test our UI wiring independently
  require: () => {},
  document: domMock.document,
  window: domMock,
  fetch: (url, opts) => {
    fetchedUrls.push(url);
    if (opts.signal) opts.signal.addEventListener('abort', () => { abortCalled = true; });
    return Promise.resolve({ ok: true });
  },
  AbortController: class {
    constructor() { this.signal = { addEventListener: (e, cb) => { this.cb = cb; } }; }
    abort() { if(this.signal.cb) this.signal.cb(); }
  }
});

try {
  vm.runInContext(uiSource, context);
} catch (err) {
  console.error('Shared UI failed to load:', err);
  process.exit(1);
}
