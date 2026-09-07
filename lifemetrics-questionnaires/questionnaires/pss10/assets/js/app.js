/**
 * PSS-10 WordPress frontend.
 * Intro -> Questionnaire -> Result -> confirmed same-origin REST submission.
 */
(function () {
  'use strict';

  const PSS_QUESTIONS = [
    "Avez-vous été dérangé par un événement inattendu ?",
    "Vous a-t-il semblé difficile de contrôler les choses importantes de votre quotidien ?",
    "Vous êtes-vous senti nerveux et stressé ?",
    "Vous êtes-vous senti confiant dans vos capacités à prendre en main vos problèmes personnels ?",
    "Avez-vous senti que les choses allaient comme vous le vouliez ?",
    "Avez-vous pensé que vous ne pouviez pas assumer toutes les choses que vous deviez faire ?",
    "Avez-vous été capable de maîtriser votre énervement ?",
    "Avez-vous senti que vous contrôliez la situation ?",
    "Vous êtes-vous senti irrité parce que les événements échappaient à votre contrôle ?",
    "Avez-vous trouvé que les difficultés s'accumulaient à un tel point que vous ne pouviez plus les surmonter ?"
  ];

  const ANSWER_LABELS = [
    'Jamais',
    'Presque jamais',
    'Parfois',
    'Assez souvent',
    'Très souvent'
  ];

  const REVERSE_QUESTIONS = [4, 5, 7, 8];

  function initPss10(root, rootIndex) {
    if (root.getAttribute('data-lmq-initialized') === 'true') return;
    root.setAttribute('data-lmq-initialized', 'true');

    const find = function (selector) {
      return root.querySelector(selector);
    };
    const submitEndpoint = root.getAttribute('data-lmq-submit-url') || '';
    const instanceName = root.id || ('lmq-pss10-' + rootIndex);
    const sections = {
      intro: find('[data-lmq-section="intro"]'),
      test: find('[data-lmq-section="test"]'),
      result: find('[data-lmq-section="result"]')
    };
    const progressBar = find('[data-lmq-role="progress-bar"]');
    const progressLabel = find('[data-lmq-role="progress-label"]');
    const testQuestion = find('[data-lmq-role="test-question"]');
    const answersContainer = find('[data-lmq-role="answers"]');
    const btnBack = find('[data-lmq-role="back"]');
    const btnStart = find('[data-lmq-role="start"]');
    const resultScore = find('[data-lmq-role="result-score"]');
    const resultBadge = find('[data-lmq-role="result-badge"]');
    const gaugeFill = find('[data-lmq-role="gauge-fill"]');
    const gaugeNeedle = find('[data-lmq-role="gauge-needle"]');
    const interpretationTitle = find('[data-lmq-role="interpretation-title"]');
    const analysisText = find('[data-lmq-role="analysis-text"]');
    const toast = find('[data-lmq-role="toast"]');
    const modalOverlay = find('[data-lmq-role="modal-overlay"]');
    const linkEnSavoirPlus = find('[data-lmq-role="learn-more"]');
    const modalClose = find('[data-lmq-role="modal-close"]');
    const resultSaveAlert = find('[data-lmq-role="save-alert"]');
    const resultSaveAlertText = find('[data-lmq-role="save-alert-text"]');
    const btnRetrySend = find('[data-lmq-role="retry"]');
    const btnRefaireTest = find('[data-lmq-role="restart"]');

    if (
      !sections.intro || !sections.test || !sections.result ||
      !progressBar || !progressLabel || !testQuestion || !answersContainer ||
      !btnBack || !btnStart || !resultScore || !resultBadge || !gaugeFill ||
      !gaugeNeedle || !interpretationTitle || !analysisText || !modalOverlay
    ) {
      return;
    }

    let state = {
      sessionId: null,
      currentQuestion: 1,
      answers: {},
      lastPayload: null,
      saveFailed: false,
      saving: false
    };
    let autoAdvanceTimer = null;
    let toastTimer = null;
    let focusBeforeModal = null;

    function generateSessionId() {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
      }
      var hex = '0123456789abcdef';
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (character) {
        var random = Math.random() * 16 | 0;
        var value = character === 'x' ? random : (random & 0x3 | 0x8);
        return hex[value];
      });
    }

    function showToast(message, hideAfter) {
      if (!toast) return;
      if (toastTimer) clearTimeout(toastTimer);
      toast.textContent = message;
      toast.hidden = false;
      toast.classList.add('toast--visible');
      if (hideAfter) toastTimer = setTimeout(hideToast, hideAfter);
    }

    function hideToast() {
      if (!toast) return;
      toast.classList.remove('toast--visible');
      toastTimer = setTimeout(function () {
        toast.hidden = true;
      }, 300);
    }

    function showSection(name) {
      Object.keys(sections).forEach(function (key) {
        var section = sections[key];
        var active = key === name;
        section.classList.toggle('section--active', active);
        section.hidden = !active;
      });
    }

    /**
     * The source project's 1-5 answers, 10-50 total, reverse scoring and
     * thresholds are intentionally preserved. They require separate clinical
     * and business validation before anyone changes them.
     */
    function computeScoreLocal() {
      var total = 0;
      for (var question = 1; question <= 10; question++) {
        var value = state.answers[question];
        if (value == null) continue;
        total += REVERSE_QUESTIONS.indexOf(question) >= 0 ? (6 - value) : value;
      }

      total = Math.max(10, Math.min(50, total));
      var category = 'low';
      if (total >= 27) category = 'high';
      else if (total >= 21) category = 'medium';

      var texts = {
        low: "0-20 : vous n'avez pas trop de souci pour gérer vos stress. En suivant votre programme personnalisé, vous pourrez encore gagner en sérénité, vous relaxer et apprendre tous les outils pour gérer le stress et les émotions liées à celui-ci.",
        medium: "21-26 : il arrive que vous vous sentiez tendu et que vous ayez du mal à gérer certaines situations provoquant du stress. Cela peut vous amener à un sentiment d'impuissance qui peut affecter vos émotions. En suivant votre programme, vous aurez tous les outils pour gérer le stress et les émotions liées à celui-ci. Pensez également à contacter un de nos praticiens certifiés.",
        high: "27 ou plus : vous êtes très affecté par le stress. Vous avez également très souvent le sentiment de ne pas contrôler certaines situations et que vos émotions prennent le dessus. Pas d'inquiétude, nous allons vous accompagner vers le mieux-être grâce au programme personnalisé conçu sur mesure pour gérer cette problématique qui importune votre quotidien. Pensez également à contacter un de nos praticiens certifiés."
      };
      var titles = {
        low: 'Votre niveau de stress est bas, félicitations.',
        medium: 'Votre niveau de stress est assez élevé.',
        high: 'Votre niveau de stress est très élevé.'
      };

      return {
        final_score: total,
        category: category,
        interpretation_title: titles[category],
        analysis_text: texts[category]
      };
    }

    function buildPayload(result) {
      var payload = {
        created_at: new Date().toISOString(),
        session_id: state.sessionId,
        final_score: result.final_score,
        category: result.category === 'low'
          ? 'Stress bas'
          : (result.category === 'medium' ? 'Stress assez élevé' : 'Stress très élevé')
      };

      for (var question = 1; question <= 10; question++) {
        var answer = state.answers[question];
        payload['q' + question] = REVERSE_QUESTIONS.indexOf(question) >= 0
          ? (6 - answer)
          : answer;
      }

      return payload;
    }

    function submissionError(kind) {
      var error = new Error(kind);
      error.lmqKind = kind;
      return error;
    }

    function sendToWordPress(payload) {
      if (!submitEndpoint) return Promise.reject(submissionError('configuration'));

      return fetch(submitEndpoint, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(function (response) {
        return response.json().catch(function () {
          return null;
        }).then(function (data) {
          if (!response.ok || !data || data.success !== true) {
            throw submissionError(response.status >= 500 ? 'backend' : 'validation');
          }
          return data;
        });
      }).catch(function (error) {
        if (error && error.lmqKind) throw error;
        throw submissionError('network');
      });
    }

    function displaySaveError(error) {
      var messages = {
        configuration: "L'enregistrement n'est pas configuré.",
        validation: 'Le résultat est invalide et ne peut pas être enregistré.',
        network: 'Connexion impossible. Vérifiez votre connexion et réessayez.',
        backend: "Le service d'enregistrement est temporairement indisponible."
      };
      var message = messages[error.lmqKind] || messages.backend;

      state.saveFailed = true;
      if (resultSaveAlertText) resultSaveAlertText.textContent = message;
      if (resultSaveAlert) resultSaveAlert.hidden = false;
      showToast(message, 3500);
    }

    function submitPayload(payload) {
      if (state.saving) return;
      state.saving = true;
      state.saveFailed = false;
      if (btnRetrySend) btnRetrySend.disabled = true;
      if (resultSaveAlert) resultSaveAlert.hidden = true;
      showToast('Sauvegarde en cours…');

      sendToWordPress(payload).then(function () {
        state.saving = false;
        state.saveFailed = false;
        if (btnRetrySend) btnRetrySend.disabled = false;
        if (resultSaveAlert) resultSaveAlert.hidden = true;
        hideToast();
      }).catch(function (error) {
        state.saving = false;
        if (btnRetrySend) btnRetrySend.disabled = false;
        displaySaveError(error);
      });
    }

    function submitResultToBackend(result) {
      state.lastPayload = buildPayload(result);
      submitPayload(state.lastPayload);
    }

    function retrySend() {
      if (state.lastPayload) submitPayload(state.lastPayload);
    }

    function renderQuestion() {
      var questionNumber = state.currentQuestion;
      var total = PSS_QUESTIONS.length;
      progressBar.style.width = (questionNumber / total * 100) + '%';
      progressBar.setAttribute('aria-valuenow', questionNumber);
      progressLabel.textContent = 'Question ' + questionNumber + '/' + total;
      testQuestion.textContent = PSS_QUESTIONS[questionNumber - 1];
      answersContainer.innerHTML = '';

      var selected = state.answers[questionNumber];
      ANSWER_LABELS.forEach(function (label, index) {
        var value = index + 1;
        var card = root.ownerDocument.createElement('label');
        var input = root.ownerDocument.createElement('input');

        card.className = 'answer-card' + (selected === value ? ' answer-card--selected' : '');
        card.setAttribute('data-value', value);
        input.type = 'radio';
        input.name = instanceName + '-q-' + questionNumber;
        input.value = value;
        if (selected === value) input.checked = true;
        card.appendChild(input);
        card.appendChild(root.ownerDocument.createTextNode(label));
        card.addEventListener('click', onAnswerClick);
        answersContainer.appendChild(card);
      });

      btnBack.disabled = questionNumber <= 1;
    }

    function onAnswerClick(event) {
      var card = event.currentTarget;
      var value = parseInt(card.getAttribute('data-value'), 10);
      var questionId = state.currentQuestion;
      cancelAutoAdvance();

      answersContainer.querySelectorAll('.answer-card').forEach(function (answerCard) {
        answerCard.classList.remove('answer-card--selected');
        answerCard.style.pointerEvents = 'none';
      });
      card.classList.add('answer-card--selected');
      state.answers[questionId] = value;

      if (questionId < PSS_QUESTIONS.length) {
        autoAdvanceTimer = setTimeout(function () {
          state.currentQuestion = questionId + 1;
          renderQuestion();
        }, 400);
      } else {
        var result = computeScoreLocal();
        showResult(result);
        submitResultToBackend(result);
      }
    }

    function showResult(data) {
      showSection('result');
      var score = data.final_score;
      var category = data.category;
      var valueElement = resultScore.querySelector('.result-score__value');

      if (valueElement) valueElement.textContent = score;
      else resultScore.textContent = score + ' / 50';
      resultBadge.textContent = category === 'low'
        ? 'Stress bas'
        : (category === 'medium' ? 'Stress modéré' : 'Stress élevé');
      resultBadge.className = 'result-badge result-badge--' + category;
      interpretationTitle.textContent = data.interpretation_title;
      analysisText.textContent = data.analysis_text;

      var circumference = Math.PI * 80;
      var ratio = score / 50;
      gaugeFill.setAttribute('stroke-dashoffset', circumference * (1 - ratio));
      gaugeNeedle.setAttribute('transform', 'rotate(' + (180 - ratio * 180) + ', 100, 100)');
      if (resultSaveAlert) resultSaveAlert.hidden = !state.saveFailed;
    }

    function cancelAutoAdvance() {
      if (!autoAdvanceTimer) return;
      clearTimeout(autoAdvanceTimer);
      autoAdvanceTimer = null;
    }

    function startTest() {
      cancelAutoAdvance();
      state.sessionId = generateSessionId();
      state.currentQuestion = 1;
      state.answers = {};
      state.lastPayload = null;
      state.saveFailed = false;
      showSection('test');
      renderQuestion();
    }

    function goBack() {
      if (state.currentQuestion <= 1) return;
      cancelAutoAdvance();
      state.currentQuestion--;
      renderQuestion();
    }

    function restartTest() {
      cancelAutoAdvance();
      state.sessionId = null;
      state.currentQuestion = 1;
      state.answers = {};
      state.lastPayload = null;
      state.saveFailed = false;
      if (resultSaveAlert) resultSaveAlert.hidden = true;
      showSection('intro');
    }

    function openModal() {
      focusBeforeModal = root.ownerDocument.activeElement;
      modalOverlay.classList.add('modal--open');
      modalOverlay.setAttribute('aria-hidden', 'false');
      if (modalClose) modalClose.focus();
    }

    function closeModal() {
      if (!modalOverlay.classList.contains('modal--open')) return;
      modalOverlay.classList.remove('modal--open');
      modalOverlay.setAttribute('aria-hidden', 'true');
      if (focusBeforeModal && focusBeforeModal.focus) focusBeforeModal.focus();
    }

    btnStart.addEventListener('click', startTest);
    btnBack.addEventListener('click', goBack);
    if (linkEnSavoirPlus) {
      linkEnSavoirPlus.addEventListener('click', function (event) {
        event.preventDefault();
        openModal();
      });
    }
    if (modalClose) modalClose.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', function (event) {
      if (event.target === modalOverlay) closeModal();
    });
    if (btnRetrySend) btnRetrySend.addEventListener('click', retrySend);
    if (btnRefaireTest) btnRefaireTest.addEventListener('click', restartTest);
    root.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeModal();
    });
  }

  document.querySelectorAll('[data-lmq-questionnaire="pss10"]').forEach(initPss10);
})();
