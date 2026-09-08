<?php

defined('ABSPATH') || exit;

final class LifeMetrics_Plugin
{
    private static bool $initialized = false;

    private static ?LifeMetrics_Legacy_PSS10_Runtime $legacy_pss10 = null;

    public static function init(): void
    {
        if (self::$initialized) {
            return;
        }

        self::$initialized = true;
        self::$legacy_pss10 = new LifeMetrics_Legacy_PSS10_Runtime();

        add_action('wp_enqueue_scripts', array(self::$legacy_pss10, 'register_assets'));
        add_action('wp_footer', array(self::$legacy_pss10, 'print_late_styles'), 1);
        add_shortcode('lifemetrics_questionnaire', array(self::$legacy_pss10, 'render_shortcode'));
        add_action('rest_api_init', array(self::$legacy_pss10, 'register_rest_routes'));
    }
}
