<?php
/**
 * Plugin Name: LifeMetrics Questionnaires
 * Description: WordPress wrapper for the LifeMetrics questionnaires.
 * Version: 1.0.0
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
        'https://script.google.com/macros/s/AKfycbwBoW3UFzmKhZ3SYMttlx3VAqmYvk9n8gn2_WrimwhKqxafr5ajDuoo_px0CmdDfWzc/exec'
    );
}

require_once LMQ_PLUGIN_PATH . 'includes/class-questionnaire-registry.php';
require_once LMQ_PLUGIN_PATH . 'includes/class-legacy-pss10-runtime.php';
require_once LMQ_PLUGIN_PATH . 'includes/class-shortcodes.php';
require_once LMQ_PLUGIN_PATH . 'includes/class-rest-controller.php';
require_once LMQ_PLUGIN_PATH . 'includes/class-lifemetrics-plugin.php';

LifeMetrics_Plugin::init();
