<?php
defined('ABSPATH') || exit;

$gradient_id = $instance_id . '-gauge-gradient';
$modal_title_id = $instance_id . '-modal-title';
?>
<div
  id="<?php echo esc_attr($instance_id); ?>"
  class="lmq-pss10"
  data-lmq-questionnaire="pss10"
  data-lmq-submit-url="<?php echo esc_url($submit_url); ?>"
>
  <div class="app">
    <section class="section section--active" data-lmq-section="intro">
      <div class="card card--intro">
        <h1 class="title">Évaluez votre niveau de stress</h1>
        <p class="intro-text">
          Évaluez rapidement votre niveau de stress ressenti grâce à l'échelle de stress perçu développée par Cohen et Williamson en 1983.
          <br><br>Toutes vos réponses sont sécurisées et anonymes!
          <br>Le test est effectué en 2 min.
        </p>
        <div class="badges">
          <div class="badges-pill">
            <div class="badge-item">
              <img src="<?php echo esc_url($asset_url . 'icons/shield.svg'); ?>" alt="Anonyme" class="icon-img">
              <span>Anonyme</span>
            </div>
            <div class="divider"></div>
            <div class="badge-item">
              <img src="<?php echo esc_url($asset_url . 'icons/lock.svg'); ?>" alt="Sécurisé" class="icon-img">
              <span>Sécurisé</span>
            </div>
            <div class="divider"></div>
            <div class="badge-item">
              <img src="<?php echo esc_url($asset_url . 'icons/clock.svg'); ?>" alt="2 min" class="icon-img">
              <span>2 min</span>
            </div>
          </div>
        </div>
        <button type="button" class="btn btn--primary btn--cta" data-lmq-role="start">COMMENCER</button>
        <p class="intro-footer">
          <a href="#" class="link" data-lmq-role="learn-more" aria-label="En savoir plus">En savoir plus</a>
        </p>
      </div>
      <footer class="page-footer">
        <a href="https://www.psy.cmu.edu/~scohen/" class="footer-link" target="_blank" rel="noopener">Conditions d'utilisation</a>
        <span class="footer-sep">·</span>
        <a href="https://www.psy.cmu.edu/~scohen/" class="footer-link" target="_blank" rel="noopener">Références : psy.cmu.edu</a>
      </footer>
    </section>

    <section class="section" data-lmq-section="test" hidden>
      <div class="card card--test">
        <div class="progress-bar-wrap">
          <div class="progress-bar" data-lmq-role="progress-bar" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="10"></div>
        </div>
        <p class="progress-label" data-lmq-role="progress-label">Question 0/10</p>
        <p class="test-prefix">Au cours du mois dernier :</p>
        <h2 class="test-question" data-lmq-role="test-question"></h2>
        <div class="answers" data-lmq-role="answers" role="radiogroup" aria-label="Choisissez une réponse"></div>
        <div class="test-actions">
          <button type="button" class="btn btn--secondary btn--back" data-lmq-role="back" disabled>← Retour</button>
        </div>
      </div>
    </section>

    <section class="section" data-lmq-section="result" hidden>
      <div class="card card--result">
        <h2 class="result-title">Mon score stress</h2>
        <div class="result-badge" data-lmq-role="result-badge"></div>
        <div class="gauge-wrap">
          <div class="gauge-score" data-lmq-role="result-score" aria-live="polite">
            <span class="result-score__value">0</span><span class="gauge-score__max">/50</span>
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
        <p class="analysis-meta">Le score est compris entre 10 et 50, sachant que 10 est le meilleur score possible et 50 le plus mauvais.</p>
        <p class="analysis-meta">D'après vos réponses,</p>
        <div class="analysis-block">
          <p class="analysis-text" data-lmq-role="analysis-text"></p>
        </div>
        <div class="result-save-alert" data-lmq-role="save-alert" hidden>
          <p class="result-save-alert__text" data-lmq-role="save-alert-text">La sauvegarde a échoué. Vérifiez votre connexion et réessayez.</p>
          <button type="button" class="btn btn--secondary btn--retry" data-lmq-role="retry">Réessayer</button>
        </div>
        <div class="result-actions">
          <button type="button" class="btn btn--primary">Voir mon programme personnalisé</button>
          <button type="button" class="btn btn--secondary">Contacter un praticien certifié</button>
          <button type="button" class="btn btn--tertiary" data-lmq-role="restart">Refaire le test</button>
        </div>
      </div>
    </section>
  </div>

  <div class="modal-overlay" data-lmq-role="modal-overlay" aria-hidden="true">
    <div class="modal" role="dialog" aria-labelledby="<?php echo esc_attr($modal_title_id); ?>" aria-modal="true">
      <h3 id="<?php echo esc_attr($modal_title_id); ?>">À propos du PSS-10</h3>
      <p>
        Perceived Stress Scale (PSS) de Cohen, Kamarck et Mermelstein est l'une des échelles les plus utilisées pour évaluer la perception du stress.
        Les items sont élaborés pour mettre en évidence dans quelle mesure les individus trouvent leur vie imprévisible, incontrôlable.
        Échelle internationale validée sur le plan scientifique en France, le PSS-10 est un test simple qui permet d'évaluer de façon objective votre niveau de stress au cours du mois passé.
      </p>
      <h4>Pourquoi l'utiliser ?</h4>
      <p><strong>Objectifs</strong><br>Évaluer rapidement son niveau de stress.<br>Prendre conscience de son stress.<br>Disposer de repères clairs.</p>
      <p><strong>Contexte</strong><br>Le stress a des répercussions nombreuses sur la qualité du sommeil, l'humeur, la capacité à prendre des décisions. L'objectif premier de ce test est de vous faire prendre conscience de votre niveau de stress actuel. Se situer permet de réagir à temps et, si besoin, d'utiliser les outils présentés dans cet ouvrage pour revenir à un niveau acceptable. Alors, stressé ou pas ?</p>
      <p>
        Les réponses sont notées de 1 à 5 (jamais à très souvent).
        Le score total varie entre 10 et 50.
        Ce questionnaire est un outil d'évaluation et ne remplace pas un avis médical.
      </p>
      <button type="button" class="btn btn--primary modal-close" data-lmq-role="modal-close">Fermer</button>
    </div>
  </div>

  <div class="toast" data-lmq-role="toast" aria-live="polite" hidden>Sauvegarde en cours…</div>
</div>
