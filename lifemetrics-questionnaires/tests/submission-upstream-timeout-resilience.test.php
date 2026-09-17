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
    function wp_generate_uuid4() {
        return sprintf(
            '%04x%04x-%04x-4%03x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff), mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
        );
    }
}

$GLOBALS['mock_remote_post_log'] = array();
$GLOBALS['mock_remote_post_response'] = null;
$GLOBALS['mock_remote_get_response'] = null;

if (!function_exists('wp_remote_post')) {
    function wp_remote_post($url, $args = array()) {
        $GLOBALS['mock_remote_post_log'][] = array('url' => $url, 'args' => $args);
        return $GLOBALS['mock_remote_post_response'];
    }
}
if (!function_exists('wp_remote_get')) {
    function wp_remote_get($url, $args = array()) {
        return $GLOBALS['mock_remote_get_response'];
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

$test_filters = array();
if (!function_exists('apply_filters')) {
    function apply_filters($tag, $value, ...$args) {
        global $test_filters;
        if (isset($test_filters[$tag]) && is_callable($test_filters[$tag])) {
            return call_user_func_array($test_filters[$tag], array_merge(array($value), $args));
        }
        return $value;
    }
}

function expect_true(bool $condition, string $label): void {
    if (!$condition) {
        throw new RuntimeException("Assertion failed: $label");
    }
}

function expect_error_code(string $expected, mixed $actual, string $label): void {
    if (!($actual instanceof WP_Error) || $actual->get_error_code() !== $expected) {
        $found = ($actual instanceof WP_Error) ? $actual->get_error_code() : gettype($actual);
        throw new RuntimeException("Assertion failed [$label]: expected error code '$expected', got '$found'");
    }
}

require_once dirname(__DIR__) . '/includes/class-questionnaire-schema-validator.php';
require_once dirname(__DIR__) . '/includes/class-questionnaire-registry.php';
require_once dirname(__DIR__) . '/includes/class-questionnaire-scoring-engine.php';
require_once dirname(__DIR__) . '/includes/class-google-apps-script-adapter.php';
require_once dirname(__DIR__) . '/includes/class-submission-service.php';

$registry = new LifeMetrics_Questionnaire_Registry(
    dirname(__DIR__) . '/questionnaires',
    array(
        'fatigue-recuperation' => 'fatigue-recuperation/questionnaire.php',
        'pss10' => 'pss10/questionnaire.php',
    ),
    new LifeMetrics_Questionnaire_Schema_Validator()
);
$engine = new LifeMetrics_Questionnaire_Scoring_Engine();
$adapter = new LifeMetrics_Google_Apps_Script_Adapter();
$service = new LifeMetrics_Submission_Service($registry, $engine, $adapter);

define('LMQ_GOOGLE_ENDPOINT', 'https://script.google.com/macros/s/lifemetrics_central_endpoint/exec');
define('LMQ_PSS10_GOOGLE_ENDPOINT', 'https://script.google.com/macros/s/lifemetrics_pss10_endpoint/exec');

// =========================================================================
// TEST 1: Configured Timeout Verification
// =========================================================================
expect_true($adapter->get_timeout() === 25, 'TEST 1A: Default adapter timeout is 25 seconds');

// Test filter override
$test_filters['lifemetrics_gas_timeout'] = static function ($timeout) {
    return 30;
};
expect_true($adapter->get_timeout() === 30, 'TEST 1B: Filter lifemetrics_gas_timeout overrides timeout to 30');
unset($test_filters['lifemetrics_gas_timeout']);
expect_true($adapter->get_timeout() === 25, 'TEST 1C: Timeout reverts to default 25 after filter removed');

// =========================================================================
// TEST 2: Cold Start Upstream Timeout Simulation (Scenario A)
// =========================================================================
// Fatigue-recuperation payload
$session_id = '123e4567-e89b-42d3-a456-426614174099';
$answers = array();
for ($i = 1; $i <= 12; $i++) {
    $answers['FR' . sprintf('%02d', $i)] = '1';
}
$answers['FRSF01'] = 'no';
$answers['FRSF02'] = 'no';
$answers['FRSF03'] = 'no';

$req1 = new WP_REST_Request(array('answers' => $answers, 'session_id' => $session_id));

// Simulate cURL timeout (e.g. cold start takes longer than timeout)
$GLOBALS['mock_remote_post_log'] = array();
$GLOBALS['mock_remote_post_response'] = new WP_Error(
    'http_request_failed',
    'cURL error 28: Operation timed out after 25000 milliseconds with 0 bytes received'
);

$res1 = $service->submit('fatigue-recuperation', $req1);

expect_error_code('lmq_upstream_network_error', $res1, 'TEST 2A: Upstream timeout returns lmq_upstream_network_error');
expect_true($res1->get_error_data()['status'] === 502, 'TEST 2B: HTTP response status is 502');
expect_true(count($GLOBALS['mock_remote_post_log']) === 1, 'TEST 2C: Exactly one POST attempted');
expect_true($GLOBALS['mock_remote_post_log'][0]['args']['timeout'] === 25, 'TEST 2D: POST timeout was 25 seconds');

// =========================================================================
// TEST 3: Upstream Row Written + Idempotent Retry Simulation (Scenario B)
// =========================================================================
// In Google Apps Script, the script finished running in the background and wrote the row.
// The user/client now clicks "Réessayer" with the EXACT SAME session_id.
// Google Apps Script checks column 2, finds the session_id, and returns { ok: true, duplicate: true }.
$GLOBALS['mock_remote_post_log'] = array();
$GLOBALS['mock_remote_post_response'] = array(
    'status' => 200,
    'body' => json_encode(array('ok' => true, 'duplicate' => true))
);

$req_retry = new WP_REST_Request(array('answers' => $answers, 'session_id' => $session_id));
$res_retry = $service->submit('fatigue-recuperation', $req_retry);

expect_true(is_array($res_retry), 'TEST 3A: Retry returns array response, not WP_Error');
expect_true(isset($res_retry['success']) && $res_retry['success'] === true, 'TEST 3B: Retry result has success: true');
expect_true(isset($res_retry['duplicate']) && $res_retry['duplicate'] === true, 'TEST 3C: Retry result confirms duplicate: true');
expect_true(count($GLOBALS['mock_remote_post_log']) === 1, 'TEST 3D: Exactly one POST dispatched on retry');

$posted_body = json_decode($GLOBALS['mock_remote_post_log'][0]['args']['body'], true);
expect_true($posted_body['session_id'] === $session_id, 'TEST 3E: Retry preserves exact original session_id for deduplication');
expect_true($posted_body['questionnaire_id'] === 'fatigue-recuperation', 'TEST 3F: Questionnaire ID matches');

// =========================================================================
// TEST 4: PSS-10 Upstream Timeout & Retry Parity
// =========================================================================
$pss_session_id = '223e4567-e89b-42d3-a456-426614174099';
$pss_req = new WP_REST_Request(array(
    'session_id' => $pss_session_id,
    'created_at' => '2026-09-17T12:00:00.000Z',
    'q1' => 3, 'q2' => 3, 'q3' => 3, 'q4' => 3, 'q5' => 3,
    'q6' => 3, 'q7' => 3, 'q8' => 3, 'q9' => 3, 'q10' => 3,
    'final_score' => 30,
    'category' => 'Stress très élevé'
));

// First PSS-10 call times out
$GLOBALS['mock_remote_post_log'] = array();
$GLOBALS['mock_remote_post_response'] = new WP_Error('http_request_failed', 'cURL error 28: Operation timed out');
$pss_res1 = $service->submit('pss10', $pss_req);
expect_error_code('lmq_upstream_network_error', $pss_res1, 'TEST 4A: PSS-10 timeout returns lmq_upstream_network_error');
expect_true($pss_res1->get_error_data()['status'] === 502, 'TEST 4B: PSS-10 timeout status is 502');

// Second PSS-10 call (retry with same session_id) receives duplicate acknowledgment
$GLOBALS['mock_remote_post_log'] = array();
$GLOBALS['mock_remote_post_response'] = array(
    'status' => 200,
    'body' => json_encode(array('ok' => true, 'duplicate' => true))
);
$pss_res2 = $service->submit('pss10', $pss_req);
expect_true(is_array($pss_res2) && $pss_res2['success'] === true && $pss_res2['duplicate'] === true, 'TEST 4C: PSS-10 retry returns success: true, duplicate: true');

echo "Submission Upstream Timeout Resilience & Idempotent Retry Tests: ALL PASSED.\n";
