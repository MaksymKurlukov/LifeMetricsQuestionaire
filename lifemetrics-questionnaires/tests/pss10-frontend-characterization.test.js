const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');

const testsDir = __dirname;
const appPath = path.join(testsDir, '..', 'questionnaires', 'pss10', 'assets', 'js', 'app.js');
const templatePath = path.join(testsDir, '..', 'questionnaires', 'pss10', 'template.php');
const pluginPath = path.join(testsDir, '..', 'lifemetrics-questionnaires.php');
const cssPath = path.join(testsDir, '..', 'questionnaires', 'pss10', 'assets', 'css', 'style.css');
const fixture = JSON.parse(fs.readFileSync(path.join(testsDir, 'fixtures', 'pss10-golden-v1.json'), 'utf8'));

const mutations = {
  low_clamp: ['Math.max(10,', 'Math.max(11,'],
  high_clamp: ['Math.min(50,', 'Math.min(49,'],
  medium_boundary: ['total >= 21', 'total >= 22'],
  high_boundary: ['total >= 27', 'total >= 28'],
  reverse_q4: ['[4, 5, 7, 8]', '[5, 7, 8]'],
  reverse_q5: ['[4, 5, 7, 8]', '[4, 7, 8]'],
  reverse_q7: ['[4, 5, 7, 8]', '[4, 5, 8]'],
  reverse_q8: ['[4, 5, 7, 8]', '[4, 5, 7]'],
  payload_created_at: ['created_at: new Date().toISOString()', 'completed_at: new Date().toISOString()'],
  payload_session_id: ['session_id: state.sessionId', 'run_id: state.sessionId'],
  payload_final_score: ['final_score: result.final_score', 'score: result.final_score'],
  payload_category: ['category: result.category ===', 'level: result.category ==='],
  payload_answers: ["payload['q' + question]", "payload['answer' + question]"]
};

function applyMutation(source, name) {
  const mutation = mutations[name];
  assert.ok(mutation, `unknown mutation: ${name}`);
  assert.ok(source.includes(mutation[0]), `mutation target missing: ${name}`);
  return source.replace(mutation[0], mutation[1]);
}

function fakeElement() {
  const classes = new Set();
  return {
    hidden: false,
    disabled: false,
    style: {},
    textContent: '',
    className: '',
    classList: {
      add: (...names) => names.forEach((name) => classes.add(name)),
      remove: (...names) => names.forEach((name) => classes.delete(name)),
      contains: (name) => classes.has(name),
      toggle: (name, active) => active ? classes.add(name) : classes.delete(name)
    },
    addEventListener() {},
    appendChild() {},
    focus() {},
    querySelector() { return fakeElement(); },
    querySelectorAll() { return []; },
    setAttribute(name, value) { this[name] = String(value); },
    getAttribute(name) { return this[name] || null; }
  };
}

function fakeRoot(id) {
  const attributes = {
    'data-lmq-submit-url': 'https://example.test/wp-json/lifemetrics-questionnaires/v1/pss10/submit'
  };
  const elements = new Map();
  const ownerDocument = {
    activeElement: null,
    createElement: fakeElement,
    createTextNode: (text) => ({ textContent: text })
  };

  return {
    id,
    ownerDocument,
    addEventListener() {},
    getAttribute: (name) => attributes[name] || null,
    setAttribute: (name, value) => { attributes[name] = String(value); },
    querySelector(selector) {
      if (!elements.has(selector)) elements.set(selector, fakeElement());
      return elements.get(selector);
    }
  };
}

function instrument(source) {
  const listenerMarker = "    btnStart.addEventListener('click', startTest);";
  const bootstrapMarker = "  document.querySelectorAll('[data-lmq-questionnaire=\"pss10\"]').forEach(initPss10);";
  assert.ok(source.includes(listenerMarker), 'frontend hook marker changed');
  assert.ok(source.includes(bootstrapMarker), 'frontend bootstrap marker changed');

  source = source.replace(
    listenerMarker,
    "    root.__lmqTestHooks = { state: state, computeScoreLocal: computeScoreLocal, buildPayload: buildPayload };\n\n" + listenerMarker
  );
  return source.replace(
    bootstrapMarker,
    '  globalThis.__LMQ_CONSTANTS__ = { PSS_QUESTIONS: PSS_QUESTIONS, ANSWER_LABELS: ANSWER_LABELS, REVERSE_QUESTIONS: REVERSE_QUESTIONS };\n' + bootstrapMarker
  );
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function runCharacterization(mutationName) {
  let source = fs.readFileSync(appPath, 'utf8');
  if (mutationName) source = applyMutation(source, mutationName);

  const roots = [fakeRoot('lmq-pss10-a'), fakeRoot('lmq-pss10-b')];
  class FixedDate extends Date {
    constructor(...args) {
      super(args.length ? args[0] : fixture.payload_snapshot.created_at);
    }
  }
  const context = {
    AbortController,
    Date: FixedDate,
    Error,
    Math,
    Promise,
    clearTimeout,
    console,
    crypto: { randomUUID: () => fixture.payload_snapshot.session_id },
    document: { querySelectorAll: () => roots },
    fetch: () => Promise.reject(new Error('network disabled in characterization test')),
    setTimeout
  };
  vm.createContext(context);
  vm.runInContext(instrument(source), context, { filename: appPath });

  assert.deepEqual(Array.from(context.__LMQ_CONSTANTS__.PSS_QUESTIONS), fixture.questions);
  assert.deepEqual(Array.from(context.__LMQ_CONSTANTS__.ANSWER_LABELS), fixture.answer_labels);
  assert.deepEqual(Array.from(context.__LMQ_CONSTANTS__.REVERSE_QUESTIONS), fixture.reverse_questions);
  assert.notStrictEqual(roots[0].__lmqTestHooks.state, roots[1].__lmqTestHooks.state, 'instances share state');

  const hooks = roots[0].__lmqTestHooks;
  for (const vector of fixture.vectors) {
    hooks.state.answers = Object.fromEntries(vector.selected.map((value, index) => [index + 1, value]));
    hooks.state.sessionId = fixture.payload_snapshot.session_id;
    const result = plain(hooks.computeScoreLocal());
    const category = fixture.categories[vector.category];
    assert.equal(result.final_score, vector.final_score, `${vector.name} score`);
    assert.equal(result.category, vector.category, `${vector.name} category`);
    assert.equal(result.interpretation_title, category.title, `${vector.name} title`);
    assert.equal(result.analysis_text, category.analysis, `${vector.name} analysis`);

    const payload = plain(hooks.buildPayload(result));
    assert.deepEqual(
      Array.from({ length: 10 }, (_, index) => payload['q' + (index + 1)]),
      vector.scored,
      `${vector.name} scored answers`
    );
    assert.equal(payload.final_score, vector.final_score, `${vector.name} payload score`);
    assert.equal(payload.category, category.stored, `${vector.name} stored category`);
  }

  const snapshotVector = fixture.vectors.find((vector) => vector.name === fixture.payload_snapshot.vector);
  hooks.state.answers = Object.fromEntries(snapshotVector.selected.map((value, index) => [index + 1, value]));
  hooks.state.sessionId = fixture.payload_snapshot.session_id;
  assert.deepEqual(
    plain(hooks.buildPayload(hooks.computeScoreLocal())),
    fixture.payload_snapshot.expected,
    'payload snapshot'
  );

  const template = fs.readFileSync(templatePath, 'utf8');
  const plugin = fs.readFileSync(pluginPath, 'utf8');
  const css = fs.readFileSync(cssPath, 'utf8');
  assert.match(source, new RegExp('\\}, ' + fixture.ui.auto_advance_ms + '\\);'), 'auto-advance delay changed');
  for (const message of Object.values(fixture.ui).filter((value) => typeof value === 'string')) {
    assert.ok(source.includes(message), `missing UI copy: ${message}`);
  }
  assert.ok(source.includes("document.querySelectorAll('[data-lmq-questionnaire=\"pss10\"]')"));
  assert.ok(source.includes('root.ownerDocument.createElement'));
  assert.ok(!source.includes('document.getElementById'));
  assert.ok(!source.includes('window.PSS_'));
  assert.ok(!source.includes('script.google.com'));
  assert.ok(!source.includes('/wp-content/'));
  assert.ok(source.includes('data.success !== true'));
  assert.ok(source.includes('state.lastPayload'));
  assert.ok(source.includes("method: 'POST'"));
  assert.ok(source.includes('body: JSON.stringify(payload)'));
  assert.ok(source.includes("showToast('Sauvegarde en cours…');"));
  assert.ok(source.includes('displaySaveError(error);'));
  assert.ok(source.includes('showToast(message, 3500);'));
  assert.ok(source.includes('if (resultSaveAlert) resultSaveAlert.hidden = false;'));
  assert.ok(!source.includes('Résultat enregistré.'));
  assert.match(source, /sendToWordPress\(payload\)\.then\(function \(\) \{[\s\S]*?hideToast\(\);[\s\S]*?\}\)\.catch\(function \(error\) \{[\s\S]*?displaySaveError\(error\);/);
  assert.ok(plugin.includes("'/pss10/submit'"));
  assert.ok(plugin.includes("wp_unique_id('lmq-pss10-')"));
  assert.ok(template.includes('$instance_id . \'-gauge-gradient\''));
  assert.ok(template.includes('$instance_id . \'-modal-title\''));
  assert.ok(template.includes('data-lmq-questionnaire="pss10"'));
  assert.ok(template.includes('class="lmq-dialog"'));
  assert.ok(!template.includes('class="modal"'));
  assert.match(template, /<button type="button" class="btn btn--primary">Voir mon programme personnalisé<\/button>/);
  assert.match(template, /<button type="button" class="btn btn--secondary">Contacter un praticien certifié<\/button>/);
  assert.ok(css.includes('.lmq-pss10'));
  assert.ok(css.includes('.lmq-pss10 .lmq-dialog'));
  assert.ok(!css.includes('.lmq-pss10 .modal {'));
  assert.match(css, /\.lmq-pss10 \.btn--secondary:hover:not\(:disabled\) \{[\s\S]*?background: var\(--color-cream\);[\s\S]*?color: var\(--color-text\);[\s\S]*?border: none;/);
  assert.match(css, /\.lmq-pss10 \.btn--secondary:focus:not\(:disabled\) \{[\s\S]*?background: var\(--color-cream\);[\s\S]*?color: var\(--color-text\);/);
  assert.match(css, /\.lmq-pss10 \.btn--secondary:active:not\(:disabled\) \{[\s\S]*?background: var\(--color-cream\);[\s\S]*?color: var\(--color-text\);/);
  assert.match(css, /\.lmq-pss10 \.result-actions \.btn \{[\s\S]*?display: flex;[\s\S]*?align-items: center;[\s\S]*?justify-content: center;[\s\S]*?text-align: center;/);
  assert.match(css, /\.lmq-pss10 \.modal-close \{[\s\S]*?display: flex;[\s\S]*?align-items: center;[\s\S]*?justify-content: center;[\s\S]*?text-align: center;[\s\S]*?width: 100%;/);
}

const requestedMutation = process.env.LMQ_MUTATION || '';
runCharacterization(requestedMutation);

if (!requestedMutation) {
  for (const mutationName of Object.keys(mutations)) {
    const result = spawnSync(process.execPath, [__filename], {
      encoding: 'utf8',
      env: { ...process.env, LMQ_MUTATION: mutationName }
    });
    assert.notEqual(result.status, 0, `mutation was not detected: ${mutationName}`);
  }
  console.log(`PSS10 frontend characterization: OK (${Object.keys(mutations).length} mutation guards)`);
}
