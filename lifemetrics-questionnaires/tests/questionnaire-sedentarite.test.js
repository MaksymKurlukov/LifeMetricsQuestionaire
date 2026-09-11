const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const engine = require('../assets/js/questionnaire-engine.js');

const config = {
  schema_version: '2.0.0',
  id: 'sedentarite',
  version: '1.0.0',
  status: 'review',
  locale: 'fr-FR',
  title: 'Score LifeMetrics - Sédentarité',
  seo_title: 'Auto-évaluation LifeMetrics - Sédentarité',
  description: "Évaluez le volume, la continuité et l'interruption de votre sédentarité quotidienne, indépendamment de votre niveau sportif.",
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
      id: 'SD01',
      dimension: 'temps-sedentaire-quotidien',
      text: 'Au cours des 14 derniers jours, combien de temps avez-vous passé en moyenne assis ou allongé pendant vos heures d’éveil ?',
      help: 'Inclure travail/études, repas, déplacements, télévision, ordinateur, jeux vidéo, téléphone et autres loisirs assis. Ne pas compter le sommeil. Les seuils constituent une gradation LifeMetrics.',
      required: true,
      answers: [
        { value: '1', label: 'Moins de 3 heures', points: 1, applicable: true },
        { value: '2', label: 'Entre 3 et moins de 5 heures', points: 2, applicable: true },
        { value: '3', label: 'Entre 5 et moins de 7 heures', points: 3, applicable: true },
        { value: '4', label: 'Entre 7 et 9 heures', points: 4, applicable: true },
        { value: '5', label: 'Plus de 9 heures par jour', points: 5, applicable: true }
      ]
    },
    {
      id: 'SD02',
      dimension: 'temps-sedentaire-quotidien',
      text: 'Au cours des 14 derniers jours, combien de jours par semaine avez-vous passé une très grande partie de votre journée éveillée en position assise ou allongée ?',
      help: 'Complète SD01 en mesurant la fréquence des journées particulièrement sédentaires.',
      required: true,
      answers: [
        { value: '1', label: 'Rarement ou jamais', points: 1, applicable: true },
        { value: '2', label: '1-2 jours', points: 2, applicable: true },
        { value: '3', label: '3 jours', points: 3, applicable: true },
        { value: '4', label: '4-5 jours', points: 4, applicable: true },
        { value: '5', label: '6-7 jours', points: 5, applicable: true }
      ]
    },
    {
      id: 'SD03',
      dimension: 'continuite-periodes-assises',
      text: 'Lorsque vous travaillez, étudiez ou vous détendez, combien de temps restez-vous généralement assis sans vous lever ni marcher quelques minutes ?',
      help: 'Gradation LifeMetrics informée par les recommandations récentes sur les ruptures fréquentes de sédentarité.',
      required: true,
      answers: [
        { value: '1', label: 'Généralement moins de 30 minutes', points: 1, applicable: true },
        { value: '2', label: 'Entre 30 et 59 minutes', points: 2, applicable: true },
        { value: '3', label: 'Entre 60 et 89 minutes', points: 3, applicable: true },
        { value: '4', label: 'Entre 90 et 120 minutes', points: 4, applicable: true },
        { value: '5', label: 'Plus de 2 heures', points: 5, applicable: true }
      ]
    },
    {
      id: 'SD04',
      dimension: 'continuite-periodes-assises',
      text: 'Au cours des 14 derniers jours, à quelle fréquence avez-vous passé au moins deux heures presque entièrement assis sans véritable interruption de mouvement ?',
      help: 'Plus les longues séquences assises sont fréquentes, plus le score est défavorable.',
      required: true,
      answers: [
        { value: '1', label: 'Jamais ou presque jamais', points: 1, applicable: true },
        { value: '2', label: 'Rarement', points: 2, applicable: true },
        { value: '3', label: 'Plusieurs fois par semaine', points: 3, applicable: true },
        { value: '4', label: 'Environ une fois par jour', points: 4, applicable: true },
        { value: '5', label: 'Plusieurs fois par jour', points: 5, applicable: true }
      ]
    },
    {
      id: 'SD05',
      dimension: 'ruptures-sedentarite',
      text: 'Lorsque vous restez assis pendant une période prolongée, à quelle fréquence vous levez-vous pour marcher ou bouger quelques minutes ?',
      help: 'Les données Anses soutiennent des ruptures régulières, avec un bénéfice particulièrement favorable autour de 30 minutes.',
      required: true,
      answers: [
        { value: '1', label: 'Environ toutes les 30 minutes ou plus souvent', points: 1, applicable: true },
        { value: '2', label: 'Environ toutes les 30 à 60 minutes', points: 2, applicable: true },
        { value: '3', label: 'Environ toutes les 1 à 2 heures', points: 3, applicable: true },
        { value: '4', label: 'Généralement après plus de 2 heures', points: 4, applicable: true },
        { value: '5', label: 'Presque jamais', points: 5, applicable: true }
      ]
    },
    {
      id: 'SD06',
      dimension: 'ruptures-sedentarite',
      text: 'Lorsque vous interrompez une période assise, que faites-vous généralement ?',
      help: 'Le but n’est pas de transformer chaque pause en séance de sport : quelques minutes de mouvement léger constituent déjà une rupture utile.',
      required: true,
      answers: [
        { value: '1', label: 'Je marche ou bouge généralement environ 3 à 5 minutes ou davantage', points: 1, applicable: true },
        { value: '2', label: 'Je marche ou bouge quelques minutes', points: 2, applicable: true },
        { value: '3', label: 'Je reste debout ou bouge moins d’une minute', points: 3, applicable: true },
        { value: '4', label: 'Je me lève brièvement sans réellement bouger', points: 4, applicable: true },
        { value: '5', label: 'Je reste assis ou change seulement de position', points: 5, applicable: true }
      ]
    },
    {
      id: 'SD07',
      dimension: 'travail-etudes-deplacements',
      text: 'Pendant vos périodes de travail ou d’études, à quelle fréquence alternez-vous volontairement les périodes assises avec des moments debout ou en mouvement ?',
      help: '« Non concerné actuellement » reste hors score.',
      required: true,
      answers: [
        { value: '1', label: 'Très régulièrement', points: 1, applicable: true },
        { value: '2', label: 'Souvent', points: 2, applicable: true },
        { value: '3', label: 'Parfois', points: 3, applicable: true },
        { value: '4', label: 'Rarement', points: 4, applicable: true },
        { value: '5', label: 'Jamais ou presque jamais', points: 5, applicable: true },
        { value: 'na', label: 'Non concerné actuellement', points: null, applicable: false }
      ]
    },
    {
      id: 'SD08',
      dimension: 'travail-etudes-deplacements',
      text: 'Pour vos déplacements habituels, quelle part du trajet est généralement passée assis dans une voiture, les transports ou un autre véhicule ?',
      help: 'Cette question mesure la contribution des déplacements au temps sédentaire, pas la performance sportive. « Très peu de déplacements actuellement » reste hors score.',
      required: true,
      answers: [
        { value: '1', label: 'Très peu / je me déplace principalement à pied ou autrement en mouvement', points: 1, applicable: true },
        { value: '2', label: 'Une minorité seulement', points: 2, applicable: true },
        { value: '3', label: 'Environ la moitié', points: 3, applicable: true },
        { value: '4', label: 'Une très grande majorité', points: 4, applicable: true },
        { value: '5', label: 'Presque tous mes déplacements sont entièrement assis', points: 5, applicable: true },
        { value: 'na', label: 'Très peu de déplacements actuellement', points: null, applicable: false }
      ]
    },
    {
      id: 'SD09',
      dimension: 'loisirs-sedentaires',
      text: 'En dehors du travail ou des études, combien de temps passez-vous généralement assis devant un écran au cours d’une journée ?',
      help: 'Gradation comportementale LifeMetrics ; il ne s’agit pas d’un seuil médical universel de screen time.',
      required: true,
      answers: [
        { value: '1', label: 'Moins d’une heure', points: 1, applicable: true },
        { value: '2', label: '1-2 heures', points: 2, applicable: true },
        { value: '3', label: '2-4 heures', points: 3, applicable: true },
        { value: '4', label: '4-5 heures', points: 4, applicable: true },
        { value: '5', label: 'Plus de 5 heures', points: 5, applicable: true }
      ]
    },
    {
      id: 'SD10',
      dimension: 'loisirs-sedentaires',
      text: 'Lorsque vous regardez un écran ou réalisez une activité de loisir assise pendant longtemps, à quelle fréquence profitez-vous d’une occasion pour vous lever ou bouger ?',
      help: 'Exemples : entre deux épisodes, pendant une pause, entre deux parties ou pendant un appel.',
      required: true,
      answers: [
        { value: '1', label: 'Très régulièrement', points: 1, applicable: true },
        { value: '2', label: 'Souvent', points: 2, applicable: true },
        { value: '3', label: 'Parfois', points: 3, applicable: true },
        { value: '4', label: 'Rarement', points: 4, applicable: true },
        { value: '5', label: 'Jamais ou presque jamais', points: 5, applicable: true }
      ]
    },
    {
      id: 'SD11',
      dimension: 'mouvement-quotidien-regularite',
      text: 'En dehors de vos séances de sport éventuelles, à quelle fréquence intégrez-vous de petits moments de mouvement dans votre journée ?',
      help: 'Exemples : marcher quelques minutes, escaliers, tâche domestique, appel debout, petits déplacements.',
      required: true,
      answers: [
        { value: '1', label: 'Très régulièrement tout au long de la journée', points: 1, applicable: true },
        { value: '2', label: 'Régulièrement dans la journée', points: 2, applicable: true },
        { value: '3', label: 'Quelques fois dans la journée', points: 3, applicable: true },
        { value: '4', label: 'Rarement', points: 4, applicable: true },
        { value: '5', label: 'Presque jamais', points: 5, applicable: true }
      ]
    },
    {
      id: 'SD12',
      dimension: 'mouvement-quotidien-regularite',
      text: 'Au cours des 14 derniers jours, avez-vous réussi à limiter et interrompre régulièrement les longues périodes assises, y compris les jours de travail, d’études et les week-ends ?',
      help: 'Question intégrative LifeMetrics sur la stabilité des habitudes.',
      required: true,
      answers: [
        { value: '1', label: 'Presque toujours', points: 1, applicable: true },
        { value: '2', label: 'Généralement', points: 2, applicable: true },
        { value: '3', label: 'Cela dépend fortement des jours', points: 3, applicable: true },
        { value: '4', label: 'Rarement', points: 4, applicable: true },
        { value: '5', label: 'Presque jamais', points: 5, applicable: true }
      ]
    }
  ],
  dimensions: [
    { id: 'temps-sedentaire-quotidien', label: 'Temps sédentaire quotidien', question_ids: ['SD01', 'SD02'], calculation_mode: 'average', weakest_eligible: true },
    { id: 'continuite-periodes-assises', label: 'Continuité des périodes assises', question_ids: ['SD03', 'SD04'], calculation_mode: 'average', weakest_eligible: true },
    { id: 'ruptures-sedentarite', label: 'Ruptures de sédentarité', question_ids: ['SD05', 'SD06'], calculation_mode: 'average', weakest_eligible: true },
    { id: 'travail-etudes-deplacements', label: 'Travail / études et déplacements', question_ids: ['SD07', 'SD08'], calculation_mode: 'average', weakest_eligible: true },
    { id: 'loisirs-sedentaires', label: 'Loisirs sédentaires', question_ids: ['SD09', 'SD10'], calculation_mode: 'average', weakest_eligible: true },
    { id: 'mouvement-quotidien-regularite', label: 'Mouvement quotidien et régularité', question_ids: ['SD11', 'SD12'], calculation_mode: 'average', weakest_eligible: true }
  ],
  weakest_dimensions: { count: 2, tie_break: 'configuration_order' },
  result_levels: [
    {
      code: 'HABITUDES_FAVORABLES',
      rank: 1,
      min: 12,
      max: 24,
      title: 'Habitudes de sédentarité globalement favorables',
      description: 'Vos habitudes vis-à-vis de la sédentarité sont globalement favorables.',
      recommendations: ['Maintenir des ruptures régulières', 'Éviter les séquences assises très longues', 'Conserver du mouvement léger au fil de la journée']
    },
    {
      code: 'SEDENTARITE_A_REDUIRE',
      rank: 2,
      min: 25,
      max: 32,
      title: 'Sédentarité à réduire',
      description: 'Votre sédentarité reste à réduire.',
      recommendations: ['Réduire les plus longues périodes assises', 'Multiplier les courtes interruptions actives', 'Augmenter le mouvement léger dans la journée']
    },
    {
      code: 'SEDENTARITE_ELEVEE',
      rank: 3,
      min: 33,
      max: 60,
      title: 'Sédentarité élevée',
      description: 'Votre niveau de sédentarité est actuellement élevé.',
      recommendations: ['Interrompre plus souvent la position assise', 'Réduire progressivement le temps assis total', 'Intégrer davantage de mouvement léger chaque jour']
    }
  ],
  classification_rules: [
    {
      id: 'GUARDRAIL_TEMPS_SEDENTAIRE_D1',
      type: 'category_cap',
      metric: 'dimension_score',
      dimension: 'temps-sedentaire-quotidien',
      operator: '>=',
      value: 8,
      max_category: 'SEDENTARITE_A_REDUIRE',
      message_code: 'SEDENTARITE_VOLUME_CAP'
    }
  ],
  classification_messages: {
    'SEDENTARITE_VOLUME_CAP': {
      title: 'Temps quotidien assis important',
      text: 'Votre score global reflète plusieurs habitudes favorables concernant l’interruption de la position assise. Cependant, votre temps total passé assis reste élevé. Des pauses régulières sont bénéfiques, mais elles ne compensent pas entièrement un volume quotidien important de sédentarité.'
    }
  },
  safety_questions: [],
  safety_messages: {},
  result_ctas: [
    { label: 'Je veux faire un bilan', url: 'https://lifemetrics.fr/formulaire-bilan/', variant: 'primary', enabled: true },
    { label: 'Découvrir les autres questionnaires', url: '/tests-sante/', variant: 'secondary', enabled: true }
  ],
  disclaimer: {
    before: 'Cette auto-évaluation LifeMetrics est destinée à vous aider à mieux comprendre le volume, la continuité et l’interruption de votre sédentarité quotidienne.',
    after: 'Le Score LifeMetrics - Sédentarité est un outil propriétaire d’auto-évaluation.'
  },
  approvals: { content_scoring: true, legal_licensing: false, technical_runtime: true, publication: false }
};

// 1. Min / Max / Boundary Checks
const answers_min = {};
const answers_max = {};
for (let i = 1; i <= 12; i++) {
  const qId = 'SD' + (i < 10 ? '0' + i : i);
  answers_min[qId] = '1';
  answers_max[qId] = '5';
}

const res_12 = engine.score(config, answers_min);
assert.equal(res_12.final_score, 12);
assert.equal(res_12.calculated_category, 'HABITUDES_FAVORABLES');
assert.equal(res_12.displayed_category, 'HABITUDES_FAVORABLES');

const res_60 = engine.score(config, answers_max);
assert.equal(res_60.final_score, 60);
assert.equal(res_60.calculated_category, 'SEDENTARITE_ELEVEE');
assert.equal(res_60.displayed_category, 'SEDENTARITE_ELEVEE');

// Boundaries 24/25 and 32/33
const answers_24 = {};
const answers_25 = {};
const answers_32 = {};
const answers_33 = {};
for (let i = 1; i <= 12; i++) {
  const qId = 'SD' + (i < 10 ? '0' + i : i);
  answers_24[qId] = '2'; // sum = 24
  answers_25[qId] = '2';
  answers_32[qId] = (i <= 8 && i >= 3) ? '3' : '2'; // SD01=2, SD02=2 (D1=4), 6 questions with 3, 4 with 2 => 4 + 18 + 8 = 30?
}
// Let's set precise values for 25, 32, 33 with D1 < 8:
answers_25.SD03 = '3'; // D1 = 4, sum = 25
// For 32: D1 = 4, 8 questions with 3 and 2 questions with 2 (e.g. SD01=2, SD02=2, SD03..SD10=3, SD11=2, SD12=2 -> 4 + 24 + 4 = 32)
for (let i = 1; i <= 12; i++) {
  const qId = 'SD' + (i < 10 ? '0' + i : i);
  answers_32[qId] = (i >= 3 && i <= 10) ? '3' : '2';
  answers_33[qId] = (i >= 3 && i <= 11) ? '3' : '2'; // 4 + 27 + 2 = 33
}

assert.equal(engine.score(config, answers_24).final_score, 24);
assert.equal(engine.score(config, answers_24).calculated_category, 'HABITUDES_FAVORABLES');
assert.equal(engine.score(config, answers_25).final_score, 25);
assert.equal(engine.score(config, answers_25).calculated_category, 'SEDENTARITE_A_REDUIRE');
assert.equal(engine.score(config, answers_32).final_score, 32);
assert.equal(engine.score(config, answers_32).calculated_category, 'SEDENTARITE_A_REDUIRE');
assert.equal(engine.score(config, answers_33).final_score, 33);
assert.equal(engine.score(config, answers_33).calculated_category, 'SEDENTARITE_ELEVEE');

// 2. N/A Normalization (SD07=na, SD08=na, or both)
const answers_na_single = { ...answers_min, SD07: 'na' };
const res_na_single = engine.score(config, answers_na_single);
assert.equal(res_na_single.raw_score, 11);
assert.equal(res_na_single.available_min, 11);
assert.equal(res_na_single.available_max, 55);
assert.equal(res_na_single.final_score, 12);

const answers_na_both = { ...answers_min, SD07: 'na', SD08: 'na' };
const res_na_both = engine.score(config, answers_na_both);
assert.equal(res_na_both.raw_score, 10);
assert.equal(res_na_both.available_min, 10);
assert.equal(res_na_both.available_max, 50);
assert.equal(res_na_both.final_score, 12);
assert.equal(res_na_both.dimensions.find(d => d.id === 'travail-etudes-deplacements').unavailable, true);
assert.ok(!res_na_both.weakest_dimensions.includes('travail-etudes-deplacements'));

// 3. Guardrail D1 = SD01 + SD02 >= 8
// D1 = 7 -> No guardrail
const answers_d1_7 = {
  SD01: '4', SD02: '3',
  SD03: '1', SD04: '1', SD05: '1', SD06: '1',
  SD07: '1', SD08: '1', SD09: '1', SD10: '1',
  SD11: '1', SD12: '1'
};
const res_d1_7 = engine.score(config, answers_d1_7);
assert.equal(res_d1_7.final_score, 17);
assert.equal(res_d1_7.calculated_category, 'HABITUDES_FAVORABLES');
assert.equal(res_d1_7.displayed_category, 'HABITUDES_FAVORABLES');
assert.equal(res_d1_7.applied_classification_rules.length, 0);

// D1 = 8 -> Guardrail caps to SEDENTARITE_A_REDUIRE (score unchanged)
const answers_d1_8 = {
  SD01: '4', SD02: '4',
  SD03: '1', SD04: '1', SD05: '1', SD06: '1',
  SD07: '1', SD08: '1', SD09: '1', SD10: '1',
  SD11: '1', SD12: '1'
};
const res_d1_8 = engine.score(config, answers_d1_8);
assert.equal(res_d1_8.final_score, 18);
assert.equal(res_d1_8.calculated_category, 'HABITUDES_FAVORABLES');
assert.equal(res_d1_8.displayed_category, 'SEDENTARITE_A_REDUIRE');
assert.ok(res_d1_8.applied_classification_rules.includes('GUARDRAIL_TEMPS_SEDENTAIRE_D1'));
assert.deepEqual(res_d1_8.classification_message_codes, ['SEDENTARITE_VOLUME_CAP']);

// D1 = 10 -> Guardrail caps to SEDENTARITE_A_REDUIRE (never red!)
const answers_d1_10 = {
  SD01: '5', SD02: '5',
  SD03: '1', SD04: '1', SD05: '1', SD06: '1',
  SD07: '1', SD08: '1', SD09: '1', SD10: '1',
  SD11: '1', SD12: '1'
};
const res_d1_10 = engine.score(config, answers_d1_10);
assert.equal(res_d1_10.final_score, 20);
assert.equal(res_d1_10.calculated_category, 'HABITUDES_FAVORABLES');
assert.equal(res_d1_10.displayed_category, 'SEDENTARITE_A_REDUIRE');

console.log('Questionnaire Sédentarité JS Unit & Scoring Tests: ALL PASSED.');
