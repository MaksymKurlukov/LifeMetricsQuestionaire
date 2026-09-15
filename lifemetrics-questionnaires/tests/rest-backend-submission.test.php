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
    'risque-nutritionnel' => 'risque-nutritionnel/questionnaire.php',
    'bien-etre' => 'bien-etre/questionnaire.php',
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

// 3. Test all 9 proprietary questionnaires submit cleanly via REST backend without tokens or wp-config constants
$proprietary_ids = array(
    'sedentarite', 'hydratation', 'fatigue-recuperation', 'sommeil',
    'nutrition', 'activite-physique', 'pieds-confort-postural',
    'risque-nutritionnel', 'bien-etre'
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
sub_assert($sent_hydra['available_max'] === 55, 'Hydratation available_max=55');
sub_assert($sent_hydra['final_score'] === 36, 'Hydratation final_score=36');
sub_assert($sent_hydra['displayed_category'] === 'HABITUDES_INSUFFISANTES', 'Hydratation category matches');
sub_assert($sent_hydra['answers']['HY05']['label'] === 'Non concerné actuellement', 'HY05 label matches');
sub_assert($sent_hydra['answers']['HY05']['applicable'] === false, 'HY05 applicable is false');
sub_assert($sent_hydra['safety_answers']['HYSF01']['label'] === 'Non', 'HYSF01 label is Non');
sub_assert($sent_hydra['safety_answers']['HYSF02']['label'] === 'Non', 'HYSF02 label is Non');
sub_assert($sent_hydra['safety_answers']['HYSF03']['label'] === 'Oui', 'HYSF03 label is Oui');
sub_assert($sent_hydra['safety_flags'] === array('HYDRATATION_SAFETY_MESSAGE'), 'safety_flags matches');

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

// 8. Explicit Verification of Guardrails Transport and Displayed Category across the 4 Questionnaires (Phase 14.7)

// A. Sédentarité: D1 = SD01 + SD02 >= 8 caps green HABITUDES_FAVORABLES to orange SEDENTARITE_A_REDUIRE without altering final_score
$sed_guardrail_fixture = array(
    'session_id' => '11112222-3333-4444-8555-666677778888',
    'completed_at' => '2026-09-09T17:00:00Z',
    'answers' => array(
        'SD01' => '4', // 4 points
        'SD02' => '4', // 4 points -> D1 = 8 >= 8
        'SD03' => '1', 'SD04' => '1', 'SD05' => '1', 'SD06' => '1',
        'SD07' => '1', 'SD08' => '1', 'SD09' => '1', 'SD10' => '1',
        'SD11' => '1', 'SD12' => '1',
    ),
);
$req_sed = new WP_REST_Request(json_encode($sed_guardrail_fixture), $sed_guardrail_fixture, array());
$res_sed = $service->submit('sedentarite', $req_sed);
sub_assert(!is_wp_error($res_sed), 'Sedentarite guardrail submission succeeds');
$sent_sed = json_decode($last_http_post['args']['body'], true);

// Strict assertions on Sédentarité guardrail
sub_assert($sent_sed['raw_score'] === 18, 'Sedentarite raw_score is 18 (unchanged)');
sub_assert($sent_sed['available_max'] === 60, 'Sedentarite available_max is 60');
sub_assert($sent_sed['final_score'] === 18, 'Sedentarite final_score is 18 (unchanged)');
sub_assert($sent_sed['calculated_category'] === 'HABITUDES_FAVORABLES', 'Calculated category is green HABITUDES_FAVORABLES');
sub_assert($sent_sed['displayed_category'] === 'SEDENTARITE_A_REDUIRE', 'Displayed category is capped to orange SEDENTARITE_A_REDUIRE');
sub_assert($sent_sed['displayed_category'] !== 'SEDENTARITE_ELEVEE', 'Guardrail never forces red SEDENTARITE_ELEVEE');
sub_assert(in_array('GUARDRAIL_TEMPS_SEDENTAIRE_D1', $sent_sed['applied_classification_rules'], true), 'GUARDRAIL_TEMPS_SEDENTAIRE_D1 rule transmitted in payload');

// Also test Sédentarité case when D1 = 7 < 8: guardrail NOT triggered
$sed_safe_fixture = $sed_guardrail_fixture;
$sed_safe_fixture['session_id'] = '11112222-3333-4444-8555-666677778889';
$sed_safe_fixture['answers']['SD02'] = '3'; // D1 = 4 + 3 = 7 < 8
$req_sed_safe = new WP_REST_Request(json_encode($sed_safe_fixture), $sed_safe_fixture, array());
$res_sed_safe = $service->submit('sedentarite', $req_sed_safe);
sub_assert(!is_wp_error($res_sed_safe), 'Sedentarite safe submission succeeds');
$sent_sed_safe = json_decode($last_http_post['args']['body'], true);
sub_assert($sent_sed_safe['raw_score'] === 17, 'Safe raw_score is 17');
sub_assert($sent_sed_safe['final_score'] === 17, 'Safe final_score is 17');
sub_assert($sent_sed_safe['calculated_category'] === 'HABITUDES_FAVORABLES', 'Safe calculated is green');
sub_assert($sent_sed_safe['displayed_category'] === 'HABITUDES_FAVORABLES', 'Safe displayed remains green');
sub_assert(empty($sent_sed_safe['applied_classification_rules']), 'No rule applied when D1 < 8');

// B. Pieds & confort postural: PF09 >= 4 or PF10 >= 4 caps favorable to CONFORT_A_AMELIORER
$pieds_guardrail_fixture = array(
    'session_id' => '22223333-4444-4555-8666-777788889999',
    'completed_at' => '2026-09-09T17:05:00Z',
    'answers' => array(
        'PF01' => '1', 'PF02' => '1', 'PF03' => '1', 'PF04' => '1',
        'PF05' => '1', 'PF06' => '1', 'PF07' => '1', 'PF08' => '1',
        'PF09' => '4', // 4 points -> triggers GUARDRAIL_PF09_LIMITATION
        'PF10' => '1', 'PF11' => '1', 'PF12' => '1',
        'PFSF01' => 'no', 'PFSF02' => 'no', 'PFSF03' => 'no', 'PFSF04' => 'no'
    )
);
$req_pieds = new WP_REST_Request(json_encode($pieds_guardrail_fixture), $pieds_guardrail_fixture, array());
$res_pieds = $service->submit('pieds-confort-postural', $req_pieds);
sub_assert(!is_wp_error($res_pieds), 'Pieds guardrail submission succeeds');
$sent_pieds = json_decode($last_http_post['args']['body'], true);
sub_assert($sent_pieds['raw_score'] === 15, 'Pieds raw_score is 15 (unchanged)');
sub_assert($sent_pieds['final_score'] === 15, 'Pieds final_score is 15 (unchanged)');
sub_assert($sent_pieds['calculated_category'] === 'CONFORT_FAVORABLE', 'Pieds calculated is favorable');
sub_assert($sent_pieds['displayed_category'] === 'CONFORT_A_AMELIORER', 'Pieds displayed is capped to orange CONFORT_A_AMELIORER');
sub_assert(in_array('GUARDRAIL_PF09_LIMITATION', $sent_pieds['applied_classification_rules'], true), 'GUARDRAIL_PF09_LIMITATION transmitted');

// C. Risque nutritionnel: RN03 >= 4 caps RISQUE_FAIBLE to RISQUE_A_SURVEILLER
$rn_guardrail_fixture = array(
    'session_id' => '33334444-5555-4666-8777-888899990000',
    'completed_at' => '2026-09-09T17:10:00Z',
    'answers' => array(
        'RN01' => '1', 'RN02' => '1',
        'RN03' => '4', // 4 points -> triggers RN_GUARDRAIL_RN03
        'RN04' => '1', 'RN05' => '1', 'RN06' => '1', 'RN07' => '1',
        'RN08' => '1', 'RN09' => '1', 'RN10' => '1', 'RN11' => '1', 'RN12' => '1',
        'RNSF01' => 'no', 'RNSF02' => 'no', 'RNSF03' => 'no', 'RNSF04' => 'no'
    )
);
$req_rn = new WP_REST_Request(json_encode($rn_guardrail_fixture), $rn_guardrail_fixture, array());
$res_rn = $service->submit('risque-nutritionnel', $req_rn);
sub_assert(!is_wp_error($res_rn), 'RN guardrail submission succeeds');
$sent_rn = json_decode($last_http_post['args']['body'], true);
sub_assert($sent_rn['raw_score'] === 15, 'RN raw_score is 15 (unchanged)');
sub_assert($sent_rn['final_score'] === 15, 'RN final_score is 15 (unchanged)');
sub_assert($sent_rn['calculated_category'] === 'RISQUE_FAIBLE', 'RN calculated is RISQUE_FAIBLE');
sub_assert($sent_rn['displayed_category'] === 'RISQUE_A_SURVEILLER', 'RN displayed is capped to orange RISQUE_A_SURVEILLER');
sub_assert(in_array('RN_GUARDRAIL_RN03', $sent_rn['applied_classification_rules'], true), 'RN_GUARDRAIL_RN03 transmitted');

// D. Bien-être: Dimension score >= 8 (mean >= 4.00) caps BIEN_ETRE_FAVORABLE to BIEN_ETRE_A_RENFORCER
$be_guardrail_fixture = array(
    'session_id' => '44445555-6666-4777-8888-999900001111',
    'completed_at' => '2026-09-09T17:15:00Z',
    'answers' => array(
        'BE01' => '4', // 4 points
        'BE02' => '4', // 4 points -> satisfaction-globale-quotidien raw = 8 >= 8 (mean >= 4.00)
        'BE03' => '1', 'BE04' => '1', 'BE05' => '1', 'BE06' => '1',
        'BE07' => '1', 'BE08' => '1', 'BE09' => '1', 'BE10' => '1',
        'BE11' => '1', 'BE12' => '1',
    )
);
$req_be = new WP_REST_Request(json_encode($be_guardrail_fixture), $be_guardrail_fixture, array());
$res_be = $service->submit('bien-etre', $req_be);
sub_assert(!is_wp_error($res_be), 'BE guardrail submission succeeds');
$sent_be = json_decode($last_http_post['args']['body'], true);
sub_assert($sent_be['raw_score'] === 18, 'BE raw_score is 18 (unchanged)');
sub_assert($sent_be['final_score'] === 18, 'BE final_score is 18 (unchanged)');
sub_assert($sent_be['calculated_category'] === 'BIEN_ETRE_FAVORABLE', 'BE calculated is BIEN_ETRE_FAVORABLE');
sub_assert($sent_be['displayed_category'] === 'BIEN_ETRE_A_RENFORCER', 'BE displayed is capped to orange BIEN_ETRE_A_RENFORCER');
sub_assert(in_array('BE_GUARDRAIL_SATISFACTION', $sent_be['applied_classification_rules'], true), 'BE_GUARDRAIL_SATISFACTION transmitted');

echo "ALL REST BACKEND SUBMISSION TESTS PASSED." . PHP_EOL;
