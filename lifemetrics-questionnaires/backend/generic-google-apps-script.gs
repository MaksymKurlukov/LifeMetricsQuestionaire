/**
 * LifeMetrics Questionnaires Central Google Apps Script Web App.
 *
 * Storage Architecture:
 * - ONE central Google Spreadsheet: "LifeMetrics — Questionnaires"
 * - Separate physical worksheets per proprietary questionnaire (Sedentarite, Hydratation, etc.)
 * - Flat, human-readable column-by-column layout for every scored question and safety question
 * - Header schema enforcement with fail-safe rejection on header conflict
 * - Idempotency via session_id deduplication on Column 2
 * - Formula injection protection (escaping '=+-@')
 * - Concurrency locking and rate limiting
 */

var QUESTIONNAIRE_SCHEMAS = {
  'sedentarite': {
    sheetName: 'Sedentarite',
    scoredQuestions: [
      { id: 'SD01', text: 'SD01 — Au cours des 14 derniers jours, combien de temps avez-vous passé assis en moyenne par jour de travail ou d\'études ?' },
      { id: 'SD02', text: 'SD02 — Au cours des 14 derniers jours, combien de jours par semaine avez-vous passé plus de 7 heures assis au total ?' },
      { id: 'SD03', text: 'SD03 — Lorsque vous travaillez, étudiez ou vous détendez, combien de temps restez-vous assis en continu avant de vous lever ?' },
      { id: 'SD04', text: 'SD04 — Au cours des 14 derniers jours, à quelle fréquence avez-vous interrompu vos périodes assises prolongées par une pause active ?' },
      { id: 'SD05', text: 'SD05 — Lorsque vous restez assis pendant une période prolongée, vos postures sont-elles variées ou soutenues par un bon alignement ?' },
      { id: 'SD06', text: 'SD06 — Lorsque vous interrompez une période assise, que faites-vous le plus souvent ?' },
      { id: 'SD07', text: 'SD07 — Pendant vos périodes de travail ou d\'études, à quelle fréquence avez-vous l\'occasion d\'effectuer des tâches debout ou en mouvement ?' },
      { id: 'SD08', text: 'SD08 — Pour vos déplacements habituels, quelle part du trajet réalisez-vous de façon active ?' },
      { id: 'SD09', text: 'SD09 — En dehors du travail ou des études, combien de temps passez-vous assis devant un écran par jour en moyenne ?' },
      { id: 'SD10', text: 'SD10 — Lorsque vous regardez un écran ou réalisez une activité assise de loisir, faites-vous régulièrement des pauses actives ?' },
      { id: 'SD11', text: 'SD11 — En dehors de vos séances de sport éventuelles, à quelle fréquence compensez-vous une longue période assise par une marche ou une activité légère ?' },
      { id: 'SD12', text: 'SD12 — Au cours des 14 derniers jours, avez-vous réussi à limiter vos journées d\'immobilité prolongée ?' }
    ],
    safetyQuestions: []
  },
  'hydratation': {
    sheetName: 'Hydratation',
    scoredQuestions: [
      { id: 'HY01', text: 'HY01 — Au cours des 14 derniers jours, quelle place l\'eau a-t-elle occupée dans vos boissons quotidiennes ?' },
      { id: 'HY02', text: 'HY02 — Au cours des 14 derniers jours, à quelle fréquence avez-vous bu de l\'eau dès le début de votre journée ?' },
      { id: 'HY03', text: 'HY03 — Au cours des 14 derniers jours, à quelle fréquence avez-vous bu régulièrement de l\'eau tout au long de la journée ?' },
      { id: 'HY04', text: 'HY04 — Au cours d\'une journée habituelle, à quelle fréquence consommez-vous des boissons sucrées, édulcorées ou des sodas ?' },
      { id: 'HY05', text: 'HY05 — Lorsque vous pratiquez une activité physique ou effectuez un effort soutenu, augmentez-vous vos apports en eau ?' },
      { id: 'HY06', text: 'HY06 — Lorsqu\'il fait chaud ou que vous transpirez davantage, ajustez-vous spontanément votre consommation d\'eau ?' },
      { id: 'HY07', text: 'HY07 — Lorsque vous avez soif, à quelle fréquence choisissez-vous l\'eau plutôt qu\'une autre boisson ?' },
      { id: 'HY08', text: 'HY08 — Au cours des 14 derniers jours, à quelle fréquence avez-vous attendu d\'avoir une sensation de soif marquée avant de boire de l\'eau ?' },
      { id: 'HY09', text: 'HY09 — Votre alimentation comprend-elle régulièrement des aliments riches en eau ?' },
      { id: 'HY10', text: 'HY10 — Dans votre quotidien, avez-vous généralement de l\'eau facilement accessible ?' },
      { id: 'HY11', text: 'HY11 — Lorsque vous prévoyez une longue journée, un déplacement ou une sortie prolongée, emportez-vous de l\'eau ?' },
      { id: 'HY12', text: 'HY12 — Au cours des 14 derniers jours, vos bonnes habitudes d\'hydratation ont-elles été régulières d\'un jour à l\'autre ?' }
    ],
    safetyQuestions: [
      { id: 'HYSF01', text: 'HYSF01 — Un professionnel de santé vous a-t-il demandé de limiter vos apports en eau ou liquides en raison d\'un problème médical ?' },
      { id: 'HYSF02', text: 'HYSF02 — Avez-vous actuellement ou récemment eu des pertes d\'eau anormales et importantes ?' },
      { id: 'HYSF03', text: 'HYSF03 — Avez-vous actuellement des symptômes importants tels que vertiges marqués, confusion, soif extrême ou malaise ?' }
    ]
  },
  'fatigue-recuperation': {
    sheetName: 'Fatigue',
    scoredQuestions: [
      { id: 'FR01', text: 'FR01 — Au cours des 14 derniers jours, à quelle fréquence vous êtes-vous senti reposé et plein d\'énergie au réveil ?' },
      { id: 'FR02', text: 'FR02 — Après une nuit de sommeil ou une période normale de repos, à quel point votre niveau d\'énergie augmente-t-il généralement ?' },
      { id: 'FR03', text: 'FR03 — Au cours des 14 derniers jours, à quelle fréquence votre énergie est-elle restée stable tout au long de la journée ?' },
      { id: 'FR04', text: 'FR04 — Au cours des 14 derniers jours, votre énergie est-elle restée suffisante pour accomplir vos activités habituelles ?' },
      { id: 'FR05', text: 'FR05 — Au cours des 14 derniers jours, à quelle fréquence avez-vous ressenti des baisses d\'énergie prononcées pendant la journée ?' },
      { id: 'FR06', text: 'FR06 — Au cours des 14 derniers jours, à quelle fréquence avez-vous eu la sensation d\'être mentalement épuisé ou saturé ?' },
      { id: 'FR07', text: 'FR07 — Après une journée normalement active ou une activité sportive modérée, retrouvez-vous votre niveau d\'énergie habituel dès le lendemain ?' },
      { id: 'FR08', text: 'FR08 — Après une journée plus exigeante que d\'habitude, à quelle vitesse récupérez-vous généralement ?' },
      { id: 'FR09', text: 'FR09 — Lorsque vous vous sentez fatigué, une période adaptée de repos, de sommeil ou de calme vous permet-elle de récupérer efficacement ?' },
      { id: 'FR10', text: 'FR10 — Au cours des 14 derniers jours, à quelle fréquence avez-vous accordé du temps à des activités calmes ou relaxantes favorisant votre récupération ?' },
      { id: 'FR11', text: 'FR11 — Au cours des 14 derniers jours, votre niveau d\'énergie globale a-t-il été régulier d\'un jour à l\'autre ?' },
      { id: 'FR12', text: 'FR12 — En considérant globalement les 14 derniers jours, à quelle fréquence avez-vous ressenti une fatigue générale persistante ?' }
    ],
    safetyQuestions: [
      { id: 'FRSF01', text: 'FRSF01 — Votre fatigue persiste-t-elle depuis plusieurs jours ou semaines sans cause évidente ?' },
      { id: 'FRSF02', text: 'FRSF02 — Votre fatigue est-elle actuellement si importante qu\'elle vous empêche d\'effectuer vos activités quotidiennes de base ?' },
      { id: 'FRSF03', text: 'FRSF03 — Votre fatigue s\'accompagne-t-elle actuellement de symptômes inhabituels tels que fièvre inexpliquée, perte de poids involontaire ou essoufflement anormal ?' }
    ]
  },
  'sommeil': {
    sheetName: 'Sommeil',
    scoredQuestions: [
      { id: 'SL01', text: 'SL01 — Au cours des 14 derniers jours, combien de temps avez-vous dormi en moyenne par nuit ?' },
      { id: 'SL02', text: 'SL02 — Au cours des 14 derniers jours, à quelle fréquence avez-vous eu la sensation que votre durée de sommeil correspondait à vos besoins ?' },
      { id: 'SL03', text: 'SL03 — Au cours des 14 derniers jours, combien de temps vous a-t-il fallu en moyenne pour vous endormir après avoir éteint la lumière ?' },
      { id: 'SL04', text: 'SL04 — Au cours des 14 derniers jours, à quelle fréquence votre sommeil a-t-il été interrompu par des réveils qui vous ont réellement gêné ?' },
      { id: 'SL05', text: 'SL05 — Lorsque vous vous réveillez pendant la nuit, parvenez-vous généralement à vous rendormir facilement ?' },
      { id: 'SL06', text: 'SL06 — Au cours des 14 derniers jours, vos heures habituelles de coucher et de lever ont-elles été relativement régulières ?' },
      { id: 'SL07', text: 'SL07 — Entre vos jours de travail ou d\'études et vos jours libres, à quel point vos horaires de sommeil changent-ils généralement ?' },
      { id: 'SL08', text: 'SL08 — Au cours des 14 derniers jours, à quelle fréquence vous êtes-vous réveillé avec la sensation d\'avoir réellement récupéré ?' },
      { id: 'SL09', text: 'SL09 — Au cours des 14 derniers jours, à quelle fréquence avez-vous eu du mal à rester éveillé ou attentif pendant la journée à cause de la somnolence ?' },
      { id: 'SL10', text: 'SL10 — Au cours des 14 derniers jours, à quelle fréquence votre sommeil vous a-t-il semblé suffisant pour maintenir une bonne énergie et une bonne concentration pendant la journée ?' },
      { id: 'SL11', text: 'SL11 — Au cours des 14 derniers jours, à quelle fréquence avez-vous consacré la période précédant votre coucher à des activités calmes favorisant la transition vers le sommeil ?' },
      { id: 'SL12', text: 'SL12 — Au cours des 14 derniers jours, votre environnement et vos habitudes vous ont-ils généralement permis de dormir sans perturbations évitables ?' }
    ],
    safetyQuestions: [
      { id: 'SLSF01', text: 'SLSF01 — Vous a-t-on déjà signalé des pauses respiratoires, des étouffements ou des reprises de respiration inhabituelles pendant votre sommeil ?' },
      { id: 'SLSF02', text: 'SLSF02 — Votre somnolence vous a-t-elle déjà mis en difficulté ou en danger, notamment au volant ou lors d\'une activité nécessitant de rester vigilant ?' },
      { id: 'SLSF03', text: 'SLSF03 — Vos difficultés de sommeil persistent-elles depuis plusieurs semaines et affectent-elles fortement votre travail, vos études ou votre vie quotidienne ?' }
    ]
  },
  'nutrition': {
    sheetName: 'Nutrition',
    scoredQuestions: [
      { id: 'NT01', text: 'NT01 — Au cours des 14 derniers jours, combien de portions de fruits et légumes avez-vous consommées en moyenne chaque jour ?' },
      { id: 'NT02', text: 'NT02 — Au cours d\'une semaine habituelle, votre alimentation comprend-elle une variété de fruits, légumes et autres aliments d\'origine végétale ?' },
      { id: 'NT03', text: 'NT03 — Au cours d\'une semaine habituelle, à quelle fréquence consommez-vous des légumes secs ?' },
      { id: 'NT04', text: 'NT04 — Lorsque vous consommez du pain, du riz, des pâtes, de la semoule ou d\'autres produits céréaliers, à quelle fréquence choisissez-vous une version complète ou semi-complète ?' },
      { id: 'NT05', text: 'NT05 — Au cours d\'une semaine habituelle, alternez-vous différentes sources de protéines ?' },
      { id: 'NT06', text: 'NT06 — Au cours d\'une semaine habituelle, à quelle fréquence consommez-vous du poisson ou, si vous n\'en mangez pas, des alternatives permettant de diversifier vos sources de protéines et de bonnes graisses ?' },
      { id: 'NT07', text: 'NT07 — Pour cuisiner ou assaisonner vos repas, à quelle fréquence privilégiez-vous des huiles végétales comme l\'huile d\'olive, de colza ou de noix plutôt que des matières grasses riches en graisses saturées ?' },
      { id: 'NT08', text: 'NT08 — Au cours des 14 derniers jours, quelle place les aliments frais ou peu transformés et les repas préparés simplement ont-ils occupée dans votre alimentation ?' },
      { id: 'NT09', text: 'NT09 — Au cours des 14 derniers jours, à quelle fréquence avez-vous consommé des boissons sucrées ?' },
      { id: 'NT10', text: 'NT10 — Au cours des 14 derniers jours, à quelle fréquence les produits très gras, très sucrés, très salés ou ultra-transformés ont-ils occupé une place importante dans vos repas ou collations ?' },
      { id: 'NT11', text: 'NT11 — Au cours des 14 derniers jours, à quelle fréquence vos repas principaux combinaient-ils plusieurs groupes d\'aliments complémentaires ?' },
      { id: 'NT12', text: 'NT12 — Au cours des 14 derniers jours, à quelle fréquence votre organisation alimentaire vous a-t-elle permis de manger de façon relativement régulière sans grignotages fréquents ou repas improvisés faute d\'organisation ?' }
    ],
    safetyQuestions: [
      { id: 'NTSF01', text: 'NTSF01 — Suivez-vous actuellement un régime alimentaire spécifique pour une raison médicale ?' },
      { id: 'NTSF02', text: 'NTSF02 — Avez-vous perdu ou pris une quantité importante de poids récemment sans l\'avoir réellement souhaité ?' },
      { id: 'NTSF03', text: 'NTSF03 — Avez-vous actuellement des difficultés importantes à vous alimenter ou des préoccupations concernant votre comportement alimentaire ?' }
    ]
  },
  'activite-physique': {
    sheetName: 'Activite_Physique',
    scoredQuestions: [
      { id: 'AP01', text: 'AP01 — Au cours des 7 derniers jours, combien de jours avez-vous pratiqué au moins 30 minutes d\'activité physique dynamique au total ?' },
      { id: 'AP02', text: 'AP02 — Environ combien de temps avez-vous consacré au total à une activité physique d\'intensité au moins modérée pendant les 7 derniers jours ?' },
      { id: 'AP03', text: 'AP03 — Lorsque vous êtes physiquement actif, à quelle fréquence votre activité accélère-t-elle réellement votre respiration et votre rythme cardiaque ?' },
      { id: 'AP04', text: 'AP04 — Au cours d\'une semaine habituelle, combien de jours réalisez-vous des activités qui sollicitent volontairement vos muscles ?' },
      { id: 'AP05', text: 'AP05 — Vos activités physiques sollicitent-elles différentes parties du corps au cours de la semaine ?' },
      { id: 'AP06', text: 'AP06 — Combien de jours par semaine utilisez-vous volontairement la marche, le vélo, les escaliers ou un autre déplacement actif dans votre quotidien ?' },
      { id: 'AP07', text: 'AP07 — En dehors de vos séances de sport éventuelles, votre journée comporte-t-elle régulièrement des périodes où vous marchez, vous déplacez ou effectuez des tâches physiques ?' },
      { id: 'AP08', text: 'AP08 — Lors d\'une journée habituelle, combien de temps passez-vous principalement assis ou allongé, en dehors du sommeil ?' },
      { id: 'AP09', text: 'AP09 — Lorsque vous devez rester assis longtemps, à quelle fréquence vous levez-vous pour marcher ou bouger quelques minutes ?' },
      { id: 'AP10', text: 'AP10 — Votre activité physique est-elle répartie sur plusieurs jours de la semaine ?' },
      { id: 'AP11', text: 'AP11 — Au cours des 4 dernières semaines, combien de semaines ont comporté une activité physique régulière ?' },
      { id: 'AP12', text: 'AP12 — Au cours d\'une semaine habituelle, combien de journées passez-vous avec très peu de marche ou d\'activité physique ?' }
    ],
    safetyQuestions: []
  },
  'pieds-confort-postural': {
    sheetName: 'Pieds_Confort',
    scoredQuestions: [
      { id: 'PF01', text: 'PF01 — Au cours des 14 derniers jours, à quelle fréquence avez-vous ressenti une douleur au niveau d\'un ou des deux pieds ?' },
      { id: 'PF02', text: 'PF02 — Lorsque vous ressentez une gêne au niveau des pieds, dans quelle mesure celle-ci perturbe-t-elle votre confort ?' },
      { id: 'PF03', text: 'PF03 — Au cours des 14 derniers jours, à quelle fréquence avez-vous pu marcher aussi longtemps que vous le souhaitiez sans gêne importante au niveau des pieds ?' },
      { id: 'PF04', text: 'PF04 — Lorsque vous restez debout pendant une période prolongée, comment vos pieds tolèrent-ils généralement cette situation ?' },
      { id: 'PF05', text: 'PF05 — Au cours des 14 derniers jours, à quelle fréquence vous êtes-vous senti stable et en confiance lorsque vous étiez debout ou en mouvement ?' },
      { id: 'PF06', text: 'PF06 — Au cours des 14 derniers jours, avez-vous eu l\'impression de charger davantage un pied, un côté du pied ou une jambe que l\'autre lorsque vous êtes debout ou marchez ?' },
      { id: 'PF07', text: 'PF07 — Au cours des 14 derniers jours, à quelle fréquence vos chaussures habituelles vous ont-elles permis de marcher ou rester debout confortablement ?' },
      { id: 'PF08', text: 'PF08 — Au cours des 14 derniers jours, à quelle fréquence avez-vous ressenti des zones de pression, de frottement ou d\'échauffement inhabituelles dans vos chaussures ?' },
      { id: 'PF09', text: 'PF09 — Au cours des 14 derniers jours, à quelle fréquence une gêne au niveau des pieds vous a-t-elle conduit à réduire, reporter ou éviter une activité habituelle ?' },
      { id: 'PF10', text: 'PF10 — Au cours des 14 derniers jours, à quelle fréquence avez-vous modifié votre façon de marcher à cause d\'une douleur ou d\'un inconfort au niveau des pieds ?' },
      { id: 'PF11', text: 'PF11 — Après une journée avec beaucoup de marche ou de station debout, à quelle fréquence vos pieds retrouvent-ils un confort habituel après une période normale de repos ?' },
      { id: 'PF12', text: 'PF12 — En considérant globalement les 14 derniers jours, comment évalueriez-vous le confort de vos pieds dans votre vie quotidienne ?' }
    ],
    safetyQuestions: [
      { id: 'PFSF01', text: 'PFSF01 — Avez-vous actuellement une plaie qui cicatrise mal, qui suinte ou une modification inhabituelle de la couleur ou de la température d\'un pied ?' },
      { id: 'PFSF02', text: 'PFSF02 — Avez-vous récemment constaté une diminution ou une perte inhabituelle de sensibilité au niveau d\'un pied ?' },
      { id: 'PFSF03', text: 'PFSF03 — Votre douleur est-elle apparue brutalement après une chute, un choc ou un autre traumatisme récent ?' },
      { id: 'PFSF04', text: 'PFSF04 — La douleur ou la gêne vous empêche-t-elle actuellement de marcher normalement ou d\'assurer vos activités habituelles ?' }
    ]
  }
};

function getHeaderList(schema) {
  var headers = [
    'completed_at',
    'session_id',
    'questionnaire_id',
    'questionnaire_version',
    'client_version',
    'locale',
    'source_page'
  ];
  for (var i = 0; i < schema.scoredQuestions.length; i++) {
    headers.push(schema.scoredQuestions[i].text);
  }
  for (var j = 0; j < schema.safetyQuestions.length; j++) {
    headers.push(schema.safetyQuestions[j].text);
  }
  headers.push(
    'raw_score',
    'available_min',
    'available_max',
    'final_score',
    'calculated_category',
    'displayed_category',
    'dimensions_json',
    'safety_flags_json'
  );
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

function extractAnswerLabel(answersObj, questionId) {
  if (!answersObj || typeof answersObj !== 'object') return '';
  var answer = answersObj[questionId];
  if (answer === null || answer === undefined) return '';
  if (typeof answer === 'object') {
    if (answer.label !== undefined && answer.label !== null && String(answer.label).trim() !== '') {
      return String(answer.label);
    }
    if (answer.value !== undefined && answer.value !== null) {
      return String(answer.value);
    }
    return JSON.stringify(answer);
  }
  return String(answer);
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

    var expectedHeaders = getHeaderList(schema);
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
                 expectedHeaders.length + ' columns (' + expectedHeaders[7] + '...), but found ' +
                 existingHeaders.length + ' columns (' + (existingHeaders[7] || 'none') + ').'
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
      safeSheetText(data.questionnaire_id),
      safeSheetText(data.questionnaire_version),
      safeSheetText(data.client_version || ''),
      safeSheetText(data.locale || ''),
      safeSheetText(data.source_page || '')
    ];

    // Scored question columns in canonical order
    for (var qIdx = 0; qIdx < schema.scoredQuestions.length; qIdx++) {
      var q = schema.scoredQuestions[qIdx];
      var qLabel = extractAnswerLabel(data.answers, q.id);
      row.push(safeSheetText(qLabel));
    }

    // Safety question columns in canonical order
    for (var sqIdx = 0; sqIdx < schema.safetyQuestions.length; sqIdx++) {
      var sq = schema.safetyQuestions[sqIdx];
      var sqLabel = extractAnswerLabel(data.safety_answers, sq.id);
      if (!sqLabel && data.answers) {
        sqLabel = extractAnswerLabel(data.answers, sq.id);
      }
      row.push(safeSheetText(sqLabel));
    }

    // Metric and calculated score columns
    row.push(data.raw_score !== undefined ? data.raw_score : '');
    row.push(data.available_min !== undefined ? data.available_min : '');
    row.push(data.available_max !== undefined ? data.available_max : '');
    row.push(data.final_score);
    row.push(safeSheetText(data.calculated_category));
    row.push(safeSheetText(data.displayed_category || ''));
    row.push(safeSheetText(data.dimensions || {}));
    row.push(safeSheetText(data.safety_flags || []));

    sheet.appendRow(row);

    return jsonResponse({ ok: true, duplicate: false });
  } catch (error) {
    console.error(error);
    return jsonResponse({ ok: false, code: 'internal_error', error: 'Internal storage error: ' + error.message });
  } finally {
    if (hasLock) lock.releaseLock();
  }
}
