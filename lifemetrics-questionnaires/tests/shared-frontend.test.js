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

// A very basic DOM mock
const mockRoot = {
  id: 'test-root-1',
  classList: { add: () => {}, remove: () => {} },
  querySelector: function(sel) {
    if (this._elements && this._elements[sel]) return this._elements[sel];
    return null;
  },
  querySelectorAll: () => [],
  getAttribute: () => '/submit/test',
  _elements: {}
};

const domMock = {
  document: {
    addEventListener: (event, cb) => {
      if (event === 'DOMContentLoaded') {
        setTimeout(cb, 0); // execute on next tick
      }
    },
    querySelectorAll: (sel) => {
      if (sel === '.lmq-questionnaire-root') return [mockRoot];
      return [];
    },
    createElement: (tag) => {
      return {
        tag,
        className: '',
        classList: { 
          add: function(cls) { this.classes = this.classes || []; this.classes.push(cls); },
          remove: function(cls) { if(this.classes) this.classes = this.classes.filter(c => c !== cls); },
          contains: function(c) { return this.classes && this.classes.includes(c); }
        },
        setAttribute: function(k, v) { this[k] = v; },
        appendChild: function(c) { this.children = this.children || []; this.children.push(c); },
        children: []
      };
    }
  }
};

const fakeConfig = {
  id: "test-q",
  title: "Test Q",
  description: "Test Desc",
  questions: [
    { id: "q1", text: "Q1?", dimension: null, answers: [{ value: 1, label: "Yes", points: 1, applicable: true }, { value: 0, label: "No", points: 0, applicable: true }] },
    { id: "q2", text: "Q2?", dimension: null, answers: [{ value: 1, label: "Yes", points: 1, applicable: true }, { value: 0, label: "No", points: 0, applicable: true }] }
  ],
  safety_questions: [],
  dimensions: [],
  classification_rules: [],
  classification_messages: {},
  safety_messages: {},
  result_ctas: [],
  score: { target_min: 0, target_max: 2, normalize_when_unavailable: false, rounding: "half_up" },
  result_levels: [
    { code: "low", rank: 1, min: 0, max: 0, title: "Low", description: "Low Desc", recommendations: [] },
    { code: "mid", rank: 2, min: 1, max: 1, title: "Mid", description: "Mid Desc", recommendations: [] },
    { code: "high", rank: 3, min: 2, max: 2, title: "High", description: "High Desc", recommendations: [] }
  ]
};

mockRoot._elements['[data-lmq-config]'] = { textContent: JSON.stringify(fakeConfig) };
mockRoot._elements['[data-lmq-submit-url]'] = { textContent: '"/submit/test"' };
mockRoot._elements['[data-lmq-section="intro"]'] = { hidden: false };
mockRoot._elements['[data-lmq-section="test"]'] = { hidden: true };
mockRoot._elements['[data-lmq-section="result"]'] = { hidden: true };
mockRoot._elements['[data-lmq-role="intro-title"]'] = {};
mockRoot._elements['[data-lmq-role="intro-text"]'] = {};
mockRoot._elements['[data-lmq-role="start"]'] = { onclick: null };
mockRoot._elements['[data-lmq-role="test-question"]'] = {};
mockRoot._elements['[data-lmq-role="answers"]'] = { set innerHTML(v) { this.children = []; }, appendChild: function(c) { this.children = this.children || []; this.children.push(c); }, children: [] };
mockRoot._elements['[data-lmq-role="progress-label"]'] = {};
mockRoot._elements['[data-lmq-role="progress-bar"]'] = { style: {}, setAttribute: () => {} };
mockRoot._elements['[data-lmq-role="back"]'] = { onclick: null, disabled: false };
mockRoot._elements['.result-score__value'] = {};
mockRoot._elements['[data-lmq-role="analysis-text"]'] = {};

// Wait for next tick so DOMContentLoaded fires
setTimeout(() => {
  assert.equal(mockRoot._elements['[data-lmq-role="intro-title"]'].textContent, 'Test Q');
  
  // click start
  mockRoot._elements['[data-lmq-role="start"]'].onclick();
  assert.equal(mockRoot._elements['[data-lmq-section="test"]'].hidden, false);
  assert.equal(mockRoot._elements['[data-lmq-role="test-question"]'].textContent, 'Q1?');
  
  // check answers
  const answers = mockRoot._elements['[data-lmq-role="answers"]'].children;
  assert.equal(answers.length, 2);
  assert.equal(answers[0].textContent, 'Yes');
  
  // click first answer
  answers[0].onclick();
  assert.equal(answers[0].classList.contains('selected'), true);
  
  // mock timer execution for auto-next
  setTimeout(() => {
    assert.equal(mockRoot._elements['[data-lmq-role="test-question"]'].textContent, 'Q2?');
    
    // go back
    mockRoot._elements['[data-lmq-role="back"]'].onclick();
    assert.equal(mockRoot._elements['[data-lmq-role="test-question"]'].textContent, 'Q1?');
    
    // verify selection restored
    const backAnswers = mockRoot._elements['[data-lmq-role="answers"]'].children;
    assert.equal(backAnswers[0].classList.contains('selected'), true);
    
    // go forward again
    backAnswers[0].onclick();
    setTimeout(() => {
      // answer Q2
      const q2Answers = mockRoot._elements['[data-lmq-role="answers"]'].children;
      q2Answers[0].onclick();
      
      setTimeout(() => {
        // should be results
        assert.equal(mockRoot._elements['[data-lmq-section="result"]'].hidden, false);
        assert.equal(mockRoot._elements['.result-score__value'].textContent, 2); // 1 + 1 = 2
        assert.equal(mockRoot._elements['[data-lmq-role="analysis-text"]'].textContent, 'High Desc');
        
        console.log('Shared UI functional test passed.');
      }, 450);
    }, 450);
  }, 450);
}, 50);

const context = vm.createContext({
  console,
  setTimeout,
  clearTimeout,
  LifeMetricsQuestionnaireEngine: engine,
  require: () => {},
  document: domMock.document,
  window: domMock,
  fetch: () => Promise.resolve({ ok: true })
});

try {
  vm.runInContext(uiSource, context);
} catch (err) {
  console.error('Shared UI failed to load:', err);
  process.exit(1);
}
