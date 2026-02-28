/**
 * PSS-10 - Application SPA (une page, sections cachées)
 * Intro -> Questionnaire -> Résultat
 * Backend : un seul envoi en fin de test vers Google Apps Script (Google Sheet).
 */

(function () {
  'use strict';

  var GOOGLE_ENDPOINT = (typeof window.PSS_CONFIG !== 'undefined' && window.PSS_CONFIG.googleScriptUrl)
    ? window.PSS_CONFIG.googleScriptUrl
    : '';

  // ---------- Données PSS-10 (questions en français) ----------
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

  const REVERSE_QUESTIONS = [4, 5, 7, 8]; // PSS-10 : score_value = 6 - selected_value

  // ---------- État ----------
  let state = {
    sessionId: null,
    currentQuestion: 1,
    answers: {},
    lastPayload: null,
    saveFailed: false
  };

  // ---------- Éléments DOM ----------
  const sections = {
    intro: document.getElementById('section-intro'),
    test: document.getElementById('section-test'),
    result: document.getElementById('section-result')
  };

  const progressBar = document.getElementById('progress-bar');
  const progressLabel = document.getElementById('progress-label');
  const testQuestion = document.getElementById('test-question');
  const answersContainer = document.getElementById('answers');
  const btnBack = document.getElementById('btn-back');
  const btnStart = document.getElementById('btn-start');
  const resultScore = document.getElementById('result-score');
  const resultBadge = document.getElementById('result-badge');
  const gaugeFill = document.getElementById('gauge-fill');
  const gaugeNeedle = document.getElementById('gauge-needle');
  const interpretationTitle = document.getElementById('interpretation-title');
  const analysisText = document.getElementById('analysis-text');
  const toast = document.getElementById('toast');
  const modalOverlay = document.getElementById('modal-overlay');
  const linkEnSavoirPlus = document.getElementById('link-en-savoir-plus');
  const modalClose = document.getElementById('modal-close');
  const resultSaveAlert = document.getElementById('result-save-alert');
  const btnRetrySend = document.getElementById('btn-retry-send');
  const btnRefaireTest = document.getElementById('btn-refaire-test');

  // ---------- Utilitaires ----------
  function generateSessionId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    var hex = '0123456789abcdef';
    var s = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0;
      var v = c === 'x' ? r : (r & 0x3 | 0x8);
      return hex[v];
    });
    return s;
  }

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.hidden = false;
    toast.classList.add('toast--visible');
  }

  function hideToast() {
    if (!toast) return;
    toast.classList.remove('toast--visible');
    setTimeout(function () { toast.hidden = true; }, 300);
  }

  // ---------- Navigation sections ----------
  function showSection(name) {
    Object.keys(sections).forEach(function (key) {
      var el = sections[key];
      if (el) {
        if (key === name) {
          el.classList.add('section--active');
          el.hidden = false;
        } else {
          el.classList.remove('section--active');
          el.hidden = true;
        }
      }
    });
  }

  // ---------- Score PSS-10 (reverse 4, 5, 7, 8) ----------
  function computeScoreLocal() {
    var total = 0;
    for (var q = 1; q <= 10; q++) {
      var v = state.answers[q];
      if (v == null) continue;
      var scoreValue = REVERSE_QUESTIONS.indexOf(q) >= 0 ? (6 - v) : v;
      total += scoreValue;
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

  /** Констатирует payload для Google Sheets : created_at, session_id, q1..q10, final_score, category */
  function buildPayload(result) {
    var row = {
      created_at: new Date().toISOString(),
      session_id: state.sessionId,
      q1: (state.answers[1] != null && REVERSE_QUESTIONS.indexOf(1) >= 0) ? (6 - state.answers[1]) : (state.answers[1] || ''),
      q2: (state.answers[2] != null && REVERSE_QUESTIONS.indexOf(2) >= 0) ? (6 - state.answers[2]) : (state.answers[2] || ''),
      q3: (state.answers[3] != null && REVERSE_QUESTIONS.indexOf(3) >= 0) ? (6 - state.answers[3]) : (state.answers[3] || ''),
      q4: (state.answers[4] != null && REVERSE_QUESTIONS.indexOf(4) >= 0) ? (6 - state.answers[4]) : (state.answers[4] || ''),
      q5: (state.answers[5] != null && REVERSE_QUESTIONS.indexOf(5) >= 0) ? (6 - state.answers[5]) : (state.answers[5] || ''),
      q6: (state.answers[6] != null && REVERSE_QUESTIONS.indexOf(6) >= 0) ? (6 - state.answers[6]) : (state.answers[6] || ''),
      q7: (state.answers[7] != null && REVERSE_QUESTIONS.indexOf(7) >= 0) ? (6 - state.answers[7]) : (state.answers[7] || ''),
      q8: (state.answers[8] != null && REVERSE_QUESTIONS.indexOf(8) >= 0) ? (6 - state.answers[8]) : (state.answers[8] || ''),
      q9: (state.answers[9] != null && REVERSE_QUESTIONS.indexOf(9) >= 0) ? (6 - state.answers[9]) : (state.answers[9] || ''),
      q10: (state.answers[10] != null && REVERSE_QUESTIONS.indexOf(10) >= 0) ? (6 - state.answers[10]) : (state.answers[10] || ''),
      final_score: result.final_score,
      category: result.category === 'low' ? 'Stress bas' : result.category === 'medium' ? 'Stress assez élevé' : 'Stress très élevé'
    };
    if (typeof window.PSS_CONFIG !== 'undefined' && window.PSS_CONFIG.pssSecret) {
      row._secret = window.PSS_CONFIG.pssSecret;
    }
    return row;
  }

  /** Envoi unique vers Google Apps Script (doPost). */
  function sendToSheets(payload) {
    if (!GOOGLE_ENDPOINT) {
      return Promise.reject(new Error('No endpoint configured'));
    }
    return fetch(GOOGLE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      mode: 'no-cors'
    });
  }

  function submitResultToBackend(result) {
    var payload = buildPayload(result);
    state.lastPayload = payload;
    state.saveFailed = false;
    if (resultSaveAlert) {
      resultSaveAlert.hidden = true;
    }
    if (!GOOGLE_ENDPOINT) {
      showToast('Enregistrement non configuré.');
      setTimeout(hideToast, 2500);
      return;
    }
    sendToSheets(payload).then(function () {
      state.saveFailed = false;
      if (resultSaveAlert) resultSaveAlert.hidden = true;
    }).catch(function () {
      state.saveFailed = true;
      showToast('Résultat non sauvegardé.');
      if (resultSaveAlert) {
        resultSaveAlert.hidden = false;
      }
    });
  }

  function retrySend() {
    if (!state.lastPayload) return;
    if (!GOOGLE_ENDPOINT) {
      showToast('Enregistrement non configuré.');
      setTimeout(hideToast, 2500);
      return;
    }
    if (resultSaveAlert) resultSaveAlert.hidden = true;
    sendToSheets(state.lastPayload).then(function () {
      state.saveFailed = false;
      if (resultSaveAlert) resultSaveAlert.hidden = true;
    }).catch(function () {
      showToast('Résultat non sauvegardé.');
      if (resultSaveAlert) resultSaveAlert.hidden = false;
    });
  }

  // ---------- Rendu question ----------
  function renderQuestion() {
    var n = state.currentQuestion;
    var total = PSS_QUESTIONS.length;
    progressBar.style.width = (n / total * 100) + '%';
    progressBar.setAttribute('aria-valuenow', n);
    progressLabel.textContent = 'Question ' + n + '/' + total;
    testQuestion.textContent = PSS_QUESTIONS[n - 1];

    answersContainer.innerHTML = '';
    var selected = state.answers[n];

    ANSWER_LABELS.forEach(function (label, index) {
      var value = index + 1;
      var card = document.createElement('label');
      card.className = 'answer-card' + (selected === value ? ' answer-card--selected' : '');
      card.setAttribute('data-value', value);
      var input = document.createElement('input');
      input.type = 'radio';
      input.name = 'q';
      input.value = value;
      if (selected === value) input.checked = true;
      card.appendChild(input);
      card.appendChild(document.createTextNode(label));
      card.addEventListener('click', onAnswerClick);
      answersContainer.appendChild(card);
    });

    btnBack.disabled = n <= 1;
  }

  function onAnswerClick(e) {
    var card = e.currentTarget;
    var value = parseInt(card.getAttribute('data-value'), 10);
    var questionId = state.currentQuestion;

    // Si une réponse a déjà été donnée pour cette question, ignorer le clic
    if (state.answers[questionId] === value) {
      return;
    }

    answersContainer.querySelectorAll('.answer-card').forEach(function (c) {
      c.classList.remove('answer-card--selected');
    });
    card.classList.add('answer-card--selected');

    state.answers[questionId] = value;

    // Désactiver tous les clics pour éviter les doubles envois
    answersContainer.querySelectorAll('.answer-card').forEach(function (c) {
      c.style.pointerEvents = 'none';
    });

    if (questionId < PSS_QUESTIONS.length) {
      setTimeout(function () {
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

    if (resultScore) {
      var valueEl = resultScore.querySelector && resultScore.querySelector('.result-score__value');
      if (valueEl) valueEl.textContent = score;
      else resultScore.textContent = score + ' / 50';
    }
    if (resultBadge) {
      resultBadge.textContent = category === 'low' ? 'Stress bas' : category === 'medium' ? 'Stress modéré' : 'Stress élevé';
      resultBadge.className = 'result-badge result-badge--' + category;
    }
    if (interpretationTitle) interpretationTitle.textContent = data.interpretation_title;
    if (analysisText) analysisText.textContent = data.analysis_text;

    var circumference = Math.PI * 80;
    var ratio = score / 50;
    gaugeFill.setAttribute('stroke-dashoffset', circumference * (1 - ratio));
    var angle = 180 - ratio * 180;
    gaugeNeedle.setAttribute('transform', 'rotate(' + angle + ', 100, 100)');

    if (resultSaveAlert) {
      resultSaveAlert.hidden = !state.saveFailed;
    }
  }

  // ---------- Démarrage questionnaire ----------
  function startTest() {
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
    state.currentQuestion--;
    renderQuestion();
  }

  function restartTest() {
    state.sessionId = null;
    state.currentQuestion = 1;
    state.answers = {};
    state.lastPayload = null;
    state.saveFailed = false;
    showSection('intro');
  }

  // ---------- Modal ----------
  function openModal() {
    modalOverlay.classList.add('modal--open');
    modalOverlay.setAttribute('aria-hidden', 'false');
  }

  function closeModal() {
    modalOverlay.classList.remove('modal--open');
    modalOverlay.setAttribute('aria-hidden', 'true');
  }

  // ---------- Event listeners ----------
  if (btnStart) btnStart.addEventListener('click', startTest);
  if (btnBack) btnBack.addEventListener('click', goBack);
  if (linkEnSavoirPlus) {
    linkEnSavoirPlus.addEventListener('click', function (e) {
      e.preventDefault();
      openModal();
    });
  }
  if (modalClose) modalClose.addEventListener('click', closeModal);
  if (modalOverlay) {
    modalOverlay.addEventListener('click', function (e) {
      if (e.target === modalOverlay) closeModal();
    });
  }
  if (btnRetrySend) btnRetrySend.addEventListener('click', retrySend);
  if (btnRefaireTest) btnRefaireTest.addEventListener('click', restartTest);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeModal();
  });

  // Expose for tests (when window.__PSS_RUN_TESTS__ is set)
  if (typeof window.__PSS_RUN_TESTS__ !== 'undefined') {
    window.__PSS_TEST__ = {
      setState: function (s) {
        if (s.answers !== undefined) state.answers = s.answers;
        if (s.sessionId !== undefined) state.sessionId = s.sessionId;
      },
      computeScoreLocal: computeScoreLocal,
      buildPayload: buildPayload
    };
  }
})();
