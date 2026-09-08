<?php
defined('ABSPATH') || exit;

$gradient_id = $instance_id . '-gauge-gradient';
$modal_title_id = $instance_id . '-modal-title';
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
        <div class="progress-bar-wrap">
          <div class="progress-bar" data-lmq-role="progress-bar" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
        </div>
        <p class="progress-label" data-lmq-role="progress-label"></p>
        <p class="test-prefix" data-lmq-role="test-prefix"></p>
        <h2 class="test-question" data-lmq-role="test-question"></h2>
        <div class="answers" data-lmq-role="answers" role="radiogroup" aria-label="Choisissez une réponse"></div>
        <div class="test-actions">
          <button type="button" class="btn btn--secondary btn--back" data-lmq-role="back" disabled>← Retour</button>
        </div>
      </div>
    </section>

    <section class="section" data-lmq-section="result" hidden>
      <div class="card card--result">
        <h2 class="result-title" data-lmq-role="result-header">Mon résultat</h2>
        <div class="result-badge" data-lmq-role="result-badge"></div>
        <div class="gauge-wrap" data-lmq-role="gauge-wrap">
          <div class="gauge-score" data-lmq-role="result-score" aria-live="polite">
            <span class="result-score__value">0</span><span class="gauge-score__max"></span>
          </div>
          <svg class="gauge" viewBox="0 0 200 120" aria-hidden="true">
            <defs>
              <linearGradient id="<?php echo esc_attr($gradient_id); ?>" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#4ade80" />
                <stop offset="50%" stop-color="#fbbf24" />
                <stop offset="100%" stop-color="#ef4444" />
              </linearGradient>
            </defs>
            <path class="gauge-bg" d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#eee" stroke-width="12" />
            <path class="gauge-fill" data-lmq-role="gauge-fill" d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="url(#<?php echo esc_attr($gradient_id); ?>)" stroke-width="12" stroke-dasharray="251.2" stroke-dashoffset="251.2" />
            <line class="gauge-needle" data-lmq-role="gauge-needle" x1="100" y1="100" x2="100" y2="30" stroke="#333" stroke-width="2" stroke-linecap="round" />
          </svg>
        </div>
        <h3 class="interpretation-title" data-lmq-role="interpretation-title"></h3>
        <p class="analysis-meta" data-lmq-role="score-meta"></p>
        <div class="analysis-block">
          <p class="analysis-text" data-lmq-role="analysis-text"></p>
        </div>
        
        <div data-lmq-role="dimensions" class="dimensions-wrap"></div>
        <div data-lmq-role="safety-messages" class="safety-messages"></div>
        <div data-lmq-role="classification-messages" class="classification-messages"></div>

        <div class="result-save-alert" data-lmq-role="save-alert" hidden>
          <p class="result-save-alert__text" data-lmq-role="save-alert-text">La sauvegarde a échoué. Vérifiez votre connexion et réessayez.</p>
          <button type="button" class="btn btn--secondary btn--retry" data-lmq-role="retry">Réessayer</button>
        </div>
        <div class="result-actions" data-lmq-role="ctas">
          <button type="button" class="btn btn--tertiary" data-lmq-role="restart">Refaire le test</button>
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
