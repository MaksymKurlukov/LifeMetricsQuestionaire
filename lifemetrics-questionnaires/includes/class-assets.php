<?php

defined('ABSPATH') || exit;

final class LifeMetrics_Questionnaire_Assets
{
    private string $plugin_url;
    private string $plugin_path;
    private string $version;

    public function __construct(string $plugin_url, string $plugin_path, string $version)
    {
        $this->plugin_url = rtrim($plugin_url, '/');
        $this->plugin_path = rtrim($plugin_path, '/');
        $this->version = $version;
    }

    public function register(): void
    {
        $css_path = '/assets/css/questionnaire.css';
        $js_engine_path = '/assets/js/questionnaire-engine.js';
        $js_ui_path = '/assets/js/questionnaire-ui.js';

        wp_register_style(
            'lmq-shared-style',
            $this->plugin_url . $css_path,
            array(),
            file_exists($this->plugin_path . $css_path) ? filemtime($this->plugin_path . $css_path) : $this->version
        );

        wp_register_script(
            'lmq-shared-engine',
            $this->plugin_url . $js_engine_path,
            array(),
            file_exists($this->plugin_path . $js_engine_path) ? filemtime($this->plugin_path . $js_engine_path) : $this->version,
            true
        );

        wp_register_script(
            'lmq-shared-ui',
            $this->plugin_url . $js_ui_path,
            array('lmq-shared-engine'),
            file_exists($this->plugin_path . $js_ui_path) ? filemtime($this->plugin_path . $js_ui_path) : $this->version,
            true
        );
    }

    public function enqueue(string $questionnaire_id = ''): void
    {
        wp_enqueue_style('lmq-shared-style');
        wp_enqueue_script('lmq-shared-ui');

        if ($questionnaire_id !== '') {
            $specific_css = '/assets/css/questionnaires/' . $questionnaire_id . '.css';
            if (file_exists($this->plugin_path . $specific_css)) {
                $handle = 'lmq-style-' . $questionnaire_id;
                wp_register_style(
                    $handle,
                    $this->plugin_url . $specific_css,
                    array('lmq-shared-style'),
                    filemtime($this->plugin_path . $specific_css)
                );
                wp_enqueue_style($handle);
            }
        }
    }
}
