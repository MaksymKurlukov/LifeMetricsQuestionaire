<?php

defined('ABSPATH') || exit;

final class LifeMetrics_Google_Apps_Script_Adapter
{
    /**
     * Resolve HTTP timeout for Google Apps Script requests.
     * Default: 25 seconds (optimized for Apps Script cold starts).
     */
    public function get_timeout(): int
    {
        $timeout = 25;
        if (defined('LMQ_GAS_TIMEOUT')) {
            $timeout = (int)constant('LMQ_GAS_TIMEOUT');
        }
        if (function_exists('apply_filters')) {
            $timeout = (int)apply_filters('lifemetrics_gas_timeout', $timeout);
        }
        return $timeout > 0 ? $timeout : 25;
    }

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

        $timeout = $this->get_timeout();

        $response = wp_remote_post(
            $endpoint,
            array(
                'headers' => array('Content-Type' => 'application/json; charset=utf-8'),
                'body' => wp_json_encode($payload),
                'timeout' => $timeout,
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
        if ($status >= 300 && $status < 400) {
            $location = wp_remote_retrieve_header($response, 'location');
            $redirect = is_string($location) ? parse_url($location) : false;
            $host = (is_array($redirect) && isset($redirect['host'])) ? strtolower($redirect['host']) : '';
            $is_google_host = ($host === 'script.googleusercontent.com' ||
                               str_ends_with($host, '.googleusercontent.com') ||
                               $host === 'script.google.com' ||
                               str_ends_with($host, '.google.com'));

            if (
                !is_array($redirect) ||
                !isset($redirect['scheme']) ||
                strtolower($redirect['scheme']) !== 'https' ||
                !$is_google_host ||
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
                array('timeout' => $timeout, 'redirection' => 0, 'sslverify' => true)
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

        $body = wp_remote_retrieve_body($response);
        $backend = is_string($body) ? json_decode(trim($body), true) : null;
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
