<?php
/**
 * Plugin Name: LifeMetrics Questionnaires
 * Description: WordPress wrapper for the LifeMetrics questionnaires.
 * Version: 2.0.0
 * Requires at least: 6.0
 * Requires PHP: 8.2
 */

defined('ABSPATH') || exit;

define('LMQ_PLUGIN_FILE', __FILE__);
define('LMQ_PLUGIN_PATH', plugin_dir_path(__FILE__));
define('LMQ_PLUGIN_URL', plugin_dir_url(__FILE__));

if (!defined('LMQ_PSS10_GOOGLE_ENDPOINT')) {
    define(
        'LMQ_PSS10_GOOGLE_ENDPOINT',
        'https://script.google.com/macros/s/AKfycby9bjCrFBTRQYLIPMabIsGJXkC-3-RU6hC3scqgkgqv3Sq-FPNwdkUW8pg1bY1b6SI/exec'
    );
}

if (!defined('LMQ_GOOGLE_ENDPOINT')) {
    define(
        'LMQ_GOOGLE_ENDPOINT',
        'https://script.google.com/macros/s/AKfycbwSleAicEBsAbJQhkzzpqa6J3AW1YdgJlRuvVokJheGLTbfBZBManIWGpYsi-XV3ZH-/exec'
    );
}

require_once LMQ_PLUGIN_PATH . 'includes/class-questionnaire-schema-validator.php';
require_once LMQ_PLUGIN_PATH . 'includes/class-questionnaire-scoring-engine.php';
require_once LMQ_PLUGIN_PATH . 'includes/class-questionnaire-registry.php';
require_once LMQ_PLUGIN_PATH . 'includes/class-assets.php';
require_once LMQ_PLUGIN_PATH . 'includes/class-questionnaire-renderer.php';
require_once LMQ_PLUGIN_PATH . 'includes/class-google-apps-script-adapter.php';
require_once LMQ_PLUGIN_PATH . 'includes/class-submission-service.php';
require_once LMQ_PLUGIN_PATH . 'includes/class-legacy-pss10-runtime.php';
require_once LMQ_PLUGIN_PATH . 'includes/class-shortcodes.php';
require_once LMQ_PLUGIN_PATH . 'includes/class-rest-controller.php';
require_once LMQ_PLUGIN_PATH . 'includes/class-lifemetrics-plugin.php';

LifeMetrics_Plugin::init();
