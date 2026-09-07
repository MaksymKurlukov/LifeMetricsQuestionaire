<?php
/**
 * Plugin Name: LifeMetrics Questionnaires
 * Description: WordPress wrapper for the LifeMetrics questionnaires.
 * Version: 1.0.0
 * Requires at least: 6.0
 * Requires PHP: 7.4
 */

defined('ABSPATH') || exit;

if (!defined('LMQ_PSS10_GOOGLE_ENDPOINT')) {
    define(
        'LMQ_PSS10_GOOGLE_ENDPOINT',
        'https://script.google.com/macros/s/AKfycbwBoW3UFzmKhZ3SYMttlx3VAqmYvk9n8gn2_WrimwhKqxafr5ajDuoo_px0CmdDfWzc/exec'
    );
}

/** Register assets early; enqueue them only when the shortcode is rendered. */
function lmq_register_assets()
{
    $base_url = plugin_dir_url(__FILE__) . 'questionnaires/pss10/assets/';

    wp_register_style(
        'lmq-pss10',
        $base_url . 'css/style.css',
        array(),
        '1.0.0'
    );

    wp_register_script(
        'lmq-pss10',
        $base_url . 'js/app.js',
        array(),
        '1.0.0',
        true
    );
}
add_action('wp_enqueue_scripts', 'lmq_register_assets');

/**
 * Ensure a stylesheet enqueued by a late-rendered shortcode is still printed.
 * This keeps the shortcode reliable in both the block editor and page builders.
 */
function lmq_print_late_styles()
{
    if (
        wp_style_is('lmq-pss10', 'enqueued') &&
        !wp_style_is('lmq-pss10', 'done')
    ) {
        wp_print_styles('lmq-pss10');
    }
}
add_action('wp_footer', 'lmq_print_late_styles', 1);

/** Render [lifemetrics_questionnaire id="pss10"]. */
function lmq_questionnaire_shortcode($attributes)
{
    $attributes = shortcode_atts(
        array('id' => ''),
        $attributes,
        'lifemetrics_questionnaire'
    );

    $questionnaire_id = sanitize_key($attributes['id']);
    $questionnaires = array(
        'pss10' => plugin_dir_path(__FILE__) . 'questionnaires/pss10/template.php',
    );

    if (!isset($questionnaires[$questionnaire_id])) {
        return '';
    }

    lmq_register_assets();
    wp_enqueue_style('lmq-pss10');
    wp_enqueue_script('lmq-pss10');

    $asset_url = plugin_dir_url(__FILE__) . 'questionnaires/pss10/assets/';
    $submit_url = rest_url('lifemetrics-questionnaires/v1/pss10/submit');
    $instance_id = wp_unique_id('lmq-pss10-');

    ob_start();
    include $questionnaires[$questionnaire_id];

    return (string) ob_get_clean();
}
add_shortcode('lifemetrics_questionnaire', 'lmq_questionnaire_shortcode');

/** Register the public, same-origin submission endpoint. */
function lmq_register_rest_routes()
{
    register_rest_route(
        'lifemetrics-questionnaires/v1',
        '/pss10/submit',
        array(
            'methods' => WP_REST_Server::CREATABLE,
            'callback' => 'lmq_pss10_submit',
            'permission_callback' => '__return_true',
        )
    );
}
add_action('rest_api_init', 'lmq_register_rest_routes');

/** Validate input, forward it to Google Apps Script, and return a readable result. */
function lmq_pss10_submit(WP_REST_Request $request)
{
    if (strlen($request->get_body()) > 8192) {
        return new WP_Error(
            'lmq_payload_too_large',
            'Request body is too large.',
            array('status' => 413)
        );
    }

    if (!$request->is_json_content_type()) {
        return new WP_Error(
            'lmq_invalid_content_type',
            'Expected an application/json request.',
            array('status' => 400)
        );
    }

    $input = $request->get_json_params();
    if (!is_array($input)) {
        return new WP_Error(
            'lmq_invalid_json',
            'Invalid JSON request.',
            array('status' => 400)
        );
    }

    $session_id = isset($input['session_id']) ? $input['session_id'] : null;
    if (
        !is_string($session_id) ||
        !preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i', $session_id)
    ) {
        return new WP_Error(
            'lmq_invalid_session',
            'Invalid questionnaire session.',
            array('status' => 400)
        );
    }

    $created_at = isset($input['created_at']) ? $input['created_at'] : null;
    if (
        !is_string($created_at) ||
        !preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?Z$/', $created_at) ||
        false === strtotime($created_at)
    ) {
        return new WP_Error(
            'lmq_invalid_created_at',
            'Invalid questionnaire timestamp.',
            array('status' => 400)
        );
    }

    $payload = array(
        'created_at' => $created_at,
        'session_id' => $session_id,
    );
    $score_sum = 0;

    for ($question = 1; $question <= 10; $question++) {
        $key = 'q' . $question;
        if (!isset($input[$key]) || !is_int($input[$key]) || $input[$key] < 1 || $input[$key] > 5) {
            return new WP_Error(
                'lmq_invalid_answers',
                'All questionnaire answers must be integers from 1 to 5.',
                array('status' => 400)
            );
        }

        $payload[$key] = $input[$key];
        $score_sum += $input[$key];
    }

    $final_score = isset($input['final_score']) ? $input['final_score'] : null;
    if (!is_int($final_score) || $final_score < 10 || $final_score > 50 || $final_score !== $score_sum) {
        return new WP_Error(
            'lmq_invalid_score',
            'Invalid questionnaire score.',
            array('status' => 400)
        );
    }

    $allowed_categories = array('Stress bas', 'Stress assez élevé', 'Stress très élevé');
    if (!isset($input['category']) || !is_string($input['category']) || !in_array($input['category'], $allowed_categories, true)) {
        return new WP_Error(
            'lmq_invalid_category',
            'Invalid questionnaire category.',
            array('status' => 400)
        );
    }

    // The frontend category is informational; the server derives the stored value.
    $payload['final_score'] = $final_score;
    $payload['category'] = $final_score >= 27
        ? 'Stress très élevé'
        : ($final_score >= 21 ? 'Stress assez élevé' : 'Stress bas');

    $endpoint = esc_url_raw(LMQ_PSS10_GOOGLE_ENDPOINT);
    if (!$endpoint) {
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
            array(
                'timeout' => 15,
                'redirection' => 0,
                'sslverify' => true,
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
    }

    $response_body = wp_remote_retrieve_body($response);
    $backend = json_decode($response_body, true);

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

    return rest_ensure_response(
        array(
            'success' => true,
            'duplicate' => !empty($backend['duplicate']),
        )
    );
}
