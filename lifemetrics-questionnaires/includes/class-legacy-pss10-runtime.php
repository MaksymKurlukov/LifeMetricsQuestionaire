<?php

defined('ABSPATH') || exit;

/** Temporary compatibility path for the validated PSS10 runtime. */
final class LifeMetrics_Legacy_PSS10_Runtime
{
    public function register_assets(): void
    {
        $base_path = LMQ_PLUGIN_PATH . 'questionnaires/pss10/assets/';
        $base_url = LMQ_PLUGIN_URL . 'questionnaires/pss10/assets/';

        wp_register_style('lmq-pss10', $base_url . 'css/style.css', array(), filemtime($base_path . 'css/style.css'));
        wp_register_script('lmq-pss10', $base_url . 'js/app.js', array(), filemtime($base_path . 'js/app.js'), true);
    }

    public function print_late_styles(): void
    {
        if (wp_style_is('lmq-pss10', 'enqueued') && !wp_style_is('lmq-pss10', 'done')) {
            wp_print_styles('lmq-pss10');
        }
    }

            public function render_shortcode($attributes): string
    {
        $attributes = shortcode_atts(array('id' => ''), $attributes, 'lifemetrics_questionnaire');
        if (sanitize_key($attributes['id']) !== 'pss10') {
            return '';
        }

        $this->register_assets();
        wp_enqueue_style('lmq-pss10');
        wp_enqueue_script('lmq-pss10');

        require_once LMQ_PLUGIN_PATH . 'includes/class-questionnaire-registry.php';
        require_once LMQ_PLUGIN_PATH . 'includes/class-questionnaire-schema-validator.php';
        require_once LMQ_PLUGIN_PATH . 'includes/class-assets.php';
        require_once LMQ_PLUGIN_PATH . 'includes/class-questionnaire-renderer.php';

        $registry = new LifeMetrics_Questionnaire_Registry(
            LMQ_PLUGIN_PATH . 'questionnaires',
            array('pss10' => 'pss10/questionnaire.php'),
            new LifeMetrics_Questionnaire_Schema_Validator()
        );
        $config = $registry->get_internal('pss10');
        if (!$config) return '';

        // The generic renderer dynamically creates the ID using the config id, 
        // e.g., wp_unique_id('lmq-pss10-')
        $assets = new LifeMetrics_Questionnaire_Assets(LMQ_PLUGIN_URL, LMQ_PLUGIN_PATH, '1.0.0');
        $renderer = new LifeMetrics_Questionnaire_Renderer($assets, LMQ_PLUGIN_PATH . 'questionnaires/pss10/template.php');

        return $renderer->render($config, rest_url('lifemetrics-questionnaires/v1/pss10/submit'));
    }

            public function submit(WP_REST_Request $request)
    {
        if (strlen($request->get_body()) > 8192) {
            return new WP_Error('lmq_payload_too_large', 'Request body is too large.', array('status' => 413));
        }

        if (!$request->is_json_content_type()) {
            return new WP_Error('lmq_invalid_content_type', 'Expected an application/json request.', array('status' => 400));
        }

        $input = $request->get_json_params();
        if (!is_array($input)) {
            return new WP_Error('lmq_invalid_json', 'Invalid JSON request.', array('status' => 400));
        }

        require_once LMQ_PLUGIN_PATH . 'includes/class-questionnaire-scoring-engine.php';
        $engine = new LifeMetrics_Questionnaire_Scoring_Engine();
        require_once LMQ_PLUGIN_PATH . 'includes/class-questionnaire-registry.php';
        require_once LMQ_PLUGIN_PATH . 'includes/class-questionnaire-schema-validator.php';
        $registry = new LifeMetrics_Questionnaire_Registry(
            LMQ_PLUGIN_PATH . 'questionnaires',
            array('pss10' => 'pss10/questionnaire.php'),
            new LifeMetrics_Questionnaire_Schema_Validator()
        );
        $config = $registry->get_internal('pss10');

        $is_legacy = !isset($input['answers']);
        
        if ($is_legacy) {
            // Validate legacy fields explicitly to preserve characterization test parity
            if (empty($input['session_id']) || !is_string($input['session_id']) || !preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i', $input['session_id'])) {
                return new WP_Error('lmq_invalid_session', 'Invalid questionnaire session.', array('status' => 400));
            }
            if (empty($input['created_at']) || !is_string($input['created_at']) || false === strtotime($input['created_at'])) {
                return new WP_Error('lmq_invalid_created_at', 'Invalid questionnaire timestamp.', array('status' => 400));
            }
            for ($i = 1; $i <= 10; $i++) {
                if (!isset($input['q' . $i]) || !is_int($input['q' . $i])) {
                    return new WP_Error('lmq_invalid_answers', 'All questionnaire answers must be integers from 1 to 5.', array('status' => 400));
                }
            }
            if (!isset($input['final_score']) || !is_int($input['final_score']) || $input['final_score'] < 10 || $input['final_score'] > 50) {
                return new WP_Error('lmq_invalid_score', 'Invalid questionnaire score.', array('status' => 400));
            }
            if (empty($input['category']) || !in_array($input['category'], array('Stress bas', 'Stress assez élevé', 'Stress très élevé'), true)) {
                return new WP_Error('lmq_invalid_category', 'Invalid category.', array('status' => 400));
            }

            // Convert legacy payload to generic format for engine verification
            $answers = array();
            $reverse_questions = array(4, 5, 7, 8);
            foreach (range(1, 10) as $i) {
                $val = $input['q' . $i];
                if (in_array($i, $reverse_questions, true)) {
                    $answers['q' . $i] = (string)(6 - $val);
                } else {
                    $answers['q' . $i] = (string)$val;
                }
            }

            $result = $engine->score($config, $answers);

            // Verify final score matches what the client claimed
            if ($result['final_score'] !== $input['final_score']) {
                return new WP_Error('lmq_invalid_score', 'Invalid questionnaire score.', array('status' => 400));
            }

            // Forward legacy payload exactly as provided BUT with server-calculated category
            $payload = $input;
            $payload['category'] = $result['calculated_category'] === 'low' ? 'Stress bas' : ($result['calculated_category'] === 'medium' ? 'Stress assez élevé' : 'Stress très élevé');
        } else {
            // New generic frontend
            if (!is_array($input['answers'])) {
                return new WP_Error('lmq_invalid_json', 'Invalid JSON request.', array('status' => 400));
            }
            $answers = $input['answers'];
            $result = $engine->score($config, $answers);

            $payload = array(
                'created_at' => gmdate('Y-m-d\TH:i:s.000\Z'),
                'session_id' => wp_generate_uuid4(),
            );
            $reverse_questions = array(4, 5, 7, 8);
            for ($i = 1; $i <= 10; $i++) {
                $val = (int)$answers['q' . $i];
                if (in_array($i, $reverse_questions, true)) {
                    $payload['q' . $i] = 6 - $val;
                } else {
                    $payload['q' . $i] = $val;
                }
            }
            $payload['final_score'] = $result['final_score'];
            $payload['category'] = $result['calculated_category'] === 'low' ? 'Stress bas' : ($result['calculated_category'] === 'medium' ? 'Stress assez élevé' : 'Stress très élevé');
        }

        $endpoint = esc_url_raw(LMQ_PSS10_GOOGLE_ENDPOINT);
        if (!$endpoint) {
            return new WP_Error('lmq_backend_not_configured', 'Questionnaire storage is not configured.', array('status' => 500));
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
            return new WP_Error('lmq_upstream_network_error', 'Questionnaire storage is temporarily unavailable.', array('status' => 502));
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
                return new WP_Error('lmq_upstream_http_error', 'Questionnaire storage returned an error.', array('status' => 502));
            }

            $response = wp_remote_get(
                $location,
                array('timeout' => 15, 'redirection' => 0, 'sslverify' => true)
            );

            if (is_wp_error($response)) {
                return new WP_Error('lmq_upstream_network_error', 'Questionnaire storage is temporarily unavailable.', array('status' => 502));
            }
            $status = wp_remote_retrieve_response_code($response);
        }

        $backend = json_decode(wp_remote_retrieve_body($response), true);
        if ($status < 200 || $status >= 300) {
            return new WP_Error('lmq_upstream_http_error', 'Questionnaire storage returned an error.', array('status' => 502));
        }

        if (!is_array($backend) || empty($backend['ok'])) {
            return new WP_Error('lmq_upstream_rejected', 'Questionnaire storage rejected the result.', array('status' => 502));
        }

        return rest_ensure_response(
            array('success' => true, 'duplicate' => !empty($backend['duplicate']))
        );
    }
}
