/**
 * LifeMetrics Questionnaires Central Google Apps Script Web App.
 *
 * Physical Storage Architecture:
 * - ONE central Google Spreadsheet: "LifeMetrics — Questionnaires"
 * - Separate physical worksheets per proprietary questionnaire (Sedentarite, Hydratation, etc.)
 * - Flat, human-readable column layout:
 *   - Metadata: completed_at, session_id, questionnaire_version (3 columns)
 *   - For each scored question: "<QUESTION_ID> - <FULL CANONICAL QUESTION TEXT>" and "<QUESTION_ID> — Points" (adjacent)
 *   - For each safety question (if present): "<SAFETY_QUESTION_ID> - <FULL CANONICAL SAFETY QUESTION TEXT>"
 *   - Summary scores: raw_score, available_max, final_score (3 columns)
 *   - Human-facing category: "category" (= authoritative displayed_category, 1 column)
 *   - Safety attention summary: "safety_attention" (Oui / Non, 1 column, for questionnaires with safety questions)
 * - Header schema validation with fail-safe rejection on conflict
 * - Idempotency via session_id deduplication on Column 2
 * - Formula injection protection (escaping '=+-@')
 * - Concurrency locking and rate limiting
 */

var QUESTIONNAIRE_SCHEMAS = {
  'sedentarite': {
    sheetName: 'Sedentarite',
    hasSafety: false,
    scoredQuestions: [
      { id: 'SD01', text: "Au cours des 14 derniers jours, combien de temps avez-vous passé en moyenne assis ou allongé pendant vos heures d'éveil ?" },
      { id: 'SD02', text: "Au cours des 14 derniers jours, combien de jours par semaine avez-vous passé une très grande partie de votre journée éveillée en position assise ou allongée ?" },
      { id: 'SD03', text: "Lorsque vous travaillez, étudiez ou vous détendez, combien de temps restez-vous généralement assis sans vous lever ni marcher quelques minutes ?" },
      { id: 'SD04', text: "Au cours des 14 derniers jours, à quelle fréquence avez-vous passé au moins deux heures presque entièrement assis sans véritable interruption de mouvement ?" },
      { id: 'SD05', text: "Lorsque vous restez assis pendant une période prolongée, à quelle fréquence vous levez-vous pour marcher ou bouger quelques minutes ?" },
      { id: 'SD06', text: "Lorsque vous interrompez une période assise, que faites-vous généralement ?" },
      { id: 'SD07', text: "Pendant vos périodes de travail ou d'études, à quelle fréquence alternez-vous volontairement les périodes assises avec des moments debout ou en mouvement ?" },
      { id: 'SD08', text: "Pour vos déplacements habituels, quelle part du trajet est généralement passée assis dans une voiture, les transports ou un autre véhicule ?" },
      { id: 'SD09', text: "En dehors du travail ou des études, combien de temps passez-vous généralement assis devant un écran au cours d'une journée ?" },
      { id: 'SD10', text: "Lorsque vous regardez un écran ou réalisez une activité de loisir assise pendant longtemps, à quelle fréquence profitez-vous d'une occasion pour vous lever ou bouger ?" },
      { id: 'SD11', text: "En dehors de vos séances de sport éventuelles, à quelle fréquence intégrez-vous de petits moments de mouvement dans votre journée ?" },
      { id: 'SD12', text: "Au cours des 14 derniers jours, avez-vous réussi à limiter et interrompre régulièrement les longues périodes assises, y compris les jours de travail, d'études et les week-ends ?" }
    ],
    safetyQuestions: []
  },
  'hydratation': {
    sheetName: 'Hydratation',
    hasSafety: true,
    scoredQuestions: [
      { id: 'HY01', text: "Au cours des 14 derniers jours, quelle place l'eau a-t-elle occupée parmi les boissons que vous consommez pour vous hydrater ?" },
      { id: 'HY02', text: "Au cours des 14 derniers jours, à quelle fréquence avez-vous eu l'impression de boire suffisamment pour vos besoins au cours de la journée ?" },
      { id: 'HY03', text: "Au cours des 14 derniers jours, à quelle fréquence avez-vous bu régulièrement à différents moments de la journée plutôt que de boire une grande quantité seulement à quelques occasions ?" },
      { id: 'HY04', text: "Au cours d'une journée habituelle, à quelle fréquence passez-vous plusieurs heures sans rien boire simplement parce que vous êtes occupé, que vous oubliez ou que vous n'avez rien à proximité ?" },
      { id: 'HY05', text: "Lorsque vous pratiquez une activité physique ou effectuez un effort prolongé, adaptez-vous votre hydratation avant, pendant ou après l'activité selon sa durée, son intensité et les conditions ?" },
      { id: 'HY06', text: "Lorsqu'il fait chaud ou que vous transpirez davantage que d'habitude, pensez-vous à augmenter ou à rendre plus régulière votre consommation d'eau ?" },
      { id: 'HY07', text: "Lorsque vous avez soif, à quelle fréquence choisissez-vous en priorité de l'eau ou une boisson non sucrée adaptée plutôt qu'une boisson très sucrée ?" },
      { id: 'HY08', text: "Au cours des 14 derniers jours, à quelle fréquence les sodas, boissons énergisantes, boissons sucrées ou sirops ont-ils constitué une part importante de vos boissons quotidiennes ?" },
      { id: 'HY09', text: "Votre alimentation comprend-elle régulièrement des aliments riches en eau, par exemple des fruits, des légumes, des soupes, des laitages ou d'autres aliments comparables ?" },
      { id: 'HY10', text: "Dans votre quotidien, avez-vous généralement de l'eau facilement disponible lorsque vous travaillez, étudiez, vous déplacez ou restez longtemps à l'extérieur de chez vous ?" },
      { id: 'HY11', text: "Lorsque vous prévoyez une longue journée, un déplacement, un voyage, du sport ou plusieurs heures loin de chez vous, pensez-vous à prévoir l'accès à de l'eau ?" },
      { id: 'HY12', text: "Au cours des 14 derniers jours, vos bonnes habitudes d'hydratation ont-elles été relativement régulières, y compris pendant les journées de travail, d'études ou les week-ends ?" }
    ],
    safetyQuestions: [
      { id: 'HYSF01', text: "Un professionnel de santé vous a-t-il demandé de limiter, contrôler ou adapter précisément votre consommation de liquides ?" },
      { id: 'HYSF02', text: "Avez-vous actuellement ou récemment eu des pertes importantes de liquides, par exemple en raison de vomissements, diarrhées, fièvre ou transpiration inhabituelle ?" },
      { id: 'HYSF03', text: "Avez-vous actuellement des symptômes importants tels qu'une faiblesse inhabituelle, des vertiges marqués, une confusion, un malaise ou une diminution inhabituelle des urines ?" }
    ]
  },
  'fatigue-recuperation': {
    sheetName: 'Fatigue',
    hasSafety: true,
    scoredQuestions: [
      { id: 'FR01', text: "Au cours des 14 derniers jours, à quelle fréquence vous êtes-vous réveillé avec suffisamment d'énergie pour commencer votre journée ?" },
      { id: 'FR02', text: "Après une nuit de sommeil ou une période normale de repos, à quelle fréquence avez-vous eu l'impression d'avoir réellement récupéré ?" },
      { id: 'FR03', text: "Au cours des 14 derniers jours, à quelle fréquence avez-vous disposé d'un niveau d'énergie suffisant pour assurer votre journée habituelle ?" },
      { id: 'FR04', text: "Au cours des 14 derniers jours, votre énergie est-elle généralement restée suffisamment stable pour aller au bout de vos activités prévues ?" },
      { id: 'FR05', text: "Au cours des 14 derniers jours, à quelle fréquence la fatigue vous a-t-elle obligé à réduire, reporter ou abandonner certaines activités habituelles ?" },
      { id: 'FR06', text: "Au cours des 14 derniers jours, à quelle fréquence la fatigue a-t-elle diminué votre capacité à rester concentré ou efficace dans vos activités ?" },
      { id: 'FR07', text: "Après une journée normalement active ou une activité physique habituelle, à quelle fréquence récupérez-vous dans un délai qui vous paraît normal pour vous ?" },
      { id: 'FR08', text: "Après une journée plus exigeante que d'habitude, à quelle fréquence retrouvez-vous un niveau d'énergie habituel après une période raisonnable de repos ?" },
      { id: 'FR09', text: "Lorsque vous vous sentez fatigué, une période adaptée de repos ou une pause vous aide-t-elle généralement à retrouver de l'énergie ?" },
      { id: 'FR10', text: "Au cours des 14 derniers jours, à quelle fréquence avez-vous eu besoin de beaucoup plus de repos que d'habitude pour retrouver votre niveau d'énergie habituel ?" },
      { id: 'FR11', text: "Au cours des 14 derniers jours, votre niveau d'énergie a-t-il été relativement stable d'un jour à l'autre ?" },
      { id: 'FR12', text: "En considérant globalement les 14 derniers jours, comment évalueriez-vous votre capacité à récupérer entre vos journées et vos activités ?" }
    ],
    safetyQuestions: [
      { id: 'FRSF01', text: "Votre fatigue persiste-t-elle depuis plusieurs jours ou semaines malgré un repos suffisant ou des adaptations de vos habitudes ?" },
      { id: 'FRSF02', text: "Votre fatigue est-elle actuellement si importante qu'elle vous empêche régulièrement d'assurer vos activités habituelles ?" },
      { id: 'FRSF03', text: "Votre fatigue s'accompagne-t-elle actuellement de signes inhabituels ou d'une aggravation marquée après des efforts modestes ?" }
    ]
  },
  'sommeil': {
    sheetName: 'Sommeil',
    hasSafety: true,
    scoredQuestions: [
      { id: 'SL01', text: "Au cours des 14 derniers jours, combien de temps avez-vous dormi en moyenne par nuit ?" },
      { id: 'SL02', text: "Au cours des 14 derniers jours, à quelle fréquence avez-vous eu l'impression d'avoir dormi suffisamment longtemps pour vos besoins ?" },
      { id: 'SL03', text: "Au cours des 14 derniers jours, combien de temps vous fallait-il généralement pour vous endormir après avoir décidé de dormir ?" },
      { id: 'SL04', text: "Au cours des 14 derniers jours, à quelle fréquence votre sommeil a-t-il été interrompu par des réveils qui vous ont réellement gêné ?" },
      { id: 'SL05', text: "Lorsque vous vous réveillez pendant la nuit, parvenez-vous généralement à vous rendormir facilement ?" },
      { id: 'SL06', text: "Au cours des 14 derniers jours, vos heures habituelles de coucher et de lever ont-elles été relativement régulières ?" },
      { id: 'SL07', text: "Entre vos jours de travail ou d'études et vos jours libres, à quel point vos horaires de sommeil changent-ils généralement ?" },
      { id: 'SL08', text: "Au cours des 14 derniers jours, à quelle fréquence vous êtes-vous réveillé avec la sensation d'avoir réellement récupéré ?" },
      { id: 'SL09', text: "Au cours des 14 derniers jours, à quelle fréquence avez-vous eu du mal à rester éveillé ou attentif pendant la journée à cause de la somnolence ?" },
      { id: 'SL10', text: "Au cours des 14 derniers jours, à quelle fréquence votre sommeil vous a-t-il semblé suffisant pour maintenir une bonne énergie et une bonne concentration pendant la journée ?" },
      { id: 'SL11', text: "Au cours des 14 derniers jours, à quelle fréquence avez-vous consacré la période précédant votre coucher à des activités calmes favorisant la transition vers le sommeil ?" },
      { id: 'SL12', text: "Au cours des 14 derniers jours, votre environnement et vos habitudes vous ont-ils généralement permis de dormir sans perturbations évitables ?" }
    ],
    safetyQuestions: [
      { id: 'SLSF01', text: "Vous a-t-on déjà signalé des pauses respiratoires, des étouffements ou des reprises de respiration inhabituelles pendant votre sommeil ?" },
      { id: 'SLSF02', text: "Votre somnolence vous a-t-elle déjà mis en difficulté ou en danger, notamment au volant ou lors d'une activité nécessitant de rester vigilant ?" },
      { id: 'SLSF03', text: "Vos difficultés de sommeil persistent-elles depuis plusieurs semaines et affectent-elles fortement votre travail, vos études ou votre vie quotidienne ?" }
    ]
  },
  'nutrition': {
    sheetName: 'Nutrition',
    hasSafety: true,
    scoredQuestions: [
      { id: 'NT01', text: "Au cours des 14 derniers jours, combien de portions de fruits et légumes avez-vous consommées en moyenne chaque jour ?" },
      { id: 'NT02', text: "Au cours d'une semaine habituelle, votre alimentation comprend-elle une variété de fruits, légumes et autres aliments d'origine végétale ?" },
      { id: 'NT03', text: "Au cours d'une semaine habituelle, à quelle fréquence consommez-vous des légumes secs ?" },
      { id: 'NT04', text: "Lorsque vous consommez du pain, du riz, des pâtes, de la semoule ou d'autres produits céréaliers, à quelle fréquence choisissez-vous une version complète ou semi-complète ?" },
      { id: 'NT05', text: "Au cours d'une semaine habituelle, alternez-vous différentes sources de protéines ?" },
      { id: 'NT06', text: "Au cours d'une semaine habituelle, à quelle fréquence consommez-vous du poisson ou, si vous n'en mangez pas, des alternatives permettant de diversifier vos sources de protéines et de bonnes graisses ?" },
      { id: 'NT07', text: "Pour cuisiner ou assaisonner vos repas, à quelle fréquence privilégiez-vous des huiles végétales comme l'huile d'olive, de colza ou de noix plutôt que des matières grasses riches en graisses saturées ?" },
      { id: 'NT08', text: "Au cours des 14 derniers jours, quelle place les aliments frais ou peu transformés et les repas préparés simplement ont-ils occupée dans votre alimentation ?" },
      { id: 'NT09', text: "Au cours des 14 derniers jours, à quelle fréquence avez-vous consommé des boissons sucrées ?" },
      { id: 'NT10', text: "Au cours des 14 derniers jours, à quelle fréquence les produits très gras, très sucrés, très salés ou ultra-transformés ont-ils occupé une place importante dans vos repas ou collations ?" },
      { id: 'NT11', text: "Au cours des 14 derniers jours, à quelle fréquence vos repas principaux combinaient-ils plusieurs groupes d'aliments complémentaires ?" },
      { id: 'NT12', text: "Au cours des 14 derniers jours, à quelle fréquence votre organisation alimentaire vous a-t-elle permis de manger de façon relativement régulière sans grignotages fréquents ou repas improvisés faute d'organisation ?" }
    ],
    safetyQuestions: [
      { id: 'NTSF01', text: "Suivez-vous actuellement un régime alimentaire spécifique pour une raison médicale ?" },
      { id: 'NTSF02', text: "Avez-vous perdu ou pris une quantité importante de poids récemment sans l'avoir réellement souhaité ?" },
      { id: 'NTSF03', text: "Avez-vous actuellement des difficultés importantes à vous alimenter ou des préoccupations concernant votre comportement alimentaire ?" }
    ]
  },
  'activite-physique': {
    sheetName: 'Activite_Physique',
    hasSafety: false,
    scoredQuestions: [
      { id: 'AP01', text: "Au cours des 7 derniers jours, combien de jours avez-vous pratiqué au moins 30 minutes d'activité physique dynamique au total ?" },
      { id: 'AP02', text: "Environ combien de temps avez-vous consacré au total à une activité physique d'intensité au moins modérée pendant les 7 derniers jours ?" },
      { id: 'AP03', text: "Lorsque vous êtes physiquement actif, à quelle fréquence votre activité accélère-t-elle réellement votre respiration et votre rythme cardiaque ?" },
      { id: 'AP04', text: "Au cours d'une semaine habituelle, combien de jours réalisez-vous des activités qui sollicitent volontairement vos muscles ?" },
      { id: 'AP05', text: "Vos activités physiques sollicitent-elles différentes parties du corps au cours de la semaine ?" },
      { id: 'AP06', text: "Combien de jours par semaine utilisez-vous volontairement la marche, le vélo, les escaliers ou un autre déplacement actif dans votre quotidien ?" },
      { id: 'AP07', text: "En dehors de vos séances de sport éventuelles, votre journée comporte-t-elle régulièrement des périodes où vous marchez, vous déplacez ou effectuez des tâches physiques ?" },
      { id: 'AP08', text: "Lors d'une journée habituelle, combien de temps passez-vous principalement assis ou allongé, en dehors du sommeil ?" },
      { id: 'AP09', text: "Lorsque vous devez rester assis longtemps, à quelle fréquence vous levez-vous pour marcher ou bouger quelques minutes ?" },
      { id: 'AP10', text: "Votre activité physique est-elle répartie sur plusieurs jours de la semaine ?" },
      { id: 'AP11', text: "Au cours des 4 dernières semaines, combien de semaines ont comporté une activité physique régulière ?" },
      { id: 'AP12', text: "Au cours d'une semaine habituelle, combien de journées passez-vous avec très peu de marche ou d'activité physique ?" }
    ],
    safetyQuestions: []
  },
  'pieds-confort-postural': {
    sheetName: 'Pieds_Confort',
    hasSafety: true,
    scoredQuestions: [
      { id: 'PF01', text: "Au cours des 14 derniers jours, à quelle fréquence avez-vous ressenti une douleur au niveau d'un ou des deux pieds ?" },
      { id: 'PF02', text: "Lorsque vous ressentez une gêne au niveau des pieds, dans quelle mesure celle-ci perturbe-t-elle votre confort ?" },
      { id: 'PF03', text: "Au cours des 14 derniers jours, à quelle fréquence avez-vous pu marcher aussi longtemps que vous le souhaitiez sans gêne importante au niveau des pieds ?" },
      { id: 'PF04', text: "Lorsque vous restez debout pendant une période prolongée, comment vos pieds tolèrent-ils généralement cette situation ?" },
      { id: 'PF05', text: "Au cours des 14 derniers jours, à quelle fréquence vous êtes-vous senti stable et en confiance lorsque vous étiez debout ou en mouvement ?" },
      { id: 'PF06', text: "Au cours des 14 derniers jours, avez-vous eu l'impression de charger davantage un pied, un côté du pied ou une jambe que l'autre lorsque vous êtes debout ou marchez ?" },
      { id: 'PF07', text: "Au cours des 14 derniers jours, à quelle fréquence vos chaussures habituelles vous ont-elles permis de marcher ou rester debout confortablement ?" },
      { id: 'PF08', text: "Au cours des 14 derniers jours, à quelle fréquence avez-vous ressenti des zones de pression, de frottement ou d'échauffement inhabituelles dans vos chaussures ?" },
      { id: 'PF09', text: "Au cours des 14 derniers jours, à quelle fréquence une gêne au niveau des pieds vous a-t-elle conduit à réduire, reporter ou éviter une activité habituelle ?" },
      { id: 'PF10', text: "Au cours des 14 derniers jours, à quelle fréquence avez-vous modifié votre façon de marcher à cause d'une douleur ou d'un inconfort au niveau des pieds ?" },
      { id: 'PF11', text: "Après une journée avec beaucoup de marche ou de station debout, à quelle fréquence vos pieds retrouvent-ils un confort habituel après une période normale de repos ?" },
      { id: 'PF12', text: "En considérant globalement les 14 derniers jours, comment évalueriez-vous le confort de vos pieds dans votre vie quotidienne ?" }
    ],
    safetyQuestions: [
      { id: 'PFSF01', text: "Avez-vous actuellement une plaie qui cicatrise mal, qui suinte ou une modification inhabituelle de la couleur ou de la température d'un pied ?" },
      { id: 'PFSF02', text: "Avez-vous récemment constaté une diminution ou une perte inhabituelle de sensibilité au niveau d'un pied ?" },
      { id: 'PFSF03', text: "Votre douleur est-elle apparue brutalement après une chute, un choc ou un autre traumatisme récent ?" },
      { id: 'PFSF04', text: "La douleur ou la gêne vous empêche-t-elle actuellement de marcher normalement ou d'assurer vos activités habituelles ?" }
    ]
  }
};

var QUESTIONNAIRE_ALIASES = {
  'fatigue': 'fatigue-recuperation',
  'activite_physique': 'activite-physique',
  'pieds_confort': 'pieds-confort-postural'
};

function getSchema(questionnaireId) {
  if (typeof questionnaireId !== 'string') return null;
  var key = questionnaireId.toLowerCase().trim();
  if (QUESTIONNAIRE_ALIASES.hasOwnProperty(key)) {
    key = QUESTIONNAIRE_ALIASES[key];
  }
  return QUESTIONNAIRE_SCHEMAS.hasOwnProperty(key) ? QUESTIONNAIRE_SCHEMAS[key] : null;
}

function getTargetSheetName(questionnaireId) {
  if (typeof questionnaireId !== 'string') return null;
  var key = questionnaireId.toLowerCase().trim();
  if (key === 'pss10') return 'PSS10';
  var schema = getSchema(questionnaireId);
  return schema ? schema.sheetName : null;
}

function getHeaderList(schema, payloadQuestionsSchema) {
  var headers = [
    'completed_at',
    'session_id',
    'questionnaire_version'
  ];

  var scored = (payloadQuestionsSchema && Array.isArray(payloadQuestionsSchema.scored) && payloadQuestionsSchema.scored.length === schema.scoredQuestions.length)
    ? payloadQuestionsSchema.scored
    : schema.scoredQuestions;

  // Scored questions: adjacent "<ID> - <FULL CANONICAL QUESTION TEXT>" and "<ID> — Points"
  for (var i = 0; i < scored.length; i++) {
    var item = scored[i];
    var qId = typeof item === 'object' ? item.id : item;
    var qText = typeof item === 'object' && item.text ? item.text : '';
    if (!qText && typeof schema.scoredQuestions[i] === 'object') {
      qText = schema.scoredQuestions[i].text;
    }
    headers.push(qId + ' - ' + qText);
    headers.push(qId + ' — Points');
  }

  var safety = (payloadQuestionsSchema && Array.isArray(payloadQuestionsSchema.safety) && payloadQuestionsSchema.safety.length === schema.safetyQuestions.length)
    ? payloadQuestionsSchema.safety
    : schema.safetyQuestions;

  // Safety questions: "<SAFETY_QUESTION_ID> - <FULL CANONICAL SAFETY QUESTION TEXT>" (no points column)
  for (var j = 0; j < safety.length; j++) {
    var sItem = safety[j];
    var sqId = typeof sItem === 'object' ? sItem.id : sItem;
    var sqText = typeof sItem === 'object' && sItem.text ? sItem.text : '';
    if (!sqText && typeof schema.safetyQuestions[j] === 'object') {
      sqText = schema.safetyQuestions[j].text;
    }
    headers.push(sqId + ' - ' + sqText);
  }

  // Metric and score summary
  headers.push('raw_score');
  headers.push('available_max');
  headers.push('final_score');

  // Human-facing category
  headers.push('category');

  // Safety attention summary (Oui / Non, for questionnaires with safety questions)
  if (schema.hasSafety) {
    headers.push('safety_attention');
  }

  return headers;
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function validationError(message) {
  return jsonResponse({ ok: false, code: 'validation_error', error: message });
}

function safeSheetText(value) {
  if (value === null || value === undefined) return '';
  var text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function isValidSessionId(value) {
  return typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isValidTimestamp(value) {
  return typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?Z$/.test(value) &&
    !isNaN(Date.parse(value));
}

function extractAnswerData(answersObj, questionId) {
  if (!answersObj || typeof answersObj !== 'object') return { label: '', points: '' };
  var answer = answersObj[questionId];
  if (answer === null || answer === undefined) return { label: '', points: '' };
  
  if (typeof answer === 'object') {
    var label = '';
    if (answer.label !== undefined && answer.label !== null && String(answer.label).trim() !== '') {
      label = String(answer.label);
    } else if (answer.value !== undefined && answer.value !== null) {
      label = String(answer.value);
    }

    var points = '';
    if (answer.applicable === false) {
      points = ''; // N/A receives blank points
    } else if (typeof answer.points === 'number') {
      points = answer.points;
    }

    return { label: label, points: points };
  }

  return { label: String(answer), points: '' };
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  var hasLock = false;

  try {
    if (!e || !e.postData || !e.postData.contents) {
      return validationError('Missing JSON body');
    }

    var data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch (parseError) {
      return validationError('Invalid JSON body');
    }

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return validationError('JSON body must be an object');
    }
    if (!isValidSessionId(data.session_id)) {
      return validationError('Invalid session_id');
    }
    if (!isValidTimestamp(data.completed_at)) {
      return validationError('Invalid completed_at');
    }
    if (typeof data.questionnaire_id !== 'string' || !data.questionnaire_id) {
      return validationError('Invalid questionnaire_id');
    }

    // Strictly validate questionnaire_id against trusted schema definitions
    var schema = getSchema(data.questionnaire_id);
    if (!schema) {
      return validationError('Unknown questionnaire_id: ' + data.questionnaire_id);
    }

    if (typeof data.questionnaire_version !== 'string' || !data.questionnaire_version) {
      return validationError('Invalid questionnaire_version');
    }
    if (typeof data.final_score !== 'number' || isNaN(data.final_score)) {
      return validationError('Invalid final_score');
    }
    if (typeof data.calculated_category !== 'string') {
      return validationError('Invalid calculated_category');
    }

    // Rate-limit rapid duplicate calls per session_id
    var rateLimitKey = 'rl_' + data.session_id;
    var cache = CacheService.getScriptCache();
    if (cache && cache.get(rateLimitKey)) {
      return jsonResponse({ ok: false, code: 'rate_limited', error: 'Too many requests' });
    }
    if (cache) {
      cache.put(rateLimitKey, '1', 5);
    }

    hasLock = lock.tryLock(10000);
    if (!hasLock) {
      return jsonResponse({ ok: false, code: 'lock_timeout', error: 'Storage is busy' });
    }

    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = spreadsheet.getSheetByName(schema.sheetName);

    // Fail safely if the designated worksheet does not exist
    if (!sheet) {
      return jsonResponse({
        ok: false,
        code: 'sheet_not_found',
        error: 'Designated worksheet "' + schema.sheetName + '" not found in spreadsheet'
      });
    }

    var expectedHeaders = getHeaderList(schema, data.questions_schema);
    var lastRow = sheet.getLastRow();

    if (lastRow === 0) {
      // Initialize empty sheet with deterministic schema headers
      sheet.appendRow(expectedHeaders);
    } else {
      // Validate that existing row 1 matches expected header schema
      var lastCol = sheet.getLastColumn();
      var existingHeaders = lastCol > 0 ? sheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];
      
      var isCompatible = existingHeaders.length === expectedHeaders.length;
      if (isCompatible) {
        for (var hIdx = 0; hIdx < expectedHeaders.length; hIdx++) {
          if (String(existingHeaders[hIdx]).trim() !== String(expectedHeaders[hIdx]).trim()) {
            isCompatible = false;
            break;
          }
        }
      }

      if (!isCompatible) {
        return jsonResponse({
          ok: false,
          code: 'schema_conflict',
          error: 'Worksheet "' + schema.sheetName + '" has conflicting column headers. Expected ' +
                 expectedHeaders.length + ' columns (' + expectedHeaders[3] + '...), but found ' +
                 existingHeaders.length + ' columns (' + (existingHeaders[3] || 'none') + ').'
        });
      }

      // Check session_id in Column 2 for idempotent duplicate
      if (lastRow > 1) {
        var existingSessions = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
        for (var rowIndex = 0; rowIndex < existingSessions.length; rowIndex++) {
          if (String(existingSessions[rowIndex][0]) === data.session_id) {
            return jsonResponse({ ok: true, duplicate: true });
          }
        }
      }
    }

    // Build row values matching expected physical columns exactly
    var row = [
      safeSheetText(data.completed_at),
      safeSheetText(data.session_id),
      safeSheetText(data.questionnaire_version)
    ];

    // Scored question columns: Col 1 = Answer label, Col 2 = numeric points (or blank if N/A)
    for (var qIdx = 0; qIdx < schema.scoredQuestions.length; qIdx++) {
      var qItem = schema.scoredQuestions[qIdx];
      var qId = typeof qItem === 'object' ? qItem.id : qItem;
      var qData = extractAnswerData(data.answers, qId);
      row.push(safeSheetText(qData.label));
      row.push(qData.points !== '' ? qData.points : '');
    }

    // Safety question columns: Answer label only (no points)
    for (var sqIdx = 0; sqIdx < schema.safetyQuestions.length; sqIdx++) {
      var sqItem = schema.safetyQuestions[sqIdx];
      var sqId = typeof sqItem === 'object' ? sqItem.id : sqItem;
      var sqData = extractAnswerData(data.safety_answers || data.answers, sqId);
      row.push(safeSheetText(sqData.label));
    }

    // Metric and score summary
    row.push(data.raw_score !== undefined ? data.raw_score : '');
    row.push(data.available_max !== undefined ? data.available_max : '');
    row.push(data.final_score);

    // Human-facing category
    row.push(safeSheetText(data.displayed_category || data.calculated_category || ''));

    // Safety attention summary (Oui / Non, for questionnaires with safety questions)
    if (schema.hasSafety) {
      var hasAttention = false;
      if (data.safety_flags && Array.isArray(data.safety_flags) && data.safety_flags.length > 0) {
        hasAttention = true;
      }
      row.push(hasAttention ? 'Oui' : 'Non');
    }

    sheet.appendRow(row);

    return jsonResponse({ ok: true, duplicate: false });
  } catch (error) {
    console.error(error);
    return jsonResponse({ ok: false, code: 'internal_error', error: 'Internal storage error: ' + error.message });
  } finally {
    if (hasLock) lock.releaseLock();
  }
}
