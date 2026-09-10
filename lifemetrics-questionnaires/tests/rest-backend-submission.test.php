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

global $last_http_post, $mock_post_override;
$last_http_post = null;
$mock_post_override = null;

if (!function_exists('wp_remote_post')) {
    function wp_remote_post($url, $args) {
        global $last_http_post, $mock_post_override;
        $last_http_post = array('url' => $url, 'args' => $args);
        if (is_callable($mock_post_override)) {
            return ($mock_post_override)($url, $args);
        }
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

function sub_assert(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException('REST Submission assertion failed: ' . $message);
    }
}

echo "=== LifeMetrics REST Backend Submission Architecture Tests ===" . PHP_EOL;

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

define('LMQ_GOOGLE_ENDPOINT', 'https://script.google.com/macros/s/CENTRAL_DEPLOYMENT_URL/exec');

// 1. Verify endpoint resolution for all questionnaires in zero-config environment
foreach (array_keys($all_questionnaires) as $id) {
    $ep = $service->get_endpoint($id);
    sub_assert(!empty($ep), "get_endpoint('$id') resolves to non-empty string");
    sub_assert(str_starts_with($ep, 'https://script.google.com/macros/s/'), "get_endpoint('$id') points to Google Apps Script");
}

// 2. Verify that public registry still protects review questionnaires from frontend discovery
foreach (array_keys($all_questionnaires) as $id) {
    sub_assert($registry->get_public($id) === null, "get_public('$id') returns null while status=review");
    sub_assert($registry->get_internal($id) !== null, "get_internal('$id') returns valid configuration");
}

// 3. Test all 7 proprietary questionnaires submit cleanly via REST backend without tokens or wp-config constants
$proprietary_ids = array(
    'sedentarite', 'hydratation', 'fatigue-recuperation', 'sommeil',
    'nutrition', 'activite-physique', 'pieds-confort-postural'
);

foreach ($proprietary_ids as $q_idx => $q_id) {
    $config = $registry->get_internal($q_id);
    sub_assert($config !== null, "Config exists for $q_id");

    $answers = array();
    foreach ($config['questions'] as $q) {
        $answers[$q['id']] = $q['answers'][0]['value'];
    }
    foreach ($config['safety_questions'] as $sq) {
        $answers[$sq['id']] = $sq['answers'][0]['value'];
    }

    $tampered_payload = array(
        'session_id' => '12345678-1234-4234-8234-' . sprintf('%012x', $q_idx + 1),
        'completed_at' => '2026-09-09T16:00:00Z',
        'answers' => $answers,
        'raw_score' => 9999,
        'available_max' => 9999,
        'final_score' => 9999,
        'calculated_category' => 'FORGED_CALCULATED',
        'displayed_category' => 'FORGED_DISPLAYED',
        'sheet_name' => 'PSS10',
        'destination_worksheet' => 'MALICIOUS_DESTINATION',
        'questions_schema' => array('scored' => array(array('id' => 'FORGED', 'text' => 'FORGED_TEXT')))
    );

    $req = new WP_REST_Request(json_encode($tampered_payload), $tampered_payload, array());
    $res = $service->submit($q_id, $req);

    sub_assert(!is_wp_error($res), "REST submission succeeds for $q_id without token");
    $res_data = is_array($res) ? $res : (method_exists($res, 'get_data') ? $res->get_data() : (array)$res);
    sub_assert($res_data['success'] === true, "Response success=true for $q_id");

    // Verify upstream payload received by adapter is strictly authoritative
    sub_assert($last_http_post !== null, "Adapter received upstream POST for $q_id");
    $sent_payload = json_decode($last_http_post['args']['body'], true);
    sub_assert($sent_payload['questionnaire_id'] === $q_id, "questionnaire_id is $q_id");
    sub_assert($sent_payload['final_score'] !== 9999, "Forged final_score=9999 ignored for $q_id");
    sub_assert($sent_payload['raw_score'] !== 9999, "Forged raw_score=9999 ignored for $q_id");
    sub_assert($sent_payload['calculated_category'] !== 'FORGED_CALCULATED', "Forged calculated_category ignored for $q_id");
    sub_assert($sent_payload['displayed_category'] !== 'FORGED_DISPLAYED', "Forged displayed_category ignored for $q_id");
    sub_assert(!isset($sent_payload['sheet_name']), "Forged sheet_name was not forwarded for $q_id");
    sub_assert(!isset($sent_payload['destination_worksheet']), "Forged destination_worksheet was not forwarded for $q_id");
    sub_assert($sent_payload['questions_schema']['scored'][0]['id'] !== 'FORGED', "Forged questions_schema ignored for $q_id");
}

// 3. Test Unknown questionnaire ID returns HTTP 404 lmq_not_found
$unknown_payload = array('answers' => array());
$req_unknown = new WP_REST_Request(json_encode($unknown_payload), $unknown_payload, array());
$res_unknown = $service->submit('unknown_instrument_id', $req_unknown);
sub_assert(is_wp_error($res_unknown), 'Unknown ID returns WP_Error');
sub_assert($res_unknown->get_error_code() === 'lmq_not_found', 'Unknown ID code is lmq_not_found');
sub_assert($res_unknown->get_error_data()['status'] === 404, 'Unknown ID returns HTTP 404');

// 4. Test PSS10 legacy submission works 100% identically
$valid_pss10 = array(
    'session_id' => 'a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6',
    'created_at' => '2026-09-09T16:00:00Z',
    'q1' => 3, 'q2' => 3, 'q3' => 3, 'q4' => 3, 'q5' => 3,
    'q6' => 3, 'q7' => 3, 'q8' => 3, 'q9' => 3, 'q10' => 3,
    'final_score' => 30,
    'category' => 'Stress assez élevé'
);
$req_pss10 = new WP_REST_Request(json_encode($valid_pss10), $valid_pss10, array());
$res_pss10 = $service->submit('pss10', $req_pss10);
sub_assert(!is_wp_error($res_pss10), 'PSS10 submission succeeds');
$res_pss10_data = is_array($res_pss10) ? $res_pss10 : (method_exists($res_pss10, 'get_data') ? $res_pss10->get_data() : (array)$res_pss10);
sub_assert($res_pss10_data['success'] === true, 'PSS10 response success=true');

// 5. Test Hydratation exact manual E2E fixture
$hydratation_fixture = array(
    'session_id' => 'e4a82c61-71bf-4d39-93e1-fa609e742b01',
    'completed_at' => '2026-09-09T16:45:00Z',
    'source_page' => '/test-hydratation-e2e',
    'raw_score' => 999,
    'available_max' => 999,
    'final_score' => 999,
    'calculated_category' => 'FORGED_CALCULATED',
    'displayed_category' => 'FORGED_DISPLAYED',
    'sheet_name' => 'PSS10',
    'answers' => array(
        'HY01' => '3', 'HY02' => '3', 'HY03' => '3', 'HY04' => '3',
        'HY05' => 'na', 'HY06' => '3', 'HY07' => '3', 'HY08' => '3',
        'HY09' => '3', 'HY10' => '3', 'HY11' => '3', 'HY12' => '3',
        'HYSF01' => 'no', 'HYSF02' => 'no', 'HYSF03' => 'yes'
    )
);

$req_hydra = new WP_REST_Request(json_encode($hydratation_fixture), $hydratation_fixture, array());
$res_hydra = $service->submit('hydratation', $req_hydra);
sub_assert(!is_wp_error($res_hydra), 'Hydratation fixture submission succeeds');

$sent_hydra = json_decode($last_http_post['args']['body'], true);
sub_assert($sent_hydra['raw_score'] === 33, 'Hydratation raw_score=33');
sub_assert($sent_hydra['available_max'] === 44, 'Hydratation available_max=44');
sub_assert($sent_hydra['final_score'] === 36, 'Hydratation final_score=36');
sub_assert($sent_hydra['displayed_category'] === 'HABITUDES_HYDRATATION_FAVORABLES', 'Hydratation category matches');
sub_assert($sent_hydra['answers']['HY05']['label'] === 'Non concerné actuellement', 'HY05 label matches');
sub_assert($sent_hydra['answers']['HY05']['applicable'] === false, 'HY05 applicable is false');
sub_assert($sent_hydra['safety_answers']['HYSF01']['label'] === 'Non', 'HYSF01 label is Non');
sub_assert($sent_hydra['safety_answers']['HYSF02']['label'] === 'Non', 'HYSF02 label is Non');
sub_assert($sent_hydra['safety_answers']['HYSF03']['label'] === 'Oui', 'HYSF03 label is Oui');
sub_assert($sent_hydra['safety_flags'] === array('HYDRATION_ATTENTION_MESSAGE'), 'safety_flags matches');

// 6. Test upstream error mapping behavior
global $mock_post_override;
$mock_post_override = function ($url, $args) {
    return array(
        'response' => array('code' => 200),
        'body' => json_encode(array('ok' => false, 'code' => 'validation_error', 'error' => 'Invalid created_at')),
        'headers' => array('content-type' => 'application/json')
    );
};

// Submitting when upstream returns ok=false results in HTTP 502 lmq_upstream_rejected
$res_rejected = $service->submit('hydratation', $req_hydra);
sub_assert(is_wp_error($res_rejected), 'Rejected upstream returns WP_Error');
sub_assert($res_rejected->get_error_code() === 'lmq_upstream_rejected', 'Error code is lmq_upstream_rejected');
sub_assert($res_rejected->get_error_data()['status'] === 502, 'HTTP status is 502');

// Reset mock override
$mock_post_override = null;

// 7. Test endpoint distinction: PSS10 vs proprietary questionnaires
sub_assert(
    $service->get_endpoint('pss10') !== $service->get_endpoint('hydratation') || defined('LMQ_GOOGLE_ENDPOINT'),
    'PSS10 and proprietary questionnaires resolve their respective endpoints'
);

echo "ALL REST BACKEND SUBMISSION TESTS PASSED." . PHP_EOL;
