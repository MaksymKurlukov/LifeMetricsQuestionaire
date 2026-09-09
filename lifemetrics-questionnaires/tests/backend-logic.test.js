const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// 1. PSS10 Legacy Google Apps Script
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

// 2. Generic Google Apps Script
const genericPath = path.join(__dirname, '..', 'backend', 'generic-google-apps-script.gs');
const genericBackend = fs.readFileSync(genericPath, 'utf8');
const genericContext = { console };

vm.createContext(genericContext);
vm.runInContext(genericBackend, genericContext);

assert.equal(genericContext.safeSheetText('simple text'), 'simple text');
assert.equal(genericContext.safeSheetText('+12345'), "'+12345");
assert.equal(genericContext.safeSheetText('-CMD("calc")'), "'-CMD(\"calc\")");
assert.equal(genericContext.safeSheetText('@SUM(A1:A10)'), "'@SUM(A1:A10)");
assert.equal(genericContext.safeSheetText('=IMAGE("https://example.com/bad.png")'), "'=IMAGE(\"https://example.com/bad.png\")");
assert.equal(genericContext.safeSheetText({ Q1: '2', Q2: '3' }), '{"Q1":"2","Q2":"3"}');
assert.equal(genericContext.isValidSessionId('123e4567-e89b-42d3-a456-426614174000'), true);
assert.equal(genericContext.isValidSessionId('invalid-uuid'), false);
assert.equal(genericContext.isValidTimestamp('2026-09-09T09:00:00.000Z'), true);
assert.equal(genericContext.isValidTimestamp('invalid-date'), false);

console.log('backend logic smoke test: OK');
