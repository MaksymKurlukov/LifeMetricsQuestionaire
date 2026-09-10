<?php

defined('ABSPATH') || exit;

final class LifeMetrics_Shortcodes
{
    public function __construct(
        private LifeMetrics_Legacy_PSS10_Runtime $legacy_pss10,
        private ?LifeMetrics_Questionnaire_Registry $registry = null,
        private ?LifeMetrics_Questionnaire_Renderer $renderer = null
    ) {
    }

    public function render($attributes): string
    {
        $attributes = shortcode_atts(array('id' => ''), $attributes, 'lifemetrics_questionnaire');
        $id = sanitize_key($attributes['id']);

        // 1. Empty ID or explicit 'pss10' -> delegate to legacy PSS10 runtime
        if ($id === '' || $id === 'pss10') {
            return $this->legacy_pss10->render_shortcode($attributes);
        }

        // 2. Known proprietary questionnaires -> render through generic renderer
        if ($this->registry !== null && $this->renderer !== null) {
            $config = $this->registry->get_internal($id);
            if ($config !== null) {
                $submit_url = function_exists('rest_url') ? rest_url('lifemetrics-questionnaires/v1/' . $id . '/submit') : '';
                return $this->renderer->render($config, $submit_url);
            }
        }

        // 3. Unknown ID -> fail safely with empty string
        return '';
    }
}
