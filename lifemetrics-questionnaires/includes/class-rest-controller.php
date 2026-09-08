<?php

defined('ABSPATH') || exit;

final class LifeMetrics_REST_Controller
{
    public function __construct(private LifeMetrics_Legacy_PSS10_Runtime $legacy_pss10)
    {
    }

    /** Register only the existing compatibility route until the generic route stage. */
    public function register_routes(): void
    {
        register_rest_route(
            'lifemetrics-questionnaires/v1',
            '/pss10/submit',
            array(
                'methods' => WP_REST_Server::CREATABLE,
                'callback' => array($this, 'submit_pss10'),
                'permission_callback' => '__return_true',
            )
        );
    }

    public function submit_pss10(WP_REST_Request $request)
    {
        return $this->legacy_pss10->submit($request);
    }
}
