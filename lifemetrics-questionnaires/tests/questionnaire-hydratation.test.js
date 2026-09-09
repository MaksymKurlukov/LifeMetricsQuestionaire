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
  scoring_direction: 'higher_is_better',
  score: {
    target_min: 0,
    target_max: 48,
    normalize_when_unavailable: true,
    rounding: 'half_up'
  },
  questions: [
    {
      id: 'HY01',
      dimension: 'place-eau',
      text: "Au cours des 14 derniers jours, quelle place l'eau a-t-elle occupée parmi les boissons que vous consommez pour vous hydrater ?",
      help: "L'eau peut être plate ou gazeuse.",
      required: true,
      answers: [
        { value: '0', label: 'Très faible', points: 0, applicable: true },
        { value: '1', label: 'Faible', points: 1, applicable: true },
        { value: '2', label: 'Environ la moitié de mes boissons', points: 2, applicable: true },
        { value: '3', label: 'Majoritaire', points: 3, applicable: true },
        { value: '4', label: "L'eau est clairement ma boisson principale", points: 4, applicable: true }
      ]
    },
    {
      id: 'HY02',
      dimension: 'place-eau',
      text: "Au cours des 14 derniers jours, à quelle fréquence avez-vous eu l'impression de boire suffisamment pour vos besoins au cours de la journée ?",
      required: true,
      answers: [
        { value: '0', label: 'Jamais ou presque jamais', points: 0, applicable: true },
        { value: '1', label: 'Rarement', points: 1, applicable: true },
        { value: '2', label: 'Environ la moitié du temps', points: 2, applicable: true },
        { value: '3', label: 'Souvent', points: 3, applicable: true },
        { value: '4', label: 'Presque tous les jours', points: 4, applicable: true }
      ]
    },
    {
      id: 'HY03',
      dimension: 'repartition-hydratation',
      text: "Au cours des 14 derniers jours, à quelle fréquence avez-vous bu régulièrement à différents moments de la journée plutôt que de boire une grande quantité seulement à quelques occasions ?",
      required: true,
      answers: [
        { value: '0', label: 'Jamais ou presque jamais', points: 0, applicable: true },
        { value: '1', label: 'Rarement', points: 1, applicable: true },
        { value: '2', label: 'Environ la moitié du temps', points: 2, applicable: true },
        { value: '3', label: 'Souvent', points: 3, applicable: true },
        { value: '4', label: 'Presque toujours', points: 4, applicable: true }
      ]
    },
    {
      id: 'HY04',
      dimension: 'repartition-hydratation',
      text: "Au cours d'une journée habituelle, à quelle fréquence passez-vous plusieurs heures sans rien boire simplement parce que vous êtes occupé, que vous oubliez ou que vous n'avez rien à proximité ?",
      required: true,
      answers: [
        { value: '0', label: 'Très souvent', points: 0, applicable: true },
        { value: '1', label: 'Souvent', points: 1, applicable: true },
        { value: '2', label: 'Parfois', points: 2, applicable: true },
        { value: '3', label: 'Rarement', points: 3, applicable: true },
        { value: '4', label: 'Presque jamais', points: 4, applicable: true }
      ]
    },
    {
      id: 'HY05',
      dimension: 'adaptation-activite-chaleur',
      text: "Lorsque vous pratiquez une activité physique ou effectuez un effort prolongé, adaptez-vous votre hydratation avant, pendant ou après l'activité selon sa durée, son intensité et les conditions ?",
      help: "Si aucune activité physique significative n'est pratiquée actuellement, l'interface peut proposer « Non concerné actuellement ».",
      required: true,
      answers: [
        { value: '0', label: 'Jamais', points: 0, applicable: true },
        { value: '1', label: 'Rarement', points: 1, applicable: true },
        { value: '2', label: 'Parfois', points: 2, applicable: true },
        { value: '3', label: 'Souvent', points: 3, applicable: true },
        { value: '4', label: 'Presque toujours', points: 4, applicable: true },
        { value: 'na', label: 'Non concerné actuellement', points: null, applicable: false }
      ]
    },
    {
      id: 'HY06',
      dimension: 'adaptation-activite-chaleur',
      text: "Lorsqu'il fait chaud ou que vous transpirez davantage que d'habitude, pensez-vous à augmenter ou à rendre plus régulière votre consommation d'eau ?",
      required: true,
      answers: [
        { value: '0', label: 'Jamais', points: 0, applicable: true },
        { value: '1', label: 'Rarement', points: 1, applicable: true },
        { value: '2', label: 'Parfois', points: 2, applicable: true },
        { value: '3', label: 'Souvent', points: 3, applicable: true },
        { value: '4', label: 'Presque toujours', points: 4, applicable: true }
      ]
    },
    {
      id: 'HY07',
      dimension: 'choix-boissons',
      text: "Lorsque vous avez soif, à quelle fréquence choisissez-vous en priorité de l'eau ou une boisson non sucrée adaptée plutôt qu'une boisson très sucrée ?",
      required: true,
      answers: [
        { value: '0', label: 'Jamais ou presque jamais', points: 0, applicable: true },
        { value: '1', label: 'Rarement', points: 1, applicable: true },
        { value: '2', label: 'Environ la moitié du temps', points: 2, applicable: true },
        { value: '3', label: 'Souvent', points: 3, applicable: true },
        { value: '4', label: 'Presque toujours', points: 4, applicable: true }
      ]
    },
    {
      id: 'HY08',
      dimension: 'choix-boissons',
      text: "Au cours des 14 derniers jours, à quelle fréquence les sodas, boissons énergisantes, boissons sucrées ou sirops ont-ils constitué une part importante de vos boissons quotidiennes ?",
      required: true,
      answers: [
        { value: '0', label: 'Plusieurs fois par jour', points: 0, applicable: true },
        { value: '1', label: 'Environ tous les jours', points: 1, applicable: true },
        { value: '2', label: '4-6 jours par semaine', points: 2, applicable: true },
        { value: '3', label: '1-3 jours par semaine', points: 3, applicable: true },
        { value: '4', label: 'Rarement ou jamais', points: 4, applicable: true }
      ]
    },
    {
      id: 'HY09',
      dimension: 'alimentation-environnement',
      text: "Votre alimentation comprend-elle régulièrement des aliments riches en eau, par exemple des fruits, des légumes, des soupes, des laitages ou d'autres aliments comparables ?",
      required: true,
      answers: [
        { value: '0', label: 'Presque jamais', points: 0, applicable: true },
        { value: '1', label: 'Rarement', points: 1, applicable: true },
        { value: '2', label: 'De temps en temps', points: 2, applicable: true },
        { value: '3', label: 'Souvent', points: 3, applicable: true },
        { value: '4', label: 'Tous les jours ou presque', points: 4, applicable: true }
      ]
    },
    {
      id: 'HY10',
      dimension: 'alimentation-environnement',
      text: "Dans votre quotidien, avez-vous généralement de l'eau facilement disponible lorsque vous travaillez, étudiez, vous déplacez ou restez longtemps à l'extérieur de chez vous ?",
      help: "Exemples : bouteille, gourde, carafe, fontaine ou accès facile à un point d'eau.",
      required: true,
      answers: [
        { value: '0', label: 'Presque jamais', points: 0, applicable: true },
        { value: '1', label: 'Rarement', points: 1, applicable: true },
        { value: '2', label: 'Parfois', points: 2, applicable: true },
        { value: '3', label: 'Souvent', points: 3, applicable: true },
        { value: '4', label: 'Presque toujours', points: 4, applicable: true }
      ]
    },
    {
      id: 'HY11',
      dimension: 'anticipation-regularite',
      text: "Lorsque vous prévoyez une longue journée, un déplacement, un voyage, du sport ou plusieurs heures loin de chez vous, pensez-vous à prévoir l'accès à de l'eau ?",
      required: true,
      answers: [
        { value: '0', label: 'Jamais', points: 0, applicable: true },
        { value: '1', label: 'Rarement', points: 1, applicable: true },
        { value: '2', label: 'Parfois', points: 2, applicable: true },
        { value: '3', label: 'Souvent', points: 3, applicable: true },
        { value: '4', label: 'Presque toujours', points: 4, applicable: true }
      ]
    },
    {
      id: 'HY12',
      dimension: 'anticipation-regularite',
      text: "Au cours des 14 derniers jours, vos bonnes habitudes d'hydratation ont-elles été relativement régulières, y compris pendant les journées de travail, d'études ou les week-ends ?",
      required: true,
      answers: [
        { value: '0', label: 'Très irrégulières', points: 0, applicable: true },
        { value: '1', label: 'Plutôt irrégulières', points: 1, applicable: true },
        { value: '2', label: 'Variables selon les jours', points: 2, applicable: true },
        { value: '3', label: 'Généralement régulières', points: 3, applicable: true },
        { value: '4', label: 'Très régulières', points: 4, applicable: true }
      ]
    }
  ],
  dimensions: [
    { id: 'place-eau', label: "Place de l'eau", question_ids: ['HY01', 'HY02'], weakest_eligible: true },
    { id: 'repartition-hydratation', label: "Répartition de l'hydratation", question_ids: ['HY03', 'HY04'], weakest_eligible: true },
    { id: 'adaptation-activite-chaleur', label: "Adaptation à l'activité et à la chaleur", question_ids: ['HY05', 'HY06'], weakest_eligible: true },
    { id: 'choix-boissons', label: 'Choix des boissons', question_ids: ['HY07', 'HY08'], weakest_eligible: true },
    { id: 'alimentation-environnement', label: 'Alimentation et environnement', question_ids: ['HY09', 'HY10'], weakest_eligible: true },
    { id: 'anticipation-regularite', label: 'Anticipation et régularité', question_ids: ['HY11', 'HY12'], weakest_eligible: true }
  ],
  weakest_dimensions: { count: 2, tie_break: 'configuration_order' },
  result_levels: [
    {
      code: 'HABITUDES_HYDRATATION_INSUFFISANTES', rank: 0, min: 0, max: 15,
      title: "Habitudes d'hydratation insuffisantes",
      description: "Vos réponses suggèrent que plusieurs de vos habitudes d'hydratation peuvent actuellement être améliorées."
    },
    {
      code: 'HYDRATATION_A_RENFORCER', rank: 1, min: 16, max: 27,
      title: "Hydratation à renforcer",
      description: "Vous disposez déjà de certaines habitudes favorables, mais votre hydratation semble encore irrégulière dans plusieurs situations."
    },
    {
      code: 'HABITUDES_HYDRATATION_FAVORABLES', rank: 2, min: 28, max: 38,
      title: "Habitudes d'hydratation favorables",
      description: "Vos réponses décrivent des habitudes d'hydratation globalement favorables."
    },
    {
      code: 'TRES_BONNES_HABITUDES_HYDRATATION', rank: 3, min: 39, max: 48,
      title: "Très bonnes habitudes d'hydratation",
      description: "Votre profil indique des habitudes d'hydratation particulièrement favorables sur les dimensions évaluées."
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
        { value: 'yes', label: 'Oui', triggers: ['HYDRATION_ATTENTION_MESSAGE'] }
      ]
    },
    {
      id: 'HYSF02',
      text: 'Avez-vous actuellement ou récemment eu des pertes importantes de liquides, par exemple en raison de vomissements, diarrhées, fièvre ou transpiration inhabituelle ?',
      required: true,
      answers: [
        { value: 'no', label: 'Non', triggers: [] },
        { value: 'yes', label: 'Oui', triggers: ['HYDRATION_ATTENTION_MESSAGE'] }
      ]
    },
    {
      id: 'HYSF03',
      text: 'Avez-vous actuellement des symptômes importants tels qu\'une faiblesse inhabituelle, des vertiges marqués, une confusion, un malaise ou une diminution inhabituelle des urines ?',
      required: true,
      answers: [
        { value: 'no', label: 'Non', triggers: [] },
        { value: 'yes', label: 'Oui', triggers: ['HYDRATION_ATTENTION_MESSAGE'] }
      ]
    }
  ],
  safety_messages: {
    HYDRATION_ATTENTION_MESSAGE: {
      priority: 100,
      title: 'Certaines de vos réponses nécessitent une attention particulière.',
      text: 'Cette auto-évaluation générale ne permet pas d\'évaluer votre état d\'hydratation ni de déterminer la quantité de liquide adaptée à une situation médicale particulière.'
    }
  },
  result_ctas: [
    { label: 'Découvrir mon bilan VitaScan', url: '/vitascan/', variant: 'primary', enabled: true }
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
  answers_min[qId] = '0';
  answers_max[qId] = '4';
}

const res_0 = engine.score(config, answers_min);
assert.equal(res_0.final_score, 0);
assert.equal(res_0.calculated_category, 'HABITUDES_HYDRATATION_INSUFFISANTES');
assert.equal(res_0.displayed_category, 'HABITUDES_HYDRATATION_INSUFFISANTES');

const res_48 = engine.score(config, answers_max);
assert.equal(res_48.final_score, 48);
assert.equal(res_48.calculated_category, 'TRES_BONNES_HABITUDES_HYDRATATION');
assert.equal(res_48.displayed_category, 'TRES_BONNES_HABITUDES_HYDRATATION');

// 2. N/A Normalization on HY05
const answers_na = { ...answers_max, HY05: 'na' };
const res_na = engine.score(config, answers_na);
assert.equal(res_na.raw_score, 44);
assert.equal(res_na.available_max, 44);
assert.equal(res_na.final_score, 48);
assert.equal(res_na.calculated_category, 'TRES_BONNES_HABITUDES_HYDRATATION');

// 3. Safety Flags
const res_sf = engine.score(config, { ...answers_max, HYSF01: 'yes', HYSF02: 'yes' });
assert.equal(res_sf.final_score, 48);
assert.deepEqual(res_sf.safety_flag_codes, ['HYDRATION_ATTENTION_MESSAGE']);

// 4. Synthetic Profiles (PDF Section 13)
// Profile 1: Bon quotidien, faible adaptation chaleur (43/48 -> Très bonnes habitudes)
const profile_1 = {
  ...baseSafety,
  HY01: '4', HY02: '4',
  HY03: '4', HY04: '4',
  HY05: '4', HY06: '1',
  HY07: '4', HY08: '4',
  HY09: '3', HY10: '4',
  HY11: '4', HY12: '3'
};
const res_p1 = engine.score(config, profile_1);
assert.equal(res_p1.final_score, 43);
assert.equal(res_p1.calculated_category, 'TRES_BONNES_HABITUDES_HYDRATATION');
assert.ok(res_p1.weakest_dimensions.includes('adaptation-activite-chaleur'));

// Profile 4: Beaucoup de boissons sucrées (25/48 -> Hydratation à renforcer)
const profile_4 = {
  ...baseSafety,
  HY01: '2', HY02: '2',
  HY03: '3', HY04: '3',
  HY05: '2', HY06: '2',
  HY07: '0', HY08: '0',
  HY09: '3', HY10: '3',
  HY11: '2', HY12: '3'
};
const res_p4 = engine.score(config, profile_4);
assert.equal(res_p4.final_score, 25);
assert.equal(res_p4.calculated_category, 'HYDRATATION_A_RENFORCER');
assert.equal(res_p4.weakest_dimensions[0], 'choix-boissons');

// Profile 5: Très bonnes habitudes, sans sport (44/44 -> 48/48)
const profile_5 = {
  ...baseSafety,
  HY01: '4', HY02: '4',
  HY03: '4', HY04: '4',
  HY05: 'na', HY06: '4',
  HY07: '4', HY08: '4',
  HY09: '4', HY10: '4',
  HY11: '4', HY12: '4'
};
const res_p5 = engine.score(config, profile_5);
assert.equal(res_p5.raw_score, 44);
assert.equal(res_p5.available_max, 44);
assert.equal(res_p5.final_score, 48);
assert.equal(res_p5.calculated_category, 'TRES_BONNES_HABITUDES_HYDRATATION');

console.log('Questionnaire Hydratation JS Unit & Scoring Tests: ALL PASSED.');
