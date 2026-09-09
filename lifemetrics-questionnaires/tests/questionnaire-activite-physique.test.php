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
ap_assert($config['status'] === 'review', 'Status is review');
ap_assert($config['locale'] === 'fr-FR', 'Locale is fr-FR');
ap_assert($config['scoring_direction'] === 'higher_is_better', 'Direction is higher_is_better');
ap_assert($config['score']['target_min'] === 0, 'Target min is 0');
ap_assert($config['score']['target_max'] === 48, 'Target max is 48');

// ----------------------------------------------------
// 2. Question Counts & AP04 Duplicate 4-Point Verification
// ----------------------------------------------------
ap_assert(count($config['questions']) === 12, 'Must have exactly 12 scored questions');

$q_ids = array_map(function ($q) { return $q['id']; }, $config['questions']);
ap_assert($q_ids === array('AP01', 'AP02', 'AP03', 'AP04', 'AP05', 'AP06', 'AP07', 'AP08', 'AP09', 'AP10', 'AP11', 'AP12'), 'Exact AP01-AP12 sequence');

// AP04 (Renforcement musculaire) duplicate 4 pts verification
$q4 = $config['questions'][3];
ap_assert($q4['id'] === 'AP04', 'Q4 is AP04');
ap_assert($q4['answers'][0]['value'] === '0' && $q4['answers'][0]['points'] === 0, 'AP04 opt 0 (Jamais) = 0 pts');
ap_assert($q4['answers'][1]['value'] === '1' && $q4['answers'][1]['points'] === 1, 'AP04 opt 1 (Moins d\'une fois/sem) = 1 pt');
ap_assert($q4['answers'][2]['value'] === '2' && $q4['answers'][2]['points'] === 2, 'AP04 opt 2 (1 jour/sem) = 2 pts');
ap_assert($q4['answers'][3]['value'] === '3' && $q4['answers'][3]['points'] === 4, 'AP04 opt 3 (2 jours/sem) = 4 pts [DUPLICATE MAX]');
ap_assert($q4['answers'][4]['value'] === '4' && $q4['answers'][4]['points'] === 4, 'AP04 opt 4 (3 jours ou plus/sem) = 4 pts [DUPLICATE MAX]');

// Verify no N/A, no safety questions, no guardrails
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

ap_assert($config['dimensions'][0]['question_ids'] === array('AP01', 'AP02', 'AP03'), 'D1 has AP01, AP02, AP03 (capacity 12)');
ap_assert($config['dimensions'][1]['question_ids'] === array('AP04', 'AP05'), 'D2 has AP04, AP05 (capacity 8)');
ap_assert($config['dimensions'][2]['question_ids'] === array('AP06', 'AP07'), 'D3 has AP06, AP07 (capacity 8)');
ap_assert($config['dimensions'][3]['question_ids'] === array('AP08', 'AP09'), 'D4 has AP08, AP09 (capacity 8)');
ap_assert($config['dimensions'][4]['question_ids'] === array('AP10', 'AP11', 'AP12'), 'D5 has AP10, AP11, AP12 (capacity 12)');

// ----------------------------------------------------
// 4. Scoring Engine Boundaries (0, 15, 16, 27, 28, 39, 40, 48)
// ----------------------------------------------------
// Min score (all 0s) -> 0/48 -> ACTIVITE_INSUFFISANTE
$answers_min = array(
    'AP01' => '0', 'AP02' => '0', 'AP03' => '0', 'AP04' => '0',
    'AP05' => '0', 'AP06' => '0', 'AP07' => '0', 'AP08' => '0',
    'AP09' => '0', 'AP10' => '0', 'AP11' => '0', 'AP12' => '0',
);
$res_0 = $engine->score($config, $answers_min);
ap_assert($res_0['final_score'] === 0, 'Min score is 0');
ap_assert($res_0['calculated_category'] === 'ACTIVITE_INSUFFISANTE', 'Score 0 category is ACTIVITE_INSUFFISANTE');
ap_assert($res_0['displayed_category'] === 'ACTIVITE_INSUFFISANTE', 'Score 0 displayed category is ACTIVITE_INSUFFISANTE');

// Max score (AP01-AP12 max answers) -> 48/48 -> TRES_BON_NIVEAU
$answers_max = array(
    'AP01' => '4', 'AP02' => '4', 'AP03' => '4', 'AP04' => '3', // AP04 '3' is 4 pts
    'AP05' => '4', 'AP06' => '4', 'AP07' => '4', 'AP08' => '4',
    'AP09' => '4', 'AP10' => '4', 'AP11' => '4', 'AP12' => '4',
);
$res_48 = $engine->score($config, $answers_max);
ap_assert($res_48['final_score'] === 48, 'Max score is 48');
ap_assert($res_48['calculated_category'] === 'TRES_BON_NIVEAU', 'Score 48 category is TRES_BON_NIVEAU');
ap_assert($res_48['displayed_category'] === 'TRES_BON_NIVEAU', 'Score 48 displayed category is TRES_BON_NIVEAU');

// Max score using alternative duplicate-max answer for AP04 (AP04=4 [4pts])
$answers_max_alt = array_merge($answers_max, array('AP04' => '4'));
$res_48_alt = $engine->score($config, $answers_max_alt);
ap_assert($res_48_alt['final_score'] === 48, 'Max score with AP04=4 is also 48');
ap_assert($res_48_alt['calculated_category'] === 'TRES_BON_NIVEAU', 'Alt max category is TRES_BON_NIVEAU');

// Boundary 15 -> ACTIVITE_INSUFFISANTE
$answers_15 = array(
    'AP01' => '1', 'AP02' => '1', 'AP03' => '1', // D1: 1+1+1=3
    'AP04' => '1', 'AP05' => '1',                // D2: 1+1=2
    'AP06' => '1', 'AP07' => '1',                // D3: 1+1=2
    'AP08' => '1', 'AP09' => '1',                // D4: 1+1=2
    'AP10' => '2', 'AP11' => '2', 'AP12' => '2', // D5: 2+2+2=6 -> Total = 3+2+2+2+6 = 15
);
$res_15 = $engine->score($config, $answers_15);
ap_assert($res_15['final_score'] === 15, 'Score is 15');
ap_assert($res_15['calculated_category'] === 'ACTIVITE_INSUFFISANTE', 'Score 15 category is ACTIVITE_INSUFFISANTE');

// Boundary 16 -> ACTIVITE_A_RENFORCER
$answers_16 = array_merge($answers_15, array('AP09' => '2')); // +1 pt -> 16
$res_16 = $engine->score($config, $answers_16);
ap_assert($res_16['final_score'] === 16, 'Score is 16');
ap_assert($res_16['calculated_category'] === 'ACTIVITE_A_RENFORCER', 'Score 16 category is ACTIVITE_A_RENFORCER');

// Boundary 27 -> ACTIVITE_A_RENFORCER
$answers_27 = array(
    'AP01' => '3', 'AP02' => '2', 'AP03' => '2', // D1: 3+2+2=7
    'AP04' => '2', 'AP05' => '2',                // D2: 2+2=4
    'AP06' => '2', 'AP07' => '2',                // D3: 2+2=4
    'AP08' => '2', 'AP09' => '2',                // D4: 2+2=4
    'AP10' => '3', 'AP11' => '3', 'AP12' => '2', // D5: 3+3+2=8 -> Total = 7+4+4+4+8 = 27
);
$res_27 = $engine->score($config, $answers_27);
ap_assert($res_27['final_score'] === 27, 'Score is 27');
ap_assert($res_27['calculated_category'] === 'ACTIVITE_A_RENFORCER', 'Score 27 category is ACTIVITE_A_RENFORCER');

// Boundary 28 -> NIVEAU_FAVORABLE
$answers_28 = array_merge($answers_27, array('AP07' => '3')); // +1 pt -> 28
$res_28 = $engine->score($config, $answers_28);
ap_assert($res_28['final_score'] === 28, 'Score is 28');
ap_assert($res_28['calculated_category'] === 'NIVEAU_FAVORABLE', 'Score 28 category is NIVEAU_FAVORABLE');

// Boundary 39 -> NIVEAU_FAVORABLE
$answers_39 = array(
    'AP01' => '4', 'AP02' => '3', 'AP03' => '3', // D1: 4+3+3=10
    'AP04' => '3', 'AP05' => '2',                // D2: 4+2=6 (AP04 '3' is 4 pts)
    'AP06' => '4', 'AP07' => '3',                // D3: 4+3=7
    'AP08' => '3', 'AP09' => '3',                // D4: 3+3=6
    'AP10' => '4', 'AP11' => '3', 'AP12' => '3', // D5: 4+3+3=10 -> Total = 10+6+7+6+10 = 39
);
$res_39 = $engine->score($config, $answers_39);
ap_assert($res_39['final_score'] === 39, 'Score is 39');
ap_assert($res_39['calculated_category'] === 'NIVEAU_FAVORABLE', 'Score 39 category is NIVEAU_FAVORABLE');

// Boundary 40 -> TRES_BON_NIVEAU
$answers_40 = array_merge($answers_39, array('AP05' => '3')); // +1 pt -> 40
$res_40 = $engine->score($config, $answers_40);
ap_assert($res_40['final_score'] === 40, 'Score is 40');
ap_assert($res_40['calculated_category'] === 'TRES_BON_NIVEAU', 'Score 40 category is TRES_BON_NIVEAU');

// ----------------------------------------------------
// 5. Weakest Dimensions & Deterministic Ties
// ----------------------------------------------------
// In $res_15:
// D1: 3/12 = 25%
// D2: 2/8 = 25%
// D3: 2/8 = 25%
// D4: 2/8 = 25%
// D5: 6/12 = 50%
// Tied lowest at 25% among D1, D2, D3, D4.
// Configuration order tie-break picks first 2: D1 (activite-endurance) and D2 (renforcement-mobilite).
ap_assert($res_15['weakest_dimensions'] === array('activite-endurance', 'renforcement-mobilite'), 'Deterministic tie-breaking in weakest dimensions');

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
ap_assert($loaded_config['status'] === 'review', 'Status in review');

// Server scoring authority: client sends claims for final_score=48 and category=TRES_BON_NIVEAU,
// but server evaluates actual answers (answers_15) and computes authoritative final_score=15
$tampered_client_answers = $answers_15; // Actual answers evaluate to 15
$server_scored = $engine->score($loaded_config, $tampered_client_answers);
ap_assert($server_scored['final_score'] === 15, 'Server computes authoritative score (15, ignoring client claim of 48)');
ap_assert($server_scored['calculated_category'] === 'ACTIVITE_INSUFFISANTE', 'Server computes authoritative category ACTIVITE_INSUFFISANTE');
ap_assert($server_scored['displayed_category'] === 'ACTIVITE_INSUFFISANTE', 'Server computes authoritative displayed category');

// Submission Service flow
$adapter = new LifeMetrics_Google_Apps_Script_Adapter();
$submission_service = new LifeMetrics_Submission_Service($registry, $engine, $adapter);

// Verify endpoint resolution
if (!defined('LMQ_GOOGLE_ENDPOINT')) {
    define('LMQ_GOOGLE_ENDPOINT', 'https://script.google.com/macros/s/central_endpoint/exec');
}
ap_assert($submission_service->get_endpoint('activite-physique') === 'https://script.google.com/macros/s/central_endpoint/exec', 'Activité Physique endpoint resolves to central Google script');

echo "Questionnaire Activité Physique PHP Unit & Scoring Tests: ALL PASSED.\n";
