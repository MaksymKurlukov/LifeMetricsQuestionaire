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
// 2. Score Boundaries (0, 15, 16, 27, 28, 38, 39, 48)
// ----------------------------------------------------
$base_safety = array('HYSF01' => 'no', 'HYSF02' => 'no', 'HYSF03' => 'no');

// Min score 0 -> HABITUDES_HYDRATATION_INSUFFISANTES
$answers_min = array_merge(array_fill_keys(array('HY01','HY02','HY03','HY04','HY05','HY06','HY07','HY08','HY09','HY10','HY11','HY12'), '0'), $base_safety);
$res_0 = $engine->score($config, $answers_min);
hy_assert($res_0['final_score'] === 0, 'Min score is 0');
hy_assert($res_0['calculated_category'] === 'HABITUDES_HYDRATATION_INSUFFISANTES', '0 is HABITUDES_HYDRATATION_INSUFFISANTES');
hy_assert($res_0['displayed_category'] === 'HABITUDES_HYDRATATION_INSUFFISANTES', 'Displayed category is HABITUDES_HYDRATATION_INSUFFISANTES');

// Score 15 -> HABITUDES_HYDRATATION_INSUFFISANTES
$answers_15 = array_merge(array(
    'HY01' => '2', 'HY02' => '2', 'HY03' => '2', 'HY04' => '2',
    'HY05' => '2', 'HY06' => '2', 'HY07' => '2', 'HY08' => '1',
    'HY09' => '0', 'HY10' => '0', 'HY11' => '0', 'HY12' => '0'
), $base_safety);
$res_15 = $engine->score($config, $answers_15);
hy_assert($res_15['final_score'] === 15, 'Score 15 test');
hy_assert($res_15['calculated_category'] === 'HABITUDES_HYDRATATION_INSUFFISANTES', '15 is HABITUDES_HYDRATATION_INSUFFISANTES');

// Score 16 -> HYDRATATION_A_RENFORCER
$answers_16 = array_merge(array(
    'HY01' => '2', 'HY02' => '2', 'HY03' => '2', 'HY04' => '2',
    'HY05' => '2', 'HY06' => '2', 'HY07' => '2', 'HY08' => '2',
    'HY09' => '0', 'HY10' => '0', 'HY11' => '0', 'HY12' => '0'
), $base_safety);
$res_16 = $engine->score($config, $answers_16);
hy_assert($res_16['final_score'] === 16, 'Score 16 test');
hy_assert($res_16['calculated_category'] === 'HYDRATATION_A_RENFORCER', '16 is HYDRATATION_A_RENFORCER');

// Score 27 -> HYDRATATION_A_RENFORCER
$answers_27 = array_merge(array(
    'HY01' => '2', 'HY02' => '2', 'HY03' => '2', 'HY04' => '2',
    'HY05' => '2', 'HY06' => '2', 'HY07' => '2', 'HY08' => '2',
    'HY09' => '3', 'HY10' => '3', 'HY11' => '3', 'HY12' => '2'
), $base_safety);
$res_27 = $engine->score($config, $answers_27);
hy_assert($res_27['final_score'] === 27, 'Score 27 test');
hy_assert($res_27['calculated_category'] === 'HYDRATATION_A_RENFORCER', '27 is HYDRATATION_A_RENFORCER');

// Score 28 -> HABITUDES_HYDRATATION_FAVORABLES
$answers_28 = array_merge(array(
    'HY01' => '2', 'HY02' => '2', 'HY03' => '2', 'HY04' => '2',
    'HY05' => '2', 'HY06' => '2', 'HY07' => '2', 'HY08' => '2',
    'HY09' => '3', 'HY10' => '3', 'HY11' => '3', 'HY12' => '3'
), $base_safety);
$res_28 = $engine->score($config, $answers_28);
hy_assert($res_28['final_score'] === 28, 'Score 28 test');
hy_assert($res_28['calculated_category'] === 'HABITUDES_HYDRATATION_FAVORABLES', '28 is HABITUDES_HYDRATATION_FAVORABLES');

// Score 38 -> HABITUDES_HYDRATATION_FAVORABLES
$answers_38 = array_merge(array(
    'HY01' => '3', 'HY02' => '3', 'HY03' => '3', 'HY04' => '3',
    'HY05' => '3', 'HY06' => '3', 'HY07' => '3', 'HY08' => '3',
    'HY09' => '4', 'HY10' => '4', 'HY11' => '3', 'HY12' => '3'
), $base_safety);
$res_38 = $engine->score($config, $answers_38);
hy_assert($res_38['final_score'] === 38, 'Score 38 test');
hy_assert($res_38['calculated_category'] === 'HABITUDES_HYDRATATION_FAVORABLES', '38 is HABITUDES_HYDRATATION_FAVORABLES');

// Score 39 -> TRES_BONNES_HABITUDES_HYDRATATION
$answers_39 = array_merge(array(
    'HY01' => '3', 'HY02' => '3', 'HY03' => '3', 'HY04' => '3',
    'HY05' => '3', 'HY06' => '3', 'HY07' => '4', 'HY08' => '3',
    'HY09' => '4', 'HY10' => '4', 'HY11' => '3', 'HY12' => '3'
), $base_safety);
$res_39 = $engine->score($config, $answers_39);
hy_assert($res_39['final_score'] === 39, 'Score 39 test');
hy_assert($res_39['calculated_category'] === 'TRES_BONNES_HABITUDES_HYDRATATION', '39 is TRES_BONNES_HABITUDES_HYDRATATION');

// Max score 48 -> TRES_BONNES_HABITUDES_HYDRATATION
$answers_max = array_merge(array_fill_keys(array('HY01','HY02','HY03','HY04','HY05','HY06','HY07','HY08','HY09','HY10','HY11','HY12'), '4'), $base_safety);
$res_48 = $engine->score($config, $answers_max);
hy_assert($res_48['final_score'] === 48, 'Max score is 48');
hy_assert($res_48['calculated_category'] === 'TRES_BONNES_HABITUDES_HYDRATATION', '48 is TRES_BONNES_HABITUDES_HYDRATATION');

// ----------------------------------------------------
// 3. N/A Normalization on HY05
// ----------------------------------------------------
// HY05 = 'na', all other 11 questions = '4' -> Raw: 44/44 -> Normalized: 48/48
$answers_na_max = array_merge($answers_max, array('HY05' => 'na'));
$res_na_max = $engine->score($config, $answers_na_max);
hy_assert($res_na_max['raw_score'] === 44, 'N/A max raw score is 44');
hy_assert($res_na_max['available_max'] === 44, 'N/A available max is 44');
hy_assert($res_na_max['final_score'] === 48, '44/44 normalizes to 48/48');
hy_assert($res_na_max['calculated_category'] === 'TRES_BONNES_HABITUDES_HYDRATATION', '48/48 is TRES_BONNES_HABITUDES_HYDRATATION');

// Dimension adaptation-activite-chaleur with HY05='na'
$dim_adapt = get_dim($res_na_max, 'adaptation-activite-chaleur');
hy_assert($dim_adapt !== null, 'adaptation dimension present');
hy_assert($dim_adapt['raw_score'] === 4, 'dimension raw score is 4');
hy_assert($dim_adapt['available_max'] === 4, 'dimension available max is 4 (HY05 excluded)');
hy_assert((float)$dim_adapt['percentage'] === 100.0, 'dimension percentage is 100%');

// Partial N/A normalization test (non-integer with half_up rounding)
// Raw 25 / 44 -> 25 / 44 * 48 = 27.2727... -> round half_up -> 27
$answers_na_partial_25 = array_merge($answers_na_max, array(
    'HY01' => '2', 'HY02' => '2', 'HY03' => '2', 'HY04' => '2',
    'HY06' => '2', 'HY07' => '2', 'HY08' => '2', 'HY09' => '3',
    'HY10' => '3', 'HY11' => '3', 'HY12' => '2' // sum = 25
));
$res_na_partial_25 = $engine->score($config, $answers_na_partial_25);
hy_assert($res_na_partial_25['raw_score'] === 25, 'Raw score is 25');
hy_assert($res_na_partial_25['available_max'] === 44, 'Available max is 44');
hy_assert($res_na_partial_25['final_score'] === 27, '25/44 normalizes and rounds half_up to 27');
hy_assert($res_na_partial_25['calculated_category'] === 'HYDRATATION_A_RENFORCER', '27 is HYDRATATION_A_RENFORCER');

// Raw 26 / 44 -> 26 / 44 * 48 = 28.3636... -> round half_up -> 28
$answers_na_partial_26 = array_merge($answers_na_max, array(
    'HY01' => '2', 'HY02' => '2', 'HY03' => '2', 'HY04' => '2',
    'HY06' => '2', 'HY07' => '2', 'HY08' => '2', 'HY09' => '3',
    'HY10' => '3', 'HY11' => '3', 'HY12' => '3' // sum = 26
));
$res_na_partial_26 = $engine->score($config, $answers_na_partial_26);
hy_assert($res_na_partial_26['raw_score'] === 26, 'Raw score is 26');
hy_assert($res_na_partial_26['available_max'] === 44, 'Available max is 44');
hy_assert($res_na_partial_26['final_score'] === 28, '26/44 normalizes and rounds half_up to 28');
hy_assert($res_na_partial_26['calculated_category'] === 'HABITUDES_HYDRATATION_FAVORABLES', '28 is HABITUDES_HYDRATATION_FAVORABLES');

// ----------------------------------------------------
// 4. Safety Questions Independence
// ----------------------------------------------------
// HYSF01 alone
$res_sf1 = $engine->score($config, array_merge($answers_max, array('HYSF01' => 'yes')));
hy_assert($res_sf1['final_score'] === 48, 'Safety does not alter score (48)');
hy_assert($res_sf1['calculated_category'] === 'TRES_BONNES_HABITUDES_HYDRATATION', 'Safety does not alter category');
hy_assert($res_sf1['safety_flag_codes'] === array('HYDRATION_ATTENTION_MESSAGE'), 'HYSF01 emits HYDRATION_ATTENTION_MESSAGE');

// HYSF02 alone
$res_sf2 = $engine->score($config, array_merge($answers_max, array('HYSF02' => 'yes')));
hy_assert($res_sf2['safety_flag_codes'] === array('HYDRATION_ATTENTION_MESSAGE'), 'HYSF02 emits HYDRATION_ATTENTION_MESSAGE');

// HYSF03 alone
$res_sf3 = $engine->score($config, array_merge($answers_max, array('HYSF03' => 'yes')));
hy_assert($res_sf3['safety_flag_codes'] === array('HYDRATION_ATTENTION_MESSAGE'), 'HYSF03 emits HYDRATION_ATTENTION_MESSAGE');

// Multiple simultaneous safety triggers
$res_sf_all = $engine->score($config, array_merge($answers_max, array('HYSF01' => 'yes', 'HYSF02' => 'yes', 'HYSF03' => 'yes')));
hy_assert($res_sf_all['final_score'] === 48, 'Score unaffected by all safety flags');
hy_assert($res_sf_all['safety_flag_codes'] === array('HYDRATION_ATTENTION_MESSAGE'), 'Multiple triggers deduplicated to unique flag code');

// ----------------------------------------------------
// 5. Authoritative Synthetic Profiles from PDF (Section 13)
// ----------------------------------------------------
// Profile 1: Bon quotidien, faible adaptation chaleur (43/48 -> Très bonnes habitudes)
$profile_1 = array_merge($base_safety, array(
    'HY01' => '4', 'HY02' => '4',
    'HY03' => '4', 'HY04' => '4',
    'HY05' => '4', 'HY06' => '1', // faible adaptation chaleur (1 pt)
    'HY07' => '4', 'HY08' => '4',
    'HY09' => '3', 'HY10' => '4',
    'HY11' => '4', 'HY12' => '3'  // total = 4 + 4 + 4 + 4 + 4 + 1 + 4 + 4 + 3 + 4 + 4 + 3 = 43
));
$res_p1 = $engine->score($config, $profile_1);
hy_assert($res_p1['final_score'] === 43, 'Profile 1 score is 43/48');
hy_assert($res_p1['calculated_category'] === 'TRES_BONNES_HABITUDES_HYDRATATION', 'Profile 1 category is TRES_BONNES_HABITUDES_HYDRATATION');
hy_assert(in_array('adaptation-activite-chaleur', $res_p1['weakest_dimensions'], true), 'Profile 1 identifies adaptation dimension as weakest');

// Profile 2: Sportif bien hydraté (48/48 -> Très bonnes habitudes)
$profile_2 = array_merge($base_safety, array(
    'HY01' => '4', 'HY02' => '4',
    'HY03' => '4', 'HY04' => '4',
    'HY05' => '4', 'HY06' => '4',
    'HY07' => '4', 'HY08' => '4',
    'HY09' => '4', 'HY10' => '4',
    'HY11' => '4', 'HY12' => '4'
));
$res_p2 = $engine->score($config, $profile_2);
hy_assert($res_p2['final_score'] === 48, 'Profile 2 score is 48/48');
hy_assert($res_p2['calculated_category'] === 'TRES_BONNES_HABITUDES_HYDRATATION', 'Profile 2 category is TRES_BONNES_HABITUDES_HYDRATATION');

// Profile 3: Employé de bureau qui oublie de boire (23/48 -> Hydratation à renforcer)
$profile_3 = array_merge($base_safety, array(
    'HY01' => '2', 'HY02' => '2',
    'HY03' => '1', 'HY04' => '1',
    'HY05' => '2', 'HY06' => '2',
    'HY07' => '3', 'HY08' => '3',
    'HY09' => '2', 'HY10' => '1',
    'HY11' => '2', 'HY12' => '2' // 2+2+1+1+2+2+3+3+2+1+2+2 = 23
));
$res_p3 = $engine->score($config, $profile_3);
hy_assert($res_p3['final_score'] === 23, 'Profile 3 score is 23/48');
hy_assert($res_p3['calculated_category'] === 'HYDRATATION_A_RENFORCER', 'Profile 3 category is HYDRATATION_A_RENFORCER');

// Profile 4: Beaucoup de boissons sucrées (25/48 -> Hydratation à renforcer)
$profile_4 = array_merge($base_safety, array(
    'HY01' => '2', 'HY02' => '2',
    'HY03' => '3', 'HY04' => '3',
    'HY05' => '2', 'HY06' => '2',
    'HY07' => '0', 'HY08' => '0', // beaucoup de boissons sucrées (0 pts)
    'HY09' => '3', 'HY10' => '3',
    'HY11' => '2', 'HY12' => '3' // 2+2+3+3+2+2+0+0+3+3+2+3 = 25
));
$res_p4 = $engine->score($config, $profile_4);
hy_assert($res_p4['final_score'] === 25, 'Profile 4 score is 25/48');
hy_assert($res_p4['calculated_category'] === 'HYDRATATION_A_RENFORCER', 'Profile 4 category is HYDRATATION_A_RENFORCER');
hy_assert($res_p4['weakest_dimensions'][0] === 'choix-boissons', 'Profile 4 identifies choix-boissons as weakest');

// Profile 5: Très bonnes habitudes, sans sport (44/44 -> 48/48 -> Très bonnes habitudes)
$profile_5 = array_merge($base_safety, array(
    'HY01' => '4', 'HY02' => '4',
    'HY03' => '4', 'HY04' => '4',
    'HY05' => 'na', 'HY06' => '4',
    'HY07' => '4', 'HY08' => '4',
    'HY09' => '4', 'HY10' => '4',
    'HY11' => '4', 'HY12' => '4'
));
$res_p5 = $engine->score($config, $profile_5);
hy_assert($res_p5['raw_score'] === 44, 'Profile 5 raw score is 44');
hy_assert($res_p5['available_max'] === 44, 'Profile 5 available max is 44');
hy_assert($res_p5['final_score'] === 48, 'Profile 5 normalized score is 48');
hy_assert($res_p5['calculated_category'] === 'TRES_BONNES_HABITUDES_HYDRATATION', 'Profile 5 category is TRES_BONNES_HABITUDES_HYDRATATION');

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

// Submission Service flow
$adapter = new LifeMetrics_Google_Apps_Script_Adapter();
$submission_service = new LifeMetrics_Submission_Service($registry, $engine, $adapter);

// We verify that scoring calculation is authoritative
$server_scored = $engine->score($loaded_config, $profile_1);
hy_assert($server_scored['final_score'] === 43, 'Server scoring is authoritative (43/48)');
hy_assert($server_scored['calculated_category'] === 'TRES_BONNES_HABITUDES_HYDRATATION', 'Server category is authoritative');
hy_assert(in_array('adaptation-activite-chaleur', $server_scored['weakest_dimensions'], true), 'Weakest dimensions correctly identified');

echo "Questionnaire Hydratation PHP Unit & Scoring Tests: ALL PASSED.\n";
