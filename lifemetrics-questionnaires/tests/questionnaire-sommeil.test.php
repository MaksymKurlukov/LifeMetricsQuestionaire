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
sl_assert($config['scoring_direction'] === 'higher_is_better', 'Direction is higher_is_better');
sl_assert($config['score']['target_min'] === 0, 'Target min is 0');
sl_assert($config['score']['target_max'] === 48, 'Target max is 48');

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
sl_assert($q1['answers'][0]['value'] === '0' && $q1['answers'][0]['points'] === 0, 'SL01 opt 0 (<5h) = 0 pts');
sl_assert($q1['answers'][1]['value'] === '1' && $q1['answers'][1]['points'] === 1, 'SL01 opt 1 (5h à <6h) = 1 pt');
sl_assert($q1['answers'][2]['value'] === '2' && $q1['answers'][2]['points'] === 2, 'SL01 opt 2 (6h à <7h) = 2 pts');
sl_assert($q1['answers'][3]['value'] === '3' && $q1['answers'][3]['points'] === 4, 'SL01 opt 3 (7h à 9h) = 4 pts [MAX]');
sl_assert($q1['answers'][4]['value'] === '4' && $q1['answers'][4]['points'] === 3, 'SL01 opt 4 (>9h) = 3 pts [NON-LINEAR]');

// ----------------------------------------------------
// 3. Dimensions & Capacities Verification
// ----------------------------------------------------
sl_assert(count($config['dimensions']) === 5, 'Must have exactly 5 dimensions');
$dim_ids = array_map(function ($d) { return $d['id']; }, $config['dimensions']);
sl_assert($dim_ids === array(
    'duree-suffisance',
    'endormissement-continuite',
    'regularite-rythme',
    'recuperation-fonctionnement-diurne',
    'habitudes-favorables'
), 'Exact 5 dimension IDs');

sl_assert($config['dimensions'][0]['question_ids'] === array('SL01', 'SL02'), 'D1 has SL01, SL02');
sl_assert($config['dimensions'][1]['question_ids'] === array('SL03', 'SL04', 'SL05'), 'D2 has SL03, SL04, SL05');
sl_assert($config['dimensions'][2]['question_ids'] === array('SL06', 'SL07'), 'D3 has SL06, SL07');
sl_assert($config['dimensions'][3]['question_ids'] === array('SL08', 'SL09', 'SL10'), 'D4 has SL08, SL09, SL10');
sl_assert($config['dimensions'][4]['question_ids'] === array('SL11', 'SL12'), 'D5 has SL11, SL12');

// ----------------------------------------------------
// 4. Scoring Engine Boundaries (0, 15, 16, 27, 28, 38, 39, 48)
// ----------------------------------------------------
$base_safety = array('SLSF01' => 'no', 'SLSF02' => 'no', 'SLSF03' => 'no');

// Min score (all 0s) -> 0/48 -> SOMMEIL_TRES_PERTURBE
$answers_min = array_merge($base_safety, array(
    'SL01' => '0', 'SL02' => '0', 'SL03' => '0', 'SL04' => '0',
    'SL05' => '0', 'SL06' => '0', 'SL07' => '0', 'SL08' => '0',
    'SL09' => '0', 'SL10' => '0', 'SL11' => '0', 'SL12' => '0',
));
$res_0 = $engine->score($config, $answers_min);
sl_assert($res_0['final_score'] === 0, 'Min score is 0');
sl_assert($res_0['calculated_category'] === 'SOMMEIL_TRES_PERTURBE', 'Score 0 category is SOMMEIL_TRES_PERTURBE');
sl_assert($res_0['displayed_category'] === 'SOMMEIL_TRES_PERTURBE', 'Score 0 displayed category is SOMMEIL_TRES_PERTURBE');

// Max score (SL01='3' [4 pts], rest='4' [4 pts each]) -> 48/48 -> SOMMEIL_FAVORABLE
$answers_max = array_merge($base_safety, array(
    'SL01' => '3', 'SL02' => '4', 'SL03' => '4', 'SL04' => '4',
    'SL05' => '4', 'SL06' => '4', 'SL07' => '4', 'SL08' => '4',
    'SL09' => '4', 'SL10' => '4', 'SL11' => '4', 'SL12' => '4',
));
$res_48 = $engine->score($config, $answers_max);
sl_assert($res_48['final_score'] === 48, 'Max score is 48');
sl_assert($res_48['calculated_category'] === 'SOMMEIL_FAVORABLE', 'Score 48 category is SOMMEIL_FAVORABLE');
sl_assert($res_48['displayed_category'] === 'SOMMEIL_FAVORABLE', 'Score 48 displayed category is SOMMEIL_FAVORABLE');

// Boundary 15 -> SOMMEIL_TRES_PERTURBE
$answers_15 = array_merge($base_safety, array(
    'SL01' => '1', 'SL02' => '1', // D1: 1+1=2
    'SL03' => '1', 'SL04' => '1', 'SL05' => '1', // D2: 1+1+1=3
    'SL06' => '1', 'SL07' => '1', // D3: 1+1=2
    'SL08' => '2', 'SL09' => '2', 'SL10' => '2', // D4: 2+2+2=6
    'SL11' => '1', 'SL12' => '1', // D5: 1+1=2 -> Total = 2+3+2+6+2 = 15
));
$res_15 = $engine->score($config, $answers_15);
sl_assert($res_15['final_score'] === 15, 'Score is 15');
sl_assert($res_15['calculated_category'] === 'SOMMEIL_TRES_PERTURBE', 'Score 15 category is SOMMEIL_TRES_PERTURBE');

// Boundary 16 -> SOMMEIL_A_AMELIORER
$answers_16 = array_merge($answers_15, array('SL11' => '2')); // +1 pt -> 16
$res_16 = $engine->score($config, $answers_16);
sl_assert($res_16['final_score'] === 16, 'Score is 16');
sl_assert($res_16['calculated_category'] === 'SOMMEIL_A_AMELIORER', 'Score 16 category is SOMMEIL_A_AMELIORER');

// Boundary 27 -> SOMMEIL_A_AMELIORER
$answers_27 = array_merge($base_safety, array(
    'SL01' => '2', 'SL02' => '2', // D1: 2+2=4
    'SL03' => '2', 'SL04' => '2', 'SL05' => '2', // D2: 2+2+2=6
    'SL06' => '3', 'SL07' => '2', // D3: 3+2=5
    'SL08' => '3', 'SL09' => '2', 'SL10' => '2', // D4: 3+2+2=7
    'SL11' => '3', 'SL12' => '2', // D5: 3+2=5 -> Total = 4+6+5+7+5 = 27
));
$res_27 = $engine->score($config, $answers_27);
sl_assert($res_27['final_score'] === 27, 'Score is 27');
sl_assert($res_27['calculated_category'] === 'SOMMEIL_A_AMELIORER', 'Score 27 category is SOMMEIL_A_AMELIORER');

// Boundary 28 -> SOMMEIL_GLOBALEMENT_SATISFAISANT
$answers_28 = array_merge($answers_27, array('SL01' => '4')); // SL01 value '4' is 3 pts (+1 pt) -> 28
$res_28 = $engine->score($config, $answers_28);
sl_assert($res_28['final_score'] === 28, 'Score is 28');
sl_assert($res_28['calculated_category'] === 'SOMMEIL_GLOBALEMENT_SATISFAISANT', 'Score 28 category is SOMMEIL_GLOBALEMENT_SATISFAISANT');

// Boundary 38 -> SOMMEIL_GLOBALEMENT_SATISFAISANT
$answers_38 = array_merge($base_safety, array(
    'SL01' => '3', 'SL02' => '3', // D1: 4+3=7
    'SL03' => '3', 'SL04' => '3', 'SL05' => '3', // D2: 3+3+3=9
    'SL06' => '3', 'SL07' => '3', // D3: 3+3=6
    'SL08' => '3', 'SL09' => '4', 'SL10' => '3', // D4: 3+4+3=10
    'SL11' => '3', 'SL12' => '3', // D5: 3+3=6 -> Total = 7+9+6+10+6 = 38
));
$res_38 = $engine->score($config, $answers_38);
sl_assert($res_38['final_score'] === 38, 'Score is 38');
sl_assert($res_38['calculated_category'] === 'SOMMEIL_GLOBALEMENT_SATISFAISANT', 'Score 38 category is SOMMEIL_GLOBALEMENT_SATISFAISANT');

// Boundary 39 -> SOMMEIL_FAVORABLE
$answers_39 = array_merge($answers_38, array('SL02' => '4')); // +1 pt -> 39
$res_39 = $engine->score($config, $answers_39);
sl_assert($res_39['final_score'] === 39, 'Score is 39');
sl_assert($res_39['calculated_category'] === 'SOMMEIL_FAVORABLE', 'Score 39 category is SOMMEIL_FAVORABLE');

// ----------------------------------------------------
// 5. Testing Q1 Non-Linearity Directly
// ----------------------------------------------------
// Test with SL01='3' (7-9h = 4 pts) vs SL01='4' (>9h = 3 pts)
$q1_opt3 = array_merge($answers_min, array('SL01' => '3'));
$res_q1_opt3 = $engine->score($config, $q1_opt3);
sl_assert($res_q1_opt3['final_score'] === 4, 'SL01 option 3 gives 4 pts');

$q1_opt4 = array_merge($answers_min, array('SL01' => '4'));
$res_q1_opt4 = $engine->score($config, $q1_opt4);
sl_assert($res_q1_opt4['final_score'] === 3, 'SL01 option 4 gives 3 pts');
sl_assert($res_q1_opt3['final_score'] > $res_q1_opt4['final_score'], 'Non-linear ordering: opt 3 (7-9h) scores higher than opt 4 (>9h)');

// ----------------------------------------------------
// 6. Weakest Dimensions & Deterministic Ties
// ----------------------------------------------------
// D1=2/8 (25%), D2=3/12 (25%), D3=2/8 (25%), D4=6/12 (50%), D5=2/8 (25%)
// Ties broken by configuration order: weakest 2 must be D1 (duree-suffisance) and D2 (endormissement-continuite)
sl_assert($res_15['weakest_dimensions'] === array('duree-suffisance', 'endormissement-continuite'), 'Deterministic tie-breaking in weakest dimensions');

// ----------------------------------------------------
// 7. Safety Questions Independence
// ----------------------------------------------------
// SLSF01 alone
$res_sf1 = $engine->score($config, array_merge($answers_max, array('SLSF01' => 'yes')));
sl_assert($res_sf1['final_score'] === 48, 'Safety does not alter score (48)');
sl_assert($res_sf1['calculated_category'] === 'SOMMEIL_FAVORABLE', 'Safety does not alter category');
sl_assert($res_sf1['safety_flag_codes'] === array('HEALTH_ATTENTION_MESSAGE'), 'SLSF01 emits HEALTH_ATTENTION_MESSAGE');

// SLSF02 alone
$res_sf2 = $engine->score($config, array_merge($answers_max, array('SLSF02' => 'yes')));
sl_assert($res_sf2['safety_flag_codes'] === array('HEALTH_ATTENTION_MESSAGE'), 'SLSF02 emits HEALTH_ATTENTION_MESSAGE');

// SLSF03 alone
$res_sf3 = $engine->score($config, array_merge($answers_max, array('SLSF03' => 'yes')));
sl_assert($res_sf3['safety_flag_codes'] === array('HEALTH_ATTENTION_MESSAGE'), 'SLSF03 emits HEALTH_ATTENTION_MESSAGE');

// SLSF01 unknown (Je ne sais pas) -> no trigger
$res_sf_unk = $engine->score($config, array_merge($answers_max, array('SLSF01' => 'unknown')));
sl_assert($res_sf_unk['safety_flag_codes'] === array(), 'SLSF01 unknown does not trigger flag');

// Multiple simultaneous safety triggers
$res_sf_all = $engine->score($config, array_merge($answers_max, array('SLSF01' => 'yes', 'SLSF02' => 'yes', 'SLSF03' => 'yes')));
sl_assert($res_sf_all['final_score'] === 48, 'Score unaffected by multiple safety flags');
sl_assert($res_sf_all['safety_flag_codes'] === array('HEALTH_ATTENTION_MESSAGE'), 'Multiple triggers deduplicate to unique flag');

// ----------------------------------------------------
// 8. Registry & Submission Service Integration
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

// Submission Service flow
$adapter = new LifeMetrics_Google_Apps_Script_Adapter();
$submission_service = new LifeMetrics_Submission_Service($registry, $engine, $adapter);

$server_scored = $engine->score($loaded_config, $answers_38);
sl_assert($server_scored['final_score'] === 38, 'Server scoring is authoritative (38/48)');
sl_assert($server_scored['calculated_category'] === 'SOMMEIL_GLOBALEMENT_SATISFAISANT', 'Server category is authoritative');

echo "Questionnaire Sommeil PHP Unit & Scoring Tests: ALL PASSED.\n";
