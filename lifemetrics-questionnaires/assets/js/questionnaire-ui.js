(function(engine) {
  'use strict';

  function initQuestionnaire(rootEl) {
    const configEl = rootEl.querySelector('[data-lmq-config]');
    if (!configEl) return;
    
    let config;
    try {
      config = JSON.parse(configEl.textContent);
    } catch (e) {
      console.error('LMQ: Invalid configuration JSON', e);
      return;
    }

    const submitUrlEl = rootEl.querySelector('[data-lmq-submit-url]');
    let submitUrl = null;
    if (submitUrlEl) {
      try {
        submitUrl = JSON.parse(submitUrlEl.textContent);
      } catch (e) {
        console.error('LMQ: Invalid submit URL JSON', e);
      }
    }
    
    let state = {
      answers: {},
      currentQuestionIndex: 0,
      safetyAnswers: {},
      isSubmitting: false,
      autoNextTimer: null
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
      if (text) text.innerHTML = config.description;
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
          if (state.answers[q.id] === ans.value) {
            btn.classList.add('selected');
            btn.setAttribute('aria-checked', 'true');
          } else {
            btn.setAttribute('aria-checked', 'false');
          }
          btn.setAttribute('role', 'radio');
          btn.textContent = ans.label;
          btn.onclick = () => {
            // Cancel any pending auto-next
            if (state.autoNextTimer) clearTimeout(state.autoNextTimer);
            
            state.answers[q.id] = ans.value;
            
            // Re-render to show selected state immediately
            Array.from(answersContainer.children).forEach(child => {
              child.classList.remove('selected');
              child.setAttribute('aria-checked', 'false');
            });
            btn.classList.add('selected');
            btn.setAttribute('aria-checked', 'true');

            // Auto-next delay
            state.autoNextTimer = setTimeout(() => {
              nextQuestion();
            }, 400);
          };
          answersContainer.appendChild(btn);
        });
      }

      const progressLabel = rootEl.querySelector('[data-lmq-role="progress-label"]');
      if (progressLabel) progressLabel.textContent = `Question ${state.currentQuestionIndex + 1}/${config.questions.length}`;

      const progressBar = rootEl.querySelector('[data-lmq-role="progress-bar"]');
      if (progressBar) {
        const percent = ((state.currentQuestionIndex) / config.questions.length) * 100;
        progressBar.style.width = percent + '%';
        progressBar.setAttribute('aria-valuenow', Math.round(percent));
      }

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
      if (state.autoNextTimer) clearTimeout(state.autoNextTimer);
      if (state.currentQuestionIndex > 0) {
        state.currentQuestionIndex--;
        renderQuestion();
      }
    }

    function submitTest() {
      showSection('result');
      
      // Update final progress bar
      const progressBar = rootEl.querySelector('[data-lmq-role="progress-bar"]');
      if (progressBar) {
        progressBar.style.width = '100%';
        progressBar.setAttribute('aria-valuenow', 100);
      }

      let scoreResult;
      try {
        scoreResult = engine.score(config, state.answers);
      } catch (e) {
        console.error('LMQ: Scoring failed', e);
        return;
      }
      
      const scoreVal = rootEl.querySelector('.result-score__value');
      if (scoreVal) scoreVal.textContent = scoreResult.final_score;

      const analysisText = rootEl.querySelector('[data-lmq-role="analysis-text"]');
      if (analysisText) {
        const level = config.result_levels.find(l => l.code === scoreResult.displayed_category);
        if (level) analysisText.textContent = level.description;
      }
      
      const safetyContainer = rootEl.querySelector('[data-lmq-role="safety-messages"]');
      if (safetyContainer) {
        safetyContainer.innerHTML = '';
        if (scoreResult.safety_flag_codes) {
          scoreResult.safety_flag_codes.forEach(code => {
             const msg = config.safety_messages[code];
             if (msg) {
               const el = document.createElement('div');
               el.className = 'safety-message';
               el.innerHTML = `<strong>${msg.title}</strong><p>${msg.text}</p>`;
               safetyContainer.appendChild(el);
             }
          });
        }
      }

      const dimensionsContainer = rootEl.querySelector('[data-lmq-role="dimensions"]');
      if (dimensionsContainer) {
        dimensionsContainer.innerHTML = '';
        if (scoreResult.weakest_dimensions && scoreResult.weakest_dimensions.length > 0) {
          const dimTitle = document.createElement('h4');
          dimTitle.textContent = 'Axes d\'amélioration';
          dimensionsContainer.appendChild(dimTitle);
          scoreResult.weakest_dimensions.forEach(dimId => {
            const dimConfig = config.dimensions.find(d => d.id === dimId);
            if (dimConfig) {
              const el = document.createElement('div');
              el.className = 'dimension-item';
              el.textContent = dimConfig.label;
              dimensionsContainer.appendChild(el);
            }
          });
        }
      }

      const classContainer = rootEl.querySelector('[data-lmq-role="classification-messages"]');
      if (classContainer) {
        classContainer.innerHTML = '';
        if (scoreResult.classification_message_codes) {
          scoreResult.classification_message_codes.forEach(code => {
             const msg = config.classification_messages[code];
             if (msg) {
               const el = document.createElement('div');
               el.className = 'classification-message';
               el.innerHTML = `<strong>${msg.title}</strong><p>${msg.text}</p>`;
               classContainer.appendChild(el);
             }
          });
        }
      }
      
      const ctasContainer = rootEl.querySelector('[data-lmq-role="ctas"]');
      if (ctasContainer && config.result_ctas && config.result_ctas.length > 0) {
        // Clear generic restart button
        ctasContainer.innerHTML = '';
        config.result_ctas.forEach(cta => {
          if (!cta.enabled) return;
          const a = document.createElement('a');
          a.href = cta.url;
          a.className = cta.variant === 'primary' ? 'btn btn--primary' : 'btn btn--secondary';
          a.textContent = cta.label;
          ctasContainer.appendChild(a);
        });
        // Add restart button back
        const restartBtn = document.createElement('button');
        restartBtn.type = 'button';
        restartBtn.className = 'btn btn--tertiary';
        restartBtn.textContent = 'Refaire le test';
        restartBtn.onclick = handleRestart;
        ctasContainer.appendChild(restartBtn);
      }

      if (submitUrl) {
        state.isSubmitting = true;
        const alertBox = rootEl.querySelector('[data-lmq-role="save-alert"]');
        if (alertBox) alertBox.hidden = true;
        
        fetch(submitUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answers: state.answers })
        }).then(res => {
          if (!res.ok) throw new Error('Network error');
        }).catch(err => {
          if (alertBox) alertBox.hidden = false;
        }).finally(() => {
          state.isSubmitting = false;
        });
      }
    }

    const modal = rootEl.querySelector('[data-lmq-role="modal-overlay"]');
    const learnMoreBtn = rootEl.querySelector('[data-lmq-role="learn-more"]');
    const modalCloseBtn = rootEl.querySelector('[data-lmq-role="modal-close"]');
    if (modal && learnMoreBtn) {
      learnMoreBtn.onclick = (e) => {
        e.preventDefault();
        modal.hidden = false;
      };
    }
    if (modal && modalCloseBtn) {
      modalCloseBtn.onclick = () => {
        modal.hidden = true;
      };
    }

    function handleRestart() {
      state.answers = {};
      state.currentQuestionIndex = 0;
      state.safetyAnswers = {};
      state.isSubmitting = false;
      if (state.autoNextTimer) clearTimeout(state.autoNextTimer);
      renderIntro();
    }

    const startBtn = rootEl.querySelector('[data-lmq-role="start"]');
    if (startBtn) startBtn.onclick = renderQuestion;

    const backBtn = rootEl.querySelector('[data-lmq-role="back"]');
    if (backBtn) backBtn.onclick = prevQuestion;

    const restartBtn = rootEl.querySelector('[data-lmq-role="restart"]');
    if (restartBtn) restartBtn.onclick = handleRestart;

    const retryBtn = rootEl.querySelector('[data-lmq-role="retry"]');
    if (retryBtn) retryBtn.onclick = submitTest;

    renderIntro();
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.lmq-questionnaire-root').forEach(initQuestionnaire);
  });

})(typeof LifeMetricsQuestionnaireEngine !== 'undefined' ? LifeMetricsQuestionnaireEngine : require('./questionnaire-engine.js'));
