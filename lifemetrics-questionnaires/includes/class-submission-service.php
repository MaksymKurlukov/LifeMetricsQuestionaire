<?php

defined('ABSPATH') || exit;

final class LifeMetrics_Submission_Service
{
    public function __construct(
        private LifeMetrics_Questionnaire_Registry $registry,
        private LifeMetrics_Questionnaire_Scoring_Engine $engine,
        private LifeMetrics_Google_Apps_Script_Adapter $adapter
    ) {
    }

    /**
     * Resolve the Google Apps Script endpoint for a specific questionnaire ID.
     *
     * Preferred architecture:
     * - Central single Google Apps Script Web App: LMQ_GOOGLE_ENDPOINT
     * - Legacy compatibility exception: LMQ_PSS10_GOOGLE_ENDPOINT for 'pss10'
     * - Dynamic filter hook: 'lifemetrics_questionnaire_backend_endpoint'
     */
    public function get_endpoint(string $questionnaire_id): ?string
    {
        $sanitized_id = sanitize_key($questionnaire_id);
        $endpoint = null;

        // 1. Allow filter override first
        if (function_exists('apply_filters')) {
            $endpoint = apply_filters('lifemetrics_questionnaire_backend_endpoint', null, $sanitized_id);
            if (!empty($endpoint) && is_string($endpoint)) {
                return $endpoint;
            }
        }

        // 2. For PSS10 legacy compatibility, check dedicated PSS10 endpoint constant
        if ($sanitized_id === 'pss10' && defined('LMQ_PSS10_GOOGLE_ENDPOINT')) {
            $endpoint = constant('LMQ_PSS10_GOOGLE_ENDPOINT');
            if (!empty($endpoint) && is_string($endpoint)) {
                return $endpoint;
            }
        }

        // 3. Check central single Google Apps Script endpoint constant for all proprietary questionnaires
        if (defined('LMQ_GOOGLE_ENDPOINT')) {
            $endpoint = constant('LMQ_GOOGLE_ENDPOINT');
            if (!empty($endpoint) && is_string($endpoint)) {
                return $endpoint;
            }
        }

        // 4. Check ID-specific constant (fallback / override)
        $const_name = 'LMQ_' . strtoupper(str_replace('-', '_', $sanitized_id)) . '_GOOGLE_ENDPOINT';
        if (defined($const_name)) {
            $endpoint = constant($const_name);
            if (!empty($endpoint) && is_string($endpoint)) {
                return $endpoint;
            }
        }

        // 5. Check endpoints map constant if defined
        if (defined('LMQ_GOOGLE_ENDPOINTS')) {
            $map = constant('LMQ_GOOGLE_ENDPOINTS');
            if (is_array($map) && isset($map[$sanitized_id])) {
                $endpoint = $map[$sanitized_id];
                if (!empty($endpoint) && is_string($endpoint)) {
                    return $endpoint;
                }
            }
        }

        // 6. Safeguard fallback to default PSS10 endpoint if defined
        if (defined('LMQ_PSS10_GOOGLE_ENDPOINT')) {
            $endpoint = constant('LMQ_PSS10_GOOGLE_ENDPOINT');
            if (!empty($endpoint) && is_string($endpoint)) {
                return $endpoint;
            }
        }

        return null;
    }

    /**
     * Handle submission for a questionnaire.
     */
    public function submit(string $questionnaire_id, WP_REST_Request $request)
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

        $sanitized_id = sanitize_key($questionnaire_id);

        $config = $this->registry->get_internal($sanitized_id);

        if (!$config) {
            return new WP_Error('lmq_not_found', 'Questionnaire not found.', array('status' => 404));
        }

        $endpoint = $this->get_endpoint($sanitized_id);
        if (!$endpoint) {
            return new WP_Error('lmq_backend_not_configured', 'Questionnaire storage is not configured.', array('status' => 500));
        }

        $is_legacy_pss10 = ($sanitized_id === 'pss10') && !isset($input['answers']);

        if ($is_legacy_pss10) {
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
                    $answers['Q' . $i] = (string)(6 - $val);
                } else {
                    $answers['Q' . $i] = (string)$val;
                }
            }

            $result = $this->engine->score($config, $answers);

            // Verify final score matches what the client claimed
            if ($result['final_score'] !== $input['final_score']) {
                return new WP_Error('lmq_invalid_score', 'Invalid questionnaire score.', array('status' => 400));
            }

            // Forward legacy payload exactly as provided BUT with server-calculated category
            $payload = $input;
            $payload['category'] = $result['calculated_category'] === 'LOW' ? 'Stress bas' : ($result['calculated_category'] === 'MEDIUM' ? 'Stress assez élevé' : 'Stress très élevé');
        } elseif ($sanitized_id === 'pss10') {
            // Generic frontend submitting PSS10
            if (!is_array($input['answers'])) {
                return new WP_Error('lmq_invalid_json', 'Invalid JSON request.', array('status' => 400));
            }
            $answers = array();
            for ($i = 1; $i <= 10; $i++) {
                $key = isset($input['answers']['Q' . $i]) ? 'Q' . $i : 'q' . $i;
                $answers['Q' . $i] = isset($input['answers'][$key]) ? (string)$input['answers'][$key] : '';
            }
            $result = $this->engine->score($config, $answers);

            $payload = array(
                'created_at' => gmdate('Y-m-d\TH:i:s.000\Z'),
                'session_id' => isset($input['session_id']) && is_string($input['session_id']) ? $input['session_id'] : (function_exists('wp_generate_uuid4') ? wp_generate_uuid4() : sprintf('%04x%04x-%04x-4%03x-%04x-%04x%04x%04x', mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0x0fff), mt_rand(0, 0x8000), mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff))),
            );
            $reverse_questions = array(4, 5, 7, 8);
            for ($i = 1; $i <= 10; $i++) {
                $val = (int)$answers['Q' . $i];
                if (in_array($i, $reverse_questions, true)) {
                    $payload['q' . $i] = 6 - $val;
                } else {
                    $payload['q' . $i] = $val;
                }
            }
            $payload['final_score'] = $result['final_score'];
            $payload['category'] = $result['calculated_category'] === 'LOW' ? 'Stress bas' : ($result['calculated_category'] === 'MEDIUM' ? 'Stress assez élevé' : 'Stress très élevé');
        } else {
            // Generic canonical submission format for proprietary questionnaires
            if (!isset($input['answers']) || !is_array($input['answers'])) {
                return new WP_Error('lmq_invalid_json', 'Invalid JSON request.', array('status' => 400));
            }

            if (!empty($input['session_id']) && (!is_string($input['session_id']) || !preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i', $input['session_id']))) {
                return new WP_Error('lmq_invalid_session', 'Invalid questionnaire session.', array('status' => 400));
            }

            $session_id = !empty($input['session_id']) ? $input['session_id'] : (function_exists('wp_generate_uuid4') ? wp_generate_uuid4() : sprintf('%04x%04x-%04x-4%03x-%04x-%04x%04x%04x', mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0x0fff), mt_rand(0, 0x8000), mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)));
            $completed_at = !empty($input['completed_at']) && is_string($input['completed_at']) && strtotime($input['completed_at']) ? $input['completed_at'] : gmdate('Y-m-d\TH:i:s.000\Z');

            $result = $this->engine->score($config, $input['answers']);

            $source_page = null;
            if (!empty($input['source_page']) && is_string($input['source_page'])) {
                $parsed = parse_url($input['source_page'], PHP_URL_PATH);
                $source_page = $parsed ? (function_exists('sanitize_text_field') ? sanitize_text_field($parsed) : strip_tags($parsed)) : null;
            }

            $client_version = '1.0.0';
            if (!empty($input['client_version']) && is_string($input['client_version'])) {
                $client_version = function_exists('sanitize_text_field') ? sanitize_text_field($input['client_version']) : strip_tags($input['client_version']);
            }

            $scored_schema = array();
            foreach ($config['questions'] as $q) {
                $scored_schema[] = array(
                    'id' => $q['id'],
                    'text' => $q['text'],
                );
            }

            $safety_schema = array();
            if (!empty($config['safety_questions'])) {
                foreach ($config['safety_questions'] as $sq) {
                    $safety_schema[] = array(
                        'id' => $sq['id'],
                        'text' => $sq['text'],
                    );
                }
            }

            $payload = array(
                'submission_schema_version' => '1.0.0',
                'questionnaire_id' => $config['id'],
                'questionnaire_version' => $config['version'],
                'client_version' => $client_version,
                'session_id' => $session_id,
                'completed_at' => $completed_at,
                'received_at' => gmdate('Y-m-d\TH:i:s.000\Z'),
                'locale' => isset($config['locale']) ? $config['locale'] : 'fr-FR',
                'source_page' => $source_page,
                'questions_schema' => array(
                    'scored' => $scored_schema,
                    'safety' => $safety_schema,
                ),
                'answers' => isset($result['selected_answers']) ? $result['selected_answers'] : (isset($result['answers']) ? $result['answers'] : array()),
                'raw_score' => $result['raw_score'],
                'available_min' => $result['available_min'],
                'available_max' => $result['available_max'],
                'final_score' => $result['final_score'],
                'calculated_category' => $result['calculated_category'],
                'displayed_category' => $result['displayed_category'],
                'applied_classification_rules' => isset($result['applied_classification_rules']) ? $result['applied_classification_rules'] : array(),
                'dimensions' => isset($result['dimensions']) ? $result['dimensions'] : array(),
                'weakest_dimensions' => isset($result['weakest_dimensions']) ? $result['weakest_dimensions'] : array(),
                'safety_flags' => isset($result['safety_flag_codes']) ? $result['safety_flag_codes'] : (isset($result['safety_flags']) ? $result['safety_flags'] : array()),
                'safety_answers' => isset($result['safety_answers']) ? $result['safety_answers'] : array(),
            );
        }

        $send_result = $this->adapter->send($endpoint, $payload);
        if (is_wp_error($send_result)) {
            return $send_result;
        }

        return rest_ensure_response(
            array('success' => true, 'duplicate' => !empty($send_result['duplicate']))
        );
    }
}
