<?php

defined('ABSPATH') || exit;

final class LifeMetrics_Shortcodes
{
    public function __construct(private LifeMetrics_Legacy_PSS10_Runtime $legacy_pss10)
    {
    }

    public function render($attributes): string
    {
        return $this->legacy_pss10->render_shortcode($attributes);
    }
}
