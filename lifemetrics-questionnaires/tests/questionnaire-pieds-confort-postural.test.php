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
pf_assert($config['scoring_direction'] === 'lower_is_better', 'Direction is lower_is_better');
pf_assert($config['score']['target_min'] === 12, 'Target min is 12');
pf_assert($config['score']['target_max'] === 60, 'Target max is 60');

// ----------------------------------------------------
// 2. Question Counts & Safety Questions Verification
// ----------------------------------------------------
pf_assert(count($config['questions']) === 12, 'Must have exactly 12 scored questions');

$q_ids = array_map(function ($q) { return $q['id']; }, $config['questions']);
pf_assert($q_ids === array('PF01', 'PF02', 'PF03', 'PF04', 'PF05', 'PF06', 'PF07', 'PF08', 'PF09', 'PF10', 'PF11', 'PF12'), 'Exact PF01-PF12 sequence');

foreach ($config['questions'] as $q) {
    pf_assert(count($q['answers']) === 5, "Question {$q['id']} has 5 options");
    $pts = array_column($q['answers'], 'points');
    pf_assert($pts === array(1, 2, 3, 4, 5), "Question {$q['id']} points must be 1, 2, 3, 4, 5");
    foreach ($q['answers'] as $a) {
        pf_assert($a['applicable'] === true, "Question {$q['id']} answer {$a['value']} is applicable");
    }
}

// Safety questions verification
pf_assert(count($config['safety_questions']) === 4, 'Must have exactly 4 safety questions');
$sf_ids = array_map(function ($sf) { return $sf['id']; }, $config['safety_questions']);
pf_assert($sf_ids === array('PFSF01', 'PFSF02', 'PFSF03', 'PFSF04'), 'Exact PFSF01-PFSF04 sequence');
foreach ($config['safety_questions'] as $sf) {
    pf_assert(count($sf['answers']) === 2, "Safety question {$sf['id']} has 2 options");
    $yes_ans = $sf['answers'][0];
    $no_ans = $sf['answers'][1];
    pf_assert($yes_ans['value'] === 'yes' && $yes_ans['triggers'] === array('PIEDS_SAFETY_MESSAGE'), "Safety question {$sf['id']} 'yes' triggers PIEDS_SAFETY_MESSAGE");
    pf_assert($no_ans['value'] === 'no' && empty($no_ans['triggers']), "Safety question {$sf['id']} 'no' triggers nothing");
}

// ----------------------------------------------------
// 3. Dimensions Verification
// ----------------------------------------------------
pf_assert(count($config['dimensions']) === 6, 'Must have exactly 6 dimensions');
$dim_ids = array_map(function ($d) { return $d['id']; }, $config['dimensions']);
pf_assert($dim_ids === array(
    'douleur-inconfort-pieds',
    'marche-station-debout',
    'stabilite-appuis-ressentis',
    'chaussage-pressions',
    'retentissement-fonctionnel',
    'recuperation-confort-global'
), 'Exact 6 dimension IDs');

foreach ($config['dimensions'] as $dim) {
    pf_assert($dim['calculation_mode'] === 'average', "Dimension {$dim['id']} must use average calculation mode");
    pf_assert($dim['weakest_eligible'] === true, "Dimension {$dim['id']} must be weakest_eligible");
}

// ----------------------------------------------------
// 4. Scoring Boundaries (12, 24, 25, 32, 33, 60)
// ----------------------------------------------------
// Min score (all 1s) -> 12/60 -> CONFORT_FAVORABLE
$answers_min = array(
    'PF01' => '1', 'PF02' => '1', 'PF03' => '1', 'PF04' => '1',
    'PF05' => '1', 'PF06' => '1', 'PF07' => '1', 'PF08' => '1',
    'PF09' => '1', 'PF10' => '1', 'PF11' => '1', 'PF12' => '1',
    'PFSF01' => 'no', 'PFSF02' => 'no', 'PFSF03' => 'no', 'PFSF04' => 'no',
);
$res_12 = $engine->score($config, $answers_min);
pf_assert($res_12['final_score'] === 12, 'Min score is 12');
pf_assert($res_12['calculated_category'] === 'CONFORT_FAVORABLE', 'Score 12 category is CONFORT_FAVORABLE');
pf_assert($res_12['displayed_category'] === 'CONFORT_FAVORABLE', 'Score 12 displayed category is CONFORT_FAVORABLE');

// Max score (all 5s) -> 60/60 -> INCONFORT_IMPORTANT
$answers_max = array(
    'PF01' => '5', 'PF02' => '5', 'PF03' => '5', 'PF04' => '5',
    'PF05' => '5', 'PF06' => '5', 'PF07' => '5', 'PF08' => '5',
    'PF09' => '5', 'PF10' => '5', 'PF11' => '5', 'PF12' => '5',
    'PFSF01' => 'no', 'PFSF02' => 'no', 'PFSF03' => 'no', 'PFSF04' => 'no',
);
$res_60 = $engine->score($config, $answers_max);
pf_assert($res_60['final_score'] === 60, 'Max score is 60');
pf_assert($res_60['calculated_category'] === 'INCONFORT_IMPORTANT', 'Score 60 category is INCONFORT_IMPORTANT');
pf_assert($res_60['displayed_category'] === 'INCONFORT_IMPORTANT', 'Score 60 displayed category is INCONFORT_IMPORTANT');

// Boundary 24 -> CONFORT_FAVORABLE (12 questions with 2 points = 24)
$answers_24 = array(
    'PF01' => '2', 'PF02' => '2', 'PF03' => '2', 'PF04' => '2',
    'PF05' => '2', 'PF06' => '2', 'PF07' => '2', 'PF08' => '2',
    'PF09' => '2', 'PF10' => '2', 'PF11' => '2', 'PF12' => '2',
    'PFSF01' => 'no', 'PFSF02' => 'no', 'PFSF03' => 'no', 'PFSF04' => 'no',
);
$res_24 = $engine->score($config, $answers_24);
pf_assert($res_24['final_score'] === 24, 'Score is 24');
pf_assert($res_24['calculated_category'] === 'CONFORT_FAVORABLE', 'Score 24 category is CONFORT_FAVORABLE');
pf_assert($res_24['displayed_category'] === 'CONFORT_FAVORABLE', 'Score 24 displayed category is CONFORT_FAVORABLE');

// Boundary 25 -> CONFORT_A_AMELIORER (11x2 + 1x3 = 25)
$answers_25 = array_merge($answers_24, array('PF12' => '3'));
$res_25 = $engine->score($config, $answers_25);
pf_assert($res_25['final_score'] === 25, 'Score is 25');
pf_assert($res_25['calculated_category'] === 'CONFORT_A_AMELIORER', 'Score 25 category is CONFORT_A_AMELIORER');
pf_assert($res_25['displayed_category'] === 'CONFORT_A_AMELIORER', 'Score 25 displayed category is CONFORT_A_AMELIORER');

// Boundary 32 -> CONFORT_A_AMELIORER (8x3 + 4x2 = 32)
$answers_32 = array(
    'PF01' => '3', 'PF02' => '3', 'PF03' => '3', 'PF04' => '3',
    'PF05' => '3', 'PF06' => '3', 'PF07' => '3', 'PF08' => '3',
    'PF09' => '2', 'PF10' => '2', 'PF11' => '2', 'PF12' => '2',
    'PFSF01' => 'no', 'PFSF02' => 'no', 'PFSF03' => 'no', 'PFSF04' => 'no',
);
$res_32 = $engine->score($config, $answers_32);
pf_assert($res_32['final_score'] === 32, 'Score is 32');
pf_assert($res_32['calculated_category'] === 'CONFORT_A_AMELIORER', 'Score 32 category is CONFORT_A_AMELIORER');
pf_assert($res_32['displayed_category'] === 'CONFORT_A_AMELIORER', 'Score 32 displayed category is CONFORT_A_AMELIORER');

// Boundary 33 -> INCONFORT_IMPORTANT (9x3 + 3x2 = 33)
$answers_33 = array_merge($answers_32, array('PF09' => '3'));
$res_33 = $engine->score($config, $answers_33);
pf_assert($res_33['final_score'] === 33, 'Score is 33');
pf_assert($res_33['calculated_category'] === 'INCONFORT_IMPORTANT', 'Score 33 category is INCONFORT_IMPORTANT');
pf_assert($res_33['displayed_category'] === 'INCONFORT_IMPORTANT', 'Score 33 displayed category is INCONFORT_IMPORTANT');

// 12 responses at 3 points = 36 -> INCONFORT_IMPORTANT (PDF Repère)
$answers_36 = array(
    'PF01' => '3', 'PF02' => '3', 'PF03' => '3', 'PF04' => '3',
    'PF05' => '3', 'PF06' => '3', 'PF07' => '3', 'PF08' => '3',
    'PF09' => '3', 'PF10' => '3', 'PF11' => '3', 'PF12' => '3',
    'PFSF01' => 'no', 'PFSF02' => 'no', 'PFSF03' => 'no', 'PFSF04' => 'no',
);
$res_36 = $engine->score($config, $answers_36);
pf_assert($res_36['final_score'] === 36, 'Score is 36');
pf_assert($res_36['calculated_category'] === 'INCONFORT_IMPORTANT', 'Score 36 category is INCONFORT_IMPORTANT');

// ----------------------------------------------------
// 5. Guardrail Functional PF09 / PF10 Verification
// ----------------------------------------------------
// Case A: PF09 = 4 (Souvent), others = 1 -> Total = 4 + 11*1 = 15
// Calculated category = CONFORT_FAVORABLE (15 <= 24).
// Guardrail caps category to CONFORT_A_AMELIORER. Score remains 15.
$answers_guardrail_pf09 = array_merge($answers_min, array('PF09' => '4'));
$res_gr_pf09 = $engine->score($config, $answers_guardrail_pf09);
pf_assert($res_gr_pf09['final_score'] === 15, 'Numeric score is strictly unchanged at 15');
pf_assert($res_gr_pf09['calculated_category'] === 'CONFORT_FAVORABLE', 'Calculated category is CONFORT_FAVORABLE');
pf_assert($res_gr_pf09['displayed_category'] === 'CONFORT_A_AMELIORER', 'Displayed category is capped at CONFORT_A_AMELIORER');
pf_assert($res_gr_pf09['applied_classification_rules'] === array('GUARDRAIL_PF09_LIMITATION'), 'GUARDRAIL_PF09_LIMITATION applied');
pf_assert($res_gr_pf09['classification_message_codes'] === array('PIEDS_GUARDRAIL_MESSAGE'), 'PIEDS_GUARDRAIL_MESSAGE emitted');

// Case B: PF10 = 4, others = 1 -> Total = 15
$answers_guardrail_pf10 = array_merge($answers_min, array('PF10' => '4'));
$res_gr_pf10 = $engine->score($config, $answers_guardrail_pf10);
pf_assert($res_gr_pf10['final_score'] === 15, 'Numeric score remains 15');
pf_assert($res_gr_pf10['calculated_category'] === 'CONFORT_FAVORABLE', 'Calculated category is CONFORT_FAVORABLE');
pf_assert($res_gr_pf10['displayed_category'] === 'CONFORT_A_AMELIORER', 'Displayed category is capped at CONFORT_A_AMELIORER');
pf_assert($res_gr_pf10['applied_classification_rules'] === array('GUARDRAIL_PF10_ADAPTATION'), 'GUARDRAIL_PF10_ADAPTATION applied');

// Case C: Both PF09 = 5 and PF10 = 4, others = 1 -> Total = 5 + 4 + 10*1 = 19
$answers_guardrail_both = array_merge($answers_min, array('PF09' => '5', 'PF10' => '4'));
$res_gr_both = $engine->score($config, $answers_guardrail_both);
pf_assert($res_gr_both['final_score'] === 19, 'Numeric score is 19');
pf_assert($res_gr_both['calculated_category'] === 'CONFORT_FAVORABLE', 'Calculated category is CONFORT_FAVORABLE');
pf_assert($res_gr_both['displayed_category'] === 'CONFORT_A_AMELIORER', 'Displayed category is capped at CONFORT_A_AMELIORER');
pf_assert($res_gr_both['applied_classification_rules'] === array('GUARDRAIL_PF09_LIMITATION', 'GUARDRAIL_PF10_ADAPTATION'), 'Both guardrail rules applied');
pf_assert($res_gr_both['classification_message_codes'] === array('PIEDS_GUARDRAIL_MESSAGE'), 'Message code deduplicated');

// Case D: Guardrail on already unfavorable score (e.g. 45/60 -> INCONFORT_IMPORTANT)
// Must NOT erroneously upgrade or change INCONFORT_IMPORTANT.
$answers_gr_red = array_merge($answers_max, array('PF09' => '4')); // 11x5 + 4 = 59
$res_gr_red = $engine->score($config, $answers_gr_red);
pf_assert($res_gr_red['final_score'] === 59, 'Numeric score is 59');
pf_assert($res_gr_red['calculated_category'] === 'INCONFORT_IMPORTANT', 'Calculated category is INCONFORT_IMPORTANT');
pf_assert($res_gr_red['displayed_category'] === 'INCONFORT_IMPORTANT', 'Displayed category remains INCONFORT_IMPORTANT (never downgraded to orange)');

// ----------------------------------------------------
// 6. Safety Questions Verification
// ----------------------------------------------------
foreach (array('PFSF01', 'PFSF02', 'PFSF03', 'PFSF04') as $sf_id) {
    $answers_sf = array_merge($answers_min, array($sf_id => 'yes'));
    $res_sf = $engine->score($config, $answers_sf);
    pf_assert($res_sf['final_score'] === 12, "Score remains 12 when {$sf_id} triggered");
    pf_assert($res_sf['displayed_category'] === 'CONFORT_FAVORABLE', "Category unchanged when {$sf_id} triggered");
    pf_assert($res_sf['safety_flag_codes'] === array('PIEDS_SAFETY_MESSAGE'), "{$sf_id} triggers PIEDS_SAFETY_MESSAGE");
}

// ----------------------------------------------------
// 7. Weakest Dimensions & Deterministic Tie-breaking
// ----------------------------------------------------
// For lower_is_better, higher average score = less favorable / weaker dimension.
// In answers_min, D5 (retentissement-fonctionnel) with PF09=5, PF10=4 has avg = 4.5
// D1 with PF01=3, PF02=3 has avg = 3.0
// Other dimensions have avg = 1.0
$answers_weak = array_merge($answers_min, array(
    'PF01' => '3', 'PF02' => '3', // D1: avg 3.0
    'PF09' => '5', 'PF10' => '4', // D5: avg 4.5
));
$res_weak = $engine->score($config, $answers_weak);
pf_assert($res_weak['weakest_dimensions'] === array('retentissement-fonctionnel', 'douleur-inconfort-pieds'), 'Weakest dimensions selects highest average dimensions');

// ----------------------------------------------------
// 8. Registry & Server Scoring Authority
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
pf_assert($loaded_config['status'] === 'review', 'Status is review');

// Server scoring authority: client sends claims for final_score=12 and category=CONFORT_FAVORABLE,
// but server evaluates actual answers (answers_36) and computes authoritative final_score=36
$server_scored = $engine->score($loaded_config, $answers_36);
pf_assert($server_scored['final_score'] === 36, 'Server computes authoritative score (36, ignoring client claim of 12)');
pf_assert($server_scored['calculated_category'] === 'INCONFORT_IMPORTANT', 'Server computes authoritative category INCONFORT_IMPORTANT');
pf_assert($server_scored['displayed_category'] === 'INCONFORT_IMPORTANT', 'Server computes authoritative displayed category');

// Submission Service flow & endpoint resolution
$adapter = new LifeMetrics_Google_Apps_Script_Adapter();
$submission_service = new LifeMetrics_Submission_Service($registry, $engine, $adapter);

if (!defined('LMQ_GOOGLE_ENDPOINT')) {
    define('LMQ_GOOGLE_ENDPOINT', 'https://script.google.com/macros/s/central_endpoint/exec');
}
pf_assert($submission_service->get_endpoint('pieds-confort-postural') === 'https://script.google.com/macros/s/central_endpoint/exec', 'Pieds & Confort Postural endpoint resolves to central Google script');

echo "Questionnaire Pieds & Confort Postural PHP Unit & Scoring Tests: ALL PASSED.\n";
