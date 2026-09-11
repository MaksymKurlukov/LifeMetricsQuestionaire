const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { score } = require('../assets/js/questionnaire-engine.js');

const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/generic-scoring-v2.json'), 'utf8'));
const cases = {
  ordinary: [{ Q1: 4, Q2: 0, Q3: 'high', SF1: 'no', SF2: 'no' }, 20, 'HIGH'],
  halfUp: [{ Q1: 'na', Q2: 2, Q3: 'low', SF1: 'no', SF2: 'no' }, 3, 'LOW'],
  multipleNa: [{ Q1: 'na', Q2: 'na', Q3: 'middle', SF1: 'no', SF2: 'no' }, 10, 'MID'],
  guardrailSafety: [{ Q1: 1, Q2: 3, Q3: 'high', SF1: 'yes', SF2: 'yes' }, 14, 'MID']
};
for (const [name, [answers, finalScore, displayed]] of Object.entries(cases)) {
  const result = score(config, answers);
  assert.equal(result.final_score, finalScore, `${name} score`);
  assert.equal(result.displayed_category, displayed, `${name} category`);
}
const guarded = score(config, cases.guardrailSafety[0]);
assert.equal(guarded.calculated_category, 'HIGH');
assert.deepEqual(guarded.applied_classification_rules, ['CAP_LOW_HABITS']);
assert.deepEqual(guarded.safety_flag_codes, ['URGENT', 'CHECK']);
assert.deepEqual(guarded.classification_message_codes, ['HABITS_CAP', 'LOW_HABITS']);
const multipleNa = score(config, cases.multipleNa[0]);
assert.equal(multipleNa.dimensions[0].unavailable, true);
assert.deepEqual(multipleNa.weakest_dimensions, ['energie']);
assert.deepEqual(score(config, cases.ordinary[0]).weakest_dimensions, ['habitudes', 'energie']);
const lowerConfig = Object.assign({}, config, { scoring_direction: 'lower_is_better' });
assert.deepEqual(score(lowerConfig, cases.guardrailSafety[0]).weakest_dimensions, ['energie', 'habitudes']);
assert.throws(() => score(config, { Q1: 'na', Q2: 'na', Q3: 'na', SF1: 'no', SF2: 'no' }), /unscorable_answers/);
assert.throws(() => score(config, { Q1: '4', Q2: 0, Q3: 'high', SF1: 'no', SF2: 'no' }), /invalid_submission/);
assert.ok(!fs.readFileSync(require.resolve('../assets/js/questionnaire-engine.js'), 'utf8').match(/pss10|Q1|document|fetch|eval\s*\(/i));
console.log('Questionnaire JavaScript scoring tests passed.');
