
(function (engine) {

  function initQuestionnaire(rootEl) {
    if (rootEl.getAttribute && rootEl.getAttribute('data-lmq-initialized') === 'true') return;
    if (rootEl.setAttribute) rootEl.setAttribute('data-lmq-initialized', 'true');

    const configEl = rootEl.querySelector('[data-lmq-config]');
    if (!configEl) return;

    let config;
    try {
      config = JSON.parse(configEl.textContent);
    } catch (e) {
      console.error('LMQ: Failed to parse configuration', e);
      return;
    }

    const urlEl = rootEl.querySelector('[data-lmq-submit-url]');
    const submitUrl = urlEl ? JSON.parse(urlEl.textContent) : null;

    const allQuestions = (config.questions || []).concat(config.safety_questions || []);

    const state = {
      answers: {},
      currentQuestionIndex: 0,
      isSubmitting: false,
      autoNextTimer: null,
      abortController: null,
      previouslyFocused: null
    };

    function showSection(name) {
      rootEl.querySelectorAll('[data-lmq-section]').forEach(el => {
        const active = el.getAttribute('data-lmq-section') === name;
        if (el.classList && typeof el.classList.toggle === 'function') {
          el.classList.toggle('section--active', active);
        }
        el.hidden = !active;
      });
    }

    function renderIntro() {
      const title = rootEl.querySelector('[data-lmq-role="intro-title"]');
      const text = rootEl.querySelector('[data-lmq-role="intro-text"]');
      if (title) title.textContent = config.title;
      if (text) text.textContent = config.description;

      const badgesContainer = rootEl.querySelector('[data-lmq-role="badges"]');
      if (badgesContainer) {
        badgesContainer.innerHTML = '';
        const pill = document.createElement('div');
        pill.className = 'badges-pill';

        const badgeList = ['Anonyme', 'Sécurisé', config.estimated_duration || '2-3 min'];
        badgeList.forEach((text, idx) => {
          if (idx > 0) {
            const div = document.createElement('div');
            div.className = 'divider';
            pill.appendChild(div);
          }
          const item = document.createElement('div');
          item.className = 'badge-item';
          const span = document.createElement('span');
          span.textContent = text;
          item.appendChild(span);
          pill.appendChild(item);
        });
        badgesContainer.appendChild(pill);
      }

      showSection('intro');
    }

    function renderQuestion() {
      const q = allQuestions[state.currentQuestionIndex];
      if (!q) return;

      const prefixEl = rootEl.querySelector('[data-lmq-role="test-prefix"]');
      if (prefixEl) {
        if (q.help) {
          prefixEl.textContent = q.help;
          prefixEl.hidden = false;
        } else {
          prefixEl.textContent = '';
          prefixEl.hidden = true;
        }
      }

      const title = rootEl.querySelector('[data-lmq-role="test-question"]');
      if (title) title.textContent = q.text;

      const answersContainer = rootEl.querySelector('[data-lmq-role="answers"]');
      if (answersContainer && q.answers) {
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
            if (state.autoNextTimer) clearTimeout(state.autoNextTimer);

            state.answers[q.id] = ans.value;

            Array.from(answersContainer.children).forEach(child => {
              child.classList.remove('selected');
              child.setAttribute('aria-checked', 'false');
            });
            btn.classList.add('selected');
            btn.setAttribute('aria-checked', 'true');

            state.autoNextTimer = setTimeout(() => {
              nextQuestion();
            }, 400);
          };
          answersContainer.appendChild(btn);
        });
      }

      const progressLabel = rootEl.querySelector('[data-lmq-role="progress-label"]');
      if (progressLabel) progressLabel.textContent = `Question ${state.currentQuestionIndex + 1}/${allQuestions.length}`;

      const progressBar = rootEl.querySelector('[data-lmq-role="progress-bar"]');
      if (progressBar) {
        const percent = ((state.currentQuestionIndex + 1) / allQuestions.length) * 100;
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
      if (state.currentQuestionIndex < allQuestions.length - 1) {
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
      if (state.isSubmitting) return;

      showSection('result');

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

      const scoreMax = rootEl.querySelector('.gauge-score__max');
      if (scoreMax && config.score && config.score.target_max !== undefined) {
        scoreMax.textContent = ` / ${config.score.target_max}`;
      }

      const level = config.result_levels ? config.result_levels.find(l => l.code === scoreResult.displayed_category) : null;

      const resultBadge = rootEl.querySelector('[data-lmq-role="result-badge"]');
      if (resultBadge && level) {
        resultBadge.textContent = level.title;
        resultBadge.className = `result-badge result-badge--${level.code}`;
      }

      const interpTitle = rootEl.querySelector('[data-lmq-role="interpretation-title"]');
      if (interpTitle && level) {
        interpTitle.textContent = level.title;
      }

      const scoreMeta = rootEl.querySelector('[data-lmq-role="score-meta"]');
      if (scoreMeta && config.score && config.score.target_min !== undefined && config.score.target_max !== undefined) {
        const directionNote = config.scoring_direction === 'higher_is_better'
          ? `${config.score.target_max} est le meilleur score possible et ${config.score.target_min} le plus bas.`
          : `${config.score.target_min} est le meilleur score possible et ${config.score.target_max} le plus mauvais.`;
        scoreMeta.textContent = `Le score est compris entre ${config.score.target_min} et ${config.score.target_max}, sachant que ${directionNote}`;
      }

      const analysisText = rootEl.querySelector('[data-lmq-role="analysis-text"]');
      if (analysisText && level) {
        analysisText.textContent = level.description;
      }

      const gaugeFill = rootEl.querySelector('[data-lmq-role="gauge-fill"]');
      const gaugeNeedle = rootEl.querySelector('[data-lmq-role="gauge-needle"]');
      if (gaugeFill && gaugeNeedle && config.score && config.score.target_max > 0) {
        const circumference = Math.PI * 80;
        const min = config.score.target_min || 0;
        const max = config.score.target_max;
        const ratio = Math.max(0, Math.min(1, (scoreResult.final_score - min) / (max - min)));
        gaugeFill.setAttribute('stroke-dashoffset', circumference * (1 - ratio));
        gaugeNeedle.setAttribute('transform', `rotate(${180 - ratio * 180}, 100, 100)`);
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
               const strong = document.createElement('strong');
               strong.textContent = msg.title;
               const p = document.createElement('p');
               p.textContent = msg.text;
               el.appendChild(strong);
               el.appendChild(p);
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
               const strong = document.createElement('strong');
               strong.textContent = msg.title;
               const p = document.createElement('p');
               p.textContent = msg.text;
               el.appendChild(strong);
               el.appendChild(p);
               classContainer.appendChild(el);
             }
          });
        }
      }

      const ctasContainer = rootEl.querySelector('[data-lmq-role="ctas"]');
      if (ctasContainer && config.result_ctas && config.result_ctas.length > 0) {
        ctasContainer.innerHTML = '';
        config.result_ctas.forEach(cta => {
          if (!cta.enabled) return;
          const a = document.createElement('a');
          a.href = cta.url;
          a.className = cta.variant === 'primary' ? 'btn btn--primary' : 'btn btn--secondary';
          a.textContent = cta.label;
          ctasContainer.appendChild(a);
        });
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

        state.abortController = new AbortController();
        const timeoutId = setTimeout(() => {
          if (state.abortController) state.abortController.abort();
        }, 10000);

        fetch(submitUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answers: state.answers }),
          signal: state.abortController.signal
        }).then(res => {
          if (!res.ok) throw new Error('Network error');
        }).catch(err => {
          if (alertBox) alertBox.hidden = false;
        }).finally(() => {
          clearTimeout(timeoutId);
          state.isSubmitting = false;
        });
      }
    }

    const modal = rootEl.querySelector('[data-lmq-role="modal-overlay"]');
    const learnMoreBtn = rootEl.querySelector('[data-lmq-role="learn-more"]');
    const modalCloseBtn = rootEl.querySelector('[data-lmq-role="modal-close"]');

    if (modal && learnMoreBtn && config.disclaimer) {
      if (config.disclaimer.before || config.disclaimer.after) {
        learnMoreBtn.hidden = false;

        const modalTitle = rootEl.querySelector('[data-lmq-role="modal-title"]');
        if (modalTitle) modalTitle.textContent = 'À propos de ce test';

        const modalContent = rootEl.querySelector('[data-lmq-role="modal-content"]');
        if (modalContent) {
          modalContent.innerHTML = '';
          if (config.disclaimer.before) {
            const pb = document.createElement('p');
            pb.textContent = config.disclaimer.before;
            modalContent.appendChild(pb);
          }
          if (config.disclaimer.after) {
            const pa = document.createElement('p');
            pa.textContent = config.disclaimer.after;
            modalContent.appendChild(pa);
          }
        }
      }
    }

    function openModal() {
      if (modal) {
        modal.hidden = false;
        state.previouslyFocused = document.activeElement;
        if (modalCloseBtn) modalCloseBtn.focus();
      }
    }

    function closeModal() {
      if (modal) {
        modal.hidden = true;
        if (state.previouslyFocused) state.previouslyFocused.focus();
      }
    }

    if (modal && learnMoreBtn) {
      learnMoreBtn.onclick = (e) => {
        e.preventDefault();
        openModal();
      };

      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
      });

      document.addEventListener('keydown', (e) => {
        if (!modal.hidden && e.key === 'Escape') closeModal();
      });
    }

    if (modalCloseBtn) {
      modalCloseBtn.onclick = closeModal;
    }

    function handleRestart() {
      if (state.isSubmitting) {
        if (state.abortController) state.abortController.abort();
      }
      state.answers = {};
      state.currentQuestionIndex = 0;
      state.isSubmitting = false;
      if (state.autoNextTimer) clearTimeout(state.autoNextTimer);
      renderIntro();
    }

    const startBtn = rootEl.querySelector('[data-lmq-role="start"]');
    if (startBtn) {
      startBtn.onclick = () => {
        state.currentQuestionIndex = 0;
        renderQuestion();
      };
    }

    const backBtn = rootEl.querySelector('[data-lmq-role="back"]');
    if (backBtn) backBtn.onclick = prevQuestion;

    const restartBtn = rootEl.querySelector('[data-lmq-role="restart"]');
    if (restartBtn) restartBtn.onclick = handleRestart;

    const retryBtn = rootEl.querySelector('[data-lmq-role="retry"]');
    if (retryBtn) retryBtn.onclick = submitTest;

    renderIntro();
  }

  function runAutoInit() {
    document.querySelectorAll('.lmq-questionnaire-root').forEach(initQuestionnaire);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runAutoInit);
  } else {
    runAutoInit();
  }

})(typeof LifeMetricsQuestionnaireEngine !== 'undefined' ? LifeMetricsQuestionnaireEngine : require('./questionnaire-engine.js'));
