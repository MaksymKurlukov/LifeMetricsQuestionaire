<?php

defined('ABSPATH') || exit;

/**
 * PSS10 legacy compatibility runtime.
 *
 * Narrow legacy compatibility exception:
 * PSS10 is an existing production instrument whose legal/licensing approval
 * remains unresolved (status = review). To maintain uninterrupted, frozen
 * functionality without inventing approvals or exposing other review instruments,
 * this runtime explicitly resolves 'pss10' via get_internal('pss10') while
 * routing submissions through the generic scoring engine and submission service.
 */
final class LifeMetrics_Legacy_PSS10_Runtime
{
    private ?LifeMetrics_Submission_Service $submission_service;

    public function __construct(?LifeMetrics_Submission_Service $submission_service = null)
    {
        $this->submission_service = $submission_service;
    }

    public function register_assets(): void
    {
        $base_path = LMQ_PLUGIN_PATH . 'questionnaires/pss10/assets/';
        $base_url = LMQ_PLUGIN_URL . 'questionnaires/pss10/assets/';

        wp_register_style('lmq-pss10', $base_url . 'css/style.css', array(), filemtime($base_path . 'css/style.css'));
        wp_register_script('lmq-pss10', $base_url . 'js/app.js', array(), filemtime($base_path . 'js/app.js'), true);
    }

    public function print_late_styles(): void
    {
        if (wp_style_is('lmq-pss10', 'enqueued') && !wp_style_is('lmq-pss10', 'done')) {
            wp_print_styles('lmq-pss10');
        }
    }

    public function render_shortcode($attributes): string
    {
        $attributes = shortcode_atts(array('id' => ''), $attributes, 'lifemetrics_questionnaire');
        if (sanitize_key($attributes['id']) !== 'pss10') {
            return '';
        }

        $this->register_assets();
        wp_enqueue_style('lmq-pss10');

        require_once LMQ_PLUGIN_PATH . 'includes/class-questionnaire-registry.php';
        require_once LMQ_PLUGIN_PATH . 'includes/class-questionnaire-schema-validator.php';
        require_once LMQ_PLUGIN_PATH . 'includes/class-assets.php';
        require_once LMQ_PLUGIN_PATH . 'includes/class-questionnaire-renderer.php';

        $registry = new LifeMetrics_Questionnaire_Registry(
            LMQ_PLUGIN_PATH . 'questionnaires',
            array('pss10' => 'pss10/questionnaire.php'),
            new LifeMetrics_Questionnaire_Schema_Validator()
        );
        $config = $registry->get_internal('pss10');
        if (!$config) {
            return '';
        }

        // The generic renderer dynamically creates the root ID using the config id,
        // e.g., wp_unique_id('lmq-pss10-')
        $assets = new LifeMetrics_Questionnaire_Assets(LMQ_PLUGIN_URL, LMQ_PLUGIN_PATH, '1.0.0');
        $renderer = new LifeMetrics_Questionnaire_Renderer($assets, LMQ_PLUGIN_PATH . 'questionnaires/pss10/template.php');

        return $renderer->render($config, rest_url('lifemetrics-questionnaires/v1/pss10/submit'));
    }

    public function submit(WP_REST_Request $request)
    {
        if ($this->submission_service === null) {
            require_once LMQ_PLUGIN_PATH . 'includes/class-questionnaire-schema-validator.php';
            require_once LMQ_PLUGIN_PATH . 'includes/class-questionnaire-registry.php';
            require_once LMQ_PLUGIN_PATH . 'includes/class-questionnaire-scoring-engine.php';
            require_once LMQ_PLUGIN_PATH . 'includes/class-google-apps-script-adapter.php';
            require_once LMQ_PLUGIN_PATH . 'includes/class-submission-service.php';

            $registry = new LifeMetrics_Questionnaire_Registry(
                LMQ_PLUGIN_PATH . 'questionnaires',
                array('pss10' => 'pss10/questionnaire.php'),
                new LifeMetrics_Questionnaire_Schema_Validator()
            );
            $engine = new LifeMetrics_Questionnaire_Scoring_Engine();
            $adapter = new LifeMetrics_Google_Apps_Script_Adapter();
            $this->submission_service = new LifeMetrics_Submission_Service($registry, $engine, $adapter);
        }

        return $this->submission_service->submit('pss10', $request);
    }
}
