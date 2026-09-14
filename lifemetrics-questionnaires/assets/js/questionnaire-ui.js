
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

    function generateSessionId() {
      if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
      }
      var hex = '0123456789abcdef';
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (character) {
        var random = Math.random() * 16 | 0;
        var value = character === 'x' ? random : (random & 0x3 | 0x8);
        return hex[value];
      });
    }

    const state = {
      sessionId: generateSessionId(),
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
      if (text && config.description) {
        const paragraphs = config.description.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
        if (paragraphs.length > 1) {
          text.innerHTML = '';
          paragraphs.forEach((para, pIdx) => {
            const p = document.createElement('p');
            p.textContent = para;
            if (pIdx > 0) p.className = 'intro-text__secondary';
            text.appendChild(p);
          });
        } else {
          text.textContent = config.description;
        }
      }

      const badgesContainer = rootEl.querySelector('[data-lmq-role="badges"]');
      if (badgesContainer) {
        badgesContainer.innerHTML = '';
        const pill = document.createElement('div');
        pill.className = 'badges-pill';

        const badgesConfig = [
          {
            text: 'Anonyme',
            icon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
          },
          {
            text: 'Sécurisé',
            icon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>'
          },
          {
            text: config.estimated_duration || '2-3 min',
            icon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>'
          }
        ];

        badgesConfig.forEach((badge, idx) => {
          if (idx > 0) {
            const div = document.createElement('div');
            div.className = 'divider';
            pill.appendChild(div);
          }
          const item = document.createElement('div');
          item.className = 'badge-item';
          item.innerHTML = `${badge.icon}<span>${badge.text}</span>`;
          pill.appendChild(item);
        });
        badgesContainer.appendChild(pill);
      }

      showSection('intro');
    }

    function renderQuestion() {
      const q = allQuestions[state.currentQuestionIndex];
      if (!q) return;

      const isSafetyQuestion = (config.safety_questions || []).some(sq => sq.id === q.id);
      const safetyBadge = rootEl.querySelector('[data-lmq-role="safety-badge"]');
      if (safetyBadge) {
        safetyBadge.hidden = !isSafetyQuestion;
      }

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
          btn.className = 'answer-card answer-btn';
          btn.textContent = ans.label;
          if (state.answers[q.id] === ans.value) {
            btn.classList.add('selected', 'answer-card--selected');
            btn.setAttribute('aria-checked', 'true');
          } else {
            btn.setAttribute('aria-checked', 'false');
          }
          btn.setAttribute('role', 'radio');
          btn.onclick = () => {
            if (state.autoNextTimer) clearTimeout(state.autoNextTimer);

            state.answers[q.id] = ans.value;

            Array.from(answersContainer.children).forEach(child => {
              child.classList.remove('selected', 'answer-card--selected');
              child.setAttribute('aria-checked', 'false');
            });
            btn.classList.add('selected', 'answer-card--selected');
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
      const rank = level ? (level.rank || 1) : 1;
      const semanticType = rank === 1 ? 'favorable' : (rank === 2 ? 'intermediate' : 'unfavorable');

      const resultCard = rootEl.querySelector('.card--result');
      if (resultCard) {
        resultCard.classList.remove('lmq-result--favorable', 'lmq-result--intermediate', 'lmq-result--unfavorable', 'lmq-result--rank-1', 'lmq-result--rank-2', 'lmq-result--rank-3');
        resultCard.classList.add(`lmq-result--${semanticType}`, `lmq-result--rank-${rank}`);
      }

      const badge = rootEl.querySelector('[data-lmq-role="result-badge"]');
      if (badge && level) {
        badge.textContent = level.title;
        badge.className = `result-badge result-badge--${semanticType} result-badge--rank-${rank}`;
      }

      const interpTitle = rootEl.querySelector('[data-lmq-role="interpretation-title"]');
      if (interpTitle && level) {
        interpTitle.textContent = level.title;
        interpTitle.className = `interpretation-title interpretation-title--${semanticType} interpretation-title--rank-${rank}`;
      }

      const scoreMeta = rootEl.querySelector('[data-lmq-role="score-meta"]');
      if (scoreMeta && config.score && config.score.target_min !== undefined && config.score.target_max !== undefined) {
        const directionNote = config.scoring_direction === 'higher_is_better'
          ? `${config.score.target_max} le plus favorable`
          : `${config.score.target_min} le plus favorable`;
        scoreMeta.textContent = `Score de ${config.score.target_min} à ${config.score.target_max} (${directionNote})`;
      }

      // Safety messages (Priority before analysis & axes)
      const safetyContainer = rootEl.querySelector('[data-lmq-role="safety-messages"]');
      if (safetyContainer) {
        safetyContainer.innerHTML = '';
        if (scoreResult.safety_flag_codes && scoreResult.safety_flag_codes.length > 0) {
          safetyContainer.hidden = false;
          scoreResult.safety_flag_codes.forEach(code => {
             const msg = config.safety_messages ? config.safety_messages[code] : null;
             if (msg) {
               const el = document.createElement('div');
               el.className = 'safety-card';
               const strong = document.createElement('strong');
               strong.textContent = msg.title;
               const p = document.createElement('p');
               p.textContent = msg.text;
               el.appendChild(strong);
               el.appendChild(p);
               safetyContainer.appendChild(el);
             }
          });
        } else {
          safetyContainer.hidden = true;
        }
      }

      // Progressive disclosure for analysis text
      const analysisBlock = rootEl.querySelector('[data-lmq-role="analysis-block"]');
      const analysisLead = rootEl.querySelector('[data-lmq-role="analysis-lead"]');
      const analysisDetails = rootEl.querySelector('[data-lmq-role="analysis-details"]');
      const analysisText = rootEl.querySelector('[data-lmq-role="analysis-text"]');
      const analysisToggle = rootEl.querySelector('[data-lmq-role="analysis-toggle"]');

      if (level && level.description) {
        const fullText = level.description;
        let lead = '';
        let details = '';

        if (fullText.includes('\n\n')) {
          const parts = fullText.split(/\n\n+/);
          lead = parts[0];
          details = parts.slice(1).join('\n\n');
        } else {
          const match = fullText.match(/^([^.!?]+[.!?])\s+([A-ZÀ-Ÿ].*)$/s);
          if (match && match[2].length > 40) {
            lead = match[1];
            details = match[2];
          } else {
            lead = fullText;
            details = '';
          }
        }

        if (analysisLead) analysisLead.textContent = lead;
        if (analysisText) analysisText.textContent = details;

        if (analysisToggle) {
          if (details.trim().length > 0) {
            analysisToggle.hidden = false;
            analysisToggle.setAttribute('aria-expanded', 'false');
            if (analysisDetails) analysisDetails.hidden = true;
            const toggleText = analysisToggle.querySelector('.toggle-text');
            if (toggleText) toggleText.textContent = "Lire l'analyse détaillée";

            analysisToggle.onclick = () => {
              const isExpanded = analysisToggle.getAttribute('aria-expanded') === 'true';
              const nextState = !isExpanded;
              analysisToggle.setAttribute('aria-expanded', String(nextState));
              if (analysisDetails) analysisDetails.hidden = !nextState;
              if (toggleText) {
                toggleText.textContent = nextState ? "Masquer l'analyse" : "Lire l'analyse détaillée";
              }
              const toggleIcon = analysisToggle.querySelector('.toggle-icon');
              if (toggleIcon) {
                toggleIcon.style.transform = nextState ? 'rotate(180deg)' : 'rotate(0deg)';
              }
            };
          } else {
            analysisToggle.hidden = true;
            if (analysisDetails) analysisDetails.hidden = true;
          }
        }
        if (analysisBlock) analysisBlock.hidden = false;
      } else if (analysisBlock) {
        analysisBlock.hidden = true;
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

      // Priority Improvement Axes Cards Grid
      const dimensionsContainer = rootEl.querySelector('[data-lmq-role="dimensions"]');
      if (dimensionsContainer) {
        dimensionsContainer.innerHTML = '';
        if (scoreResult.weakest_dimensions && scoreResult.weakest_dimensions.length > 0) {
          dimensionsContainer.hidden = false;
          const dimTitle = document.createElement('h3');
          dimTitle.className = 'axes-title';
          dimTitle.textContent = 'Axes prioritaires';
          dimensionsContainer.appendChild(dimTitle);

          const axesGrid = document.createElement('div');
          axesGrid.className = 'axes-grid';

          scoreResult.weakest_dimensions.forEach(dimId => {
            const dimConfig = (config.dimensions || []).find(d => d.id === dimId);
            if (dimConfig) {
              const card = document.createElement('div');
              card.className = 'axis-card';
              
              const header = document.createElement('div');
              header.className = 'axis-card__header';
              header.innerHTML = `<span class="axis-card__icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></span><h4 class="axis-card__title">${dimConfig.label}</h4>`;
              card.appendChild(header);

              if (dimConfig.improvement_message) {
                const msg = document.createElement('p');
                msg.className = 'axis-card__text';
                msg.textContent = dimConfig.improvement_message;
                card.appendChild(msg);
              }
              axesGrid.appendChild(card);
            }
          });
          dimensionsContainer.appendChild(axesGrid);
        } else {
          dimensionsContainer.hidden = true;
        }
      }

      const classContainer = rootEl.querySelector('[data-lmq-role="classification-messages"]');
      if (classContainer) {
        classContainer.innerHTML = '';
        if (scoreResult.classification_message_codes && scoreResult.classification_message_codes.length > 0) {
          classContainer.hidden = false;
          scoreResult.classification_message_codes.forEach(code => {
             const msg = config.classification_messages ? config.classification_messages[code] : null;
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
        } else {
          classContainer.hidden = true;
        }
      }

      // CTAs with strict hierarchy (Primary orange dominant, Secondary outline ghost)
      const ctasContainer = rootEl.querySelector('[data-lmq-role="ctas"]');
      if (ctasContainer && config.result_ctas && config.result_ctas.length > 0) {
        ctasContainer.innerHTML = '';
        config.result_ctas.forEach(cta => {
          if (!cta.enabled) return;
          const a = document.createElement('a');
          a.href = cta.url;
          a.className = cta.variant === 'primary' ? 'btn btn--primary btn--cta-primary' : 'btn btn--secondary btn--cta-secondary';
          a.textContent = cta.label;
          ctasContainer.appendChild(a);
        });
      }

      // Discrete Tertiary restart button
      const restartBtn = rootEl.querySelector('[data-lmq-role="restart"]');
      if (restartBtn) {
        restartBtn.onclick = handleRestart;
      }

      if (submitUrl) {
        if (state.isSubmitting) return;
        state.isSubmitting = true;
        const alertBox = rootEl.querySelector('[data-lmq-role="save-alert"]');
        if (alertBox) alertBox.hidden = true;
        const retryBtn = rootEl.querySelector('[data-lmq-role="retry"]');
        if (retryBtn) retryBtn.disabled = true;

        state.abortController = new AbortController();
        const timeoutId = setTimeout(() => {
          if (state.abortController) state.abortController.abort();
        }, 25000);

        const payload = {
          session_id: state.sessionId,
          answers: state.answers,
          client_version: '1.0.0',
          completed_at: new Date().toISOString()
        };

        fetch(submitUrl, {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: state.abortController.signal
        }).then(res => {
          return res.json().catch(() => null).then(data => {
            if (!res.ok || !data || data.success !== true) {
              throw new Error('Save error');
            }
            return data;
          });
        }).then(() => {
          if (alertBox) alertBox.hidden = true;
        }).catch(err => {
          if (alertBox) alertBox.hidden = false;
        }).finally(() => {
          clearTimeout(timeoutId);
          state.isSubmitting = false;
          if (retryBtn) retryBtn.disabled = false;
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
      state.sessionId = generateSessionId();
      state.answers = {};
      state.currentQuestionIndex = 0;
      state.isSubmitting = false;
      if (state.autoNextTimer) clearTimeout(state.autoNextTimer);
      renderIntro();
    }

    const startBtn = rootEl.querySelector('[data-lmq-role="start"]');
    if (startBtn) {
      startBtn.onclick = () => {
        if (!state.sessionId) {
          state.sessionId = generateSessionId();
        }
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
