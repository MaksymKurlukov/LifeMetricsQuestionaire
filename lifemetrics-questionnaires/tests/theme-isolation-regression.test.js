const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const genericCssPath = path.resolve(__dirname, '..', 'assets', 'css', 'questionnaire.css');
const pss10CssPath = path.resolve(__dirname, '..', 'questionnaires', 'pss10', 'assets', 'css', 'style.css');
const pss10TplPath = path.resolve(__dirname, '..', 'questionnaires', 'pss10', 'template.php');
const pss10JsPath = path.resolve(__dirname, '..', 'questionnaires', 'pss10', 'assets', 'js', 'app.js');

const genericCss = fs.readFileSync(genericCssPath, 'utf8');
const pss10Css = fs.readFileSync(pss10CssPath, 'utf8');
const pss10Tpl = fs.readFileSync(pss10TplPath, 'utf8');
const pss10Js = fs.readFileSync(pss10JsPath, 'utf8');

// 1. Generic V2 Theme Isolation & CSS Hardening
assert.match(
  genericCss,
  /\.lmq-questionnaire \.answer-card:hover[\s\S]*?color: var\(--color-text\) !important;/,
  'Generic V2: answer card hover must enforce text color !important'
);
assert.match(
  genericCss,
  /\.lmq-questionnaire \.answer-card\.selected[\s\S]*?color: var\(--color-text\) !important;/,
  'Generic V2: answer card selected must enforce text color !important'
);
assert.match(
  genericCss,
  /\.lmq-questionnaire \.answer-card:hover \*[\s\S]*?color: var\(--color-text\) !important;/,
  'Generic V2: answer card children must enforce text color !important to prevent Hub white-text'
);
assert.match(
  genericCss,
  /\.lmq-questionnaire \.btn\.btn--secondary\.btn--back[\s\S]*?background: var\(--color-cream\) !important;[\s\S]*?color: var\(--color-text\) !important;[\s\S]*?border: none !important;/,
  'Generic V2: back button must enforce cream background and no border !important'
);
assert.match(
  genericCss,
  /\.lmq-questionnaire \.btn--back:hover:not\(:disabled\)[\s\S]*?background: #ebe6df !important;[\s\S]*?color: var\(--color-text\) !important;[\s\S]*?border: none !important;/,
  'Generic V2: back button hover must enforce beige hover and no yellow !important'
);
assert.match(
  genericCss,
  /\.lmq-questionnaire \.analysis-toggle[\s\S]*?background: transparent !important;[\s\S]*?border: none !important;[\s\S]*?color: var\(--color-primary\) !important;/,
  'Generic V2: analysis-toggle must enforce transparent background and primary color !important'
);
assert.match(
  genericCss,
  /\.lmq-questionnaire \.analysis-toggle:hover[\s\S]*?background: transparent !important;/,
  'Generic V2: analysis-toggle hover must prevent yellow background injection'
);

// 2. PSS-10 Theme Isolation & CSS Hardening
assert.match(
  pss10Css,
  /\.lmq-pss10 \.answer-card:hover[\s\S]*?color: var\(--color-text\) !important;/,
  'PSS-10: answer card hover must enforce text color !important'
);
assert.match(
  pss10Css,
  /\.lmq-pss10 \.answer-card--selected[\s\S]*?color: var\(--color-text\) !important;/,
  'PSS-10: answer card selected must enforce text color !important'
);
assert.match(
  pss10Css,
  /\.lmq-pss10 \.answer-card:hover \*[\s\S]*?color: var\(--color-text\) !important;/,
  'PSS-10: answer card children must enforce text color !important'
);
assert.match(
  pss10Css,
  /\.lmq-pss10 \.btn\.btn--secondary\.btn--back[\s\S]*?background: var\(--color-cream\) !important;[\s\S]*?color: var\(--color-text\) !important;[\s\S]*?border: none !important;/,
  'PSS-10: back button must enforce cream background and text color !important'
);
assert.match(
  pss10Css,
  /\.lmq-pss10 \.analysis-toggle[\s\S]*?background: transparent !important;[\s\S]*?border: none !important;[\s\S]*?color: var\(--color-primary\) !important;/,
  'PSS-10: analysis-toggle must enforce transparent background and primary color !important'
);
assert.match(
  pss10Css,
  /\.lmq-pss10 \.analysis-toggle:hover[\s\S]*?background: transparent !important;/,
  'PSS-10: analysis-toggle hover must prevent yellow background injection'
);

// 3. Modern Gauge Structure in PSS-10
assert.ok(pss10Css.includes('.lmq-pss10 .gauge-track'), 'PSS-10 CSS defines .gauge-track');
assert.ok(pss10Css.includes('.lmq-pss10 .gauge-marker'), 'PSS-10 CSS defines .gauge-marker');
assert.ok(!pss10Css.includes('.lmq-pss10 .gauge-needle'), 'PSS-10 CSS does not define .gauge-needle');
assert.ok(!pss10Css.includes('.lmq-pss10 .gauge-fill'), 'PSS-10 CSS does not define .gauge-fill');

assert.ok(pss10Tpl.includes('data-lmq-role="gauge-track"'), 'PSS-10 template has gauge-track');
assert.ok(pss10Tpl.includes('data-lmq-role="gauge-marker"'), 'PSS-10 template has gauge-marker');
assert.ok(pss10Tpl.includes('data-lmq-role="gauge-gradient"'), 'PSS-10 template has gauge-gradient');
assert.ok(!pss10Tpl.includes('gauge-needle'), 'PSS-10 template has no gauge-needle');
assert.ok(!pss10Tpl.includes('gauge-fill'), 'PSS-10 template has no gauge-fill');

// 4. Progressive Disclosure in PSS-10 Template & JS
assert.ok(pss10Tpl.includes('data-lmq-role="analysis-lead"'), 'PSS-10 template has analysis-lead');
assert.ok(pss10Tpl.includes('data-lmq-role="analysis-details"'), 'PSS-10 template has analysis-details');
assert.match(pss10Tpl, /data-lmq-role="analysis-details"[\s\S]*?hidden/, 'PSS-10 details hidden by default');
assert.ok(pss10Js.includes('function renderGaugeGradient()'), 'PSS-10 JS has renderGaugeGradient');
assert.ok(pss10Js.includes('function renderGaugeMarker('), 'PSS-10 JS has renderGaugeMarker');
assert.ok(!pss10Js.includes('gaugeNeedle'), 'PSS-10 JS does not use gaugeNeedle');
assert.ok(!pss10Js.includes('gaugeFill'), 'PSS-10 JS does not use gaugeFill');

console.log('Theme Isolation & Approved Redesign Regression Tests: ALL PASSED.');
