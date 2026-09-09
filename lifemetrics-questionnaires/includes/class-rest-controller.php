<?php

defined('ABSPATH') || exit;

final class LifeMetrics_REST_Controller
{
    public function __construct(private LifeMetrics_Submission_Service|LifeMetrics_Legacy_PSS10_Runtime $service)
    {
    }

    /** Register generic questionnaire submission route and legacy compatibility route. */
    public function register_routes(): void
    {
        // Generic questionnaire submission route
        register_rest_route(
            'lifemetrics-questionnaires/v1',
            '/(?P<id>[a-zA-Z0-9_-]+)/submit',
            array(
                'methods' => WP_REST_Server::CREATABLE,
                'callback' => array($this, 'submit_questionnaire'),
                'permission_callback' => '__return_true',
            )
        );

        // Explicit PSS10 route to guarantee backwards compatibility
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
        if ($this->service instanceof LifeMetrics_Submission_Service) {
            return $this->service->submit('pss10', $request);
        }
        return $this->service->submit($request);
    }

    public function submit_questionnaire(WP_REST_Request $request)
    {
        $id = $request->get_param('id');
        if ($this->service instanceof LifeMetrics_Submission_Service) {
            return $this->service->submit((string)$id, $request);
        }
        return $this->service->submit($request);
    }
}
