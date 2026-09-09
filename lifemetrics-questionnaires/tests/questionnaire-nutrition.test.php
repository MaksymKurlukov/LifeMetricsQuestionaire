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

function nut_assert(bool $condition, string $message): void
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
$config = require __DIR__ . '/../questionnaires/nutrition/questionnaire.php';
$validation_errors = $validator->validate($config);
nut_assert(empty($validation_errors), 'Nutrition config must satisfy Schema 2.0.0: ' . implode(', ', $validation_errors));
nut_assert($config['id'] === 'nutrition', 'ID is nutrition');
nut_assert($config['version'] === '1.0.0', 'Version is 1.0.0');
nut_assert($config['status'] === 'review', 'Status is review');
nut_assert($config['locale'] === 'fr-FR', 'Locale is fr-FR');
nut_assert($config['scoring_direction'] === 'higher_is_better', 'Direction is higher_is_better');
nut_assert($config['score']['target_min'] === 0, 'Target min is 0');
nut_assert($config['score']['target_max'] === 48, 'Target max is 48');

// ----------------------------------------------------
// 2. Question Counts, Duplicate Points & Non-Linear Verification
// ----------------------------------------------------
nut_assert(count($config['questions']) === 12, 'Must have exactly 12 scored questions');

$q_ids = array_map(function ($q) { return $q['id']; }, $config['questions']);
nut_assert($q_ids === array('NT01', 'NT02', 'NT03', 'NT04', 'NT05', 'NT06', 'NT07', 'NT08', 'NT09', 'NT10', 'NT11', 'NT12'), 'Exact NT01-NT12 sequence');

// NT02 (Fruits) non-linear points verification (optimal at 2 fruits = 4 pts, >3 fruits = 3 pts)
$q2 = $config['questions'][1];
nut_assert($q2['id'] === 'NT02', 'Q2 is NT02');
nut_assert($q2['answers'][0]['points'] === 0, 'NT02 opt 0 = 0 pts');
nut_assert($q2['answers'][1]['points'] === 1, 'NT02 opt 1 = 1 pt');
nut_assert($q2['answers'][2]['points'] === 2, 'NT02 opt 2 = 2 pts');
nut_assert($q2['answers'][3]['points'] === 4, 'NT02 opt 3 (2 fruits) = 4 pts [MAX]');
nut_assert($q2['answers'][4]['points'] === 3, 'NT02 opt 4 (3+ fruits) = 3 pts [NON-LINEAR]');

// NT03 (Légumes secs) duplicate 4 pts verification
$q3 = $config['questions'][2];
nut_assert($q3['id'] === 'NT03', 'Q3 is NT03');
nut_assert($q3['answers'][0]['points'] === 0, 'NT03 opt 0 = 0 pts');
nut_assert($q3['answers'][1]['points'] === 1, 'NT03 opt 1 = 1 pt');
nut_assert($q3['answers'][2]['points'] === 2, 'NT03 opt 2 = 2 pts');
nut_assert($q3['answers'][3]['points'] === 4, 'NT03 opt 3 (2x/sem) = 4 pts [DUPLICATE MAX]');
nut_assert($q3['answers'][4]['points'] === 4, 'NT03 opt 4 (3x+/sem) = 4 pts [DUPLICATE MAX]');

// NT06 (Poisson & alternatives) duplicate 4 pts verification
$q6 = $config['questions'][5];
nut_assert($q6['id'] === 'NT06', 'Q6 is NT06');
nut_assert($q6['answers'][0]['points'] === 0, 'NT06 opt 0 = 0 pts');
nut_assert($q6['answers'][1]['points'] === 1, 'NT06 opt 1 = 1 pt');
nut_assert($q6['answers'][2]['points'] === 2, 'NT06 opt 2 = 2 pts');
nut_assert($q6['answers'][3]['points'] === 4, 'NT06 opt 3 (~2x/sem) = 4 pts [DUPLICATE MAX]');
nut_assert($q6['answers'][4]['points'] === 4, 'NT06 opt 4 (>2x/sem) = 4 pts [DUPLICATE MAX]');

// NT09 (Boissons sucrées) reverse scoring verification
$q9 = $config['questions'][8];
nut_assert($q9['id'] === 'NT09', 'Q9 is NT09');
nut_assert($q9['answers'][0]['points'] === 0, 'NT09 opt 0 (Plusieurs fois/j) = 0 pts');
nut_assert($q9['answers'][1]['points'] === 1, 'NT09 opt 1 (1x/j) = 1 pt');
nut_assert($q9['answers'][2]['points'] === 2, 'NT09 opt 2 (3-5x/sem) = 2 pts');
nut_assert($q9['answers'][3]['points'] === 3, 'NT09 opt 3 (1-2x/sem) = 3 pts');
nut_assert($q9['answers'][4]['points'] === 4, 'NT09 opt 4 (Rarement ou jamais) = 4 pts');

// NT10 (Produits transformés) reverse scoring verification
$q10 = $config['questions'][9];
nut_assert($q10['id'] === 'NT10', 'Q10 is NT10');
nut_assert($q10['answers'][0]['points'] === 0, 'NT10 opt 0 (Plusieurs fois/j) = 0 pts');
nut_assert($q10['answers'][1]['points'] === 1, 'NT10 opt 1 (Au moins 1x/j) = 1 pt');
nut_assert($q10['answers'][2]['points'] === 2, 'NT10 opt 2 (4-6x/sem) = 2 pts');
nut_assert($q10['answers'][3]['points'] === 3, 'NT10 opt 3 (2-3x/sem) = 3 pts');
nut_assert($q10['answers'][4]['points'] === 4, 'NT10 opt 4 (Rarement) = 4 pts');

// ----------------------------------------------------
// 3. Dimensions & Capacities Verification
// ----------------------------------------------------
nut_assert(count($config['dimensions']) === 6, 'Must have exactly 6 dimensions');
$dim_ids = array_map(function ($d) { return $d['id']; }, $config['dimensions']);
nut_assert($dim_ids === array(
    'fruits-legumes-diversite',
    'fibres-glucides-qualite',
    'proteines-variete',
    'matieres-grasses-qualite',
    'produits-a-limiter',
    'organisation-equilibre-global'
), 'Exact 6 dimension IDs');

nut_assert($config['dimensions'][0]['question_ids'] === array('NT01', 'NT02'), 'D1 has NT01, NT02');
nut_assert($config['dimensions'][1]['question_ids'] === array('NT03', 'NT04'), 'D2 has NT03, NT04');
nut_assert($config['dimensions'][2]['question_ids'] === array('NT05', 'NT06'), 'D3 has NT05, NT06');
nut_assert($config['dimensions'][3]['question_ids'] === array('NT07', 'NT08'), 'D4 has NT07, NT08');
nut_assert($config['dimensions'][4]['question_ids'] === array('NT09', 'NT10'), 'D5 has NT09, NT10');
nut_assert($config['dimensions'][5]['question_ids'] === array('NT11', 'NT12'), 'D6 has NT11, NT12');

// ----------------------------------------------------
// 4. Scoring Engine Boundaries (0, 15, 16, 27, 28, 38, 39, 48)
// ----------------------------------------------------
$base_safety = array('NTSF01' => 'no', 'NTSF02' => 'no', 'NTSF03' => 'no');

// Min score (all 0-point answers: NT01-NT12 value '0') -> 0/48 -> HABITUDES_A_AMELIORER
$answers_min = array_merge($base_safety, array(
    'NT01' => '0', 'NT02' => '0', 'NT03' => '0', 'NT04' => '0',
    'NT05' => '0', 'NT06' => '0', 'NT07' => '0', 'NT08' => '0',
    'NT09' => '0', 'NT10' => '0', 'NT11' => '0', 'NT12' => '0',
));
$res_0 = $engine->score($config, $answers_min);
nut_assert($res_0['final_score'] === 0, 'Min score is 0');
nut_assert($res_0['calculated_category'] === 'HABITUDES_A_AMELIORER', 'Score 0 category is HABITUDES_A_AMELIORER');
nut_assert($res_0['displayed_category'] === 'HABITUDES_A_AMELIORER', 'Score 0 displayed category is HABITUDES_A_AMELIORER');

// Max score (NT01=4 [4pts], NT02=3 [4pts], NT03=3 [4pts], NT04=4 [4pts], NT05=4 [4pts], NT06=3 [4pts], NT07=4 [4pts], NT08=4 [4pts], NT09=4 [4pts], NT10=4 [4pts], NT11=4 [4pts], NT12=4 [4pts]) -> 48/48 -> HABITUDES_TRES_FAVORABLES
$answers_max = array_merge($base_safety, array(
    'NT01' => '4', 'NT02' => '3', 'NT03' => '3', 'NT04' => '4',
    'NT05' => '4', 'NT06' => '3', 'NT07' => '4', 'NT08' => '4',
    'NT09' => '4', 'NT10' => '4', 'NT11' => '4', 'NT12' => '4',
));
$res_48 = $engine->score($config, $answers_max);
nut_assert($res_48['final_score'] === 48, 'Max score is 48');
nut_assert($res_48['calculated_category'] === 'HABITUDES_TRES_FAVORABLES', 'Score 48 category is HABITUDES_TRES_FAVORABLES');
nut_assert($res_48['displayed_category'] === 'HABITUDES_TRES_FAVORABLES', 'Score 48 displayed category is HABITUDES_TRES_FAVORABLES');

// Max score using alternative duplicate-max answers for NT03 and NT06 (NT03=4 [4pts], NT06=4 [4pts])
$answers_max_alt = array_merge($answers_max, array('NT03' => '4', 'NT06' => '4'));
$res_48_alt = $engine->score($config, $answers_max_alt);
nut_assert($res_48_alt['final_score'] === 48, 'Max score with NT03=4 and NT06=4 is also 48');
nut_assert($res_48_alt['calculated_category'] === 'HABITUDES_TRES_FAVORABLES', 'Alt max category is HABITUDES_TRES_FAVORABLES');

// Boundary 15 -> HABITUDES_A_AMELIORER
$answers_15 = array_merge($base_safety, array(
    'NT01' => '2', 'NT02' => '1', // D1: 2+1=3
    'NT03' => '1', 'NT04' => '1', // D2: 1+1=2
    'NT05' => '2', 'NT06' => '1', // D3: 2+1=3
    'NT07' => '1', 'NT08' => '1', // D4: 1+1=2
    'NT09' => '2', 'NT10' => '1', // D5: 2+1=3
    'NT11' => '1', 'NT12' => '1', // D6: 1+1=2 -> Total = 3+2+3+2+3+2 = 15
));
$res_15 = $engine->score($config, $answers_15);
nut_assert($res_15['final_score'] === 15, 'Score is 15');
nut_assert($res_15['calculated_category'] === 'HABITUDES_A_AMELIORER', 'Score 15 category is HABITUDES_A_AMELIORER');

// Boundary 16 -> EQUILIBRE_A_RENFORCER
$answers_16 = array_merge($answers_15, array('NT12' => '2')); // +1 pt -> 16
$res_16 = $engine->score($config, $answers_16);
nut_assert($res_16['final_score'] === 16, 'Score is 16');
nut_assert($res_16['calculated_category'] === 'EQUILIBRE_A_RENFORCER', 'Score 16 category is EQUILIBRE_A_RENFORCER');

// Boundary 27 -> EQUILIBRE_A_RENFORCER
$answers_27 = array_merge($base_safety, array(
    'NT01' => '3', 'NT02' => '2', // D1: 3+2=5
    'NT03' => '2', 'NT04' => '2', // D2: 2+2=4
    'NT05' => '3', 'NT06' => '2', // D3: 3+2=5
    'NT07' => '2', 'NT08' => '2', // D4: 2+2=4
    'NT09' => '3', 'NT10' => '2', // D5: 3+2=5
    'NT11' => '2', 'NT12' => '2', // D6: 2+2=4 -> Total = 5+4+5+4+5+4 = 27
));
$res_27 = $engine->score($config, $answers_27);
nut_assert($res_27['final_score'] === 27, 'Score is 27');
nut_assert($res_27['calculated_category'] === 'EQUILIBRE_A_RENFORCER', 'Score 27 category is EQUILIBRE_A_RENFORCER');

// Boundary 28 -> PROFIL_GLOBALEMENT_FAVORABLE
$answers_28 = array_merge($answers_27, array('NT04' => '3')); // +1 pt -> 28
$res_28 = $engine->score($config, $answers_28);
nut_assert($res_28['final_score'] === 28, 'Score is 28');
nut_assert($res_28['calculated_category'] === 'PROFIL_GLOBALEMENT_FAVORABLE', 'Score 28 category is PROFIL_GLOBALEMENT_FAVORABLE');

// Boundary 38 -> PROFIL_GLOBALEMENT_FAVORABLE
$answers_38 = array_merge($base_safety, array(
    'NT01' => '4', 'NT02' => '4', // D1: 4+3=7 (NT02 '4' is 3pts)
    'NT03' => '3', 'NT04' => '3', // D2: 4+3=7 (NT03 '3' is 4pts)
    'NT05' => '3', 'NT06' => '3', // D3: 3+4=7 (NT06 '3' is 4pts)
    'NT07' => '3', 'NT08' => '3', // D4: 3+3=6
    'NT09' => '4', 'NT10' => '2', // D5: 4+2=6
    'NT11' => '3', 'NT12' => '2', // D6: 3+2=5 -> Total = 7+7+7+6+6+5 = 38
));
$res_38 = $engine->score($config, $answers_38);
nut_assert($res_38['final_score'] === 38, 'Score is 38');
nut_assert($res_38['calculated_category'] === 'PROFIL_GLOBALEMENT_FAVORABLE', 'Score 38 category is PROFIL_GLOBALEMENT_FAVORABLE');

// Boundary 39 -> HABITUDES_TRES_FAVORABLES
$answers_39 = array_merge($answers_38, array('NT12' => '3')); // +1 pt -> 39
$res_39 = $engine->score($config, $answers_39);
nut_assert($res_39['final_score'] === 39, 'Score is 39');
nut_assert($res_39['calculated_category'] === 'HABITUDES_TRES_FAVORABLES', 'Score 39 category is HABITUDES_TRES_FAVORABLES');

// ----------------------------------------------------
// 5. Weakest Dimensions & Deterministic Ties
// ----------------------------------------------------
// In $res_15:
// D1=3/8 (37.5%), D2=2/8 (25%), D3=3/8 (37.5%), D4=2/8 (25%), D5=3/8 (37.5%), D6=2/8 (25%)
// Lowest percentage (25%) tied among D2, D4, D6.
// Configuration order tie-break picks first 2 lowest: D2 (fibres-glucides-qualite) and D4 (matieres-grasses-qualite).
nut_assert($res_15['weakest_dimensions'] === array('fibres-glucides-qualite', 'matieres-grasses-qualite'), 'Deterministic tie-breaking in weakest dimensions');

// ----------------------------------------------------
// 6. Safety Questions Independence
// ----------------------------------------------------
// NTSF01 alone
$res_sf1 = $engine->score($config, array_merge($answers_max, array('NTSF01' => 'yes')));
nut_assert($res_sf1['final_score'] === 48, 'Safety does not alter score (48)');
nut_assert($res_sf1['calculated_category'] === 'HABITUDES_TRES_FAVORABLES', 'Safety does not alter category');
nut_assert($res_sf1['safety_flag_codes'] === array('NUTRITION_ATTENTION_MESSAGE'), 'NTSF01 emits NUTRITION_ATTENTION_MESSAGE');

// NTSF02 alone
$res_sf2 = $engine->score($config, array_merge($answers_max, array('NTSF02' => 'yes')));
nut_assert($res_sf2['safety_flag_codes'] === array('NUTRITION_ATTENTION_MESSAGE'), 'NTSF02 emits NUTRITION_ATTENTION_MESSAGE');

// NTSF03 alone
$res_sf3 = $engine->score($config, array_merge($answers_max, array('NTSF03' => 'yes')));
nut_assert($res_sf3['safety_flag_codes'] === array('NUTRITION_ATTENTION_MESSAGE'), 'NTSF03 emits NUTRITION_ATTENTION_MESSAGE');

// NTSF01 no -> no trigger
$res_sf_no = $engine->score($config, array_merge($answers_max, array('NTSF01' => 'no', 'NTSF02' => 'no', 'NTSF03' => 'no')));
nut_assert($res_sf_no['safety_flag_codes'] === array(), 'No safety flags when all answers are no');

// Multiple simultaneous safety triggers
$res_sf_all = $engine->score($config, array_merge($answers_max, array('NTSF01' => 'yes', 'NTSF02' => 'yes', 'NTSF03' => 'yes')));
nut_assert($res_sf_all['final_score'] === 48, 'Score unaffected by multiple safety flags');
nut_assert($res_sf_all['safety_flag_codes'] === array('NUTRITION_ATTENTION_MESSAGE'), 'Multiple triggers deduplicate to unique flag');

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
// 7. Registry & Server Scoring Authority
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
    ),
    $validator
);
$loaded_config = $registry->get_internal('nutrition');
nut_assert($loaded_config !== null, 'Registry resolves nutrition questionnaire');
nut_assert($loaded_config['id'] === 'nutrition', 'Loaded config id is nutrition');
nut_assert($loaded_config['status'] === 'review', 'Status in review');

// Server scoring authority: client sends claims for final_score=48 and category=HABITUDES_TRES_FAVORABLES,
// but server evaluates actual answers (answers_15) and computes authoritative final_score=15
$tampered_client_answers = $answers_15; // Actual answers evaluate to 15
$server_scored = $engine->score($loaded_config, $tampered_client_answers);
nut_assert($server_scored['final_score'] === 15, 'Server computes authoritative score (15, ignoring client claim of 48)');
nut_assert($server_scored['calculated_category'] === 'HABITUDES_A_AMELIORER', 'Server computes authoritative category HABITUDES_A_AMELIORER');
nut_assert($server_scored['displayed_category'] === 'HABITUDES_A_AMELIORER', 'Server computes authoritative displayed category');

// Submission Service flow with ready-state mock
$ready_config = array_merge($loaded_config, array('status' => 'ready'));
$mock_registry = new LifeMetrics_Questionnaire_Registry(
    __DIR__ . '/../questionnaires',
    array('nutrition' => 'nutrition/questionnaire.php'),
    $validator
);
$adapter = new LifeMetrics_Google_Apps_Script_Adapter();
$submission_service = new LifeMetrics_Submission_Service($registry, $engine, $adapter);

// Verify endpoint resolution
if (!defined('LMQ_GOOGLE_ENDPOINT')) {
    define('LMQ_GOOGLE_ENDPOINT', 'https://script.google.com/macros/s/central_endpoint/exec');
}
nut_assert($submission_service->get_endpoint('nutrition') === 'https://script.google.com/macros/s/central_endpoint/exec', 'Nutrition endpoint resolves to central Google script');

echo "Questionnaire Nutrition PHP Unit & Scoring Tests: ALL PASSED.\n";
