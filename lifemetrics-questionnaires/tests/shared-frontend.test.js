const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const uiPath = path.join(__dirname, '..', 'assets', 'js', 'questionnaire-ui.js');
const enginePath = path.join(__dirname, '..', 'assets', 'js', 'questionnaire-engine.js');

const uiSource = fs.readFileSync(uiPath, 'utf8');
const engineSource = fs.readFileSync(enginePath, 'utf8');

const domMock = {
  document: {
    addEventListener: () => {},
    querySelectorAll: () => []
  }
};

const context = vm.createContext({
  console,
  require: (id) => {
    if (id === './questionnaire-engine.js') {
      const exports = {};
      vm.runInNewContext(engineSource, { module: { exports }, globalThis: {} });
      return exports;
    }
  },
  document: domMock.document,
  window: domMock
});

try {
  vm.runInContext(uiSource, context);
  console.log('Shared UI loaded successfully in test context.');
} catch (err) {
  console.error('Shared UI failed to load:', err);
  process.exit(1);
}
