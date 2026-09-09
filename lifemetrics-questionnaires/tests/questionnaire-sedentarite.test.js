const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const engine = require('../assets/js/questionnaire-engine.js');

// Load PHP configuration by evaluating structure in JS
const phpFile = fs.readFileSync(path.join(__dirname, '..', 'questionnaires', 'sedentarite', 'questionnaire.php'), 'utf8');

// We can extract JSON-compatible configuration or test through questionnaire-engine
// Let's create the JS equivalent of the Sédentarité config or convert
const config = {
  schema_version: '2.0.0',
  id: 'sedentarite',
  version: '1.0.0',
  status: 'review',
  locale: 'fr-FR',
  title: 'Score LifeMetrics - Sédentarité',
  description: "Évaluez le volume, la continuité et l'interruption de votre sédentarité quotidienne, indépendamment de votre niveau sportif.",
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
      id: 'SD01',
      dimension: 'temps-sedentaire-quotidien',
      text: "Au cours des 14 derniers jours, combien de temps avez-vous passé en moyenne assis ou allongé pendant vos heures d'éveil ?",
      required: true,
      answers: [
        { value: '0', label: 'Plus de 9 heures par jour', points: 0, applicable: true },
        { value: '1', label: 'Entre 7 et 9 heures', points: 1, applicable: true },
        { value: '2', label: 'Entre 5 et moins de 7 heures', points: 2, applicable: true },
        { value: '3', label: 'Entre 3 et moins de 5 heures', points: 3, applicable: true },
        { value: '4', label: 'Moins de 3 heures', points: 4, applicable: true }
      ]
    },
    {
      id: 'SD02',
      dimension: 'temps-sedentaire-quotidien',
      text: "Au cours des 14 derniers jours, combien de jours par semaine avez-vous passé une très grande partie de votre journée éveillée en position assise ou allongée ?",
      required: true,
      answers: [
        { value: '0', label: '6-7 jours', points: 0, applicable: true },
        { value: '1', label: '4-5 jours', points: 1, applicable: true },
        { value: '2', label: '3 jours', points: 2, applicable: true },
        { value: '3', label: '1-2 jours', points: 3, applicable: true },
        { value: '4', label: 'Rarement ou jamais', points: 4, applicable: true }
      ]
    },
    {
      id: 'SD03',
      dimension: 'continuite-periodes-assises',
      text: 'Lorsque vous travaillez, étudiez ou vous détendez, combien de temps restez-vous généralement assis sans vous lever ni marcher quelques minutes ?',
      required: true,
      answers: [
        { value: '0', label: 'Plus de 2 heures', points: 0, applicable: true },
        { value: '1', label: 'Entre 90 et 120 minutes', points: 1, applicable: true },
        { value: '2', label: 'Entre 60 et 89 minutes', points: 2, applicable: true },
        { value: '3', label: 'Entre 30 et 59 minutes', points: 3, applicable: true },
        { value: '4', label: 'Généralement moins de 30 minutes', points: 4, applicable: true }
      ]
    },
    {
      id: 'SD04',
      dimension: 'continuite-periodes-assises',
      text: 'Au cours des 14 derniers jours, à quelle fréquence avez-vous passé au moins deux heures presque entièrement assis sans véritable interruption de mouvement ?',
      required: true,
      answers: [
        { value: '0', label: 'Plusieurs fois par jour', points: 0, applicable: true },
        { value: '1', label: 'Environ une fois par jour', points: 1, applicable: true },
        { value: '2', label: 'Plusieurs fois par semaine', points: 2, applicable: true },
        { value: '3', label: 'Rarement', points: 3, applicable: true },
        { value: '4', label: 'Jamais ou presque jamais', points: 4, applicable: true }
      ]
    },
    {
      id: 'SD05',
      dimension: 'ruptures-sedentarite',
      text: 'Lorsque vous restez assis pendant une période prolongée, à quelle fréquence vous levez-vous pour marcher ou bouger quelques minutes ?',
      required: true,
      answers: [
        { value: '0', label: 'Presque jamais', points: 0, applicable: true },
        { value: '1', label: 'Généralement après plus de 2 heures', points: 1, applicable: true },
        { value: '2', label: 'Environ toutes les 1 à 2 heures', points: 2, applicable: true },
        { value: '3', label: 'Environ toutes les 30 à 60 minutes', points: 3, applicable: true },
        { value: '4', label: 'Environ toutes les 30 minutes ou plus souvent', points: 4, applicable: true }
      ]
    },
    {
      id: 'SD06',
      dimension: 'ruptures-sedentarite',
      text: 'Lorsque vous interrompez une période assise, que faites-vous généralement ?',
      required: true,
      answers: [
        { value: '0', label: 'Je reste assis ou change seulement de position', points: 0, applicable: true },
        { value: '1', label: 'Je me lève brièvement sans réellement bouger', points: 1, applicable: true },
        { value: '2', label: 'Je reste debout ou bouge moins d\'une minute', points: 2, applicable: true },
        { value: '3', label: 'Je marche ou bouge quelques minutes', points: 3, applicable: true },
        { value: '4', label: 'Je marche ou bouge généralement environ 3 à 5 minutes ou davantage', points: 4, applicable: true }
      ]
    },
    {
      id: 'SD07',
      dimension: 'travail-etudes-deplacements',
      text: 'Pendant vos périodes de travail ou d\'études, à quelle fréquence alternez-vous volontairement les périodes assises avec des moments debout ou en mouvement ?',
      required: true,
      answers: [
        { value: '0', label: 'Jamais ou presque jamais', points: 0, applicable: true },
        { value: '1', label: 'Rarement', points: 1, applicable: true },
        { value: '2', label: 'Parfois', points: 2, applicable: true },
        { value: '3', label: 'Souvent', points: 3, applicable: true },
        { value: '4', label: 'Très régulièrement', points: 4, applicable: true },
        { value: 'na', label: 'Non concerné actuellement', points: null, applicable: false }
      ]
    },
    {
      id: 'SD08',
      dimension: 'travail-etudes-deplacements',
      text: 'Pour vos déplacements habituels, quelle part du trajet est généralement passée assis dans une voiture, les transports ou un autre véhicule ?',
      required: true,
      answers: [
        { value: '0', label: 'Presque tous mes déplacements sont entièrement assis', points: 0, applicable: true },
        { value: '1', label: 'Une très grande majorité', points: 1, applicable: true },
        { value: '2', label: 'Environ la moitié', points: 2, applicable: true },
        { value: '3', label: 'Une minorité seulement', points: 3, applicable: true },
        { value: '4', label: 'Très peu / je me déplace principalement à pied ou autrement en mouvement', points: 4, applicable: true },
        { value: 'na', label: 'Très peu de déplacements actuellement', points: null, applicable: false }
      ]
    },
    {
      id: 'SD09',
      dimension: 'loisirs-sedentaires',
      text: 'En dehors du travail ou des études, combien de temps passez-vous généralement assis devant un écran au cours d\'une journée ?',
      required: true,
      answers: [
        { value: '0', label: 'Plus de 5 heures', points: 0, applicable: true },
        { value: '1', label: '4-5 heures', points: 1, applicable: true },
        { value: '2', label: '2-4 heures', points: 2, applicable: true },
        { value: '3', label: '1-2 heures', points: 3, applicable: true },
        { value: '4', label: 'Moins d\'une heure', points: 4, applicable: true }
      ]
    },
    {
      id: 'SD10',
      dimension: 'loisirs-sedentaires',
      text: 'Lorsque vous regardez un écran ou réalisez une activité de loisir assise pendant longtemps, à quelle fréquence profitez-vous d\'une occasion pour vous lever ou bouger ?',
      required: true,
      answers: [
        { value: '0', label: 'Jamais ou presque jamais', points: 0, applicable: true },
        { value: '1', label: 'Rarement', points: 1, applicable: true },
        { value: '2', label: 'Parfois', points: 2, applicable: true },
        { value: '3', label: 'Souvent', points: 3, applicable: true },
        { value: '4', label: 'Très régulièrement', points: 4, applicable: true }
      ]
    },
    {
      id: 'SD11',
      dimension: 'mouvement-quotidien-regularite',
      text: 'En dehors de vos séances de sport éventuelles, à quelle fréquence intégrez-vous de petits moments de mouvement dans votre journée ?',
      required: true,
      answers: [
        { value: '0', label: 'Presque jamais', points: 0, applicable: true },
        { value: '1', label: 'Rarement', points: 1, applicable: true },
        { value: '2', label: 'Quelques fois dans la journée', points: 2, applicable: true },
        { value: '3', label: 'Régulièrement dans la journée', points: 3, applicable: true },
        { value: '4', label: 'Très régulièrement tout au long de la journée', points: 4, applicable: true }
      ]
    },
    {
      id: 'SD12',
      dimension: 'mouvement-quotidien-regularite',
      text: 'Au cours des 14 derniers jours, avez-vous réussi à limiter et interrompre régulièrement les longues périodes assises, y compris les jours de travail, d\'études et les week-ends ?',
      required: true,
      answers: [
        { value: '0', label: 'Presque jamais', points: 0, applicable: true },
        { value: '1', label: 'Rarement', points: 1, applicable: true },
        { value: '2', label: 'Cela dépend fortement des jours', points: 2, applicable: true },
        { value: '3', label: 'Généralement', points: 3, applicable: true },
        { value: '4', label: 'Presque toujours', points: 4, applicable: true }
      ]
    }
  ],
  dimensions: [
    {
      id: 'temps-sedentaire-quotidien',
      label: 'Temps sédentaire quotidien',
      question_ids: ['SD01', 'SD02'],
      weakest_eligible: true,
      attention: { metric: 'dimension_score', operator: '<=', value: 2, message_code: 'ATTENTION_TEMPS_SEDENTAIRE' }
    },
    {
      id: 'continuite-periodes-assises',
      label: 'Continuité des périodes assises',
      question_ids: ['SD03', 'SD04'],
      weakest_eligible: true,
      attention: { metric: 'dimension_score', operator: '<=', value: 2, message_code: 'ATTENTION_CONTINUITE_ASSISES' }
    },
    {
      id: 'ruptures-sedentarite',
      label: 'Ruptures de sédentarité',
      question_ids: ['SD05', 'SD06'],
      weakest_eligible: true,
      attention: { metric: 'dimension_score', operator: '<=', value: 2, message_code: 'ATTENTION_RUPTURES_SEDENTARITE' }
    },
    {
      id: 'travail-etudes-deplacements',
      label: 'Travail / études et déplacements',
      question_ids: ['SD07', 'SD08'],
      weakest_eligible: true,
      attention: { metric: 'dimension_percentage', operator: '<=', value: 25, message_code: 'ATTENTION_TRAVAIL_DEPLACEMENTS' }
    },
    {
      id: 'loisirs-sedentaires',
      label: 'Loisirs sédentaires',
      question_ids: ['SD09', 'SD10'],
      weakest_eligible: true,
      attention: { metric: 'dimension_score', operator: '<=', value: 2, message_code: 'ATTENTION_LOISIRS_SEDENTAIRES' }
    },
    {
      id: 'mouvement-quotidien-regularite',
      label: 'Mouvement quotidien et régularité',
      question_ids: ['SD11', 'SD12'],
      weakest_eligible: true,
      attention: { metric: 'dimension_score', operator: '<=', value: 2, message_code: 'ATTENTION_MOUVEMENT_REGULARITE' }
    }
  ],
  weakest_dimensions: { count: 2, tie_break: 'configuration_order' },
  result_levels: [
    { code: 'SEDENTARITE_ELEVEE', rank: 0, min: 0, max: 15, title: 'Sédentarité élevée', description: 'Desc', recommendations: [] },
    { code: 'SEDENTARITE_A_REDUIRE', rank: 1, min: 16, max: 27, title: 'Sédentarité à réduire', description: 'Desc', recommendations: [] },
    { code: 'HABITUDES_SEDENTARITE_GLOBALEMENT_FAVORABLES', rank: 2, min: 28, max: 38, title: 'Habitudes globalement favorables', description: 'Desc', recommendations: [] },
    { code: 'TRES_BONNES_HABITUDES_ANTI_SEDENTARITE', rank: 3, min: 39, max: 48, title: 'Très bonnes habitudes anti-sédentarité', description: 'Desc', recommendations: [] }
  ],
  classification_rules: [
    {
      id: 'CAP_HIGH_SEDENTARY_TIME',
      type: 'category_cap',
      metric: 'dimension_score',
      dimension: 'temps-sedentaire-quotidien',
      operator: '<=',
      value: 2,
      max_category: 'SEDENTARITE_A_REDUIRE',
      message_code: 'SEDENTARITE_VOLUME_CAP'
    }
  ],
  classification_messages: {
    'SEDENTARITE_VOLUME_CAP': { title: 'Temps assis quotidien élevé', text: 'Text' },
    'ATTENTION_TEMPS_SEDENTAIRE': { title: 'Attention', text: 'Text' },
    'ATTENTION_CONTINUITE_ASSISES': { title: 'Attention', text: 'Text' },
    'ATTENTION_RUPTURES_SEDENTARITE': { title: 'Attention', text: 'Text' },
    'ATTENTION_TRAVAIL_DEPLACEMENTS': { title: 'Attention', text: 'Text' },
    'ATTENTION_LOISIRS_SEDENTAIRES': { title: 'Attention', text: 'Text' },
    'ATTENTION_MOUVEMENT_REGULARITE': { title: 'Attention', text: 'Text' }
  },
  safety_questions: [],
  safety_messages: {},
  result_ctas: [{ label: 'Bilan', url: '/vitascan/', variant: 'primary', enabled: true }],
  disclaimer: { before: 'Before', after: 'After' },
  approvals: { content_scoring: true, legal_licensing: false, technical_runtime: true, publication: false }
};

// 1. Min / Max / Boundary Checks
const answers_min = {};
const answers_max = {};
for (let i = 1; i <= 12; i++) {
  const qId = 'SD' + (i < 10 ? '0' + i : i);
  answers_min[qId] = '0';
  answers_max[qId] = '4';
}

const res_0 = engine.score(config, answers_min);
assert.equal(res_0.final_score, 0);
assert.equal(res_0.calculated_category, 'SEDENTARITE_ELEVEE');
assert.equal(res_0.displayed_category, 'SEDENTARITE_ELEVEE');

const res_48 = engine.score(config, answers_max);
assert.equal(res_48.final_score, 48);
assert.equal(res_48.calculated_category, 'TRES_BONNES_HABITUDES_ANTI_SEDENTARITE');
assert.equal(res_48.displayed_category, 'TRES_BONNES_HABITUDES_ANTI_SEDENTARITE');

// 2. N/A Normalization
const answers_na = { ...answers_max, SD07: 'na', SD08: 'na' };
const res_na = engine.score(config, answers_na);
assert.equal(res_na.raw_score, 40);
assert.equal(res_na.available_max, 40);
assert.equal(res_na.final_score, 48);

// 3. Guardrail D1 <= 2/8 capping
const answers_guardrail = {
  SD01: '1', SD02: '1',
  SD03: '4', SD04: '4',
  SD05: '4', SD06: '4',
  SD07: '4', SD08: '4',
  SD09: '4', SD10: '4',
  SD11: '4', SD12: '4'
};
const res_guardrail = engine.score(config, answers_guardrail);
assert.equal(res_guardrail.final_score, 42);
assert.equal(res_guardrail.calculated_category, 'TRES_BONNES_HABITUDES_ANTI_SEDENTARITE');
assert.equal(res_guardrail.displayed_category, 'SEDENTARITE_A_REDUIRE');
assert.ok(res_guardrail.applied_classification_rules.includes('CAP_HIGH_SEDENTARY_TIME'));

// 4. Synthetic Profile B (41/48 capped at SEDENTARITE_A_REDUIRE)
const profile_b = {
  SD01: '1', SD02: '0',
  SD03: '4', SD04: '4',
  SD05: '4', SD06: '4',
  SD07: '4', SD08: '4',
  SD09: '4', SD10: '4',
  SD11: '4', SD12: '4'
};
const res_b = engine.score(config, profile_b);
assert.equal(res_b.final_score, 41);
assert.equal(res_b.displayed_category, 'SEDENTARITE_A_REDUIRE');

console.log('Questionnaire Sédentarité JS Unit & Scoring Tests: ALL PASSED.');
