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
$GLOBALS['mock_remote_post_response'] = array('response' => array('code' => 200), 'body' => json_encode(array('ok' => true, 'duplicate' => false)));
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

$filters = array();
if (!function_exists('apply_filters')) {
    function apply_filters($tag, $value, ...$args) {
        global $filters;
        if (isset($filters[$tag])) {
            foreach ($filters[$tag] as $cb) {
                $value = call_user_func($cb, $value, ...$args);
            }
        }
        return $value;
    }
}
function add_filter_mock($tag, $callback) {
    global $filters;
    $filters[$tag][] = $callback;
}

function expect_true($condition, string $msg): void {
    if (!$condition) {
        fwrite(STDERR, "TEST FAILED: $msg\n");
        exit(1);
    }
}

function expect_error_code(string $code, mixed $result, string $msg): void {
    expect_true($result instanceof WP_Error, "$msg (expected WP_Error, got " . gettype($result) . ")");
    expect_true($result->code === $code, "$msg (expected code '$code', got '{$result->code}')");
}

// Load classes
require_once dirname(__DIR__) . '/includes/class-questionnaire-schema-validator.php';
require_once dirname(__DIR__) . '/includes/class-questionnaire-scoring-engine.php';
require_once dirname(__DIR__) . '/includes/class-questionnaire-registry.php';
require_once dirname(__DIR__) . '/includes/class-google-apps-script-adapter.php';
require_once dirname(__DIR__) . '/includes/class-submission-service.php';

// Define mock test constants
define('LMQ_PSS10_GOOGLE_ENDPOINT', 'https://script.google.com/macros/s/pss10_endpoint/exec');
define('LMQ_HYDRATATION_GOOGLE_ENDPOINT', 'https://script.google.com/macros/s/hydratation_endpoint/exec');

$validator = new LifeMetrics_Questionnaire_Schema_Validator();
$engine = new LifeMetrics_Questionnaire_Scoring_Engine();
$adapter = new LifeMetrics_Google_Apps_Script_Adapter();
$registry = new LifeMetrics_Questionnaire_Registry(
    dirname(__DIR__) . '/questionnaires',
    array('pss10' => 'pss10/questionnaire.php'),
    $validator
);
$service = new LifeMetrics_Submission_Service($registry, $engine, $adapter);

// ----------------------------------------------------
// BACK-001 & BACK-002: Endpoint Resolution via Constants
// ----------------------------------------------------
expect_true($service->get_endpoint('pss10') === 'https://script.google.com/macros/s/pss10_endpoint/exec', 'BACK-001/002: PSS10 endpoint resolved from constant');
expect_true($service->get_endpoint('hydratation') === 'https://script.google.com/macros/s/hydratation_endpoint/exec', 'BACK-001/002: Hydratation endpoint resolved from constant');
expect_true($service->get_endpoint('unknown_q') === null, 'BACK-001/002: Unconfigured endpoint returns null');

// ----------------------------------------------------
// BACK-003: Filter Hook Endpoint Override
// ----------------------------------------------------
add_filter_mock('lifemetrics_questionnaire_backend_endpoint', function ($url, $id) {
    if ($id === 'custom_test') {
        return 'https://script.google.com/macros/s/custom_filtered_endpoint/exec';
    }
    return $url;
});
expect_true($service->get_endpoint('custom_test') === 'https://script.google.com/macros/s/custom_filtered_endpoint/exec', 'BACK-003: Endpoint resolved via filter');

// ----------------------------------------------------
// BACK-004: Unconfigured Destination Handling
// ----------------------------------------------------
$req_unconfigured = new WP_REST_Request(array('answers' => array()));
$res_unconfigured = $service->submit('unknown_instrument', $req_unconfigured);
expect_error_code('lmq_not_found', $res_unconfigured, 'BACK-004: Missing questionnaire in registry returns lmq_not_found');

// ----------------------------------------------------
// BACK-005: Safe 302 Redirect Handling
// ----------------------------------------------------
$GLOBALS['mock_remote_post_response'] = array(
    'status' => 302,
    'body' => '',
    'headers' => array('location' => 'https://script.googleusercontent.com/macros/echo?user_content_key=valid_token')
);
$GLOBALS['mock_remote_get_response'] = array(
    'status' => 200,
    'body' => json_encode(array('ok' => true, 'duplicate' => false))
);
$adapter_res = $adapter->send('https://script.google.com/macros/s/test/exec', array('test' => 'data'));
expect_true(is_array($adapter_res) && $adapter_res['ok'] === true && $adapter_res['duplicate'] === false, 'BACK-005: 302 redirect followed safely');

// ----------------------------------------------------
// BACK-006: Malicious / Untrusted Redirect Rejection
// ----------------------------------------------------
$malicious_redirects = array(
    'http_insecure' => 'http://script.googleusercontent.com/macros/echo',
    'attacker_host' => 'https://evil.attacker.com/macros/echo',
    'with_credentials' => 'https://user:pass@script.googleusercontent.com/macros/echo',
    'non_standard_port' => 'https://script.googleusercontent.com:8080/macros/echo',
);
foreach ($malicious_redirects as $label => $untrusted_url) {
    $GLOBALS['mock_remote_post_response'] = array(
        'status' => 302,
        'body' => '',
        'headers' => array('location' => $untrusted_url)
    );
    $adapter_res = $adapter->send('https://script.google.com/macros/s/test/exec', array('test' => 'data'));
    expect_error_code('lmq_upstream_http_error', $adapter_res, "BACK-006: Untrusted redirect $label rejected");
}

// ----------------------------------------------------
// BACK-007: Upstream Network Errors
// ----------------------------------------------------
$GLOBALS['mock_remote_post_response'] = new WP_Error('http_request_failed', 'cURL error 28: Operation timed out');
$adapter_res = $adapter->send('https://script.google.com/macros/s/test/exec', array('test' => 'data'));
expect_error_code('lmq_upstream_network_error', $adapter_res, 'BACK-007: Network timeout returns lmq_upstream_network_error');

// ----------------------------------------------------
// BACK-008: Upstream HTTP Errors (500, 404, etc.)
// ----------------------------------------------------
$GLOBALS['mock_remote_post_response'] = array('status' => 500, 'body' => 'Internal Server Error');
$adapter_res = $adapter->send('https://script.google.com/macros/s/test/exec', array('test' => 'data'));
expect_error_code('lmq_upstream_http_error', $adapter_res, 'BACK-008: HTTP 500 returns lmq_upstream_http_error');

// ----------------------------------------------------
// BACK-009: Upstream Rejection ({ok: false})
// ----------------------------------------------------
$GLOBALS['mock_remote_post_response'] = array('status' => 200, 'body' => json_encode(array('ok' => false, 'code' => 'rate_limited')));
$adapter_res = $adapter->send('https://script.google.com/macros/s/test/exec', array('test' => 'data'));
expect_error_code('lmq_upstream_rejected', $adapter_res, 'BACK-009: {ok:false} returns lmq_upstream_rejected');

// ----------------------------------------------------
// BACK-010: Idempotent Duplicate Handling
// ----------------------------------------------------
$GLOBALS['mock_remote_post_response'] = array('status' => 200, 'body' => json_encode(array('ok' => true, 'duplicate' => true)));
$adapter_res = $adapter->send('https://script.google.com/macros/s/test/exec', array('test' => 'data'));
expect_true(is_array($adapter_res) && $adapter_res['ok'] === true && $adapter_res['duplicate'] === true, 'BACK-010: Duplicate returns duplicate:true');

// ----------------------------------------------------
// BACK-011: Unconfigured Endpoint Rejection
// ----------------------------------------------------
$adapter_empty_res = $adapter->send('', array('test' => 'data'));
expect_error_code('lmq_backend_not_configured', $adapter_empty_res, 'BACK-011: Empty endpoint returns lmq_backend_not_configured');

// ----------------------------------------------------
// BACK-012: Full Multi-Destination Submission Service Flow
// ----------------------------------------------------
$GLOBALS['mock_remote_post_log'] = array();
$GLOBALS['mock_remote_post_response'] = array('status' => 200, 'body' => json_encode(array('ok' => true, 'duplicate' => false)));

$pss10_answers = array();
for ($i = 1; $i <= 10; $i++) {
    $pss10_answers['Q' . $i] = '3';
}
$req_pss10 = new WP_REST_Request(array('answers' => $pss10_answers, 'session_id' => '123e4567-e89b-42d3-a456-426614174000'));
$res_pss10 = $service->submit('pss10', $req_pss10);

expect_true(is_array($res_pss10) && isset($res_pss10['success']) && $res_pss10['success'] === true, 'BACK-012: PSS10 submission succeeds');
expect_true(count($GLOBALS['mock_remote_post_log']) === 1, 'BACK-012: Exactly one remote POST dispatched');
expect_true($GLOBALS['mock_remote_post_log'][0]['url'] === 'https://script.google.com/macros/s/pss10_endpoint/exec', 'BACK-012: POST sent to PSS10 endpoint');

$posted_body = json_decode($GLOBALS['mock_remote_post_log'][0]['args']['body'], true);
expect_true($posted_body['session_id'] === '123e4567-e89b-42d3-a456-426614174000', 'BACK-012: Session ID preserved');
expect_true($posted_body['final_score'] === 30, 'BACK-012: Final score computed accurately (30)');
expect_true($posted_body['category'] === 'Stress très élevé', 'BACK-012: Canonical category derived');

echo "All Backend Multi-Destination Routing Tests (BACK-001 to BACK-012): ALL PASSED.\n";
