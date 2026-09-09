const assert = require('node:assert/strict');
const { score } = require('../assets/js/questionnaire-engine.js');

// 1. ACTIVITE PHYSIQUE: Duplicate point mappings
const apConfig = {
  score: { target_min: 0, target_max: 8, normalize_when_unavailable: false, rounding: 'half_up' },
  questions: [
    {
      id: 'AP01', dimension: 'cardio', text: 'AP01', required: true,
      answers: [
        { value: '0', label: '0', points: 0, applicable: true },
        { value: '1', label: '1', points: 4, applicable: true }
      ]
    },
    {
      id: 'AP04', dimension: 'cardio', text: 'AP04', required: true,
      answers: [
        { value: '0_days', label: '0 jours', points: 0, applicable: true },
        { value: '1_day',  label: '1 jour',  points: 2, applicable: true },
        { value: '2_days', label: '2 jours', points: 4, applicable: true },
        { value: '3_plus', label: '3+ jours', points: 4, applicable: true }
      ]
    }
  ],
  dimensions: [{ id: 'cardio', label: 'Cardio', question_ids: ['AP01', 'AP04'], weakest_eligible: true }],
  weakest_dimensions: { count: 1, tie_break: 'configuration_order' },
  result_levels: [
    { code: 'FAIBLE', rank: 0, min: 0, max: 4, title: 'Faible' },
    { code: 'BON',    rank: 1, min: 5, max: 8, title: 'Bon' }
  ],
  classification_rules: [],
  safety_questions: []
};

const apRes1 = score(apConfig, { AP01: '1', AP04: '2_days' });
const apRes2 = score(apConfig, { AP01: '1', AP04: '3_plus' });
assert.equal(apRes1.final_score, 8);
assert.equal(apRes2.final_score, 8);
assert.equal(apRes1.displayed_category, 'BON');

// 2. SOMMEIL: Non-linear points & Safety flags
const slConfig = {
  score: { target_min: 0, target_max: 4, normalize_when_unavailable: false, rounding: 'half_up' },
  questions: [
    {
      id: 'SL01', dimension: 'duree', text: 'SL01', required: true,
      answers: [
        { value: 'lt_5h', label: '<5h', points: 0, applicable: true },
        { value: '5_6h',  label: '5-6h', points: 1, applicable: true },
        { value: '6_7h',  label: '6-7h', points: 2, applicable: true },
        { value: '7_9h',  label: '7-9h', points: 4, applicable: true },
        { value: 'gt_9h', label: '>9h', points: 3, applicable: true }
      ]
    }
  ],
  dimensions: [{ id: 'duree', label: 'Durée', question_ids: ['SL01'], weakest_eligible: true }],
  weakest_dimensions: { count: 1, tie_break: 'configuration_order' },
  result_levels: [
    { code: 'MAUVAIS', rank: 0, min: 0, max: 2, title: 'Mauvais' },
    { code: 'BON',     rank: 1, min: 3, max: 4, title: 'Bon' }
  ],
  classification_rules: [],
  safety_questions: [
    {
      id: 'SLSF01', text: 'Apnée', required: true,
      answers: [
        { value: 'yes', label: 'Oui', triggers: ['APNEA_ALERT'] },
        { value: 'no',  label: 'Non', triggers: [] }
      ]
    }
  ],
  safety_messages: {
    APNEA_ALERT: { priority: 100, title: 'Attention Apnée', text: 'Consultez.' }
  }
};

const slResOptimal = score(slConfig, { SL01: '7_9h', SLSF01: 'no' });
const slResLong = score(slConfig, { SL01: 'gt_9h', SLSF01: 'yes' });
assert.equal(slResOptimal.final_score, 4);
assert.equal(slResLong.final_score, 3);
assert.deepEqual(slResLong.safety_flag_codes, ['APNEA_ALERT']);

// 3. HYDRATATION: N/A Normalization (44/44 -> 48)
const hyConfig = {
  score: { target_min: 0, target_max: 48, normalize_when_unavailable: true, rounding: 'half_up' },
  questions: [
    {
      id: 'HY01', dimension: 'eau', text: 'HY01', required: true,
      answers: [
        { value: '0', label: '0', points: 0, applicable: true },
        { value: '4', label: '4', points: 44, applicable: true }
      ]
    },
    {
      id: 'HY05', dimension: 'sport', text: 'HY05', required: true,
      answers: [
        { value: '0', label: '0', points: 0, applicable: true },
        { value: '4', label: '4', points: 4, applicable: true },
        { value: 'na', label: 'N/A', points: null, applicable: false }
      ]
    }
  ],
  dimensions: [
    { id: 'eau', label: 'Eau', question_ids: ['HY01'], weakest_eligible: true },
    { id: 'sport', label: 'Sport', question_ids: ['HY05'], weakest_eligible: true }
  ],
  weakest_dimensions: { count: 1, tie_break: 'configuration_order' },
  result_levels: [{ code: 'OPTIMAL', rank: 0, min: 0, max: 48, title: 'Optimal' }],
  classification_rules: [],
  safety_questions: []
};

const hyRes = score(hyConfig, { HY01: '4', HY05: 'na' });
assert.equal(hyRes.raw_score, 44);
assert.equal(hyRes.available_max, 44);
assert.equal(hyRes.final_score, 48);

// 4. SEDENTARITE: Category guardrail capping
const sdConfig = {
  score: { target_min: 0, target_max: 48, normalize_when_unavailable: true, rounding: 'half_up' },
  questions: [
    {
      id: 'SD01', dimension: 'd1', text: 'SD01', required: true,
      answers: [
        { value: '0', label: '0', points: 0, applicable: true },
        { value: '4', label: '4', points: 4, applicable: true }
      ]
    },
    {
      id: 'SD02', dimension: 'd1', text: 'SD02', required: true,
      answers: [
        { value: '0', label: '0', points: 0, applicable: true },
        { value: '4', label: '4', points: 4, applicable: true }
      ]
    },
    {
      id: 'SD03', dimension: 'd2', text: 'SD03', required: true,
      answers: [
        { value: '0', label: '0', points: 0, applicable: true },
        { value: '40', label: '40', points: 40, applicable: true }
      ]
    }
  ],
  dimensions: [
    { id: 'd1', label: 'D1', question_ids: ['SD01', 'SD02'], weakest_eligible: true },
    { id: 'd2', label: 'D2', question_ids: ['SD03'], weakest_eligible: true }
  ],
  weakest_dimensions: { count: 1, tie_break: 'configuration_order' },
  result_levels: [
    { code: 'SEDENTARITE_ELEVEE', rank: 0, min: 0, max: 15, title: 'Élevée' },
    { code: 'SEDENTARITE_A_REDUIRE', rank: 1, min: 16, max: 30, title: 'À réduire' },
    { code: 'SEDENTARITE_FAIBLE', rank: 2, min: 31, max: 48, title: 'Faible' }
  ],
  classification_rules: [
    {
      id: 'CAP_D1_HIGH_SITTING',
      type: 'category_cap',
      metric: 'dimension_score',
      dimension: 'd1',
      operator: '<=',
      value: 2,
      max_category: 'SEDENTARITE_A_REDUIRE',
      message_code: 'D1_ATTENTION'
    }
  ],
  safety_questions: []
};

const sdRes = score(sdConfig, { SD01: '0', SD02: '0', SD03: '40' });
assert.equal(sdRes.final_score, 40);
assert.equal(sdRes.calculated_category, 'SEDENTARITE_FAIBLE');
assert.equal(sdRes.displayed_category, 'SEDENTARITE_A_REDUIRE');
assert.deepEqual(sdRes.applied_classification_rules, ['CAP_D1_HIGH_SITTING']);

// 5. FATIGUE & RÉCUPÉRATION: Attention rule & Weakest dimensions
const frConfig = {
  score: { target_min: 4, target_max: 16, normalize_when_unavailable: false, rounding: 'half_up' },
  questions: [
    {
      id: 'FR01', dimension: 'd1', text: 'FR01', required: true,
      answers: [
        { value: '1', label: '1', points: 1, applicable: true },
        { value: '4', label: '4', points: 4, applicable: true }
      ]
    },
    {
      id: 'FR02', dimension: 'd1', text: 'FR02', required: true,
      answers: [
        { value: '1', label: '1', points: 1, applicable: true },
        { value: '4', label: '4', points: 4, applicable: true }
      ]
    },
    {
      id: 'FR03', dimension: 'd2', text: 'FR03', required: true,
      answers: [
        { value: '1', label: '1', points: 1, applicable: true },
        { value: '4', label: '4', points: 4, applicable: true }
      ]
    },
    {
      id: 'FR04', dimension: 'd2', text: 'FR04', required: true,
      answers: [
        { value: '1', label: '1', points: 1, applicable: true },
        { value: '4', label: '4', points: 4, applicable: true }
      ]
    }
  ],
  dimensions: [
    {
      id: 'd1', label: 'D1', question_ids: ['FR01', 'FR02'], weakest_eligible: true,
      attention: { metric: 'score', operator: '<=', value: 2, message_code: 'D1_LOW' }
    },
    { id: 'd2', label: 'D2', question_ids: ['FR03', 'FR04'], weakest_eligible: true }
  ],
  weakest_dimensions: { count: 1, tie_break: 'configuration_order' },
  result_levels: [
    { code: 'FAIBLE', rank: 0, min: 4, max: 9, title: 'Faible' },
    { code: 'BON',    rank: 1, min: 10, max: 16, title: 'Bon' }
  ],
  classification_rules: [],
  safety_questions: []
};

const frRes = score(frConfig, { FR01: '1', FR02: '1', FR03: '4', FR04: '4' });
assert.equal(frRes.final_score, 10);
assert.equal(frRes.dimensions[0].attention, true);
assert.equal(frRes.dimensions[1].attention, false);
assert.deepEqual(frRes.weakest_dimensions, ['d1']);

// 6. PIEDS & CONFORT POSTURAL: Multiple safety flags sorted by priority
const pfConfig = {
  score: { target_min: 0, target_max: 4, normalize_when_unavailable: false, rounding: 'half_up' },
  questions: [
    {
      id: 'PF01', dimension: 'douleur', text: 'PF01', required: true,
      answers: [
        { value: '0', label: '0', points: 0, applicable: true },
        { value: '4', label: '4', points: 4, applicable: true }
      ]
    }
  ],
  dimensions: [{ id: 'douleur', label: 'Douleur', question_ids: ['PF01'], weakest_eligible: true }],
  weakest_dimensions: { count: 1, tie_break: 'configuration_order' },
  result_levels: [{ code: 'BON', rank: 0, min: 0, max: 4, title: 'Bon' }],
  classification_rules: [],
  safety_questions: [
    {
      id: 'PFSF01', text: 'Douleur aiguë', required: true,
      answers: [
        { value: 'yes', label: 'Oui', triggers: ['URGENT_PAIN'] },
        { value: 'no',  label: 'Non', triggers: [] }
      ]
    },
    {
      id: 'PFSF02', text: 'Engourdissement', required: true,
      answers: [
        { value: 'yes', label: 'Oui', triggers: ['NEURO_CHECK'] },
        { value: 'no',  label: 'Non', triggers: [] }
      ]
    }
  ],
  safety_messages: {
    NEURO_CHECK: { priority: 50, title: 'Contrôle neuro', text: 'Consultez.' },
    URGENT_PAIN: { priority: 100, title: 'Douleur aiguë', text: 'Consultez rapidement.' }
  }
};

const pfRes = score(pfConfig, { PF01: '4', PFSF01: 'yes', PFSF02: 'yes' });
assert.deepEqual(pfRes.safety_flag_codes, ['URGENT_PAIN', 'NEURO_CHECK']);

console.log('All 7 PDF methodology capabilities successfully verified in JS scoring engine.');
