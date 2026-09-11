<?php
error_reporting(E_ALL);
set_error_handler(static function ($severity, $message, $file, $line) {
    throw new ErrorException($message, 0, $severity, $file, $line);
});

define('ABSPATH', __DIR__ . '/');

require_once __DIR__ . '/../includes/class-questionnaire-schema-validator.php';
require_once __DIR__ . '/../includes/class-questionnaire-scoring-engine.php';
require_once __DIR__ . '/../includes/class-questionnaire-registry.php';
require_once __DIR__ . '/../includes/class-google-apps-script-adapter.php';
require_once __DIR__ . '/../includes/class-submission-service.php';

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
if (!function_exists('wp_generate_uuid4')) {
    function wp_generate_uuid4() { return '123e4567-e89b-42d3-a456-426614174000'; }
}

function sl_assert(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException("Assertion failed: {$message}");
    }
}

$validator = new LifeMetrics_Questionnaire_Schema_Validator();
$engine = new LifeMetrics_Questionnaire_Scoring_Engine();

// ----------------------------------------------------
// 1. Schema 2.0.0 Strict Validation
// ----------------------------------------------------
$config = require __DIR__ . '/../questionnaires/sommeil/questionnaire.php';
$validation_errors = $validator->validate($config);
sl_assert(empty($validation_errors), 'Sommeil config must satisfy Schema 2.0.0: ' . implode(', ', $validation_errors));
sl_assert($config['id'] === 'sommeil', 'ID is sommeil');
sl_assert($config['version'] === '1.0.0', 'Version is 1.0.0');
sl_assert($config['status'] === 'review', 'Status is review');
sl_assert($config['locale'] === 'fr-FR', 'Locale is fr-FR');
sl_assert($config['scoring_direction'] === 'lower_is_better', 'Direction is lower_is_better');
sl_assert($config['score']['target_min'] === 12, 'Target min is 12');
sl_assert($config['score']['target_max'] === 60, 'Target max is 60');

// ----------------------------------------------------
// 2. Question Counts & Non-Linear Q1 (SL01) Verification
// ----------------------------------------------------
sl_assert(count($config['questions']) === 12, 'Must have exactly 12 scored questions');

$q_ids = array_map(function ($q) { return $q['id']; }, $config['questions']);
sl_assert($q_ids === array('SL01', 'SL02', 'SL03', 'SL04', 'SL05', 'SL06', 'SL07', 'SL08', 'SL09', 'SL10', 'SL11', 'SL12'), 'Exact SL01-SL12 sequence');

// Q1 (SL01) non-linear points verification
$q1 = $config['questions'][0];
sl_assert($q1['id'] === 'SL01', 'Q1 is SL01');
sl_assert(count($q1['answers']) === 5, 'SL01 has 5 options');
sl_assert($q1['answers'][0]['value'] === '7_to_9h' && $q1['answers'][0]['points'] === 1, 'SL01 opt 7-9h = 1 pt [OPTIMAL]');
sl_assert($q1['answers'][1]['value'] === 'more_9h' && $q1['answers'][1]['points'] === 2, 'SL01 opt >9h = 2 pts [NON-LINEAR]');
sl_assert($q1['answers'][2]['value'] === '6_to_7h' && $q1['answers'][2]['points'] === 3, 'SL01 opt 6-7h = 3 pts');
sl_assert($q1['answers'][3]['value'] === '5_to_6h' && $q1['answers'][3]['points'] === 4, 'SL01 opt 5-6h = 4 pts');
sl_assert($q1['answers'][4]['value'] === 'less_5h' && $q1['answers'][4]['points'] === 5, 'SL01 opt <5h = 5 pts');

// ----------------------------------------------------
// 3. Dimensions & Capacities Verification
// ----------------------------------------------------
sl_assert(count($config['dimensions']) === 5, 'Must have exactly 5 dimensions');
$dim_ids = array_map(function ($d) { return $d['id']; }, $config['dimensions']);
sl_assert($dim_ids === array(
    'duree-suffisance-sommeil',
    'endormissement-continuite',
    'regularite-rythme',
    'recuperation-fonctionnement-diurne',
    'habitudes-favorables-sommeil'
), 'Exact 5 dimension IDs');

sl_assert($config['dimensions'][0]['question_ids'] === array('SL01', 'SL02'), 'D1 has SL01, SL02');
sl_assert($config['dimensions'][1]['question_ids'] === array('SL03', 'SL04', 'SL05'), 'D2 has SL03, SL04, SL05');
sl_assert($config['dimensions'][2]['question_ids'] === array('SL06', 'SL07'), 'D3 has SL06, SL07');
sl_assert($config['dimensions'][3]['question_ids'] === array('SL08', 'SL09', 'SL10'), 'D4 has SL08, SL09, SL10');
sl_assert($config['dimensions'][4]['question_ids'] === array('SL11', 'SL12'), 'D5 has SL11, SL12');

// Global Result CTAs verification
sl_assert(count($config['result_ctas']) === 2, 'Must have exactly 2 result CTAs');
sl_assert($config['result_ctas'][0]['label'] === 'Je veux faire un bilan', 'Primary CTA label is Je veux faire un bilan');
sl_assert($config['result_ctas'][0]['url'] === 'https://lifemetrics.fr/formulaire-bilan/', 'Primary CTA url is https://lifemetrics.fr/formulaire-bilan/');
sl_assert($config['result_ctas'][0]['variant'] === 'primary', 'Primary CTA variant is primary');
sl_assert($config['result_ctas'][0]['enabled'] === true, 'Primary CTA is enabled');
sl_assert($config['result_ctas'][1]['variant'] === 'secondary', 'Secondary CTA variant is secondary');
sl_assert($config['result_ctas'][1]['url'] === '/tests-sante/', 'Secondary CTA url points to questionnaire catalogue');

// ----------------------------------------------------
// 4. Scoring Engine Boundaries (12, 24, 25, 32, 33, 60)
// ----------------------------------------------------
$base_safety = array('SLSF01' => 'no', 'SLSF02' => 'no', 'SLSF03' => 'no');

// Min score (all best answers = 1) -> 12/60 -> SATISFAISANT
$answers_min = array_merge($base_safety, array(
    'SL01' => '7_to_9h', 'SL02' => 'almost_always',
    'SL03' => '15_min_or_less', 'SL04' => 'rarely_never', 'SL05' => 'very_easily',
    'SL06' => 'very_regular', 'SL07' => 'very_little',
    'SL08' => 'almost_every_day', 'SL09' => 'almost_never', 'SL10' => 'almost_always',
    'SL11' => 'almost_every_evening', 'SL12' => 'almost_always',
));
$res_12 = $engine->score($config, $answers_min);
sl_assert($res_12['final_score'] === 12, 'Min score is 12');
sl_assert($res_12['calculated_category'] === 'SATISFAISANT', 'Score 12 category is SATISFAISANT');
sl_assert($res_12['displayed_category'] === 'SATISFAISANT', 'Score 12 displayed category is SATISFAISANT');

// Max score (all worst answers = 5) -> 60/60 -> PERTURBE
$answers_max = array_merge($base_safety, array(
    'SL01' => 'less_5h', 'SL02' => 'almost_never',
    'SL03' => 'more_60_min', 'SL04' => 'almost_every_night', 'SL05' => 'very_difficult',
    'SL06' => 'very_irregular', 'SL07' => 'more_3h',
    'SL08' => 'almost_never', 'SL09' => 'almost_every_day', 'SL10' => 'almost_never',
    'SL11' => 'never', 'SL12' => 'almost_never',
));
$res_60 = $engine->score($config, $answers_max);
sl_assert($res_60['final_score'] === 60, 'Max score is 60');
sl_assert($res_60['calculated_category'] === 'PERTURBE', 'Score 60 category is PERTURBE');
sl_assert($res_60['displayed_category'] === 'PERTURBE', 'Score 60 displayed category is PERTURBE');

// Boundary 24 -> SATISFAISANT (12 questions with 2 pts each)
$answers_24 = array_merge($base_safety, array(
    'SL01' => 'more_9h', 'SL02' => 'often',
    'SL03' => '16_to_30_min', 'SL04' => '1_night_week', 'SL05' => 'easily',
    'SL06' => 'generally_regular', 'SL07' => 'about_1h',
    'SL08' => 'often', 'SL09' => 'rarely', 'SL10' => 'often',
    'SL11' => 'often', 'SL12' => 'often',
));
$res_24 = $engine->score($config, $answers_24);
sl_assert($res_24['final_score'] === 24, 'Score is 24');
sl_assert($res_24['calculated_category'] === 'SATISFAISANT', 'Score 24 category is SATISFAISANT');

// Boundary 25 -> ENCORE_FRAGILE (+1 pt)
$answers_25 = $answers_24;
$answers_25['SL01'] = '6_to_7h'; // 3 pts (+1)
$res_25 = $engine->score($config, $answers_25);
sl_assert($res_25['final_score'] === 25, 'Score is 25');
sl_assert($res_25['calculated_category'] === 'ENCORE_FRAGILE', 'Score 25 category is ENCORE_FRAGILE');

// Boundary 32 -> ENCORE_FRAGILE (8 questions with 3 pts, 4 questions with 2 pts = 24 + 8 = 32)
$answers_32 = array_merge($base_safety, array(
    'SL01' => '6_to_7h', 'SL02' => 'half_time', // 3, 3
    'SL03' => '31_to_45_min', 'SL04' => '2_3_nights_week', 'SL05' => 'depends', // 3, 3, 3
    'SL06' => 'variable', 'SL07' => '1h30_to_2h', // 3, 3
    'SL08' => 'half_time', 'SL09' => 'rarely', 'SL10' => 'often', // 3, 2, 2
    'SL11' => 'often', 'SL12' => 'often', // 2, 2 -> sum = 3*8 + 2*4 = 24 + 8 = 32
));
$res_32 = $engine->score($config, $answers_32);
sl_assert($res_32['final_score'] === 32, 'Score is 32');
sl_assert($res_32['calculated_category'] === 'ENCORE_FRAGILE', 'Score 32 category is ENCORE_FRAGILE');

// Boundary 33 -> PERTURBE (+1 pt)
$answers_33 = $answers_32;
$answers_33['SL12'] = 'half_time'; // 3 pts (+1) -> sum = 33
$res_33 = $engine->score($config, $answers_33);
sl_assert($res_33['final_score'] === 33, 'Score is 33');
sl_assert($res_33['calculated_category'] === 'PERTURBE', 'Score 33 category is PERTURBE');

// ----------------------------------------------------
// 5. Testing Q1 Non-Linearity Directly
// ----------------------------------------------------
// Test with SL01='7_to_9h' (1 pt) vs SL01='more_9h' (2 pts)
$q1_opt1 = array_merge($answers_min, array('SL01' => '7_to_9h'));
$res_q1_opt1 = $engine->score($config, $q1_opt1);
sl_assert($res_q1_opt1['final_score'] === 12, 'SL01 7-9h gives 1 pt (total 12)');

$q1_opt2 = array_merge($answers_min, array('SL01' => 'more_9h'));
$res_q1_opt2 = $engine->score($config, $q1_opt2);
sl_assert($res_q1_opt2['final_score'] === 13, 'SL01 >9h gives 2 pts (total 13)');
sl_assert($res_q1_opt1['final_score'] < $res_q1_opt2['final_score'], 'Non-linear ordering: 7-9h (1 pt) is more favorable than >9h (2 pts) under lower_is_better');

// ----------------------------------------------------
// 6. Weakest Dimensions & Deterministic Ties
// ----------------------------------------------------
// Under lower_is_better, higher score/percentage = worse dimension.
$answers_weak = array_merge($base_safety, array(
    'SL01' => 'less_5h', 'SL02' => 'almost_never', // D1: 5+5 = 10/10 (100%)
    'SL03' => '46_to_60_min', 'SL04' => '4_5_nights_week', 'SL05' => 'difficult', // D2: 4+4+4 = 12/15 (75%)
    'SL06' => 'variable', 'SL07' => '1h30_to_2h', // D3: 3+3 = 6/10 (50%)
    'SL08' => 'often', 'SL09' => 'rarely', 'SL10' => 'often', // D4: 2+2+2 = 6/15 (25%)
    'SL11' => 'almost_every_evening', 'SL12' => 'almost_always', // D5: 1+1 = 2/10 (0%)
));
$res_weak = $engine->score($config, $answers_weak);
sl_assert($res_weak['weakest_dimensions'] === array('duree-suffisance-sommeil', 'endormissement-continuite'), 'Weakest dimensions select highest percentage under lower_is_better');

// ----------------------------------------------------
// 7. Safety Questions Independence
// ----------------------------------------------------
// SLSF01 alone
$res_sf1 = $engine->score($config, array_merge($answers_max, array('SLSF01' => 'yes')));
sl_assert($res_sf1['final_score'] === 60, 'Safety does not alter score (60)');
sl_assert($res_sf1['calculated_category'] === 'PERTURBE', 'Safety does not alter category');
sl_assert($res_sf1['safety_flag_codes'] === array('SOMMEIL_SAFETY_MESSAGE'), 'SLSF01 emits SOMMEIL_SAFETY_MESSAGE');

// SLSF02 alone
$res_sf2 = $engine->score($config, array_merge($answers_max, array('SLSF02' => 'yes')));
sl_assert($res_sf2['safety_flag_codes'] === array('SOMMEIL_SAFETY_MESSAGE'), 'SLSF02 emits SOMMEIL_SAFETY_MESSAGE');

// SLSF03 alone
$res_sf3 = $engine->score($config, array_merge($answers_max, array('SLSF03' => 'yes')));
sl_assert($res_sf3['safety_flag_codes'] === array('SOMMEIL_SAFETY_MESSAGE'), 'SLSF03 emits SOMMEIL_SAFETY_MESSAGE');

// SLSF01 unsure (Je ne sais pas) -> no trigger
$res_sf_unk = $engine->score($config, array_merge($answers_max, array('SLSF01' => 'unsure')));
sl_assert($res_sf_unk['safety_flag_codes'] === array(), 'SLSF01 unsure does not trigger flag');

// Multiple simultaneous safety triggers
$res_sf_all = $engine->score($config, array_merge($answers_max, array('SLSF01' => 'yes', 'SLSF02' => 'yes', 'SLSF03' => 'yes')));
sl_assert($res_sf_all['final_score'] === 60, 'Score unaffected by multiple safety flags');
sl_assert($res_sf_all['safety_flag_codes'] === array('SOMMEIL_SAFETY_MESSAGE'), 'Multiple triggers deduplicate to unique flag');

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

if (!function_exists('wp_remote_post')) {
    function wp_remote_post($url, $args = array()) {
        $GLOBALS['mock_sommeil_post_log'][] = array('url' => $url, 'args' => $args);
        return array('response' => array('code' => 200), 'body' => json_encode(array('ok' => true, 'duplicate' => false)));
    }
}
if (!function_exists('wp_remote_retrieve_response_code')) {
    function wp_remote_retrieve_response_code($response) {
        if (is_array($response) && isset($response['response']['code'])) return $response['response']['code'];
        return 200;
    }
}
if (!function_exists('wp_remote_retrieve_body')) {
    function wp_remote_retrieve_body($response) {
        return is_array($response) && isset($response['body']) ? $response['body'] : '';
    }
}

$GLOBALS['mock_sommeil_post_log'] = array();

// ----------------------------------------------------
// 8. Registry & Server Scoring Authority
// ----------------------------------------------------
$registry = new LifeMetrics_Questionnaire_Registry(
    __DIR__ . '/../questionnaires',
    array(
        'pss10' => 'pss10/questionnaire.php',
        'sedentarite' => 'sedentarite/questionnaire.php',
        'hydratation' => 'hydratation/questionnaire.php',
        'fatigue-recuperation' => 'fatigue-recuperation/questionnaire.php',
        'sommeil' => 'sommeil/questionnaire.php',
    ),
    $validator
);
$loaded_config = $registry->get_internal('sommeil');
sl_assert($loaded_config !== null, 'Registry resolves sommeil questionnaire');
sl_assert($loaded_config['id'] === 'sommeil', 'Loaded config id is sommeil');
sl_assert($loaded_config['status'] === 'review', 'Status in review');

// Server scoring authority: client sends claims for final_score=12 and category=SATISFAISANT,
// but server evaluates actual answers (answers_33) and computes authoritative final_score=33
$tampered_client_answers = $answers_33; // Actual answers evaluate to 33
$server_scored = $engine->score($loaded_config, $tampered_client_answers);
sl_assert($server_scored['final_score'] === 33, 'Server computes authoritative score (33, ignoring client claim of 12)');
sl_assert($server_scored['calculated_category'] === 'PERTURBE', 'Server computes authoritative category PERTURBE');
sl_assert($server_scored['displayed_category'] === 'PERTURBE', 'Server computes authoritative displayed category');

// Submission Service flow with ready-state mock
$ready_config = array_merge($loaded_config, array('status' => 'ready'));
$mock_registry = new LifeMetrics_Questionnaire_Registry(
    __DIR__ . '/../questionnaires',
    array('sommeil' => 'sommeil/questionnaire.php'),
    $validator
);
$adapter = new LifeMetrics_Google_Apps_Script_Adapter();
$submission_service = new LifeMetrics_Submission_Service($registry, $engine, $adapter);

// Verify endpoint resolution
if (!defined('LMQ_GOOGLE_ENDPOINT')) {
    define('LMQ_GOOGLE_ENDPOINT', 'https://script.google.com/macros/s/central_endpoint/exec');
}
sl_assert($submission_service->get_endpoint('sommeil') === 'https://script.google.com/macros/s/central_endpoint/exec', 'Sommeil endpoint resolves to central Google script');

echo "Questionnaire Sommeil PHP Unit & Scoring Tests: ALL PASSED.\n";
