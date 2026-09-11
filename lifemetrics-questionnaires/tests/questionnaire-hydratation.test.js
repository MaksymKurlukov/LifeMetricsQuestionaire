const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const engine = require('../assets/js/questionnaire-engine.js');

const config = {
  schema_version: '2.0.0',
  id: 'hydratation',
  version: '1.0.0',
  status: 'review',
  locale: 'fr-FR',
  title: 'Score LifeMetrics - Hydratation',
  seo_title: "Auto-évaluation LifeMetrics - Vos habitudes d'hydratation sont-elles adaptées ?",
  description: "Évaluez vos habitudes quotidiennes d'hydratation : régularité, place de l'eau, répartition, adaptation à l'activité et à la chaleur, choix des boissons et anticipation.",
  population: 'Adultes de 18 à 64 ans',
  recall_period: '14 derniers jours',
  estimated_duration: '2-3 minutes',
  scoring_direction: 'lower_is_better',
  score: {
    target_min: 12,
    target_max: 60,
    normalize_when_unavailable: true,
    rounding: 'half_up'
  },
  questions: [
    {
      id: 'HY01',
      dimension: 'eau-boissons-quotidiennes',
      text: "Au cours des 14 derniers jours, quelle place l'eau a-t-elle occupée parmi les boissons que vous consommez pour vous hydrater ?",
      help: "L'eau peut être plate ou gazeuse.",
      required: true,
      answers: [
        { value: '1', label: "L'eau est clairement ma boisson principale", points: 1, applicable: true },
        { value: '2', label: 'Majoritaire', points: 2, applicable: true },
        { value: '3', label: 'Environ la moitié de mes boissons', points: 3, applicable: true },
        { value: '4', label: 'Faible', points: 4, applicable: true },
        { value: '5', label: 'Très faible', points: 5, applicable: true }
      ]
    },
    {
      id: 'HY02',
      dimension: 'eau-boissons-quotidiennes',
      text: "Au cours des 14 derniers jours, à quelle fréquence avez-vous eu l'impression de boire suffisamment pour vos besoins au cours de la journée ?",
      required: true,
      answers: [
        { value: '1', label: 'Presque tous les jours', points: 1, applicable: true },
        { value: '2', label: 'Souvent', points: 2, applicable: true },
        { value: '3', label: 'Environ la moitié du temps', points: 3, applicable: true },
        { value: '4', label: 'Rarement', points: 4, applicable: true },
        { value: '5', label: 'Jamais ou presque jamais', points: 5, applicable: true }
      ]
    },
    {
      id: 'HY03',
      dimension: 'repartition-hydratation',
      text: "Au cours des 14 derniers jours, à quelle fréquence avez-vous bu régulièrement à différents moments de la journée plutôt que de boire une grande quantité seulement à quelques occasions ?",
      required: true,
      answers: [
        { value: '1', label: 'Presque toujours', points: 1, applicable: true },
        { value: '2', label: 'Souvent', points: 2, applicable: true },
        { value: '3', label: 'Environ la moitié du temps', points: 3, applicable: true },
        { value: '4', label: 'Rarement', points: 4, applicable: true },
        { value: '5', label: 'Jamais ou presque jamais', points: 5, applicable: true }
      ]
    },
    {
      id: 'HY04',
      dimension: 'repartition-hydratation',
      text: "Au cours d'une journée habituelle, à quelle fréquence passez-vous plusieurs heures sans rien boire simplement parce que vous êtes occupé, que vous oubliez ou que vous n'avez rien à proximité ?",
      required: true,
      answers: [
        { value: '1', label: 'Presque jamais', points: 1, applicable: true },
        { value: '2', label: 'Rarement', points: 2, applicable: true },
        { value: '3', label: 'Parfois', points: 3, applicable: true },
        { value: '4', label: 'Souvent', points: 4, applicable: true },
        { value: '5', label: 'Très souvent', points: 5, applicable: true }
      ]
    },
    {
      id: 'HY05',
      dimension: 'adaptation-activite-chaleur',
      text: "Lorsque vous pratiquez une activité physique ou effectuez un effort prolongé, adaptez-vous votre hydratation avant, pendant ou après l'activité selon sa durée, son intensité et les conditions ?",
      help: "Si aucune activité physique significative n'est pratiquée actuellement, l'interface peut proposer « Non concerné actuellement ».",
      required: true,
      answers: [
        { value: '1', label: 'Presque toujours', points: 1, applicable: true },
        { value: '2', label: 'Souvent', points: 2, applicable: true },
        { value: '3', label: 'Parfois', points: 3, applicable: true },
        { value: '4', label: 'Rarement', points: 4, applicable: true },
        { value: '5', label: 'Jamais', points: 5, applicable: true },
        { value: 'na', label: 'Non concerné actuellement', points: null, applicable: false }
      ]
    },
    {
      id: 'HY06',
      dimension: 'adaptation-activite-chaleur',
      text: "Lorsqu'il fait chaud ou que vous transpirez davantage que d'habitude, pensez-vous à augmenter ou à rendre plus régulière votre consommation d'eau ?",
      required: true,
      answers: [
        { value: '1', label: 'Presque toujours', points: 1, applicable: true },
        { value: '2', label: 'Souvent', points: 2, applicable: true },
        { value: '3', label: 'Parfois', points: 3, applicable: true },
        { value: '4', label: 'Rarement', points: 4, applicable: true },
        { value: '5', label: 'Jamais', points: 5, applicable: true }
      ]
    },
    {
      id: 'HY07',
      dimension: 'choix-boissons',
      text: "Lorsque vous avez soif, à quelle fréquence choisissez-vous en priorité de l'eau ou une boisson non sucrée adaptée plutôt qu'une boisson très sucrée ?",
      required: true,
      answers: [
        { value: '1', label: 'Presque toujours', points: 1, applicable: true },
        { value: '2', label: 'Souvent', points: 2, applicable: true },
        { value: '3', label: 'Environ la moitié du temps', points: 3, applicable: true },
        { value: '4', label: 'Rarement', points: 4, applicable: true },
        { value: '5', label: 'Jamais ou presque jamais', points: 5, applicable: true }
      ]
    },
    {
      id: 'HY08',
      dimension: 'choix-boissons',
      text: "Au cours des 14 derniers jours, à quelle fréquence les sodas, boissons énergisantes, boissons sucrées ou sirops ont-ils constitué une part importante de vos boissons quotidiennes ?",
      required: true,
      answers: [
        { value: '1', label: 'Rarement ou jamais', points: 1, applicable: true },
        { value: '2', label: '1-3 jours par semaine', points: 2, applicable: true },
        { value: '3', label: '4-6 jours par semaine', points: 3, applicable: true },
        { value: '4', label: 'Environ tous les jours', points: 4, applicable: true },
        { value: '5', label: 'Plusieurs fois par jour', points: 5, applicable: true }
      ]
    },
    {
      id: 'HY09',
      dimension: 'alimentation-environnement',
      text: "Votre alimentation comprend-elle régulièrement des aliments riches en eau, par exemple des fruits, des légumes, des soupes, des laitages ou d'autres aliments comparables ?",
      required: true,
      answers: [
        { value: '1', label: 'Tous les jours ou presque', points: 1, applicable: true },
        { value: '2', label: 'Souvent', points: 2, applicable: true },
        { value: '3', label: 'De temps en temps', points: 3, applicable: true },
        { value: '4', label: 'Rarement', points: 4, applicable: true },
        { value: '5', label: 'Presque jamais', points: 5, applicable: true }
      ]
    },
    {
      id: 'HY10',
      dimension: 'alimentation-environnement',
      text: "Dans votre quotidien, avez-vous généralement de l'eau facilement disponible lorsque vous travaillez, étudiez, vous déplacez ou restez longtemps à l'extérieur de chez vous ?",
      help: "Exemples : bouteille, gourde, carafe, fontaine ou accès facile à un point d'eau.",
      required: true,
      answers: [
        { value: '1', label: 'Presque toujours', points: 1, applicable: true },
        { value: '2', label: 'Souvent', points: 2, applicable: true },
        { value: '3', label: 'Parfois', points: 3, applicable: true },
        { value: '4', label: 'Rarement', points: 4, applicable: true },
        { value: '5', label: 'Presque jamais', points: 5, applicable: true }
      ]
    },
    {
      id: 'HY11',
      dimension: 'anticipation-regularite',
      text: "Lorsque vous prévoyez une longue journée, un déplacement, un voyage, du sport ou plusieurs heures loin de chez vous, pensez-vous à prévoir l'accès à de l'eau ?",
      required: true,
      answers: [
        { value: '1', label: 'Presque toujours', points: 1, applicable: true },
        { value: '2', label: 'Souvent', points: 2, applicable: true },
        { value: '3', label: 'Parfois', points: 3, applicable: true },
        { value: '4', label: 'Rarement', points: 4, applicable: true },
        { value: '5', label: 'Jamais', points: 5, applicable: true }
      ]
    },
    {
      id: 'HY12',
      dimension: 'anticipation-regularite',
      text: "Au cours des 14 derniers jours, vos bonnes habitudes d'hydratation ont-elles été relativement régulières, y compris pendant les journées de travail, d'études ou les week-ends ?",
      required: true,
      answers: [
        { value: '1', label: 'Très régulières', points: 1, applicable: true },
        { value: '2', label: 'Généralement régulières', points: 2, applicable: true },
        { value: '3', label: 'Variables selon les jours', points: 3, applicable: true },
        { value: '4', label: 'Plutôt irrégulières', points: 4, applicable: true },
        { value: '5', label: 'Très irrégulières', points: 5, applicable: true }
      ]
    }
  ],
  dimensions: [
    { id: 'eau-boissons-quotidiennes', label: "Place de l'eau et boissons quotidiennes", question_ids: ['HY01', 'HY02'], calculation_mode: 'average', weakest_eligible: true },
    { id: 'repartition-hydratation', label: "Répartition de l'hydratation dans la journée", question_ids: ['HY03', 'HY04'], calculation_mode: 'average', weakest_eligible: true },
    { id: 'adaptation-activite-chaleur', label: "Adaptation à l'activité physique et à la chaleur", question_ids: ['HY05', 'HY06'], calculation_mode: 'average', weakest_eligible: true },
    { id: 'choix-boissons', label: 'Choix des boissons et limitation du sucré', question_ids: ['HY07', 'HY08'], calculation_mode: 'average', weakest_eligible: true },
    { id: 'alimentation-environnement', label: 'Alimentation hydratante et disponibilité de l\'eau', question_ids: ['HY09', 'HY10'], calculation_mode: 'average', weakest_eligible: true },
    { id: 'anticipation-regularite', label: 'Anticipation des contextes et régularité', question_ids: ['HY11', 'HY12'], calculation_mode: 'average', weakest_eligible: true }
  ],
  weakest_dimensions: { count: 2, tie_break: 'configuration_order' },
  result_levels: [
    {
      code: 'HABITUDES_FAVORABLES', rank: 1, min: 12, max: 24,
      title: "Habitudes d'hydratation globalement favorables",
      description: "Vos réponses décrivent des habitudes d'hydratation favorables, avec une place centrale accordée à l'eau et une régularité appréciable au cours de la journée."
    },
    {
      code: 'HYDRATATION_FRAGILE', rank: 2, min: 25, max: 32,
      title: "Hydratation encore fragile",
      description: "Vous disposez déjà de certaines habitudes utiles, mais votre hydratation manque encore de régularité, d'anticipation ou d'adaptation dans certaines situations du quotidien."
    },
    {
      code: 'HABITUDES_INSUFFISANTES', rank: 3, min: 33, max: 60,
      title: "Habitudes d'hydratation insuffisantes",
      description: "Vos réponses suggèrent que plusieurs habitudes clés d'hydratation peuvent être nettement améliorées pour mieux couvrir vos besoins au quotidien."
    }
  ],
  classification_rules: [],
  classification_messages: {},
  safety_questions: [
    {
      id: 'HYSF01',
      text: 'Un professionnel de santé vous a-t-il demandé de limiter, contrôler ou adapter précisément votre consommation de liquides ?',
      required: true,
      answers: [
        { value: 'no', label: 'Non', triggers: [] },
        { value: 'yes', label: 'Oui', triggers: ['HYDRATATION_SAFETY_MESSAGE'] }
      ]
    },
    {
      id: 'HYSF02',
      text: 'Avez-vous actuellement ou récemment eu des pertes importantes de liquides, par exemple en raison de vomissements, diarrhées, fièvre ou transpiration inhabituelle ?',
      required: true,
      answers: [
        { value: 'no', label: 'Non', triggers: [] },
        { value: 'yes', label: 'Oui', triggers: ['HYDRATATION_SAFETY_MESSAGE'] }
      ]
    },
    {
      id: 'HYSF03',
      text: 'Avez-vous actuellement des symptômes importants tels qu\'une faiblesse inhabituelle, des vertiges marqués, une confusion, un malaise ou une diminution inhabituelle des urines ?',
      required: true,
      answers: [
        { value: 'no', label: 'Non', triggers: [] },
        { value: 'yes', label: 'Oui', triggers: ['HYDRATATION_SAFETY_MESSAGE'] }
      ]
    }
  ],
  safety_messages: {
    HYDRATATION_SAFETY_MESSAGE: {
      priority: 100,
      title: 'Certaines de vos réponses nécessitent une attention particulière.',
      text: 'Cette auto-évaluation générale ne permet pas d\'évaluer votre état d\'hydratation ni de déterminer la quantité de liquide adaptée à une situation médicale particulière.'
    }
  },
  result_ctas: [
    { label: 'Je veux faire un bilan', url: 'https://lifemetrics.fr/formulaire-bilan/', variant: 'primary', enabled: true },
    { label: 'Découvrir les autres questionnaires', url: '/tests-sante/', variant: 'secondary', enabled: true }
  ],
  disclaimer: {
    before: "Cette auto-évaluation LifeMetrics est destinée à vous aider à mieux comprendre vos habitudes d'hydratation.",
    after: "Le Score LifeMetrics - Hydratation est un indicateur propriétaire d'auto-évaluation."
  },
  approvals: { content_scoring: true, legal_licensing: false, technical_runtime: true, publication: false }
};

const baseSafety = { HYSF01: 'no', HYSF02: 'no', HYSF03: 'no' };

// 1. Min / Max / Boundary Checks
const answers_min = { ...baseSafety };
const answers_max = { ...baseSafety };
for (let i = 1; i <= 12; i++) {
  const qId = 'HY' + (i < 10 ? '0' + i : i);
  answers_min[qId] = '1';
  answers_max[qId] = '5';
}

const res_12 = engine.score(config, answers_min);
assert.equal(res_12.final_score, 12);
assert.equal(res_12.calculated_category, 'HABITUDES_FAVORABLES');
assert.equal(res_12.displayed_category, 'HABITUDES_FAVORABLES');

const res_60 = engine.score(config, answers_max);
assert.equal(res_60.final_score, 60);
assert.equal(res_60.calculated_category, 'HABITUDES_INSUFFISANTES');
assert.equal(res_60.displayed_category, 'HABITUDES_INSUFFISANTES');

// Boundaries 24/25 and 32/33
const answers_24 = { ...baseSafety };
const answers_25 = { ...baseSafety };
const answers_32 = { ...baseSafety };
const answers_33 = { ...baseSafety };
for (let i = 1; i <= 12; i++) {
  const qId = 'HY' + (i < 10 ? '0' + i : i);
  answers_24[qId] = '2'; // sum = 24
  answers_25[qId] = '2'; // 11*2 + 3 = 25
  answers_32[qId] = i <= 8 ? '3' : '2'; // 8*3 + 4*2 = 32
  answers_33[qId] = i <= 9 ? '3' : '2'; // 9*3 + 3*2 = 33
}
answers_25.HY01 = '3';

assert.equal(engine.score(config, answers_24).final_score, 24);
assert.equal(engine.score(config, answers_24).calculated_category, 'HABITUDES_FAVORABLES');
assert.equal(engine.score(config, answers_25).final_score, 25);
assert.equal(engine.score(config, answers_25).calculated_category, 'HYDRATATION_FRAGILE');
assert.equal(engine.score(config, answers_32).final_score, 32);
assert.equal(engine.score(config, answers_32).calculated_category, 'HYDRATATION_FRAGILE');
assert.equal(engine.score(config, answers_33).final_score, 33);
assert.equal(engine.score(config, answers_33).calculated_category, 'HABITUDES_INSUFFISANTES');

// 2. N/A Normalization on HY05
const answers_na_min = { ...answers_min, HY05: 'na' };
const res_na_min = engine.score(config, answers_na_min);
assert.equal(res_na_min.raw_score, 11);
assert.equal(res_na_min.available_min, 11);
assert.equal(res_na_min.available_max, 55);
assert.equal(res_na_min.final_score, 12);
assert.equal(res_na_min.calculated_category, 'HABITUDES_FAVORABLES');

const answers_na_max = { ...answers_max, HY05: 'na' };
const res_na_max = engine.score(config, answers_na_max);
assert.equal(res_na_max.raw_score, 55);
assert.equal(res_na_max.available_min, 11);
assert.equal(res_na_max.available_max, 55);
assert.equal(res_na_max.final_score, 60);
assert.equal(res_na_max.calculated_category, 'HABITUDES_INSUFFISANTES');

// 3. Safety Flags
const res_sf = engine.score(config, { ...answers_min, HYSF01: 'yes', HYSF02: 'yes' });
assert.equal(res_sf.final_score, 12);
assert.deepEqual(res_sf.safety_flag_codes, ['HYDRATATION_SAFETY_MESSAGE']);

// 4. Dimension Calculation and Weakest Dimensions
const profile_sweet = {
  ...answers_min,
  HY07: '5',
  HY08: '5'
};
const res_sweet = engine.score(config, profile_sweet);
assert.equal(res_sweet.final_score, 20);
assert.equal(res_sweet.calculated_category, 'HABITUDES_FAVORABLES');
assert.equal(res_sweet.weakest_dimensions[0], 'choix-boissons');

console.log('Questionnaire Hydratation JS Unit & Scoring Tests: ALL PASSED.');
