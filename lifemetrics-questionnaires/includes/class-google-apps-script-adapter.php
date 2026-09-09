<?php

defined('ABSPATH') || exit;

final class LifeMetrics_Google_Apps_Script_Adapter
{
    /**
     * Send payload to Google Apps Script endpoint.
     *
     * @param string $endpoint The Apps Script Web App URL.
     * @param array $payload The associative array to JSON-encode.
     * @return array|WP_Error Array with 'ok' and 'duplicate' on success, WP_Error on failure.
     */
    public function send(string $endpoint, array $payload)
    {
        $endpoint = esc_url_raw($endpoint);
        if (empty($endpoint)) {
            return new WP_Error(
                'lmq_backend_not_configured',
                'Questionnaire storage is not configured.',
                array('status' => 500)
            );
        }

        $response = wp_remote_post(
            $endpoint,
            array(
                'headers' => array('Content-Type' => 'application/json; charset=utf-8'),
                'body' => wp_json_encode($payload),
                'timeout' => 15,
                'redirection' => 0,
                'data_format' => 'body',
            )
        );

        if (is_wp_error($response)) {
            return new WP_Error(
                'lmq_upstream_network_error',
                'Questionnaire storage is temporarily unavailable.',
                array('status' => 502)
            );
        }

        $status = wp_remote_retrieve_response_code($response);
        if ($status === 302) {
            $location = wp_remote_retrieve_header($response, 'location');
            $redirect = is_string($location) ? parse_url($location) : false;
            if (
                !is_array($redirect) ||
                !isset($redirect['scheme'], $redirect['host']) ||
                strtolower($redirect['scheme']) !== 'https' ||
                strtolower($redirect['host']) !== 'script.googleusercontent.com' ||
                isset($redirect['user']) ||
                isset($redirect['pass']) ||
                isset($redirect['port'])
            ) {
                return new WP_Error(
                    'lmq_upstream_http_error',
                    'Questionnaire storage returned an error.',
                    array('status' => 502)
                );
            }

            $response = wp_remote_get(
                $location,
                array('timeout' => 15, 'redirection' => 0, 'sslverify' => true)
            );

            if (is_wp_error($response)) {
                return new WP_Error(
                    'lmq_upstream_network_error',
                    'Questionnaire storage is temporarily unavailable.',
                    array('status' => 502)
                );
            }
            $status = wp_remote_retrieve_response_code($response);
        }

        $backend = json_decode(wp_remote_retrieve_body($response), true);
        if ($status < 200 || $status >= 300) {
            return new WP_Error(
                'lmq_upstream_http_error',
                'Questionnaire storage returned an error.',
                array('status' => 502)
            );
        }

        if (!is_array($backend) || empty($backend['ok'])) {
            return new WP_Error(
                'lmq_upstream_rejected',
                'Questionnaire storage rejected the result.',
                array('status' => 502)
            );
        }

        return array(
            'ok' => true,
            'duplicate' => !empty($backend['duplicate']),
        );
    }
}
