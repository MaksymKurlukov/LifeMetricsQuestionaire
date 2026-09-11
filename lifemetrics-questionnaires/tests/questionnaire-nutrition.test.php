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
nut_assert($config['scoring_direction'] === 'lower_is_better', 'Direction is lower_is_better');
nut_assert($config['score']['target_min'] === 12, 'Target min is 12');
nut_assert($config['score']['target_max'] === 60, 'Target max is 60');

// ----------------------------------------------------
// 2. Question Counts & Specific Plateau Verification (Q3 & Q6)
// ----------------------------------------------------
nut_assert(count($config['questions']) === 12, 'Must have exactly 12 scored questions');

$q_ids = array_map(function ($q) { return $q['id']; }, $config['questions']);
nut_assert($q_ids === array('NT01', 'NT02', 'NT03', 'NT04', 'NT05', 'NT06', 'NT07', 'NT08', 'NT09', 'NT10', 'NT11', 'NT12'), 'Exact NT01-NT12 sequence');

// NT03 (Légumes secs) specific plateau & point mapping
$q3 = $config['questions'][2];
nut_assert($q3['id'] === 'NT03', 'Q3 is NT03');
nut_assert(count($q3['answers']) === 5, 'NT03 has 5 answers');
nut_assert($q3['answers'][0]['value'] === '3_or_more_week' && $q3['answers'][0]['points'] === 1, 'NT03 opt 3+ /sem = 1 pt');
nut_assert($q3['answers'][1]['value'] === '2_week' && $q3['answers'][1]['points'] === 1, 'NT03 opt 2 /sem = 1 pt [PLATEAU]');
nut_assert($q3['answers'][2]['value'] === 'about_1_week' && $q3['answers'][2]['points'] === 3, 'NT03 opt ~1 /sem = 3 pts');
nut_assert($q3['answers'][3]['value'] === 'less_1_week' && $q3['answers'][3]['points'] === 4, 'NT03 opt <1 /sem = 4 pts');
nut_assert($q3['answers'][4]['value'] === 'almost_never' && $q3['answers'][4]['points'] === 5, 'NT03 opt Jamais/presque jamais = 5 pts');

// NT06 (Poisson et alternatives) specific plateau & point mapping
$q6 = $config['questions'][5];
nut_assert($q6['id'] === 'NT06', 'Q6 is NT06');
nut_assert(count($q6['answers']) === 5, 'NT06 has 5 answers');
nut_assert($q6['answers'][0]['value'] === 'more_2_week' && $q6['answers'][0]['points'] === 1, 'NT06 opt >2 /sem = 1 pt');
nut_assert($q6['answers'][1]['value'] === 'about_2_week' && $q6['answers'][1]['points'] === 1, 'NT06 opt ~2 /sem = 1 pt [PLATEAU]');
nut_assert($q6['answers'][2]['value'] === 'about_1_week' && $q6['answers'][2]['points'] === 3, 'NT06 opt ~1 /sem = 3 pts');
nut_assert($q6['answers'][3]['value'] === 'less_1_week' && $q6['answers'][3]['points'] === 4, 'NT06 opt <1 /sem = 4 pts');
nut_assert($q6['answers'][4]['value'] === 'never' && $q6['answers'][4]['points'] === 5, 'NT06 opt Jamais = 5 pts');

// ----------------------------------------------------
// 3. Dimensions & Capacities Verification
// ----------------------------------------------------
nut_assert(count($config['dimensions']) === 6, 'Must have exactly 6 dimensions');
$dim_ids = array_map(function ($d) { return $d['id']; }, $config['dimensions']);
nut_assert($dim_ids === array(
    'fruits-legumes-diversite-vegetale',
    'fibres-glucides-qualite',
    'proteines-variete-alimentaire',
    'matieres-grasses-qualite-aliments',
    'produits-a-limiter',
    'organisation-equilibre-global'
), 'Exact 6 dimension IDs');

nut_assert($config['dimensions'][0]['question_ids'] === array('NT01', 'NT02'), 'D1 has NT01, NT02');
nut_assert($config['dimensions'][1]['question_ids'] === array('NT03', 'NT04'), 'D2 has NT03, NT04');
nut_assert($config['dimensions'][2]['question_ids'] === array('NT05', 'NT06'), 'D3 has NT05, NT06');
nut_assert($config['dimensions'][3]['question_ids'] === array('NT07', 'NT08'), 'D4 has NT07, NT08');
nut_assert($config['dimensions'][4]['question_ids'] === array('NT09', 'NT10'), 'D5 has NT09, NT10');
nut_assert($config['dimensions'][5]['question_ids'] === array('NT11', 'NT12'), 'D6 has NT11, NT12');

// Global Result CTAs verification
nut_assert(count($config['result_ctas']) === 2, 'Must have exactly 2 result CTAs');
nut_assert($config['result_ctas'][0]['label'] === 'Je veux faire un bilan', 'Primary CTA label is Je veux faire un bilan');
nut_assert($config['result_ctas'][0]['url'] === 'https://lifemetrics.fr/formulaire-bilan/', 'Primary CTA url is https://lifemetrics.fr/formulaire-bilan/');
nut_assert($config['result_ctas'][0]['variant'] === 'primary', 'Primary CTA variant is primary');
nut_assert($config['result_ctas'][0]['enabled'] === true, 'Primary CTA is enabled');
nut_assert($config['result_ctas'][1]['variant'] === 'secondary', 'Secondary CTA variant is secondary');
nut_assert($config['result_ctas'][1]['url'] === '/tests-sante/', 'Secondary CTA url points to questionnaire catalogue');

// ----------------------------------------------------
// 4. Scoring Engine Boundaries (12, 24, 25, 32, 33, 60)
// ----------------------------------------------------
$base_safety = array('NTSF01' => 'no', 'NTSF02' => 'no', 'NTSF03' => 'no');

// Min score (all best answers = 1 pt) -> 12/60 -> HABITUDES_FAVORABLES
$answers_min = array_merge($base_safety, array(
    'NT01' => '5_portions_or_more', 'NT02' => 'very_varied',
    'NT03' => '3_or_more_week', 'NT04' => 'almost_always',
    'NT05' => 'great_variety', 'NT06' => 'more_2_week',
    'NT07' => 'almost_always', 'NT08' => 'very_important',
    'NT09' => 'rarely_never', 'NT10' => 'rarely',
    'NT11' => 'almost_always', 'NT12' => 'almost_always',
));
$res_12 = $engine->score($config, $answers_min);
nut_assert($res_12['final_score'] === 12, 'Min score is 12');
nut_assert($res_12['calculated_category'] === 'HABITUDES_FAVORABLES', 'Score 12 category is HABITUDES_FAVORABLES');
nut_assert($res_12['displayed_category'] === 'HABITUDES_FAVORABLES', 'Score 12 displayed category is HABITUDES_FAVORABLES');

// Min score with plateau answers (NT03 = '2_week' [1 pt], NT06 = 'about_2_week' [1 pt])
$answers_min_plateau = array_merge($answers_min, array(
    'NT03' => '2_week',
    'NT06' => 'about_2_week',
));
$res_12_plateau = $engine->score($config, $answers_min_plateau);
nut_assert($res_12_plateau['final_score'] === 12, 'Score with plateau answers is also 12');
nut_assert($res_12_plateau['calculated_category'] === 'HABITUDES_FAVORABLES', 'Category is HABITUDES_FAVORABLES');

// Max score (all worst answers = 5 pts) -> 60/60 -> HABITUDES_INSUFFISANTES
$answers_max = array_merge($base_safety, array(
    'NT01' => 'less_1_portion_per_day', 'NT02' => 'very_little_varied',
    'NT03' => 'almost_never', 'NT04' => 'almost_never',
    'NT05' => 'almost_always_same', 'NT06' => 'never',
    'NT07' => 'almost_never', 'NT08' => 'very_low',
    'NT09' => 'several_day', 'NT10' => 'several_day',
    'NT11' => 'almost_never', 'NT12' => 'almost_never',
));
$res_60 = $engine->score($config, $answers_max);
nut_assert($res_60['final_score'] === 60, 'Max score is 60');
nut_assert($res_60['calculated_category'] === 'HABITUDES_INSUFFISANTES', 'Score 60 category is HABITUDES_INSUFFISANTES');
nut_assert($res_60['displayed_category'] === 'HABITUDES_INSUFFISANTES', 'Score 60 displayed category is HABITUDES_INSUFFISANTES');

// Boundary 24 -> HABITUDES_FAVORABLES (12 questions with 2 pts each)
$answers_24 = array_merge($base_safety, array(
    'NT01' => 'about_4_portions', 'NT02' => 'fairly_varied',
    'NT03' => '3_or_more_week', 'NT04' => 'half_time', // NT03=1, NT04=3 -> avg 2 pts
    'NT05' => 'several_sources', 'NT06' => 'more_2_week', // NT05=2, NT06=1
    'NT07' => 'often', 'NT08' => 'important', // 2, 2
    'NT09' => '1_3_week', 'NT10' => '1_3_week', // 2, 2
    'NT11' => 'often', 'NT12' => 'half_time', // 2, 3 -> sum: 2+2 + 1+3 + 2+1 + 2+2 + 2+2 + 2+3 = 24
));
$res_24 = $engine->score($config, $answers_24);
nut_assert($res_24['final_score'] === 24, 'Score is 24');
nut_assert($res_24['calculated_category'] === 'HABITUDES_FAVORABLES', 'Score 24 category is HABITUDES_FAVORABLES');

// Boundary 25 -> EQUILIBRE_FRAGILE (+1 pt)
$answers_25 = $answers_24;
$answers_25['NT01'] = 'about_3_portions'; // 3 pts (+1)
$res_25 = $engine->score($config, $answers_25);
nut_assert($res_25['final_score'] === 25, 'Score is 25');
nut_assert($res_25['calculated_category'] === 'EQUILIBRE_FRAGILE', 'Score 25 category is EQUILIBRE_FRAGILE');

// Boundary 32 -> EQUILIBRE_FRAGILE (8 questions with 3 pts, 4 questions with 2 pts = 24 + 8 = 32)
$answers_32 = array_merge($base_safety, array(
    'NT01' => 'about_3_portions', 'NT02' => 'moderately_varied', // 3, 3
    'NT03' => 'about_1_week', 'NT04' => 'half_time', // 3, 3
    'NT05' => 'few_sources', 'NT06' => 'about_1_week', // 3, 3
    'NT07' => 'half_time', 'NT08' => 'half_diet', // 3, 3
    'NT09' => '1_3_week', 'NT10' => '1_3_week', // 2, 2
    'NT11' => 'often', 'NT12' => 'often', // 2, 2 -> Total = 8*3 + 4*2 = 32
));
$res_32 = $engine->score($config, $answers_32);
nut_assert($res_32['final_score'] === 32, 'Score is 32');
nut_assert($res_32['calculated_category'] === 'EQUILIBRE_FRAGILE', 'Score 32 category is EQUILIBRE_FRAGILE');

// Boundary 33 -> HABITUDES_INSUFFISANTES (+1 pt)
$answers_33 = $answers_32;
$answers_33['NT09'] = '4_6_week'; // 3 pts (+1) -> Total = 33
$res_33 = $engine->score($config, $answers_33);
nut_assert($res_33['final_score'] === 33, 'Score is 33');
nut_assert($res_33['calculated_category'] === 'HABITUDES_INSUFFISANTES', 'Score 33 category is HABITUDES_INSUFFISANTES');

// ----------------------------------------------------
// 5. Weakest Dimensions & Deterministic Ties
// ----------------------------------------------------
// Under lower_is_better, higher score/percentage = worse dimension.
$answers_weak = array_merge($base_safety, array(
    'NT01' => 'less_1_portion_per_day', 'NT02' => 'very_little_varied', // D1: 5+5 = 10/10 (100%)
    'NT03' => 'less_1_week', 'NT04' => 'rarely', // D2: 4+4 = 8/10 (75%)
    'NT05' => 'few_sources', 'NT06' => 'about_1_week', // D3: 3+3 = 6/10 (50%)
    'NT07' => 'often', 'NT08' => 'important', // D4: 2+2 = 4/10 (25%)
    'NT09' => 'rarely_never', 'NT10' => 'rarely', // D5: 1+1 = 2/10 (0%)
    'NT11' => 'almost_always', 'NT12' => 'almost_always', // D6: 1+1 = 2/10 (0%)
));
$res_weak = $engine->score($config, $answers_weak);
nut_assert($res_weak['weakest_dimensions'] === array('fruits-legumes-diversite-vegetale', 'fibres-glucides-qualite'), 'Weakest dimensions select highest percentages under lower_is_better');

// ----------------------------------------------------
// 6. Safety Questions Independence
// ----------------------------------------------------
// NTSF01 alone
$res_sf1 = $engine->score($config, array_merge($answers_max, array('NTSF01' => 'yes')));
nut_assert($res_sf1['final_score'] === 60, 'Safety does not alter score (60)');
nut_assert($res_sf1['calculated_category'] === 'HABITUDES_INSUFFISANTES', 'Safety does not alter category');
nut_assert($res_sf1['safety_flag_codes'] === array('NUTRITION_SAFETY_MESSAGE'), 'NTSF01 emits NUTRITION_SAFETY_MESSAGE');

// NTSF02 alone
$res_sf2 = $engine->score($config, array_merge($answers_max, array('NTSF02' => 'yes')));
nut_assert($res_sf2['safety_flag_codes'] === array('NUTRITION_SAFETY_MESSAGE'), 'NTSF02 emits NUTRITION_SAFETY_MESSAGE');

// NTSF03 alone
$res_sf3 = $engine->score($config, array_merge($answers_max, array('NTSF03' => 'yes')));
nut_assert($res_sf3['safety_flag_codes'] === array('NUTRITION_SAFETY_MESSAGE'), 'NTSF03 emits NUTRITION_SAFETY_MESSAGE');

// NTSF01 no -> no trigger
$res_sf_no = $engine->score($config, array_merge($answers_max, array('NTSF01' => 'no', 'NTSF02' => 'no', 'NTSF03' => 'no')));
nut_assert($res_sf_no['safety_flag_codes'] === array(), 'No safety flags when all answers are no');

// Multiple simultaneous safety triggers
$res_sf_all = $engine->score($config, array_merge($answers_max, array('NTSF01' => 'yes', 'NTSF02' => 'yes', 'NTSF03' => 'yes')));
nut_assert($res_sf_all['final_score'] === 60, 'Score unaffected by multiple safety flags');
nut_assert($res_sf_all['safety_flag_codes'] === array('NUTRITION_SAFETY_MESSAGE'), 'Multiple triggers deduplicate to unique flag');

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

// Server scoring authority: client sends claims for final_score=12 and category=HABITUDES_FAVORABLES,
// but server evaluates actual answers (answers_33) and computes authoritative final_score=33
$tampered_client_answers = $answers_33; // Actual answers evaluate to 33
$server_scored = $engine->score($loaded_config, $tampered_client_answers);
nut_assert($server_scored['final_score'] === 33, 'Server computes authoritative score (33, ignoring client claim of 12)');
nut_assert($server_scored['calculated_category'] === 'HABITUDES_INSUFFISANTES', 'Server computes authoritative category HABITUDES_INSUFFISANTES');
nut_assert($server_scored['displayed_category'] === 'HABITUDES_INSUFFISANTES', 'Server computes authoritative displayed category');

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
