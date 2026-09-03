const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const backendPath = path.join(__dirname, '..', 'backend', 'google-apps-script.gs');
const backend = fs.readFileSync(backendPath, 'utf8');
const context = { console };

vm.createContext(context);
vm.runInContext(backend, context);

assert.equal(context.categoryFromScore(20), 'Stress bas');
assert.equal(context.categoryFromScore(21), 'Stress assez élevé');
assert.equal(context.categoryFromScore(26), 'Stress assez élevé');
assert.equal(context.categoryFromScore(27), 'Stress très élevé');
assert.equal(context.safeSheetText('normal'), 'normal');
assert.equal(context.safeSheetText('=IMPORTXML("x")'), "'=IMPORTXML(\"x\")");
assert.equal(context.isValidSessionId('123e4567-e89b-42d3-a456-426614174000'), true);
assert.equal(context.isValidSessionId('../../bad'), false);
assert.equal(context.isValidCreatedAt('2026-09-03T08:00:00.000Z'), true);

console.log('backend logic smoke test: OK');
