<?php
defined('ABSPATH') || exit;

$modal_title_id = $instance_id . '-modal-title';
$question_title_id = $instance_id . '-question-title';
$progress_label_id = $instance_id . '-progress-label';
?>
<div
  class="lmq-questionnaire"
  data-lmq-questionnaire="<?php echo esc_attr($config['id']); ?>"
>
  <div class="app">
    <section class="section section--active" data-lmq-section="intro">
      <div class="card card--intro">
        <h1 class="title" data-lmq-role="intro-title"></h1>
        <div class="intro-text" data-lmq-role="intro-text"></div>
        <div class="badges" data-lmq-role="badges"></div>
        <button type="button" class="btn btn--primary btn--cta" data-lmq-role="start">COMMENCER</button>
        <p class="intro-footer">
          <a href="#" class="link" data-lmq-role="learn-more" aria-label="En savoir plus" hidden>En savoir plus</a>
        </p>
      </div>
      <footer class="page-footer" data-lmq-role="intro-footer" hidden></footer>
    </section>

    <section class="section" data-lmq-section="test" hidden>
      <div class="card card--test">
        <div class="test-header">
          <div class="progress-bar-wrap">
            <div class="progress-bar" data-lmq-role="progress-bar" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" aria-labelledby="<?php echo esc_attr($progress_label_id); ?>"></div>
          </div>
          <div class="test-meta">
            <span id="<?php echo esc_attr($progress_label_id); ?>" class="progress-label" data-lmq-role="progress-label"></span>
            <span class="safety-badge" data-lmq-role="safety-badge" hidden></span>
          </div>
        </div>
        <p class="test-prefix" data-lmq-role="recall-period" hidden></p>
        <p class="test-hint" data-lmq-role="test-help" hidden></p>
        <h2 id="<?php echo esc_attr($question_title_id); ?>" class="test-question" data-lmq-role="test-question" tabindex="-1"></h2>
        <div class="answers" data-lmq-role="answers" role="radiogroup" aria-labelledby="<?php echo esc_attr($question_title_id); ?>"></div>
        <div class="test-actions">
          <button type="button" class="btn btn--secondary btn--back" data-lmq-role="back" disabled>← Retour</button>
        </div>
      </div>
    </section>

    <section class="section" data-lmq-section="result" hidden>
      <div class="card card--result">
        <div class="result-header">
          <h2 class="result-title" data-lmq-role="result-header" tabindex="-1">Mon résultat</h2>
          <div class="result-badge" data-lmq-role="result-badge"></div>
        </div>

        <div class="result-hero">
          <div class="gauge-wrap" data-lmq-role="gauge-wrap" role="img">
            <div class="gauge-score" data-lmq-role="result-score" aria-live="polite">
              <span class="result-score__value">0</span><span class="gauge-score__max"></span>
            </div>
            <svg class="gauge" viewBox="0 0 200 120" aria-hidden="true">
              <g data-lmq-role="gauge-zones"></g>
              <circle class="gauge-marker gauge-marker--favorable" data-lmq-role="gauge-marker" cx="20" cy="100" r="6" />
            </svg>
          </div>
          <h3 class="interpretation-title" data-lmq-role="interpretation-title"></h3>
          <p class="analysis-meta" data-lmq-role="score-meta"></p>
        </div>

        <!-- Safety alert placed BEFORE analysis and axes in priority -->
        <div data-lmq-role="safety-messages" class="safety-messages"></div>

        <!-- Progressive Disclosure Analysis -->
        <div class="analysis-block" data-lmq-role="analysis-block">
          <div class="analysis-lead" data-lmq-role="analysis-lead"></div>
          <div class="analysis-details" data-lmq-role="analysis-details" id="<?php echo esc_attr($instance_id . '-analysis-details'); ?>" hidden>
            <p class="analysis-text" data-lmq-role="analysis-text"></p>
            <p class="analysis-completion" data-lmq-role="analysis-completion" hidden></p>
          </div>
          <button type="button" class="analysis-toggle" data-lmq-role="analysis-toggle" aria-expanded="false" aria-controls="<?php echo esc_attr($instance_id . '-analysis-details'); ?>">
            <span class="toggle-text">Lire l'analyse détaillée</span>
            <svg class="toggle-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </button>
        </div>

        <!-- Priority Improvement Axes Cards Grid -->
        <div data-lmq-role="dimensions" class="dimensions-wrap"></div>

        <div class="result-save-alert" data-lmq-role="save-alert" hidden>
          <p class="result-save-alert__text" data-lmq-role="save-alert-text">La sauvegarde a échoué. Vérifiez votre connexion et réessayez.</p>
          <button type="button" class="btn btn--secondary btn--retry" data-lmq-role="retry">Réessayer</button>
        </div>

        <!-- Strict CTA Hierarchy (2 main CTAs + tertiary restart) -->
        <div class="result-actions" data-lmq-role="ctas"></div>
        <div class="result-restart-wrap">
          <button type="button" class="btn btn--tertiary btn--restart" data-lmq-role="restart">Refaire le test</button>
        </div>
      </div>
    </section>
  </div>

  <div class="modal-overlay" data-lmq-role="modal-overlay" aria-hidden="true" hidden>
    <div class="lmq-dialog" role="dialog" aria-labelledby="<?php echo esc_attr($modal_title_id); ?>" aria-modal="true">
      <h3 id="<?php echo esc_attr($modal_title_id); ?>" data-lmq-role="modal-title"></h3>
      <div data-lmq-role="modal-content"></div>
      <button type="button" class="btn btn--primary modal-close" data-lmq-role="modal-close">Fermer</button>
    </div>
  </div>

  <div class="toast" data-lmq-role="toast" aria-live="polite" hidden></div>
</div>
