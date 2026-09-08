(function(engine) {
  'use strict';

  function initQuestionnaire(rootEl) {
    const configEl = rootEl.querySelector('[data-lmq-config]');
    if (!configEl) return;
    const config = JSON.parse(configEl.textContent);
    const submitUrl = rootEl.getAttribute('data-lmq-submit-url');
    
    let state = {
      answers: {},
      currentQuestionIndex: 0,
      safetyAnswers: {},
      isSubmitting: false
    };

    const sections = {
      intro: rootEl.querySelector('[data-lmq-section="intro"]'),
      test: rootEl.querySelector('[data-lmq-section="test"]'),
      result: rootEl.querySelector('[data-lmq-section="result"]')
    };

    function showSection(name) {
      Object.keys(sections).forEach(k => {
        if (sections[k]) sections[k].hidden = (k !== name);
      });
    }

    function renderIntro() {
      const title = rootEl.querySelector('[data-lmq-role="intro-title"]');
      const text = rootEl.querySelector('[data-lmq-role="intro-text"]');
      if (title) title.textContent = config.title;
      if (text) text.textContent = config.description;
      showSection('intro');
    }

    function renderQuestion() {
      const q = config.questions[state.currentQuestionIndex];
      const qTitle = rootEl.querySelector('[data-lmq-role="test-question"]');
      if (qTitle) qTitle.textContent = q.text;

      const answersContainer = rootEl.querySelector('[data-lmq-role="answers"]');
      if (answersContainer) {
        answersContainer.innerHTML = '';
        q.answers.forEach(ans => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'answer-btn';
          btn.textContent = ans.label;
          btn.onclick = () => {
            state.answers[q.id] = ans.value;
            nextQuestion();
          };
          answersContainer.appendChild(btn);
        });
      }

      const progressLabel = rootEl.querySelector('[data-lmq-role="progress-label"]');
      if (progressLabel) progressLabel.textContent = `Question ${state.currentQuestionIndex + 1}/${config.questions.length}`;

      const backBtn = rootEl.querySelector('[data-lmq-role="back"]');
      if (backBtn) {
        backBtn.disabled = state.currentQuestionIndex === 0;
      }
      
      showSection('test');
    }

    function nextQuestion() {
      if (state.currentQuestionIndex < config.questions.length - 1) {
        state.currentQuestionIndex++;
        renderQuestion();
      } else {
        submitTest();
      }
    }

    function prevQuestion() {
      if (state.currentQuestionIndex > 0) {
        state.currentQuestionIndex--;
        renderQuestion();
      }
    }

    function submitTest() {
      showSection('result');
      const scoreResult = engine.score(config, state.answers);
      
      const scoreVal = rootEl.querySelector('.result-score__value');
      if (scoreVal) scoreVal.textContent = scoreResult.final_score;

      const analysisText = rootEl.querySelector('[data-lmq-role="analysis-text"]');
      if (analysisText) {
        const level = config.result_levels.find(l => l.code === scoreResult.displayed_category);
        if (level) analysisText.textContent = level.description;
      }

      // We should post to the server but for fixture tests we can mock or do a real fetch.
      if (submitUrl) {
        fetch(submitUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answers: state.answers })
        }).catch(err => {
          const alert = rootEl.querySelector('[data-lmq-role="save-alert"]');
          if (alert) alert.hidden = false;
        });
      }
    }

    const startBtn = rootEl.querySelector('[data-lmq-role="start"]');
    if (startBtn) startBtn.onclick = renderQuestion;

    const backBtn = rootEl.querySelector('[data-lmq-role="back"]');
    if (backBtn) backBtn.onclick = prevQuestion;

    const restartBtn = rootEl.querySelector('[data-lmq-role="restart"]');
    if (restartBtn) restartBtn.onclick = () => {
      state.answers = {};
      state.currentQuestionIndex = 0;
      renderIntro();
    };

    renderIntro();
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.lmq-questionnaire').forEach(initQuestionnaire);
  });

})(typeof LifeMetricsQuestionnaireEngine !== 'undefined' ? LifeMetricsQuestionnaireEngine : require('./questionnaire-engine.js'));
