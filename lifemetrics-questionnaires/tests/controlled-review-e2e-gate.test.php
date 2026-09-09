<?php

declare(strict_types=1);

error_reporting(E_ALL);
defined('ABSPATH') || define('ABSPATH', true);

// Mock WordPress classes and functions if not present
if (!class_exists('WP_Error')) {
    class WP_Error {
        public function __construct(public string $code, public string $message = '', public array $data = array()) {}
        public function get_error_code(): string { return $this->code; }
        public function get_error_message(): string { return $this->message; }
        public function get_error_data(): array { return $this->data; }
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

global $last_http_post;
$last_http_post = null;

if (!function_exists('wp_remote_post')) {
    function wp_remote_post($url, $args) {
        global $last_http_post;
        $last_http_post = array('url' => $url, 'args' => $args);
        return array(
            'response' => array('code' => 200),
            'body' => json_encode(array('ok' => true, 'duplicate' => false)),
            'headers' => array('content-type' => 'application/json')
        );
    }
}
if (!function_exists('wp_remote_retrieve_response_code')) {
    function wp_remote_retrieve_response_code($res) {
        return $res['response']['code'] ?? 200;
    }
}
if (!function_exists('wp_remote_retrieve_body')) {
    function wp_remote_retrieve_body($res) {
        return $res['body'] ?? '';
    }
}
if (!function_exists('wp_remote_retrieve_header')) {
    function wp_remote_retrieve_header($res, $h) {
        return $res['headers'][$h] ?? null;
    }
}

if (!class_exists('WP_REST_Request')) {
    class WP_REST_Request {
        public function __construct(
            private string $body = '',
            private array $json_params = array(),
            private array $headers = array()
        ) {}
        public function get_body(): string { return $this->body; }
        public function is_json_content_type(): bool { return true; }
        public function get_json_params(): array { return $this->json_params; }
        public function get_header(string $name): ?string {
            $lower = strtolower($name);
            foreach ($this->headers as $k => $v) {
                if (strtolower($k) === $lower) return (string)$v;
            }
            return null;
        }
    }
}

require_once __DIR__ . '/../includes/class-questionnaire-schema-validator.php';
require_once __DIR__ . '/../includes/class-questionnaire-scoring-engine.php';
require_once __DIR__ . '/../includes/class-questionnaire-registry.php';
require_once __DIR__ . '/../includes/class-google-apps-script-adapter.php';
require_once __DIR__ . '/../includes/class-submission-service.php';

function gate_assert(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException('Gate assertion failed: ' . $message);
    }
}

echo "=== Controlled Review E2E Gate Unit Tests ===" . PHP_EOL;

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
$service = new LifeMetrics_Submission_Service($registry, $engine, $adapter);

// Define standard endpoint constant for testing
define('LMQ_GOOGLE_ENDPOINT', 'https://script.google.com/macros/s/TEST_ENDPOINT/exec');

$valid_answers_hydratation = array(
    'HY01' => '3', 'HY02' => '3', 'HY03' => '3', 'HY04' => '3',
    'HY05' => 'na', 'HY06' => '3', 'HY07' => '3', 'HY08' => '3',
    'HY09' => '3', 'HY10' => '3', 'HY11' => '3', 'HY12' => '3',
    'HYSF01' => 'no', 'HYSF02' => 'no', 'HYSF03' => 'yes'
);

$json_payload = array(
    'session_id' => 'e4a82c61-71bf-4d39-93e1-fa609e742b01',
    'completed_at' => '2026-09-09T15:30:00Z',
    'answers' => $valid_answers_hydratation,
    'raw_score' => 999, // deliberate forged score
    'final_score' => 999, // deliberate forged score
    'displayed_category' => 'FORGED_CATEGORY'
);

$body = json_encode($json_payload);

// TEST 1: Hydratation review + NO test mode flags set -> 404 lmq_not_found
$req1 = new WP_REST_Request($body, $json_payload, array());
$res1 = $service->submit('hydratation', $req1);
gate_assert(is_wp_error($res1), 'Test 1: Returns WP_Error');
gate_assert($res1->get_error_code() === 'lmq_not_found', 'Test 1: Code is lmq_not_found');
gate_assert($res1->get_error_data()['status'] === 404, 'Test 1: HTTP 404');

// Enable test mode flag and set strong secret token for subsequent tests
define('LMQ_ALLOW_TEST_SUBMISSIONS', true);
define('LMQ_TEST_TOKEN', 'SecretTestToken_xyz123!@#');

// TEST 2: Hydratation review + test mode enabled + NO token header -> 404 lmq_not_found
$req2 = new WP_REST_Request($body, $json_payload, array());
$res2 = $service->submit('hydratation', $req2);
gate_assert(is_wp_error($res2), 'Test 2: Returns WP_Error');
gate_assert($res2->get_error_code() === 'lmq_not_found', 'Test 2: Code is lmq_not_found');
gate_assert($res2->get_error_data()['status'] === 404, 'Test 2: HTTP 404');

// TEST 3: Hydratation review + test mode enabled + WRONG token header -> 404 lmq_not_found
$req3 = new WP_REST_Request($body, $json_payload, array('X-LMQ-Test-Token' => 'WrongToken_abc999'));
$res3 = $service->submit('hydratation', $req3);
gate_assert(is_wp_error($res3), 'Test 3: Returns WP_Error');
gate_assert($res3->get_error_code() === 'lmq_not_found', 'Test 3: Code is lmq_not_found');
gate_assert($res3->get_error_data()['status'] === 404, 'Test 3: HTTP 404');

// TEST 4: Hydratation review + test mode enabled + CORRECT token header -> ACCEPTED!
$req4 = new WP_REST_Request($body, $json_payload, array('X-LMQ-Test-Token' => 'SecretTestToken_xyz123!@#'));
$res4 = $service->submit('hydratation', $req4);
gate_assert(!is_wp_error($res4), 'Test 4: Submission succeeds');
$res4_data = is_array($res4) ? $res4 : (method_exists($res4, 'get_data') ? $res4->get_data() : (array)$res4);
gate_assert($res4_data['success'] === true, 'Test 4: Response success is true');
gate_assert($last_http_post !== null, 'Test 4: Payload sent to upstream');
$upstream_payload = json_decode($last_http_post['args']['body'], true);
gate_assert($upstream_payload['raw_score'] === 33, 'Test 4: Server recomputed raw_score=33 (ignored forged 999)');
gate_assert($upstream_payload['available_max'] === 44, 'Test 4: Server recomputed available_max=44');
gate_assert($upstream_payload['final_score'] === 36, 'Test 4: Server recomputed final_score=36');
gate_assert($upstream_payload['displayed_category'] === 'HABITUDES_HYDRATATION_FAVORABLES', 'Test 4: Category is HABITUDES_HYDRATATION_FAVORABLES');

// TEST 5: Another review questionnaire (e.g. sommeil) + CORRECT token header -> STILL 404!
$valid_answers_sommeil = array(
    'SL01' => '3', 'SL02' => '3', 'SL03' => '3', 'SL04' => '3',
    'SL05' => '3', 'SL06' => '3', 'SL07' => '3', 'SL08' => '3',
    'SL09' => '3', 'SL10' => '3', 'SL11' => '3', 'SL12' => '3',
    'SLSF01' => 'no', 'SLSF02' => 'no', 'SLSF03' => 'no'
);
$json_sommeil = array('session_id' => '12345678-1234-4234-8234-123456789abc', 'completed_at' => '2026-09-09T15:30:00Z', 'answers' => $valid_answers_sommeil);
$req5 = new WP_REST_Request(json_encode($json_sommeil), $json_sommeil, array('X-LMQ-Test-Token' => 'SecretTestToken_xyz123!@#'));
$res5 = $service->submit('sommeil', $req5);
gate_assert(is_wp_error($res5), 'Test 5: Sommeil returns WP_Error even with valid token');
gate_assert($res5->get_error_code() === 'lmq_not_found', 'Test 5: Code is lmq_not_found');
gate_assert($res5->get_error_data()['status'] === 404, 'Test 5: HTTP 404');

// TEST 6: PSS10 behavior remains completely unaffected (frozen legacy exception)
$valid_pss10 = array(
    'session_id' => 'a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6',
    'created_at' => '2026-09-09T15:30:00Z',
    'q1' => 3, 'q2' => 3, 'q3' => 3, 'q4' => 3, 'q5' => 3,
    'q6' => 3, 'q7' => 3, 'q8' => 3, 'q9' => 3, 'q10' => 3,
    'final_score' => 30,
    'category' => 'Stress assez élevé'
);
$req6 = new WP_REST_Request(json_encode($valid_pss10), $valid_pss10, array());
$res6 = $service->submit('pss10', $req6);
gate_assert(!is_wp_error($res6), 'Test 6: PSS10 legacy submission succeeds without any token');

echo "ALL 6 CONTROLLED REVIEW E2E GATE TESTS PASSED." . PHP_EOL;
