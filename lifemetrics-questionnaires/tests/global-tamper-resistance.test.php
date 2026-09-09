<?php

error_reporting(E_ALL);
set_error_handler(static function ($severity, $message, $file, $line) {
    throw new ErrorException($message, 0, $severity, $file, $line);
});

define('ABSPATH', __DIR__ . '/');

if (!class_exists('WP_Error')) {
    class WP_Error {
        public function __construct(public string $code, public string $message = '', public array $data = array()) {}
        public function get_error_code(): string { return $this->code; }
        public function get_error_message(): string { return $this->message; }
        public function get_error_data(): array { return $this->data; }
    }
}
if (!class_exists('WP_REST_Request')) {
    class WP_REST_Request {
        public function __construct(
            private array $params = array(),
            private bool $is_json = true,
            private ?string $body = null,
            private array $url_params = array()
        ) {
            if ($this->body === null) {
                $this->body = json_encode($this->params);
            }
        }
        public function get_body(): string { return $this->body; }
        public function is_json_content_type(): bool { return $this->is_json; }
        public function get_json_params(): array { return $this->params; }
        public function get_param(string $key): mixed { return $this->url_params[$key] ?? $this->params[$key] ?? null; }
    }
}
if (!function_exists('is_wp_error')) {
    function is_wp_error($thing) { return $thing instanceof WP_Error; }
}
if (!function_exists('esc_url_raw')) {
    function esc_url_raw($url) { return (string)$url; }
}
if (!function_exists('sanitize_key')) {
    function sanitize_key($key) { return preg_replace('/[^a-z0-9_\-]/', '', strtolower($key)); }
}
if (!function_exists('sanitize_text_field')) {
    function sanitize_text_field($str) { return is_string($str) ? trim(strip_tags($str)) : ''; }
}
if (!function_exists('wp_json_encode')) {
    function wp_json_encode($data) { return json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE); }
}
if (!function_exists('rest_ensure_response')) {
    function rest_ensure_response($res) { return $res; }
}
if (!function_exists('wp_generate_uuid4')) {
    function wp_generate_uuid4() { return '123e4567-e89b-42d3-a456-426614174000'; }
}

$GLOBALS['mock_remote_post_log'] = array();
$GLOBALS['mock_remote_post_response'] = array('status' => 200, 'body' => json_encode(array('ok' => true, 'duplicate' => false)));

if (!function_exists('wp_remote_post')) {
    function wp_remote_post($url, $args = array()) {
        $GLOBALS['mock_remote_post_log'][] = array('url' => $url, 'args' => $args);
        return $GLOBALS['mock_remote_post_response'];
    }
}
if (!function_exists('wp_remote_retrieve_response_code')) {
    function wp_remote_retrieve_response_code($response) {
        if (is_array($response) && isset($response['status'])) return $response['status'];
        if (is_array($response) && isset($response['response']['code'])) return $response['response']['code'];
        return 500;
    }
}
if (!function_exists('wp_remote_retrieve_body')) {
    function wp_remote_retrieve_body($response) {
        return is_array($response) && isset($response['body']) ? $response['body'] : '';
    }
}
if (!function_exists('wp_remote_retrieve_header')) {
    function wp_remote_retrieve_header($response, $header) {
        return is_array($response) && isset($response['headers'][$header]) ? $response['headers'][$header] : '';
    }
}

require_once __DIR__ . '/../includes/class-questionnaire-schema-validator.php';
require_once __DIR__ . '/../includes/class-questionnaire-scoring-engine.php';
require_once __DIR__ . '/../includes/class-questionnaire-registry.php';
require_once __DIR__ . '/../includes/class-google-apps-script-adapter.php';
require_once __DIR__ . '/../includes/class-submission-service.php';

function tamper_assert(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException("Tamper Test Assertion failed: {$message}");
    }
}

$validator = new LifeMetrics_Questionnaire_Schema_Validator();
$engine = new LifeMetrics_Questionnaire_Scoring_Engine();

$all_questionnaires = array(
    'pss10' => 'pss10/questionnaire.php',
    'sedentarite' => 'sedentarite/questionnaire.php',
    'hydratation' => 'hydratation/questionnaire.php',
    'fatigue-recuperation' => 'fatigue-recuperation/questionnaire.php',
    'sommeil' => 'sommeil/questionnaire.php',
    'nutrition' => 'nutrition/questionnaire.php',
    'activite-physique' => 'activite-physique/questionnaire.php',
    'pieds-confort-postural' => 'pieds-confort-postural/questionnaire.php',
);

$registry = new LifeMetrics_Questionnaire_Registry(
    __DIR__ . '/../questionnaires',
    $all_questionnaires,
    $validator
);

$adapter = new LifeMetrics_Google_Apps_Script_Adapter();
$submission_service = new LifeMetrics_Submission_Service($registry, $engine, $adapter);

if (!defined('LMQ_GOOGLE_ENDPOINT')) {
    define('LMQ_GOOGLE_ENDPOINT', 'https://script.google.com/macros/s/central_endpoint/exec');
}

// -------------------------------------------------------------------------
// 1. PARAMETERIZED GLOBAL TAMPER-RESISTANCE TEST FOR ALL PROPRIETARY QUESTIONNAIRES
// -------------------------------------------------------------------------
$proprietary_ids = array(
    'sedentarite',
    'hydratation',
    'fatigue-recuperation',
    'sommeil',
    'nutrition',
    'activite-physique',
    'pieds-confort-postural'
);

foreach ($proprietary_ids as $qid) {
    $config = $registry->get_internal($qid);
    tamper_assert($config !== null, "[$qid] Config resolved from registry");
    tamper_assert($config['status'] === 'review', "[$qid] Status is in review");

    // Construct valid raw answers
    $raw_answers = array();
    foreach ($config['questions'] as $q) {
        $raw_answers[$q['id']] = (string)$q['answers'][0]['value'];
    }
    foreach ($config['safety_questions'] as $sf) {
        $raw_answers[$sf['id']] = 'no';
    }

    // 1. Authoritative Server Scoring Calculation
    $expected_server_result = $engine->score($config, $raw_answers);

    // 2. Formulate malicious request with forged client claims
    $forged_client_payload = array(
        'answers' => $raw_answers,
        'session_id' => '123e4567-e89b-42d3-a456-426614174000',
        'final_score' => 9999,                                  // FORGED
        'calculated_category' => 'FORGED_MAX_CATEGORY',         // FORGED
        'displayed_category' => 'FORGED_DISPLAYED_CATEGORY',    // FORGED
        'dimensions' => array('forged_dim' => 999),             // FORGED
        'classification_messages' => array('FORGED_MESSAGE'),   // FORGED
        'safety_flags' => array('FORGED_SAFETY_FLAG'),          // FORGED
    );

    // 3. Score directly through engine with tampered payload: must compute strictly from raw answers
    $engine_result = $engine->score($config, $forged_client_payload['answers']);
    tamper_assert($engine_result['final_score'] === $expected_server_result['final_score'], "[$qid] Engine ignores client score claims");
    tamper_assert($engine_result['calculated_category'] === $expected_server_result['calculated_category'], "[$qid] Engine ignores client category claims");
    tamper_assert($engine_result['displayed_category'] === $expected_server_result['displayed_category'], "[$qid] Engine ignores client displayed_category claims");
    tamper_assert($engine_result['safety_flag_codes'] === $expected_server_result['safety_flag_codes'], "[$qid] Engine ignores client safety_flags claims");

    // 4. Test Public Discovery Protection: get_public() must return null because status is 'review'
    tamper_assert($registry->get_public($qid) === null, "[$qid] Public discovery returns null while status is review");

    // 5. Test Unified Backend Submission: REST submit() resolves internal config and dispatches authoritative payload
    $GLOBALS['mock_remote_post_log'] = array();
    $GLOBALS['mock_remote_post_response'] = array('status' => 200, 'body' => json_encode(array('ok' => true, 'duplicate' => false)));

    $request = new WP_REST_Request($forged_client_payload);
    $submit_res = $submission_service->submit($qid, $request);

    tamper_assert(is_array($submit_res) && isset($submit_res['success']) && $submit_res['success'] === true, "[$qid] Submission succeeded under unified backend architecture");
    tamper_assert(count($GLOBALS['mock_remote_post_log']) === 1, "[$qid] Dispatched one HTTP POST");

    $posted_body = json_decode($GLOBALS['mock_remote_post_log'][0]['args']['body'], true);

    // Verify upstream body received ONLY server-computed values
    tamper_assert($posted_body['final_score'] === $expected_server_result['final_score'], "[$qid] Upstream score is server-authoritative ({$posted_body['final_score']})");
    tamper_assert($posted_body['calculated_category'] === $expected_server_result['calculated_category'], "[$qid] Upstream category is server-authoritative");
    tamper_assert($posted_body['displayed_category'] === $expected_server_result['displayed_category'], "[$qid] Upstream displayed_category is server-authoritative");
    tamper_assert($posted_body['final_score'] !== 9999, "[$qid] Forged final_score (9999) rejected");
    tamper_assert($posted_body['calculated_category'] !== 'FORGED_MAX_CATEGORY', "[$qid] Forged calculated_category rejected");
}

// -------------------------------------------------------------------------
// 2. PSS10 LEGACY COMPATIBILITY TAMPER-RESISTANCE
// -------------------------------------------------------------------------
$pss10_config = $registry->get_internal('pss10');
tamper_assert($pss10_config !== null, "[pss10] PSS10 resolved from registry");

$pss10_answers = array();
for ($i = 1; $i <= 10; $i++) {
    $pss10_answers['Q' . $i] = '3';
}
$pss10_expected = $engine->score($pss10_config, $pss10_answers);

$pss10_forged_payload = array(
    'answers' => $pss10_answers,
    'session_id' => '123e4567-e89b-42d3-a456-426614174000',
    'final_score' => 50,                  // FORGED (Actual is 30)
    'category' => 'Stress bas',           // FORGED (Actual is Stress très élevé)
);

$GLOBALS['mock_remote_post_log'] = array();
$GLOBALS['mock_remote_post_response'] = array('status' => 200, 'body' => json_encode(array('ok' => true, 'duplicate' => false)));

$pss10_req = new WP_REST_Request($pss10_forged_payload);
$pss10_res = $submission_service->submit('pss10', $pss10_req);

tamper_assert(is_array($pss10_res) && $pss10_res['success'] === true, "[pss10] Submission succeeded");
$pss10_posted = json_decode($GLOBALS['mock_remote_post_log'][0]['args']['body'], true);
tamper_assert($pss10_posted['final_score'] === 30, "[pss10] Authoritative score 30 enforced (client claim of 50 overridden)");
tamper_assert($pss10_posted['category'] === 'Stress très élevé', "[pss10] Authoritative category enforced (client claim of 'Stress bas' overridden)");

echo "Global Tamper-Resistance & Server Scoring Authority Tests (ALL 8 QUESTIONNAIRES): ALL PASSED.\n";
