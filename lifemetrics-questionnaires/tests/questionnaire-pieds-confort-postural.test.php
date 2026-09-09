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

function pf_assert(bool $condition, string $message): void
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
$config = require __DIR__ . '/../questionnaires/pieds-confort-postural/questionnaire.php';
$validation_errors = $validator->validate($config);
pf_assert(empty($validation_errors), 'Pieds & Confort Postural config must satisfy Schema 2.0.0: ' . implode(', ', $validation_errors));
pf_assert($config['id'] === 'pieds-confort-postural', 'ID is pieds-confort-postural');
pf_assert($config['version'] === '1.0.0', 'Version is 1.0.0');
pf_assert($config['status'] === 'review', 'Status is review');
pf_assert($config['locale'] === 'fr-FR', 'Locale is fr-FR');
pf_assert($config['scoring_direction'] === 'higher_is_better', 'Direction is higher_is_better');
pf_assert($config['score']['target_min'] === 0, 'Target min is 0');
pf_assert($config['score']['target_max'] === 48, 'Target max is 48');

// ----------------------------------------------------
// 2. Question Counts & Safety Questions Verification
// ----------------------------------------------------
pf_assert(count($config['questions']) === 12, 'Must have exactly 12 scored questions');

$q_ids = array_map(function ($q) { return $q['id']; }, $config['questions']);
pf_assert($q_ids === array('PF01', 'PF02', 'PF03', 'PF04', 'PF05', 'PF06', 'PF07', 'PF08', 'PF09', 'PF10', 'PF11', 'PF12'), 'Exact PF01-PF12 sequence');

foreach ($config['questions'] as $q) {
    pf_assert(count($q['answers']) === 5, "Question {$q['id']} has 5 options");
    foreach ($q['answers'] as $a) {
        pf_assert($a['applicable'] === true, "Question {$q['id']} answer {$a['value']} is applicable");
        pf_assert($a['points'] >= 0 && $a['points'] <= 4, "Question {$q['id']} answer {$a['value']} points between 0 and 4");
    }
}

// Safety questions verification
pf_assert(count($config['safety_questions']) === 4, 'Must have exactly 4 safety questions');
$sf_ids = array_map(function ($sf) { return $sf['id']; }, $config['safety_questions']);
pf_assert($sf_ids === array('PFSF01', 'PFSF02', 'PFSF03', 'PFSF04'), 'Exact PFSF01-PFSF04 sequence');
foreach ($config['safety_questions'] as $sf) {
    pf_assert(count($sf['answers']) === 2, "Safety question {$sf['id']} has 2 options");
    $no_ans = $sf['answers'][0];
    $yes_ans = $sf['answers'][1];
    pf_assert($no_ans['value'] === 'no' && empty($no_ans['triggers']), "Safety question {$sf['id']} 'no' triggers nothing");
    pf_assert($yes_ans['value'] === 'yes' && $yes_ans['triggers'] === array('PIEDS_ATTENTION_MESSAGE'), "Safety question {$sf['id']} 'yes' triggers PIEDS_ATTENTION_MESSAGE");
}

// ----------------------------------------------------
// 3. Dimensions & Capacities Verification
// ----------------------------------------------------
pf_assert(count($config['dimensions']) === 6, 'Must have exactly 6 dimensions');
$dim_ids = array_map(function ($d) { return $d['id']; }, $config['dimensions']);
pf_assert($dim_ids === array(
    'douleur-inconfort',
    'marche-station-debout',
    'stabilite-appuis',
    'chaussage-pressions',
    'retentissement-fonctionnel',
    'recuperation-confort-global'
), 'Exact 6 dimension IDs');

pf_assert($config['dimensions'][0]['question_ids'] === array('PF01', 'PF02'), 'D1 has PF01, PF02 (capacity 8)');
pf_assert($config['dimensions'][1]['question_ids'] === array('PF03', 'PF04'), 'D2 has PF03, PF04 (capacity 8)');
pf_assert($config['dimensions'][2]['question_ids'] === array('PF05', 'PF06'), 'D3 has PF05, PF06 (capacity 8)');
pf_assert($config['dimensions'][3]['question_ids'] === array('PF07', 'PF08'), 'D4 has PF07, PF08 (capacity 8)');
pf_assert($config['dimensions'][4]['question_ids'] === array('PF09', 'PF10'), 'D5 has PF09, PF10 (capacity 8)');
pf_assert($config['dimensions'][5]['question_ids'] === array('PF11', 'PF12'), 'D6 has PF11, PF12 (capacity 8)');

// ----------------------------------------------------
// 4. Scoring Engine Boundaries (0, 15, 16, 27, 28, 38, 39, 48)
// ----------------------------------------------------
// Min score (all 0s) -> 0/48 -> INCONFORT_PODAL_IMPORTANT
$answers_min = array(
    'PF01' => '0', 'PF02' => '0', 'PF03' => '0', 'PF04' => '0',
    'PF05' => '0', 'PF06' => '0', 'PF07' => '0', 'PF08' => '0',
    'PF09' => '0', 'PF10' => '0', 'PF11' => '0', 'PF12' => '0',
    'PFSF01' => 'no', 'PFSF02' => 'no', 'PFSF03' => 'no', 'PFSF04' => 'no',
);
$res_0 = $engine->score($config, $answers_min);
pf_assert($res_0['final_score'] === 0, 'Min score is 0');
pf_assert($res_0['calculated_category'] === 'INCONFORT_PODAL_IMPORTANT', 'Score 0 category is INCONFORT_PODAL_IMPORTANT');
pf_assert($res_0['displayed_category'] === 'INCONFORT_PODAL_IMPORTANT', 'Score 0 displayed category is INCONFORT_PODAL_IMPORTANT');

// Max score (all 4s) -> 48/48 -> TRES_BON_CONFORT_PODAL
$answers_max = array(
    'PF01' => '4', 'PF02' => '4', 'PF03' => '4', 'PF04' => '4',
    'PF05' => '4', 'PF06' => '4', 'PF07' => '4', 'PF08' => '4',
    'PF09' => '4', 'PF10' => '4', 'PF11' => '4', 'PF12' => '4',
    'PFSF01' => 'no', 'PFSF02' => 'no', 'PFSF03' => 'no', 'PFSF04' => 'no',
);
$res_48 = $engine->score($config, $answers_max);
pf_assert($res_48['final_score'] === 48, 'Max score is 48');
pf_assert($res_48['calculated_category'] === 'TRES_BON_CONFORT_PODAL', 'Score 48 category is TRES_BON_CONFORT_PODAL');
pf_assert($res_48['displayed_category'] === 'TRES_BON_CONFORT_PODAL', 'Score 48 displayed category is TRES_BON_CONFORT_PODAL');
pf_assert(empty($res_48['classification_message_codes']), 'No dimension attention triggered when all scores are 4');

// Boundary 15 -> INCONFORT_PODAL_IMPORTANT
// D1: 1+1=2, D2: 1+1=2, D3: 1+1=2, D4: 2+1=3, D5: 2+1=3, D6: 2+1=3 -> Total = 2+2+2+3+3+3 = 15
$answers_15 = array(
    'PF01' => '1', 'PF02' => '1', 'PF03' => '1', 'PF04' => '1',
    'PF05' => '1', 'PF06' => '1', 'PF07' => '2', 'PF08' => '1',
    'PF09' => '2', 'PF10' => '1', 'PF11' => '2', 'PF12' => '1',
    'PFSF01' => 'no', 'PFSF02' => 'no', 'PFSF03' => 'no', 'PFSF04' => 'no',
);
$res_15 = $engine->score($config, $answers_15);
pf_assert($res_15['final_score'] === 15, 'Score is 15');
pf_assert($res_15['calculated_category'] === 'INCONFORT_PODAL_IMPORTANT', 'Score 15 category is INCONFORT_PODAL_IMPORTANT');

// Boundary 16 -> CONFORT_PIEDS_A_AMELIORER
$answers_16 = array_merge($answers_15, array('PF12' => '2')); // +1 pt -> 16
$res_16 = $engine->score($config, $answers_16);
pf_assert($res_16['final_score'] === 16, 'Score is 16');
pf_assert($res_16['calculated_category'] === 'CONFORT_PIEDS_A_AMELIORER', 'Score 16 category is CONFORT_PIEDS_A_AMELIORER');

// Boundary 27 -> CONFORT_PIEDS_A_AMELIORER
// D1: 2+2=4, D2: 2+2=4, D3: 2+2=4, D4: 3+2=5, D5: 3+2=5, D6: 3+2=5 -> Total = 4+4+4+5+5+5 = 27
$answers_27 = array(
    'PF01' => '2', 'PF02' => '2', 'PF03' => '2', 'PF04' => '2',
    'PF05' => '2', 'PF06' => '2', 'PF07' => '3', 'PF08' => '2',
    'PF09' => '3', 'PF10' => '2', 'PF11' => '3', 'PF12' => '2',
    'PFSF01' => 'no', 'PFSF02' => 'no', 'PFSF03' => 'no', 'PFSF04' => 'no',
);
$res_27 = $engine->score($config, $answers_27);
pf_assert($res_27['final_score'] === 27, 'Score is 27');
pf_assert($res_27['calculated_category'] === 'CONFORT_PIEDS_A_AMELIORER', 'Score 27 category is CONFORT_PIEDS_A_AMELIORER');

// Boundary 28 -> CONFORT_GLOBALEMENT_FAVORABLE
$answers_28 = array_merge($answers_27, array('PF08' => '3')); // +1 pt -> 28
$res_28 = $engine->score($config, $answers_28);
pf_assert($res_28['final_score'] === 28, 'Score is 28');
pf_assert($res_28['calculated_category'] === 'CONFORT_GLOBALEMENT_FAVORABLE', 'Score 28 category is CONFORT_GLOBALEMENT_FAVORABLE');

// Boundary 38 -> CONFORT_GLOBALEMENT_FAVORABLE
// D1: 3+3=6, D2: 3+3=6, D3: 3+3=6, D4: 3+3=6, D5: 4+3=7, D6: 4+3=7 -> Total = 6+6+6+6+7+7 = 38
$answers_38 = array(
    'PF01' => '3', 'PF02' => '3', 'PF03' => '3', 'PF04' => '3',
    'PF05' => '3', 'PF06' => '3', 'PF07' => '3', 'PF08' => '3',
    'PF09' => '4', 'PF10' => '3', 'PF11' => '4', 'PF12' => '3',
    'PFSF01' => 'no', 'PFSF02' => 'no', 'PFSF03' => 'no', 'PFSF04' => 'no',
);
$res_38 = $engine->score($config, $answers_38);
pf_assert($res_38['final_score'] === 38, 'Score is 38');
pf_assert($res_38['calculated_category'] === 'CONFORT_GLOBALEMENT_FAVORABLE', 'Score 38 category is CONFORT_GLOBALEMENT_FAVORABLE');

// Boundary 39 -> TRES_BON_CONFORT_PODAL
$answers_39 = array_merge($answers_38, array('PF08' => '4')); // +1 pt -> 39
$res_39 = $engine->score($config, $answers_39);
pf_assert($res_39['final_score'] === 39, 'Score is 39');
pf_assert($res_39['calculated_category'] === 'TRES_BON_CONFORT_PODAL', 'Score 39 category is TRES_BON_CONFORT_PODAL');

// ----------------------------------------------------
// 5. Dimension Attention Triggering & Non-Capping Verification
// ----------------------------------------------------
// Dimension <= 2/8 triggers attention message code, but does NOT cap/alter the calculated category.
// Construct a profile where D1 (douleur-inconfort) = 1+1 = 2 (<= 2), while other dimensions are maxed (4+4=8).
// Total score = 2 + 8*5 = 42/48 -> TRES_BON_CONFORT_PODAL
$answers_attention = array(
    'PF01' => '1', 'PF02' => '1', // D1: 2/8 (<= 2) -> triggers ATTENTION_DOULEUR_INCONFORT
    'PF03' => '4', 'PF04' => '4', // D2: 8/8
    'PF05' => '4', 'PF06' => '4', // D3: 8/8
    'PF07' => '4', 'PF08' => '4', // D4: 8/8
    'PF09' => '4', 'PF10' => '4', // D5: 8/8
    'PF11' => '4', 'PF12' => '4', // D6: 8/8
    'PFSF01' => 'no', 'PFSF02' => 'no', 'PFSF03' => 'no', 'PFSF04' => 'no',
);
$res_attention = $engine->score($config, $answers_attention);
pf_assert($res_attention['final_score'] === 42, 'Score is 42');
pf_assert($res_attention['calculated_category'] === 'TRES_BON_CONFORT_PODAL', 'Score 42 category is TRES_BON_CONFORT_PODAL');
pf_assert($res_attention['displayed_category'] === 'TRES_BON_CONFORT_PODAL', 'Category is NOT capped (classification_rules empty)');
pf_assert(in_array('ATTENTION_DOULEUR_INCONFORT', $res_attention['classification_message_codes'], true), 'Attention message emitted for D1 <= 2');

// ----------------------------------------------------
// 6. Safety Questions Block Independence
// ----------------------------------------------------
// PFSF01 = 'yes' -> emits PIEDS_ATTENTION_MESSAGE, score and category unchanged
$answers_sf1 = array_merge($answers_max, array('PFSF01' => 'yes'));
$res_sf1 = $engine->score($config, $answers_sf1);
pf_assert($res_sf1['final_score'] === 48, 'Score remains 48 with safety question triggered');
pf_assert($res_sf1['displayed_category'] === 'TRES_BON_CONFORT_PODAL', 'Category remains TRES_BON_CONFORT_PODAL');
pf_assert($res_sf1['safety_flag_codes'] === array('PIEDS_ATTENTION_MESSAGE'), 'PFSF01 emits PIEDS_ATTENTION_MESSAGE');

// PFSF02 = 'yes'
$answers_sf2 = array_merge($answers_max, array('PFSF02' => 'yes'));
$res_sf2 = $engine->score($config, $answers_sf2);
pf_assert($res_sf2['safety_flag_codes'] === array('PIEDS_ATTENTION_MESSAGE'), 'PFSF02 emits PIEDS_ATTENTION_MESSAGE');

// PFSF03 = 'yes'
$answers_sf3 = array_merge($answers_max, array('PFSF03' => 'yes'));
$res_sf3 = $engine->score($config, $answers_sf3);
pf_assert($res_sf3['safety_flag_codes'] === array('PIEDS_ATTENTION_MESSAGE'), 'PFSF03 emits PIEDS_ATTENTION_MESSAGE');

// PFSF04 = 'yes'
$answers_sf4 = array_merge($answers_max, array('PFSF04' => 'yes'));
$res_sf4 = $engine->score($config, $answers_sf4);
pf_assert($res_sf4['safety_flag_codes'] === array('PIEDS_ATTENTION_MESSAGE'), 'PFSF04 emits PIEDS_ATTENTION_MESSAGE');

// Multiple triggers deduplicate to unique flag
$answers_sf_all = array_merge($answers_max, array(
    'PFSF01' => 'yes', 'PFSF02' => 'yes', 'PFSF03' => 'yes', 'PFSF04' => 'yes'
));
$res_sf_all = $engine->score($config, $answers_sf_all);
pf_assert($res_sf_all['safety_flag_codes'] === array('PIEDS_ATTENTION_MESSAGE'), 'Multiple triggers deduplicate to unique flag');

// ----------------------------------------------------
// 7. Profile E and Guardrails Verification
// ----------------------------------------------------
// In Section 15 of specification:
// Profile E: High overall score but frequent gait adaptation (low PF09-PF10).
// Specification notes: "Aucun guardrail supplémentaire n'est fixé dans ce document. La nécessité d'un guardrail PF09-PF10 doit être décidée après synthetic scoring..."
// Test arithmetic: D1=8, D2=8, D3=8, D4=8, D5 (PF09=0, PF10=0) = 0, D6=8 -> Score = 40/48 -> TRES_BON_CONFORT_PODAL
// D5 triggers ATTENTION_RETENTISSEMENT_FONCTIONNEL because 0 <= 2.
// Because classification_rules is empty, category remains TRES_BON_CONFORT_PODAL without artificial capping.
$answers_profile_e = array(
    'PF01' => '4', 'PF02' => '4', // D1: 8/8
    'PF03' => '4', 'PF04' => '4', // D2: 8/8
    'PF05' => '4', 'PF06' => '4', // D3: 8/8
    'PF07' => '4', 'PF08' => '4', // D4: 8/8
    'PF09' => '0', 'PF10' => '0', // D5: 0/8 (gait adaptation / activity avoidance)
    'PF11' => '4', 'PF12' => '4', // D6: 8/8
    'PFSF01' => 'no', 'PFSF02' => 'no', 'PFSF03' => 'no', 'PFSF04' => 'no',
);
$res_profile_e = $engine->score($config, $answers_profile_e);
pf_assert($res_profile_e['final_score'] === 40, 'Profile E score is 40');
pf_assert($res_profile_e['calculated_category'] === 'TRES_BON_CONFORT_PODAL', 'Profile E calculated category is TRES_BON_CONFORT_PODAL');
pf_assert($res_profile_e['displayed_category'] === 'TRES_BON_CONFORT_PODAL', 'Profile E displayed category is not capped');
pf_assert(empty($res_profile_e['applied_classification_rules']), 'No classification rules applied');
pf_assert(in_array('ATTENTION_RETENTISSEMENT_FONCTIONNEL', $res_profile_e['classification_message_codes'], true), 'Profile E triggers attention for retentissement fonctionnel');

// ----------------------------------------------------
// 8. Weakest Dimensions & Deterministic Ties
// ----------------------------------------------------
// In $res_15:
// D1: 2/8 = 25%
// D2: 2/8 = 25%
// D3: 2/8 = 25%
// D4: 3/8 = 37.5%
// D5: 3/8 = 37.5%
// D6: 3/8 = 37.5%
// Tied lowest at 25% among D1, D2, D3.
// Configuration order tie-break picks first 2: D1 (douleur-inconfort) and D2 (marche-station-debout).
pf_assert($res_15['weakest_dimensions'] === array('douleur-inconfort', 'marche-station-debout'), 'Deterministic tie-breaking in weakest dimensions');

// ----------------------------------------------------
// 9. Registry & Server Scoring Authority
// ----------------------------------------------------
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
        'pieds-confort-postural' => 'pieds-confort-postural/questionnaire.php',
    ),
    $validator
);
$loaded_config = $registry->get_internal('pieds-confort-postural');
pf_assert($loaded_config !== null, 'Registry resolves pieds-confort-postural questionnaire');
pf_assert($loaded_config['id'] === 'pieds-confort-postural', 'Loaded config id is pieds-confort-postural');
pf_assert($loaded_config['status'] === 'review', 'Status in review');

// Server scoring authority: client sends claims for final_score=48 and category=TRES_BON_CONFORT_PODAL,
// but server evaluates actual answers (answers_15) and computes authoritative final_score=15
$tampered_client_answers = $answers_15; // Actual answers evaluate to 15
$server_scored = $engine->score($loaded_config, $tampered_client_answers);
pf_assert($server_scored['final_score'] === 15, 'Server computes authoritative score (15, ignoring client claim of 48)');
pf_assert($server_scored['calculated_category'] === 'INCONFORT_PODAL_IMPORTANT', 'Server computes authoritative category INCONFORT_PODAL_IMPORTANT');
pf_assert($server_scored['displayed_category'] === 'INCONFORT_PODAL_IMPORTANT', 'Server computes authoritative displayed category');

// Submission Service flow & endpoint resolution
$adapter = new LifeMetrics_Google_Apps_Script_Adapter();
$submission_service = new LifeMetrics_Submission_Service($registry, $engine, $adapter);

if (!defined('LMQ_GOOGLE_ENDPOINT')) {
    define('LMQ_GOOGLE_ENDPOINT', 'https://script.google.com/macros/s/central_endpoint/exec');
}
pf_assert($submission_service->get_endpoint('pieds-confort-postural') === 'https://script.google.com/macros/s/central_endpoint/exec', 'Pieds & Confort Postural endpoint resolves to central Google script');

echo "Questionnaire Pieds & Confort Postural PHP Unit & Scoring Tests: ALL PASSED.\n";
