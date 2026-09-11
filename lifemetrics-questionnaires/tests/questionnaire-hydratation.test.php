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

function hy_assert($condition, string $msg): void {
    if (!$condition) {
        fwrite(STDERR, "HYDRATATION TEST FAILED: $msg\n");
        exit(1);
    }
}

function get_dim(array $result, string $dim_id): ?array {
    foreach ($result['dimensions'] as $d) {
        if ($d['id'] === $dim_id) return $d;
    }
    return null;
}

$validator = new LifeMetrics_Questionnaire_Schema_Validator();
$engine = new LifeMetrics_Questionnaire_Scoring_Engine();
$config = require __DIR__ . '/../questionnaires/hydratation/questionnaire.php';

// ----------------------------------------------------
// 1. Schema 2.0.0 Validation
// ----------------------------------------------------
$validation_errors = $validator->validate($config);
hy_assert(empty($validation_errors), 'Hydratation passes strict Schema 2.0.0 validation (errors: ' . implode(', ', $validation_errors) . ')');

// ----------------------------------------------------
// 2. Score Boundaries (12, 24, 25, 32, 33, 60) - 3 Categories
// ----------------------------------------------------
$base_safety = array('HYSF01' => 'no', 'HYSF02' => 'no', 'HYSF03' => 'no');

// Min score 12 (all 1s) -> HABITUDES_FAVORABLES
$answers_12 = array_merge(array_fill_keys(array('HY01','HY02','HY03','HY04','HY05','HY06','HY07','HY08','HY09','HY10','HY11','HY12'), '1'), $base_safety);
$res_12 = $engine->score($config, $answers_12);
hy_assert($res_12['final_score'] === 12, 'Min score is 12');
hy_assert($res_12['calculated_category'] === 'HABITUDES_FAVORABLES', '12 is HABITUDES_FAVORABLES');
hy_assert($res_12['displayed_category'] === 'HABITUDES_FAVORABLES', 'Displayed category is HABITUDES_FAVORABLES');

// Boundary 24 -> HABITUDES_FAVORABLES
$answers_24 = array_merge(array(
    'HY01' => '2', 'HY02' => '2', 'HY03' => '2', 'HY04' => '2',
    'HY05' => '2', 'HY06' => '2', 'HY07' => '2', 'HY08' => '2',
    'HY09' => '2', 'HY10' => '2', 'HY11' => '2', 'HY12' => '2'
), $base_safety);
$res_24 = $engine->score($config, $answers_24);
hy_assert($res_24['final_score'] === 24, 'Score 24 test');
hy_assert($res_24['calculated_category'] === 'HABITUDES_FAVORABLES', '24 is HABITUDES_FAVORABLES');

// Boundary 25 -> HYDRATATION_FRAGILE
$answers_25 = array_merge(array(
    'HY01' => '3', 'HY02' => '2', 'HY03' => '2', 'HY04' => '2',
    'HY05' => '2', 'HY06' => '2', 'HY07' => '2', 'HY08' => '2',
    'HY09' => '2', 'HY10' => '2', 'HY11' => '2', 'HY12' => '2'
), $base_safety);
$res_25 = $engine->score($config, $answers_25);
hy_assert($res_25['final_score'] === 25, 'Score 25 test');
hy_assert($res_25['calculated_category'] === 'HYDRATATION_FRAGILE', '25 is HYDRATATION_FRAGILE');

// Boundary 32 -> HYDRATATION_FRAGILE
$answers_32 = array_merge(array(
    'HY01' => '3', 'HY02' => '3', 'HY03' => '3', 'HY04' => '3',
    'HY05' => '3', 'HY06' => '3', 'HY07' => '3', 'HY08' => '3',
    'HY09' => '2', 'HY10' => '2', 'HY11' => '2', 'HY12' => '2'
), $base_safety);
$res_32 = $engine->score($config, $answers_32);
hy_assert($res_32['final_score'] === 32, 'Score 32 test');
hy_assert($res_32['calculated_category'] === 'HYDRATATION_FRAGILE', '32 is HYDRATATION_FRAGILE');

// Boundary 33 -> HABITUDES_INSUFFISANTES
$answers_33 = array_merge(array(
    'HY01' => '3', 'HY02' => '3', 'HY03' => '3', 'HY04' => '3',
    'HY05' => '3', 'HY06' => '3', 'HY07' => '3', 'HY08' => '3',
    'HY09' => '3', 'HY10' => '2', 'HY11' => '2', 'HY12' => '2'
), $base_safety);
$res_33 = $engine->score($config, $answers_33);
hy_assert($res_33['final_score'] === 33, 'Score 33 test');
hy_assert($res_33['calculated_category'] === 'HABITUDES_INSUFFISANTES', '33 is HABITUDES_INSUFFISANTES');

// Max score 60 (all 5s) -> HABITUDES_INSUFFISANTES
$answers_60 = array_merge(array_fill_keys(array('HY01','HY02','HY03','HY04','HY05','HY06','HY07','HY08','HY09','HY10','HY11','HY12'), '5'), $base_safety);
$res_60 = $engine->score($config, $answers_60);
hy_assert($res_60['final_score'] === 60, 'Max score is 60');
hy_assert($res_60['calculated_category'] === 'HABITUDES_INSUFFISANTES', '60 is HABITUDES_INSUFFISANTES');

// ----------------------------------------------------
// 3. N/A Normalization on HY05 (11 questions answered)
// Formula: ROUND((raw_score / 11) * 12)
// ----------------------------------------------------
// HY05 = 'na', all other 11 = '1' -> raw: 11/55 -> normalized: 12
$answers_na_min = array_merge($answers_12, array('HY05' => 'na'));
$res_na_min = $engine->score($config, $answers_na_min);
hy_assert($res_na_min['raw_score'] === 11, 'N/A min raw score is 11');
hy_assert($res_na_min['available_min'] === 11, 'N/A available min is 11');
hy_assert($res_na_min['available_max'] === 55, 'N/A available max is 55');
hy_assert($res_na_min['final_score'] === 12, '11/55 normalizes to 12/60');
hy_assert($res_na_min['calculated_category'] === 'HABITUDES_FAVORABLES', '12 is HABITUDES_FAVORABLES');

// HY05 = 'na', all other 11 = '5' -> raw: 55/55 -> normalized: 60
$answers_na_max = array_merge($answers_60, array('HY05' => 'na'));
$res_na_max = $engine->score($config, $answers_na_max);
hy_assert($res_na_max['raw_score'] === 55, 'N/A max raw score is 55');
hy_assert($res_na_max['available_max'] === 55, 'N/A available max is 55');
hy_assert($res_na_max['final_score'] === 60, '55/55 normalizes to 60/60');
hy_assert($res_na_max['calculated_category'] === 'HABITUDES_INSUFFISANTES', '60 is HABITUDES_INSUFFISANTES');

// Dimension adaptation-activite-chaleur with HY05='na'
$dim_adapt = get_dim($res_na_max, 'adaptation-activite-chaleur');
hy_assert($dim_adapt !== null, 'adaptation dimension present');
hy_assert($dim_adapt['raw_score'] === 5, 'dimension raw score is 5 (from HY06)');
hy_assert($dim_adapt['available_min'] === 1, 'dimension available min is 1');
hy_assert($dim_adapt['available_max'] === 5, 'dimension available max is 5 (HY05 excluded)');
hy_assert((float)$dim_adapt['percentage'] === 100.0, 'dimension percentage is 100%');

// Intermediate N/A normalization: raw = 22 (all other 11 = 2) -> (22/11)*12 = 24 -> HABITUDES_FAVORABLES
$answers_na_22 = array_merge($answers_24, array('HY05' => 'na'));
$res_na_22 = $engine->score($config, $answers_na_22);
hy_assert($res_na_22['raw_score'] === 22, 'Raw score is 22');
hy_assert($res_na_22['final_score'] === 24, '22/11*12 normalizes to 24');
hy_assert($res_na_22['calculated_category'] === 'HABITUDES_FAVORABLES', '24 is HABITUDES_FAVORABLES');

// Intermediate N/A normalization: raw = 23 -> ROUND((23/11)*12) = ROUND(25.0909) = 25 -> HYDRATATION_FRAGILE
$answers_na_23 = array_merge($answers_24, array('HY01' => '3', 'HY05' => 'na'));
$res_na_23 = $engine->score($config, $answers_na_23);
hy_assert($res_na_23['raw_score'] === 23, 'Raw score is 23');
hy_assert($res_na_23['final_score'] === 25, '23/11*12 normalizes to 25');
hy_assert($res_na_23['calculated_category'] === 'HYDRATATION_FRAGILE', '25 is HYDRATATION_FRAGILE');

// Intermediate N/A normalization: raw = 30 -> ROUND((30/11)*12) = ROUND(32.7272) = 33 -> HABITUDES_INSUFFISANTES
$answers_na_30 = array_merge($answers_32, array('HY01' => '4', 'HY05' => 'na'));
$res_na_30 = $engine->score($config, $answers_na_30);
hy_assert($res_na_30['raw_score'] === 30, 'Raw score is 30');
hy_assert($res_na_30['final_score'] === 33, '30/11*12 normalizes to 33');
hy_assert($res_na_30['calculated_category'] === 'HABITUDES_INSUFFISANTES', '33 is HABITUDES_INSUFFISANTES');

// ----------------------------------------------------
// 4. Safety Questions Independence
// ----------------------------------------------------
// HYSF01 alone
$res_sf1 = $engine->score($config, array_merge($answers_12, array('HYSF01' => 'yes')));
hy_assert($res_sf1['final_score'] === 12, 'Safety does not alter score (12)');
hy_assert($res_sf1['calculated_category'] === 'HABITUDES_FAVORABLES', 'Safety does not alter category');
hy_assert($res_sf1['safety_flag_codes'] === array('HYDRATATION_SAFETY_MESSAGE'), 'HYSF01 emits HYDRATATION_SAFETY_MESSAGE');

// HYSF02 alone
$res_sf2 = $engine->score($config, array_merge($answers_12, array('HYSF02' => 'yes')));
hy_assert($res_sf2['safety_flag_codes'] === array('HYDRATATION_SAFETY_MESSAGE'), 'HYSF02 emits HYDRATATION_SAFETY_MESSAGE');

// HYSF03 alone
$res_sf3 = $engine->score($config, array_merge($answers_12, array('HYSF03' => 'yes')));
hy_assert($res_sf3['safety_flag_codes'] === array('HYDRATATION_SAFETY_MESSAGE'), 'HYSF03 emits HYDRATATION_SAFETY_MESSAGE');

// Multiple simultaneous safety triggers
$res_sf_all = $engine->score($config, array_merge($answers_12, array('HYSF01' => 'yes', 'HYSF02' => 'yes', 'HYSF03' => 'yes')));
hy_assert($res_sf_all['final_score'] === 12, 'Score unaffected by all safety flags');
hy_assert($res_sf_all['safety_flag_codes'] === array('HYDRATATION_SAFETY_MESSAGE'), 'Multiple triggers deduplicated to unique flag code');

// ----------------------------------------------------
// 5. Dimension Averages & Weakest Dimensions Selection
// ----------------------------------------------------
// Profile with poor choix-boissons (HY07=5, HY08=5) and others favorable (1s)
$profile_sweet = array_merge($answers_12, array(
    'HY07' => '5',
    'HY08' => '5'
));
// Total raw score = 10*1 + 2*5 = 20 -> final_score = 20 -> HABITUDES_FAVORABLES
$res_sweet = $engine->score($config, $profile_sweet);
hy_assert($res_sweet['final_score'] === 20, 'Profile sweet score is 20');
hy_assert($res_sweet['calculated_category'] === 'HABITUDES_FAVORABLES', 'Category is HABITUDES_FAVORABLES');
$dim_choix = get_dim($res_sweet, 'choix-boissons');
hy_assert($dim_choix['raw_score'] === 10, 'Choix boissons raw score is 10');
hy_assert((float)$dim_choix['percentage'] === 100.0, 'Choix boissons percentage is 100% (highest/worst)');
hy_assert($res_sweet['weakest_dimensions'][0] === 'choix-boissons', 'Weakest dimension is choix-boissons');

// ----------------------------------------------------
// 6. Registry & Submission Service Integration
// ----------------------------------------------------
$registry = new LifeMetrics_Questionnaire_Registry(
    __DIR__ . '/../questionnaires',
    array(
        'pss10' => 'pss10/questionnaire.php',
        'sedentarite' => 'sedentarite/questionnaire.php',
        'hydratation' => 'hydratation/questionnaire.php',
    ),
    $validator
);
$loaded_config = $registry->get_internal('hydratation');
hy_assert($loaded_config !== null, 'Registry resolves hydratation questionnaire');
hy_assert($loaded_config['id'] === 'hydratation', 'Loaded config id is hydratation');
hy_assert($loaded_config['status'] === 'review', 'Status in review');
hy_assert($loaded_config['scoring_direction'] === 'lower_is_better', 'Direction is lower_is_better');
hy_assert($loaded_config['score']['target_min'] === 12, 'Target min is 12');
hy_assert($loaded_config['score']['target_max'] === 60, 'Target max is 60');

// Submission Service flow
$adapter = new LifeMetrics_Google_Apps_Script_Adapter();
$submission_service = new LifeMetrics_Submission_Service($registry, $engine, $adapter);

$server_scored = $engine->score($loaded_config, $profile_sweet);
hy_assert($server_scored['final_score'] === 20, 'Server scoring is authoritative (20/60)');
hy_assert($server_scored['calculated_category'] === 'HABITUDES_FAVORABLES', 'Server category is authoritative');
hy_assert($server_scored['weakest_dimensions'][0] === 'choix-boissons', 'Server weakest dimension authoritative');

echo "Questionnaire Hydratation PHP Unit & Scoring Tests: ALL PASSED.\n";
