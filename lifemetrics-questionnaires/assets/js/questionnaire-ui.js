
(function (engine) {

  function resolveSemanticType(config, categoryCode) {
    const levels = Array.isArray(config.result_levels) ? config.result_levels.slice() : [];
    if (levels.length === 0) return 'favorable';

    levels.sort((left, right) => Number(left.min) - Number(right.min));
    if (config.scoring_direction === 'higher_is_better') levels.reverse();

    const severityIndex = levels.findIndex(level => level.code === categoryCode);
    if (severityIndex <= 0) return 'favorable';
    if (severityIndex >= levels.length - 1) return 'unfavorable';
    return 'intermediate';
  }

  function isUserFacingHelp(help) {
    if (typeof help !== 'string' || help.trim() === '') return false;
    const internalPatterns = [
      /^Item\b/i,
      /\b(?:BE|SD|PF|FR|RN|HY|AP|SL)\d{2}\b/,
      /\bgradation(?: comportementale)? LifeMetrics\b/i,
      /^Question intégrative\b/i,
      /^(?:Cette|La) question (?:évalue|mesure|utilise|fait partie)\b/i,
      /^(?:Mesure|Évalue|Permet d'identifier|On interroge)\b/i,
      /^Échelle simple LifeMetrics\b/i,
      /^Il s'agit d'un indicateur déclaratif\b/i,
      /^Les données Anses\b/i,
      /\b(?:score|guardrail|bloc de sécurité)\b/i
    ];
    return !internalPatterns.some(pattern => pattern.test(help));
  }

  function formatEstimatedDuration(duration) {
    const value = typeof duration === 'string' && duration.trim() !== ''
      ? duration.trim()
      : '2-3 min';
    return value
      .replace(/^environ\s+/i, '')
      .replace(/(\d)\s*-\s*(\d)/g, '$1–$2');
  }

  function resolveGaugeRatios(score, min, max) {
    const scoreRatio = Math.max(0, Math.min(1, (score - min) / (max - min)));
    const minimumVisibleRatio = 0.08;
    const fillRatio = scoreRatio >= 1
      ? 1
      : minimumVisibleRatio + scoreRatio * (1 - minimumVisibleRatio);
    return { scoreRatio, fillRatio };
  }

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
            text: formatEstimatedDuration(config.estimated_duration),
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

    function renderQuestion(options) {
      const shouldFocusHeading = Boolean(options && options.focusHeading);
      const q = allQuestions[state.currentQuestionIndex];
      if (!q) return;

      const isSafetyQuestion = (config.safety_questions || []).some(sq => sq.id === q.id);
      const safetyBadge = rootEl.querySelector('[data-lmq-role="safety-badge"]');
      if (safetyBadge) {
        const safetyBadgeLabel = typeof config.safety_badge_label === 'string'
          ? config.safety_badge_label.trim()
          : '';
        safetyBadge.textContent = safetyBadgeLabel;
        safetyBadge.hidden = !isSafetyQuestion || safetyBadgeLabel === '';
      }

      const recallPeriodEl = rootEl.querySelector('[data-lmq-role="recall-period"]');
      if (recallPeriodEl) {
        const recallPeriod = config.id === 'pss10' && typeof config.recall_period === 'string'
          ? config.recall_period.trim()
          : '';
        recallPeriodEl.textContent = recallPeriod ? `${recallPeriod} :` : '';
        recallPeriodEl.hidden = recallPeriod === '';
      }

      const helpEl = rootEl.querySelector('[data-lmq-role="test-help"]')
        || rootEl.querySelector('[data-lmq-role="test-prefix"]');
      if (helpEl) {
        if (isUserFacingHelp(q.help)) {
          helpEl.textContent = q.help;
          helpEl.hidden = false;
        } else {
          helpEl.textContent = '';
          helpEl.hidden = true;
        }
      }

      const title = rootEl.querySelector('[data-lmq-role="test-question"]');
      if (title) title.textContent = q.text;

      const answersContainer = rootEl.querySelector('[data-lmq-role="answers"]');
      if (answersContainer && q.answers) {
        answersContainer.innerHTML = '';
        const selectedAnswerIndex = q.answers.findIndex(ans => state.answers[q.id] === ans.value);

        const selectAnswer = (btn, ans) => {
          if (state.autoNextTimer) clearTimeout(state.autoNextTimer);

          state.answers[q.id] = ans.value;

          Array.from(answersContainer.children).forEach(child => {
            const selected = child === btn;
            child.classList.toggle('selected', selected);
            child.classList.toggle('answer-card--selected', selected);
            child.setAttribute('aria-checked', String(selected));
            child.tabIndex = selected ? 0 : -1;
          });
          if (typeof btn.focus === 'function') btn.focus();

          state.autoNextTimer = setTimeout(() => {
            nextQuestion();
          }, 650);
        };

        q.answers.forEach((ans, answerIndex) => {
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
          btn.tabIndex = selectedAnswerIndex >= 0 ? (answerIndex === selectedAnswerIndex ? 0 : -1) : (answerIndex === 0 ? 0 : -1);
          btn.onclick = () => selectAnswer(btn, ans);
          btn.onkeydown = (event) => {
            const key = event.key;
            if (!['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft', 'Home', 'End'].includes(key)) return;
            event.preventDefault();
            let nextIndex = answerIndex;
            if (key === 'ArrowDown' || key === 'ArrowRight') nextIndex = (answerIndex + 1) % q.answers.length;
            if (key === 'ArrowUp' || key === 'ArrowLeft') nextIndex = (answerIndex - 1 + q.answers.length) % q.answers.length;
            if (key === 'Home') nextIndex = 0;
            if (key === 'End') nextIndex = q.answers.length - 1;
            const nextButton = answersContainer.children[nextIndex];
            if (nextButton) selectAnswer(nextButton, q.answers[nextIndex]);
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
      if (shouldFocusHeading && title && typeof title.focus === 'function') title.focus();
    }

    function nextQuestion() {
      if (state.currentQuestionIndex < allQuestions.length - 1) {
        state.currentQuestionIndex++;
        renderQuestion({ focusHeading: true });
      } else {
        submitTest();
      }
    }

    function prevQuestion() {
      if (state.autoNextTimer) clearTimeout(state.autoNextTimer);
      if (state.currentQuestionIndex > 0) {
        state.currentQuestionIndex--;
        renderQuestion({ focusHeading: true });
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
      const rank = level && level.rank !== undefined ? level.rank : 1;
      const semanticType = resolveSemanticType(config, scoreResult.displayed_category);
      const guardrailApplied = typeof scoreResult.calculated_category === 'string'
        && scoreResult.calculated_category !== scoreResult.displayed_category;

      const resultCard = rootEl.querySelector('.card--result');
      if (resultCard) {
        resultCard.classList.remove('lmq-result--favorable', 'lmq-result--intermediate', 'lmq-result--unfavorable', 'lmq-result--rank-0', 'lmq-result--rank-1', 'lmq-result--rank-2', 'lmq-result--rank-3', 'lmq-result--guardrail');
        resultCard.classList.add(`lmq-result--${semanticType}`, `lmq-result--rank-${rank}`);
        if (guardrailApplied) resultCard.classList.add('lmq-result--guardrail');
      }

      const badge = rootEl.querySelector('[data-lmq-role="result-badge"]');
      if (badge && level) {
        badge.textContent = level.title;
        const catCode = level.code ? level.code.toLowerCase() : '';
        badge.className = `result-badge result-badge--${semanticType} result-badge--rank-${rank}${catCode ? ' result-badge--' + catCode : ''}`;
      }

      const classMsg = config.classification_messages && (config.classification_messages[level?.code] || config.classification_messages[scoreResult.displayed_category]);

      const interpTitle = rootEl.querySelector('[data-lmq-role="interpretation-title"]');
      if (interpTitle && level) {
        const titleText = (classMsg && classMsg.title) ? classMsg.title : level.title;
        interpTitle.textContent = titleText;
        interpTitle.className = `interpretation-title interpretation-title--${semanticType} interpretation-title--rank-${rank}`;
        interpTitle.hidden = badge && badge.textContent.trim() === interpTitle.textContent.trim();
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

      const fullText = (classMsg && typeof classMsg.text === 'string' && classMsg.text.trim() !== '')
        ? classMsg.text.trim()
        : (level && level.description ? level.description : '');

      if (fullText) {
        let lead = '';
        let details = '';

        if (analysisLead) {
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

          analysisLead.textContent = lead;
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
        } else if (analysisText) {
          // Template without progressive disclosure lead (e.g. legacy PSS-10 template)
          analysisText.textContent = fullText;
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
        const gaugeRatios = resolveGaugeRatios(scoreResult.final_score, min, max);
        gaugeFill.setAttribute('stroke-dashoffset', circumference * (1 - gaugeRatios.fillRatio));
        gaugeNeedle.setAttribute('transform', `rotate(${180 - gaugeRatios.scoreRatio * 180}, 100, 100)`);
        gaugeFill.classList.remove('gauge-fill--favorable', 'gauge-fill--intermediate', 'gauge-fill--unfavorable', 'gauge-fill--guardrail');
        gaugeFill.classList.add(`gauge-fill--${semanticType}`);
        if (guardrailApplied) gaugeFill.classList.add('gauge-fill--guardrail');

        const gaugeWrap = rootEl.querySelector('[data-lmq-role="gauge-wrap"]');
        if (gaugeWrap && level) {
          gaugeWrap.setAttribute('aria-label', `Score ${scoreResult.final_score} sur ${config.score.target_max}. Catégorie : ${level.title}.`);
        }
      }

      // Priority Improvement Axes Cards Grid
      const dimensionsContainer = rootEl.querySelector('[data-lmq-role="dimensions"]');
      if (dimensionsContainer) {
        dimensionsContainer.innerHTML = '';
        const visibleDimensions = (scoreResult.weakest_dimensions || []).map(dimId => {
          return (config.dimensions || []).find(d => d.id === dimId);
        }).filter(dimConfig => {
          return dimConfig && typeof dimConfig.improvement_message === 'string'
            && dimConfig.improvement_message.trim() !== '';
        });

        if (visibleDimensions.length > 0) {
          dimensionsContainer.hidden = false;
          const dimTitle = document.createElement('h3');
          dimTitle.className = 'axes-title';
          dimTitle.textContent = 'Axes prioritaires';
          dimensionsContainer.appendChild(dimTitle);

          const axesGrid = document.createElement('div');
          axesGrid.className = 'axes-grid';

          visibleDimensions.forEach(dimConfig => {
              const card = document.createElement('div');
              card.className = 'axis-card';
              
              const header = document.createElement('div');
              header.className = 'axis-card__header';
              header.innerHTML = `<span class="axis-card__icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></span><h4 class="axis-card__title">${dimConfig.label}</h4>`;
              card.appendChild(header);

              const msg = document.createElement('p');
              msg.className = 'axis-card__text';
              msg.textContent = dimConfig.improvement_message;
              card.appendChild(msg);
              axesGrid.appendChild(card);
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

      const resultHeading = rootEl.querySelector('[data-lmq-role="result-header"]');
      if (resultHeading && typeof resultHeading.focus === 'function') resultHeading.focus();
    }

    const modal = rootEl.querySelector('[data-lmq-role="modal-overlay"]');
    const learnMoreBtn = rootEl.querySelector('[data-lmq-role="learn-more"]');
    const modalCloseBtn = rootEl.querySelector('[data-lmq-role="modal-close"]');

    if (modal && learnMoreBtn && config.disclaimer) {
      if (config.disclaimer.before || config.disclaimer.after) {
        learnMoreBtn.hidden = false;

        const modalTitle = rootEl.querySelector('[data-lmq-role="modal-title"]');
        if (modalTitle) modalTitle.textContent = 'À propos de ce questionnaire';

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
        state.previouslyFocused = document.activeElement;
        modal.hidden = false;
        modal.setAttribute('aria-hidden', 'false');
        modal.classList.add('modal--open');
        if (modalCloseBtn) modalCloseBtn.focus();
      }
    }

    function closeModal() {
      if (modal) {
        modal.classList.remove('modal--open');
        modal.setAttribute('aria-hidden', 'true');
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
        renderQuestion({ focusHeading: true });
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
