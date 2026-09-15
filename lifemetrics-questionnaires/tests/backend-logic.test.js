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

// 2. Central Multi-Worksheet Google Apps Script
const genericPath = path.join(__dirname, '..', 'backend', 'generic-google-apps-script.gs');
const genericBackend = fs.readFileSync(genericPath, 'utf8');
const genericContext = { console };

vm.createContext(genericContext);
vm.runInContext(genericBackend, genericContext);

// Allowlist routing checks (Single Spreadsheet -> dedicated worksheets)
assert.equal(genericContext.getTargetSheetName('pss10'), 'PSS10');
assert.equal(genericContext.getTargetSheetName('sedentarite'), 'Sedentarite');
assert.equal(genericContext.getTargetSheetName('hydratation'), 'Hydratation');
assert.equal(genericContext.getTargetSheetName('fatigue'), 'Fatigue');
assert.equal(genericContext.getTargetSheetName('fatigue-recuperation'), 'Fatigue');
assert.equal(genericContext.getTargetSheetName('sommeil'), 'Sommeil');
assert.equal(genericContext.getTargetSheetName('nutrition'), 'Nutrition');
assert.equal(genericContext.getTargetSheetName('activite_physique'), 'Activite_Physique');
assert.equal(genericContext.getTargetSheetName('activite-physique'), 'Activite_Physique');
assert.equal(genericContext.getTargetSheetName('pieds_confort'), 'Pieds_Confort');
assert.equal(genericContext.getTargetSheetName('pieds-confort-postural'), 'Pieds_Confort');
assert.equal(genericContext.getTargetSheetName('risque_nutritionnel'), 'Risque_Nutritionnel');
assert.equal(genericContext.getTargetSheetName('risque-nutritionnel'), 'Risque_Nutritionnel');
assert.equal(genericContext.getTargetSheetName('bien_etre'), 'Bien_Etre');
assert.equal(genericContext.getTargetSheetName('bien-etre'), 'Bien_Etre');
assert.notEqual(genericContext.getSchema('risque-nutritionnel'), null);
assert.notEqual(genericContext.getSchema('bien-etre'), null);

// Unknown IDs must be rejected
assert.equal(genericContext.getTargetSheetName('unknown_test'), null);
assert.equal(genericContext.getTargetSheetName('Dashboard_Global'), null);
assert.equal(genericContext.getTargetSheetName('../../malicious_sheet'), null);
assert.equal(genericContext.getTargetSheetName(123), null);

// Formula injection protection checks
assert.equal(genericContext.safeSheetText('simple text'), 'simple text');
assert.equal(genericContext.safeSheetText('+12345'), "'+12345");
assert.equal(genericContext.safeSheetText('-CMD("calc")'), "'-CMD(\"calc\")");
assert.equal(genericContext.safeSheetText('@SUM(A1:A10)'), "'@SUM(A1:A10)");
assert.equal(genericContext.safeSheetText('=IMAGE("https://example.com/bad.png")'), "'=IMAGE(\"https://example.com/bad.png\")");
assert.equal(genericContext.safeSheetText('=HYPERLINK("https://evil.com","Click")'), "'=HYPERLINK(\"https://evil.com\",\"Click\")");
assert.equal(genericContext.safeSheetText('=IMPORTXML("https://attacker.com","//a")'), "'=IMPORTXML(\"https://attacker.com\",\"//a\")");
assert.equal(genericContext.safeSheetText('=cmd|\' /C calc\'!A0'), "'=cmd|' /C calc'!A0");
assert.equal(genericContext.safeSheetText('+cmd|\' /C calc\'!A0'), "'+cmd|' /C calc'!A0");
assert.equal(genericContext.safeSheetText('-2+3+cmd|\' /C calc\'!A0'), "'-2+3+cmd|' /C calc'!A0");
assert.equal(genericContext.safeSheetText('@SUM(A1:A100)'), "'@SUM(A1:A100)");

// Formula injection with leading whitespace, spaces, tabs and newlines
assert.equal(genericContext.safeSheetText('  =SUM(1,2)'), "'  =SUM(1,2)");
assert.equal(genericContext.safeSheetText('   +12345'), "'   +12345");
assert.equal(genericContext.safeSheetText(' -CMD("calc")'), "' -CMD(\"calc\")");
assert.equal(genericContext.safeSheetText('  @SUM(A1:A10)'), "'  @SUM(A1:A10)");
assert.equal(genericContext.safeSheetText('\t=IMPORTXML("x")'), "'\t=IMPORTXML(\"x\")");
assert.equal(genericContext.safeSheetText('\n-12345'), "'\n-12345");
assert.equal(genericContext.safeSheetText('\r+99999'), "'\r+99999");
assert.equal(genericContext.safeSheetText('\r\n@ALERT()'), "'\r\n@ALERT()");

// Safe texts that must NOT be prefixed
assert.equal(genericContext.safeSheetText('Option 1 - description standard'), 'Option 1 - description standard');
assert.equal(genericContext.safeSheetText('Score : 12 points'), 'Score : 12 points');
assert.equal(genericContext.safeSheetText('Stress bas'), 'Stress bas');
assert.equal(genericContext.safeSheetText('Bien-être satisfaisant'), 'Bien-être satisfaisant');
assert.equal(genericContext.safeSheetText('Oui'), 'Oui');
assert.equal(genericContext.safeSheetText('Non'), 'Non');
assert.equal(genericContext.safeSheetText('7 à 9 heures'), '7 à 9 heures');

// Already escaped texts must not be double escaped
assert.equal(genericContext.safeSheetText("'=ALREADY_ESCAPED"), "'=ALREADY_ESCAPED");
assert.equal(genericContext.safeSheetText("'+ALREADY_ESCAPED"), "'+ALREADY_ESCAPED");
assert.equal(genericContext.safeSheetText("'-ALREADY_ESCAPED"), "'-ALREADY_ESCAPED");
assert.equal(genericContext.safeSheetText("'@ALREADY_ESCAPED"), "'@ALREADY_ESCAPED");

// Null, undefined, empty, numbers, objects
assert.equal(genericContext.safeSheetText(null), '');
assert.equal(genericContext.safeSheetText(undefined), '');
assert.equal(genericContext.safeSheetText(''), '');
assert.equal(genericContext.safeSheetText(123), '123');
assert.equal(genericContext.safeSheetText({ Q1: '2', Q2: '3' }), '{"Q1":"2","Q2":"3"}');

// Session ID and timestamp validations
assert.equal(genericContext.isValidSessionId('123e4567-e89b-42d3-a456-426614174000'), true);
assert.equal(genericContext.isValidSessionId('invalid-uuid'), false);
assert.equal(genericContext.isValidTimestamp('2026-09-09T09:00:00.000Z'), true);
assert.equal(genericContext.isValidTimestamp('invalid-date'), false);

console.log('backend logic smoke test: OK');
