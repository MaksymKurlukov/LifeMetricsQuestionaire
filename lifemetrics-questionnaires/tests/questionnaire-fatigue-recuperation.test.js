const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const engine = require('../assets/js/questionnaire-engine.js');

const config = {
  schema_version: '2.0.0',
  id: 'fatigue-recuperation',
  version: '1.0.0',
  status: 'review',
  locale: 'fr-FR',
  title: 'Score LifeMetrics - Fatigue & récupération',
  seo_title: 'Auto-évaluation LifeMetrics - Comment récupérez-vous au quotidien ?',
  description: 'Évaluer le profil de fatigue ressentie et la capacité de récupération au quotidien, sans rechercher une cause médicale.',
  population: 'Adultes de 18 à 64 ans',
  recall_period: '14 derniers jours',
  estimated_duration: '2-3 minutes',
  scoring_direction: 'higher_is_better',
  score: {
    target_min: 0,
    target_max: 48,
    normalize_when_unavailable: false,
    rounding: 'half_up'
  },
  questions: [
    {
      id: 'FR01',
      dimension: 'energie-recuperation-reveil',
      text: "Au cours des 14 derniers jours, à quelle fréquence vous êtes-vous réveillé avec suffisamment d'énergie pour commencer votre journée ?",
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
      id: 'FR02',
      dimension: 'energie-recuperation-reveil',
      text: "Après une nuit de sommeil ou une période normale de repos, à quelle fréquence avez-vous eu l'impression d'avoir réellement récupéré ?",
      required: true,
      answers: [
        { value: '0', label: 'Presque jamais', points: 0, applicable: true },
        { value: '1', label: 'Rarement', points: 1, applicable: true },
        { value: '2', label: 'Environ la moitié du temps', points: 2, applicable: true },
        { value: '3', label: 'Souvent', points: 3, applicable: true },
        { value: '4', label: 'Presque toujours', points: 4, applicable: true }
      ]
    },
    {
      id: 'FR03',
      dimension: 'energie-fonctionnement-journee',
      text: "Au cours des 14 derniers jours, à quelle fréquence avez-vous disposé d'un niveau d'énergie suffisant pour assurer votre journée habituelle ?",
      help: "« Journée habituelle » inclut travail, études, déplacements, tâches domestiques et activités personnelles.",
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
      id: 'FR04',
      dimension: 'energie-fonctionnement-journee',
      text: "Au cours des 14 derniers jours, votre énergie est-elle généralement restée suffisamment stable pour aller au bout de vos activités prévues ?",
      required: true,
      answers: [
        { value: '0', label: 'Presque jamais', points: 0, applicable: true },
        { value: '1', label: 'Rarement', points: 1, applicable: true },
        { value: '2', label: 'Cela dépend fortement des jours', points: 2, applicable: true },
        { value: '3', label: 'Généralement', points: 3, applicable: true },
        { value: '4', label: 'Presque toujours', points: 4, applicable: true }
      ]
    },
    {
      id: 'FR05',
      dimension: 'retentissement-fatigue',
      text: "Au cours des 14 derniers jours, à quelle fréquence la fatigue vous a-t-elle obligé à réduire, reporter ou abandonner certaines activités habituelles ?",
      required: true,
      answers: [
        { value: '0', label: 'Presque tous les jours', points: 0, applicable: true },
        { value: '1', label: 'Souvent', points: 1, applicable: true },
        { value: '2', label: 'Parfois', points: 2, applicable: true },
        { value: '3', label: 'Rarement', points: 3, applicable: true },
        { value: '4', label: 'Jamais ou presque jamais', points: 4, applicable: true }
      ]
    },
    {
      id: 'FR06',
      dimension: 'retentissement-fatigue',
      text: "Au cours des 14 derniers jours, à quelle fréquence la fatigue a-t-elle diminué votre capacité à rester concentré ou efficace dans vos activités ?",
      required: true,
      answers: [
        { value: '0', label: 'Presque tous les jours', points: 0, applicable: true },
        { value: '1', label: 'Souvent', points: 1, applicable: true },
        { value: '2', label: 'Parfois', points: 2, applicable: true },
        { value: '3', label: 'Rarement', points: 3, applicable: true },
        { value: '4', label: 'Jamais ou presque jamais', points: 4, applicable: true }
      ]
    },
    {
      id: 'FR07',
      dimension: 'recuperation-effort',
      text: "Après une journée normalement active ou une activité physique habituelle, à quelle fréquence récupérez-vous dans un délai qui vous paraît normal pour vous ?",
      required: true,
      answers: [
        { value: '0', label: 'Presque jamais', points: 0, applicable: true },
        { value: '1', label: 'Rarement', points: 1, applicable: true },
        { value: '2', label: 'Environ la moitié du temps', points: 2, applicable: true },
        { value: '3', label: 'Souvent', points: 3, applicable: true },
        { value: '4', label: 'Presque toujours', points: 4, applicable: true }
      ]
    },
    {
      id: 'FR08',
      dimension: 'recuperation-effort',
      text: "Après une journée plus exigeante que d'habitude, à quelle fréquence retrouvez-vous un niveau d'énergie habituel après une période raisonnable de repos ?",
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
      id: 'FR09',
      dimension: 'efficacite-repos',
      text: "Lorsque vous vous sentez fatigué, une période adaptée de repos ou une pause vous aide-t-elle généralement à retrouver de l'énergie ?",
      required: true,
      answers: [
        { value: '0', label: 'Presque jamais', points: 0, applicable: true },
        { value: '1', label: 'Rarement', points: 1, applicable: true },
        { value: '2', label: 'Partiellement', points: 2, applicable: true },
        { value: '3', label: 'Généralement', points: 3, applicable: true },
        { value: '4', label: 'Très souvent', points: 4, applicable: true }
      ]
    },
    {
      id: 'FR10',
      dimension: 'efficacite-repos',
      text: "Au cours des 14 derniers jours, à quelle fréquence avez-vous eu besoin de beaucoup plus de repos que d'habitude pour retrouver votre niveau d'énergie habituel ?",
      required: true,
      answers: [
        { value: '0', label: 'Presque tous les jours', points: 0, applicable: true },
        { value: '1', label: 'Souvent', points: 1, applicable: true },
        { value: '2', label: 'Parfois', points: 2, applicable: true },
        { value: '3', label: 'Rarement', points: 3, applicable: true },
        { value: '4', label: 'Jamais ou presque jamais', points: 4, applicable: true }
      ]
    },
    {
      id: 'FR11',
      dimension: 'stabilite-recuperation-globale',
      text: "Au cours des 14 derniers jours, votre niveau d'énergie a-t-il été relativement stable d'un jour à l'autre ?",
      required: true,
      answers: [
        { value: '0', label: 'Très instable', points: 0, applicable: true },
        { value: '1', label: 'Souvent instable', points: 1, applicable: true },
        { value: '2', label: 'Variable', points: 2, applicable: true },
        { value: '3', label: 'Généralement stable', points: 3, applicable: true },
        { value: '4', label: 'Très stable', points: 4, applicable: true }
      ]
    },
    {
      id: 'FR12',
      dimension: 'stabilite-recuperation-globale',
      text: "En considérant globalement les 14 derniers jours, comment évalueriez-vous votre capacité à récupérer entre vos journées et vos activités ?",
      required: true,
      answers: [
        { value: '0', label: 'Très insuffisante', points: 0, applicable: true },
        { value: '1', label: 'Insuffisante', points: 1, applicable: true },
        { value: '2', label: 'Moyenne', points: 2, applicable: true },
        { value: '3', label: 'Bonne', points: 3, applicable: true },
        { value: '4', label: 'Très bonne', points: 4, applicable: true }
      ]
    }
  ],
  dimensions: [
    {
      id: 'energie-recuperation-reveil',
      label: 'Énergie et récupération au réveil',
      question_ids: ['FR01', 'FR02'],
      weakest_eligible: true,
      attention: { metric: 'score', operator: '<=', value: 2, message_code: 'ATTENTION_ENERGIE_REVEIL' }
    },
    {
      id: 'energie-fonctionnement-journee',
      label: 'Énergie et fonctionnement dans la journée',
      question_ids: ['FR03', 'FR04'],
      weakest_eligible: true,
      attention: { metric: 'score', operator: '<=', value: 2, message_code: 'ATTENTION_ENERGIE_JOURNEE' }
    },
    {
      id: 'retentissement-fatigue',
      label: 'Retentissement de la fatigue',
      question_ids: ['FR05', 'FR06'],
      weakest_eligible: true,
      attention: { metric: 'score', operator: '<=', value: 2, message_code: 'ATTENTION_RETENTISSEMENT_FATIGUE' }
    },
    {
      id: 'recuperation-effort',
      label: 'Récupération après l\'effort',
      question_ids: ['FR07', 'FR08'],
      weakest_eligible: true,
      attention: { metric: 'score', operator: '<=', value: 2, message_code: 'ATTENTION_RECUPERATION_EFFORT' }
    },
    {
      id: 'efficacite-repos',
      label: 'Efficacité du repos',
      question_ids: ['FR09', 'FR10'],
      weakest_eligible: true,
      attention: { metric: 'score', operator: '<=', value: 2, message_code: 'ATTENTION_EFFICACITE_REPOS' }
    },
    {
      id: 'stabilite-recuperation-globale',
      label: 'Stabilité et récupération globale',
      question_ids: ['FR11', 'FR12'],
      weakest_eligible: true,
      attention: { metric: 'score', operator: '<=', value: 2, message_code: 'ATTENTION_STABILITE_RECUPERATION' }
    }
  ],
  weakest_dimensions: { count: 2, tie_break: 'configuration_order' },
  result_levels: [
    {
      code: 'FATIGUE_IMPORTANTE_RECUPERATION_INSUFFISANTE', rank: 0, min: 0, max: 15,
      title: 'Fatigue importante / récupération insuffisante',
      description: 'Vos réponses indiquent que la fatigue semble actuellement avoir un impact important sur plusieurs dimensions de votre quotidien et que votre récupération apparaît limitée.'
    },
    {
      code: 'RECUPERATION_A_RENFORCER', rank: 1, min: 16, max: 27,
      title: 'Récupération à renforcer',
      description: 'Votre profil présente certaines capacités de récupération, mais plusieurs dimensions semblent encore fragiles ou irrégulières.'
    },
    {
      code: 'RECUPERATION_GLOBALEMENT_FAVORABLE', rank: 2, min: 28, max: 38,
      title: 'Récupération globalement favorable',
      description: 'Vos réponses décrivent une capacité de récupération globalement favorable. La fatigue semble généralement compatible avec vos activités quotidiennes et le repos permet le plus souvent de retrouver un niveau d\'énergie satisfaisant.'
    },
    {
      code: 'TRES_BON_PROFIL_RECUPERATION', rank: 3, min: 39, max: 48,
      title: 'Très bon profil de récupération',
      description: 'Vos réponses décrivent actuellement un très bon profil de récupération sur les dimensions évaluées.'
    }
  ],
  classification_rules: [],
  classification_messages: {
    ATTENTION_ENERGIE_REVEIL: {
      title: 'Point nécessitant une attention particulière : Énergie et récupération au réveil',
      text: 'Votre niveau d\'énergie au réveil ou le caractère réparateur de vos nuits est particulièrement faible.'
    },
    ATTENTION_ENERGIE_JOURNEE: {
      title: 'Point nécessitant une attention particulière : Énergie et fonctionnement dans la journée',
      text: 'Votre niveau d\'énergie ou sa stabilité au cours de la journée est particulièrement diminué.'
    },
    ATTENTION_RETENTISSEMENT_FATIGUE: {
      title: 'Point nécessitant une attention particulière : Retentissement de la fatigue',
      text: 'La fatigue a un impact marqué sur vos activités quotidiennes ou votre concentration.'
    },
    ATTENTION_RECUPERATION_EFFORT: {
      title: 'Point nécessitant une attention particulière : Récupération après l\'effort',
      text: 'Votre récupération après une journée active ou un effort physique est anormalement difficile.'
    },
    ATTENTION_EFFICACITE_REPOS: {
      title: 'Point nécessitant une attention particulière : Efficacité du repos',
      text: 'Le repos semble peu efficace pour recharger votre énergie ou nécessite des durées anormalement longues.'
    },
    ATTENTION_STABILITE_RECUPERATION: {
      title: 'Point nécessitant une attention particulière : Stabilité et récupération globale',
      text: 'Votre récupération globale ou la régularité de votre énergie au fil des jours reste très fragile.'
    }
  },
  safety_questions: [
    {
      id: 'FRSF01',
      text: 'Votre fatigue persiste-t-elle depuis plusieurs jours ou semaines malgré un repos suffisant ou des adaptations de vos habitudes ?',
      required: true,
      answers: [
        { value: 'no', label: 'Non', triggers: [] },
        { value: 'yes', label: 'Oui', triggers: ['FATIGUE_ATTENTION_MESSAGE'] }
      ]
    },
    {
      id: 'FRSF02',
      text: 'Votre fatigue est-elle actuellement si importante qu\'elle vous empêche régulièrement d\'assurer vos activités habituelles ?',
      required: true,
      answers: [
        { value: 'no', label: 'Non', triggers: [] },
        { value: 'yes', label: 'Oui', triggers: ['FATIGUE_ATTENTION_MESSAGE'] }
      ]
    },
    {
      id: 'FRSF03',
      text: 'Votre fatigue s\'accompagne-t-elle actuellement de signes inhabituels ou d\'une aggravation marquée après des efforts modestes ?',
      required: true,
      answers: [
        { value: 'no', label: 'Non', triggers: [] },
        { value: 'yes', label: 'Oui', triggers: ['FATIGUE_ATTENTION_MESSAGE'] }
      ]
    }
  ],
  safety_messages: {
    FATIGUE_ATTENTION_MESSAGE: {
      priority: 100,
      title: 'Certaines de vos réponses méritent une attention particulière.',
      text: 'Cette auto-évaluation ne permet pas d\'identifier la cause de votre fatigue. Une fatigue persistante malgré le repos, très invalidante ou accompagnée d\'autres symptômes peut nécessiter une évaluation par un professionnel de santé.'
    }
  },
  result_ctas: [
    { label: 'Découvrir mon bilan VitaScan', url: '/vitascan/', variant: 'primary', enabled: true }
  ],
  disclaimer: {
    before: 'Cette auto-évaluation LifeMetrics est destinée à vous aider à mieux comprendre votre niveau de fatigue ressenti et votre récupération au quotidien.',
    after: 'Le Score LifeMetrics - Fatigue & récupération est un indicateur propriétaire d\'auto-évaluation.'
  },
  approvals: { content_scoring: true, legal_licensing: false, technical_runtime: true, publication: false }
};

const baseSafety = { FRSF01: 'no', FRSF02: 'no', FRSF03: 'no' };

// 1. Min / Max / Boundary Checks
const answers_min = { ...baseSafety };
const answers_max = { ...baseSafety };
for (let i = 1; i <= 12; i++) {
  const qId = 'FR' + (i < 10 ? '0' + i : i);
  answers_min[qId] = '0';
  answers_max[qId] = '4';
}

const res_0 = engine.score(config, answers_min);
assert.equal(res_0.final_score, 0);
assert.equal(res_0.calculated_category, 'FATIGUE_IMPORTANTE_RECUPERATION_INSUFFISANTE');
assert.equal(res_0.displayed_category, 'FATIGUE_IMPORTANTE_RECUPERATION_INSUFFISANTE');

const res_48 = engine.score(config, answers_max);
assert.equal(res_48.final_score, 48);
assert.equal(res_48.calculated_category, 'TRES_BON_PROFIL_RECUPERATION');
assert.equal(res_48.displayed_category, 'TRES_BON_PROFIL_RECUPERATION');

// 2. Attention threshold (D1 <= 2/8)
const res_att = engine.score(config, {
  ...answers_max,
  FR01: '1', FR02: '1' // D1 = 2
});
assert.equal(res_att.final_score, 42);
assert.ok(res_att.classification_message_codes.includes('ATTENTION_ENERGIE_REVEIL'));

// 3. Safety Question Trigger
const res_sf = engine.score(config, {
  ...answers_max,
  FRSF01: 'yes', FRSF03: 'yes'
});
assert.equal(res_sf.final_score, 48);
assert.deepEqual(res_sf.safety_flag_codes, ['FATIGUE_ATTENTION_MESSAGE']);

// 4. Synthetic Profiles (PDF Section 14)
// Profile 1: 14/48 -> FATIGUE_IMPORTANTE_RECUPERATION_INSUFFISANTE
const profile_1 = {
  ...baseSafety,
  FR01: '0', FR02: '0',
  FR03: '1', FR04: '1',
  FR05: '1', FR06: '1',
  FR07: '1', FR08: '1',
  FR09: '4', FR10: '0',
  FR11: '2', FR12: '2'
};
const res_p1 = engine.score(config, profile_1);
assert.equal(res_p1.final_score, 14);
assert.equal(res_p1.calculated_category, 'FATIGUE_IMPORTANTE_RECUPERATION_INSUFFISANTE');

// Profile 2: 34/48 -> RECUPERATION_GLOBALEMENT_FAVORABLE
const profile_2 = {
  ...baseSafety,
  FR01: '4', FR02: '4',
  FR03: '4', FR04: '4',
  FR05: '4', FR06: '4',
  FR07: '1', FR08: '1',
  FR09: '2', FR10: '2',
  FR11: '2', FR12: '2'
};
const res_p2 = engine.score(config, profile_2);
assert.equal(res_p2.final_score, 34);
assert.equal(res_p2.calculated_category, 'RECUPERATION_GLOBALEMENT_FAVORABLE');
assert.ok(res_p2.weakest_dimensions.includes('recuperation-effort'));

console.log('Questionnaire Fatigue & Récupération JS Unit & Scoring Tests: ALL PASSED.');
