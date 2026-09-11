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

function ap_assert(bool $condition, string $message): void
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
$config = require __DIR__ . '/../questionnaires/activite-physique/questionnaire.php';
$validation_errors = $validator->validate($config);
ap_assert(empty($validation_errors), 'Activité Physique config must satisfy Schema 2.0.0: ' . implode(', ', $validation_errors));
ap_assert($config['id'] === 'activite-physique', 'ID is activite-physique');
ap_assert($config['version'] === '1.0.0', 'Version is 1.0.0');
ap_assert($config['locale'] === 'fr-FR', 'Locale is fr-FR');
ap_assert($config['scoring_direction'] === 'lower_is_better', 'Direction is lower_is_better');
ap_assert($config['score']['target_min'] === 12, 'Target min is 12');
ap_assert($config['score']['target_max'] === 60, 'Target max is 60');

// ----------------------------------------------------
// 2. Question Counts & AP04 Duplicate 1-Point Verification
// ----------------------------------------------------
ap_assert(count($config['questions']) === 12, 'Must have exactly 12 scored questions');

$q_ids = array_map(function ($q) { return $q['id']; }, $config['questions']);
ap_assert($q_ids === array('AP01', 'AP02', 'AP03', 'AP04', 'AP05', 'AP06', 'AP07', 'AP08', 'AP09', 'AP10', 'AP11', 'AP12'), 'Exact AP01-AP12 sequence');

// AP04 (Renforcement musculaire) duplicate 1 pt verification
$q4 = $config['questions'][3];
ap_assert($q4['id'] === 'AP04', 'Q4 is AP04');
ap_assert($q4['answers'][0]['value'] === '3_plus' && $q4['answers'][0]['points'] === 1, 'AP04 3+ jours = 1 pt');
ap_assert($q4['answers'][1]['value'] === '2_days' && $q4['answers'][1]['points'] === 1, 'AP04 2 jours = 1 pt [DUPLICATE 1 PT]');
ap_assert($q4['answers'][2]['value'] === '1_day' && $q4['answers'][2]['points'] === 3, 'AP04 1 jour = 3 pts');
ap_assert($q4['answers'][3]['value'] === 'less_1' && $q4['answers'][3]['points'] === 4, 'AP04 <1 fois = 4 pts');
ap_assert($q4['answers'][4]['value'] === 'never' && $q4['answers'][4]['points'] === 5, 'AP04 Jamais = 5 pts');

// Verify no N/A, no safety questions, no classification rules
ap_assert(empty($config['safety_questions']), 'Safety questions must be empty');
ap_assert(empty($config['classification_rules']), 'Classification rules must be empty');
foreach ($config['questions'] as $q) {
    foreach ($q['answers'] as $a) {
        ap_assert($a['applicable'] === true, "Question {$q['id']} answer {$a['value']} is applicable");
        ap_assert($a['points'] !== null, "Question {$q['id']} answer {$a['value']} has explicit points");
    }
}

// ----------------------------------------------------
// 3. Dimensions & Capacities Verification
// ----------------------------------------------------
ap_assert(count($config['dimensions']) === 5, 'Must have exactly 5 dimensions');
$dim_ids = array_map(function ($d) { return $d['id']; }, $config['dimensions']);
ap_assert($dim_ids === array(
    'activite-endurance',
    'renforcement-mobilite',
    'mouvement-quotidien',
    'sedentarite',
    'regularite'
), 'Exact 5 dimension IDs');

ap_assert($config['dimensions'][0]['question_ids'] === array('AP01', 'AP02', 'AP03'), 'D1 has AP01, AP02, AP03');
ap_assert($config['dimensions'][1]['question_ids'] === array('AP04', 'AP05'), 'D2 has AP04, AP05');
ap_assert($config['dimensions'][2]['question_ids'] === array('AP06', 'AP07'), 'D3 has AP06, AP07');
ap_assert($config['dimensions'][3]['question_ids'] === array('AP08', 'AP09'), 'D4 has AP08, AP09');
ap_assert($config['dimensions'][4]['question_ids'] === array('AP10', 'AP11', 'AP12'), 'D5 has AP10, AP11, AP12');

// ----------------------------------------------------
// 4. Scoring Engine Boundaries (12, 24, 25, 32, 33, 60)
// ----------------------------------------------------
// Min score (all best answers = 1) -> 12/60 -> SATISFAISANTE
$answers_min = array(
    'AP01' => '5_plus', 'AP02' => '300_plus', 'AP03' => 'almost_always',
    'AP04' => '3_plus', 'AP05' => 'whole_body',
    'AP06' => '6_7_days', 'AP07' => 'very_regularly',
    'AP08' => 'less_3h', 'AP09' => 'every_30min',
    'AP10' => '5_plus_days', 'AP11' => '4_weeks', 'AP12' => '0_days',
);
$res_12 = $engine->score($config, $answers_min);
ap_assert($res_12['final_score'] === 12, 'Min score is 12');
ap_assert($res_12['calculated_category'] === 'SATISFAISANTE', 'Score 12 category is SATISFAISANTE');
ap_assert($res_12['displayed_category'] === 'SATISFAISANTE', 'Score 12 displayed category is SATISFAISANTE');

// Max score (all worst answers = 5) -> 60/60 -> INSUFFISANTE
$answers_max = array(
    'AP01' => '0_days', 'AP02' => 'less_30', 'AP03' => 'never',
    'AP04' => 'never', 'AP05' => 'almost_none',
    'AP06' => '0_days', 'AP07' => 'almost_never',
    'AP08' => 'more_9h', 'AP09' => 'after_2h',
    'AP10' => 'rarely_active', 'AP11' => 'none', 'AP12' => '6_7_days',
);
$res_60 = $engine->score($config, $answers_max);
ap_assert($res_60['final_score'] === 60, 'Max score is 60');
ap_assert($res_60['calculated_category'] === 'INSUFFISANTE', 'Score 60 category is INSUFFISANTE');
ap_assert($res_60['displayed_category'] === 'INSUFFISANTE', 'Score 60 displayed category is INSUFFISANTE');

// Boundary 24 -> SATISFAISANTE (12 + 12 = 24, e.g. 12 questions with 2 pts each)
$answers_24 = array(
    'AP01' => '4_days', 'AP02' => '150_299', 'AP03' => 'often',
    'AP04' => '1_day',  'AP05' => 'majority',
    'AP06' => '4_5_days', 'AP07' => 'multiple_times',
    'AP08' => '3_to_5h', 'AP09' => 'every_30_60min',
    'AP10' => '3_4_days', 'AP11' => '3_weeks', 'AP12' => '1_2_days',
);
// In answers_24: AP01=2, AP02=2, AP03=2, AP04=3, AP05=2, AP06=2, AP07=2, AP08=2, AP09=2, AP10=2, AP11=2, AP12=2 -> Total = 25.
// Let's make exact 24: set AP04 to 2_days (1 pt) -> 23 + 1 = 24
$answers_24['AP04'] = '2_days'; // 1 pt -> Total = 2 + 2 + 2 + 1 + 2 + 2 + 2 + 2 + 2 + 2 + 2 + 2 = 23.
$answers_24['AP05'] = 'some_groups'; // 3 pts -> Total = 24.
$res_24 = $engine->score($config, $answers_24);
ap_assert($res_24['final_score'] === 24, 'Score is 24');
ap_assert($res_24['calculated_category'] === 'SATISFAISANTE', 'Score 24 category is SATISFAISANTE');

// Boundary 25 -> A_RENFORCER (+1 pt)
$answers_25 = $answers_24;
$answers_25['AP01'] = '2_3_days'; // 3 pts (+1)
$res_25 = $engine->score($config, $answers_25);
ap_assert($res_25['final_score'] === 25, 'Score is 25');
ap_assert($res_25['calculated_category'] === 'A_RENFORCER', 'Score 25 category is A_RENFORCER');

// Boundary 32 -> A_RENFORCER
// 8 questions with 3 pts, 4 questions with 2 pts -> 24 + 8 = 32
$answers_32 = array(
    'AP01' => '2_3_days', 'AP02' => '60_149', 'AP03' => 'sometimes', // 3, 3, 3
    'AP04' => '1_day',    'AP05' => 'some_groups',                   // 3, 3
    'AP06' => '2_3_days', 'AP07' => 'from_time_to_time',             // 3, 3
    'AP08' => '5_to_7h',  'AP09' => 'every_30_60min',                // 3, 2
    'AP10' => '3_4_days', 'AP11' => '3_weeks', 'AP12' => '1_2_days', // 2, 2, 2 -> sum = 32
);
$res_32 = $engine->score($config, $answers_32);
ap_assert($res_32['final_score'] === 32, 'Score is 32');
ap_assert($res_32['calculated_category'] === 'A_RENFORCER', 'Score 32 category is A_RENFORCER');

// Boundary 33 -> INSUFFISANTE (+1 pt)
$answers_33 = $answers_32;
$answers_33['AP12'] = '3_days'; // 3 pts (+1) -> sum = 33
$res_33 = $engine->score($config, $answers_33);
ap_assert($res_33['final_score'] === 33, 'Score is 33');
ap_assert($res_33['calculated_category'] === 'INSUFFISANTE', 'Score 33 category is INSUFFISANTE');

// ----------------------------------------------------
// 5. Weakest Dimensions & Deterministic Ties
// ----------------------------------------------------
// Under lower_is_better, higher score/percentage = worse dimension.
// Let's set D1 (AP01..03) all worst (5,5,5 -> 100%), D2 (AP04..05) (4,4 -> 75%), D3 (3,3), D4 (2,2), D5 (1,1,1)
$answers_weakest = array(
    'AP01' => '0_days', 'AP02' => 'less_30', 'AP03' => 'never', // D1: 5+5+5 = 15/15 (100%)
    'AP04' => 'less_1', 'AP05' => 'single_zone',                // D2: 4+4 = 8/10 (75%)
    'AP06' => '2_3_days', 'AP07' => 'from_time_to_time',        // D3: 3+3 = 6/10 (50%)
    'AP08' => '3_to_5h', 'AP09' => 'every_30_60min',            // D4: 2+2 = 4/10 (25%)
    'AP10' => '5_plus_days', 'AP11' => '4_weeks', 'AP12' => '0_days', // D5: 1+1+1 = 3/15 (0%)
);
$res_weak = $engine->score($config, $answers_weakest);
ap_assert($res_weak['weakest_dimensions'] === array('activite-endurance', 'renforcement-mobilite'), 'Weakest dimensions select highest percentage under lower_is_better');

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

// ----------------------------------------------------
// 6. Registry & Server Scoring Authority
// ----------------------------------------------------
$registry = new LifeMetrics_Questionnaire_Registry(
    __DIR__ . '/../questionnaires',
    array(
        'pss10' => 'pss10/questionnaire.php',
        'sedentarite' => 'sedentarite/questionnaire.php',
        'hydratation' => 'hydratation/questionnaire.php',
        'fatigue-recuperation' => 'fatigue-recuperation/questionnaire.php',
        'sommeil' => 'sommeil/questionnaire.php',
        'nutrition' => 'nutrition/questionnaire.php',
        'activite-physique' => 'activite-physique/questionnaire.php',
    ),
    $validator
);
$loaded_config = $registry->get_internal('activite-physique');
ap_assert($loaded_config !== null, 'Registry resolves activite-physique questionnaire');
ap_assert($loaded_config['id'] === 'activite-physique', 'Loaded config id is activite-physique');

// Server scoring authority: client sends answers_33, server evaluates to 33 and INSUFFISANTE
$server_scored = $engine->score($loaded_config, $answers_33);
ap_assert($server_scored['final_score'] === 33, 'Server computes authoritative score (33)');
ap_assert($server_scored['calculated_category'] === 'INSUFFISANTE', 'Server computes authoritative category INSUFFISANTE');
ap_assert($server_scored['displayed_category'] === 'INSUFFISANTE', 'Server computes authoritative displayed category');

// Submission Service flow
$adapter = new LifeMetrics_Google_Apps_Script_Adapter();
$submission_service = new LifeMetrics_Submission_Service($registry, $engine, $adapter);

// Verify endpoint resolution
if (!defined('LMQ_GOOGLE_ENDPOINT')) {
    define('LMQ_GOOGLE_ENDPOINT', 'https://script.google.com/macros/s/central_endpoint/exec');
}
ap_assert($submission_service->get_endpoint('activite-physique') === 'https://script.google.com/macros/s/central_endpoint/exec', 'Activité Physique endpoint resolves to central Google script');

echo "Questionnaire Activité Physique PHP Unit & Scoring Tests: ALL PASSED.\n";
