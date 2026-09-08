<?php

defined('ABSPATH') || exit;

final class LifeMetrics_Plugin
{
    private static bool $initialized = false;

    private static ?LifeMetrics_Questionnaire_Registry $registry = null;

    private static ?LifeMetrics_Legacy_PSS10_Runtime $legacy_pss10 = null;

    private static ?LifeMetrics_Shortcodes $shortcodes = null;

    private static ?LifeMetrics_REST_Controller $rest_controller = null;

    public static function init(): void
    {
        if (self::$initialized) {
            return;
        }

        self::$initialized = true;
        self::$registry = new LifeMetrics_Questionnaire_Registry(
            LMQ_PLUGIN_PATH . 'questionnaires',
            array()
        );
        self::$legacy_pss10 = new LifeMetrics_Legacy_PSS10_Runtime();
        self::$shortcodes = new LifeMetrics_Shortcodes(self::$legacy_pss10);
        self::$rest_controller = new LifeMetrics_REST_Controller(self::$legacy_pss10);

        add_action('wp_enqueue_scripts', array(self::$legacy_pss10, 'register_assets'));
        add_action('wp_footer', array(self::$legacy_pss10, 'print_late_styles'), 1);
        add_shortcode('lifemetrics_questionnaire', array(self::$shortcodes, 'render'));
        add_action('rest_api_init', array(self::$rest_controller, 'register_routes'));
    }
}
