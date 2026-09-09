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

function sd_assert($condition, string $msg): void {
    if (!$condition) {
        fwrite(STDERR, "SEDENTARITE TEST FAILED: $msg\n");
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
$config = require __DIR__ . '/../questionnaires/sedentarite/questionnaire.php';

// ----------------------------------------------------
// 1. Schema 2.0.0 Validation
// ----------------------------------------------------
$validation_errors = $validator->validate($config);
sd_assert(empty($validation_errors), 'Sédentarité passes strict Schema 2.0.0 validation (errors: ' . implode(', ', $validation_errors) . ')');

// ----------------------------------------------------
// 2. Score Boundaries (0, 15, 16, 27, 28, 38, 39, 48)
// ----------------------------------------------------
// All 0s -> Score 0 -> SEDENTARITE_ELEVEE
$answers_min = array_fill_keys(array('SD01','SD02','SD03','SD04','SD05','SD06','SD07','SD08','SD09','SD10','SD11','SD12'), '0');
$res_0 = $engine->score($config, $answers_min);
sd_assert($res_0['final_score'] === 0, 'Min score is 0');
sd_assert($res_0['calculated_category'] === 'SEDENTARITE_ELEVEE', '0 is SEDENTARITE_ELEVEE');
sd_assert($res_0['displayed_category'] === 'SEDENTARITE_ELEVEE', 'Displayed category is SEDENTARITE_ELEVEE');

// Score 15 -> SEDENTARITE_ELEVEE
$answers_15 = array(
    'SD01' => '2', 'SD02' => '2', 'SD03' => '2', 'SD04' => '2',
    'SD05' => '2', 'SD06' => '2', 'SD07' => '2', 'SD08' => '1',
    'SD09' => '0', 'SD10' => '0', 'SD11' => '0', 'SD12' => '0'
);
$res_15 = $engine->score($config, $answers_15);
sd_assert($res_15['final_score'] === 15, 'Score 15 test');
sd_assert($res_15['calculated_category'] === 'SEDENTARITE_ELEVEE', '15 is SEDENTARITE_ELEVEE');

// Score 16 -> SEDENTARITE_A_REDUIRE
$answers_16 = array(
    'SD01' => '2', 'SD02' => '2', 'SD03' => '2', 'SD04' => '2',
    'SD05' => '2', 'SD06' => '2', 'SD07' => '2', 'SD08' => '2',
    'SD09' => '0', 'SD10' => '0', 'SD11' => '0', 'SD12' => '0'
);
$res_16 = $engine->score($config, $answers_16);
sd_assert($res_16['final_score'] === 16, 'Score 16 test');
sd_assert($res_16['calculated_category'] === 'SEDENTARITE_A_REDUIRE', '16 is SEDENTARITE_A_REDUIRE');

// Score 27 -> SEDENTARITE_A_REDUIRE
$answers_27 = array(
    'SD01' => '2', 'SD02' => '2', 'SD03' => '2', 'SD04' => '2',
    'SD05' => '2', 'SD06' => '2', 'SD07' => '2', 'SD08' => '2',
    'SD09' => '3', 'SD10' => '3', 'SD11' => '3', 'SD12' => '2'
);
$res_27 = $engine->score($config, $answers_27);
sd_assert($res_27['final_score'] === 27, 'Score 27 test');
sd_assert($res_27['calculated_category'] === 'SEDENTARITE_A_REDUIRE', '27 is SEDENTARITE_A_REDUIRE');

// Score 28 -> HABITUDES_SEDENTARITE_GLOBALEMENT_FAVORABLES
$answers_28 = array(
    'SD01' => '2', 'SD02' => '2', 'SD03' => '2', 'SD04' => '2',
    'SD05' => '2', 'SD06' => '2', 'SD07' => '2', 'SD08' => '2',
    'SD09' => '3', 'SD10' => '3', 'SD11' => '3', 'SD12' => '3'
);
$res_28 = $engine->score($config, $answers_28);
sd_assert($res_28['final_score'] === 28, 'Score 28 test');
sd_assert($res_28['calculated_category'] === 'HABITUDES_SEDENTARITE_GLOBALEMENT_FAVORABLES', '28 is GLOBALEMENT_FAVORABLES');

// Score 38 -> HABITUDES_SEDENTARITE_GLOBALEMENT_FAVORABLES
$answers_38 = array(
    'SD01' => '3', 'SD02' => '3', 'SD03' => '3', 'SD04' => '3',
    'SD05' => '3', 'SD06' => '3', 'SD07' => '3', 'SD08' => '3',
    'SD09' => '3', 'SD10' => '3', 'SD11' => '4', 'SD12' => '4'
);
$res_38 = $engine->score($config, $answers_38);
sd_assert($res_38['final_score'] === 38, 'Score 38 test');
sd_assert($res_38['calculated_category'] === 'HABITUDES_SEDENTARITE_GLOBALEMENT_FAVORABLES', '38 is GLOBALEMENT_FAVORABLES');

// Score 39 -> TRES_BONNES_HABITUDES_ANTI_SEDENTARITE
$answers_39 = array(
    'SD01' => '3', 'SD02' => '3', 'SD03' => '3', 'SD04' => '3',
    'SD05' => '3', 'SD06' => '3', 'SD07' => '3', 'SD08' => '3',
    'SD09' => '3', 'SD10' => '4', 'SD11' => '4', 'SD12' => '4'
);
$res_39 = $engine->score($config, $answers_39);
sd_assert($res_39['final_score'] === 39, 'Score 39 test');
sd_assert($res_39['calculated_category'] === 'TRES_BONNES_HABITUDES_ANTI_SEDENTARITE', '39 is TRES_BONNES_HABITUDES');

// Score 48 -> TRES_BONNES_HABITUDES_ANTI_SEDENTARITE
$answers_max = array_fill_keys(array('SD01','SD02','SD03','SD04','SD05','SD06','SD07','SD08','SD09','SD10','SD11','SD12'), '4');
$res_48 = $engine->score($config, $answers_max);
sd_assert($res_48['final_score'] === 48, 'Score 48 test');
sd_assert($res_48['calculated_category'] === 'TRES_BONNES_HABITUDES_ANTI_SEDENTARITE', '48 is TRES_BONNES_HABITUDES');
sd_assert($res_48['displayed_category'] === 'TRES_BONNES_HABITUDES_ANTI_SEDENTARITE', '48 displayed category matches');

// ----------------------------------------------------
// 3. N/A Normalization (SD07 and SD08)
// ----------------------------------------------------
// One N/A (SD07=na): available_max = 44. Raw 44 -> Final 48
$answers_na_sd07 = $answers_max;
$answers_na_sd07['SD07'] = 'na';
$res_na_sd07 = $engine->score($config, $answers_na_sd07);
sd_assert($res_na_sd07['raw_score'] === 44, 'Raw score with SD07 na is 44');
sd_assert($res_na_sd07['available_max'] === 44, 'Available max with SD07 na is 44');
sd_assert($res_na_sd07['final_score'] === 48, '44/44 normalizes to 48');

// Two N/As (SD07=na, SD08=na): available_max = 40. Raw 40 -> Final 48
$answers_na_both = $answers_max;
$answers_na_both['SD07'] = 'na';
$answers_na_both['SD08'] = 'na';
$res_na_both = $engine->score($config, $answers_na_both);
sd_assert($res_na_both['raw_score'] === 40, 'Raw score with both na is 40');
sd_assert($res_na_both['available_max'] === 40, 'Available max with both na is 40');
sd_assert($res_na_both['final_score'] === 48, '40/40 normalizes to 48');

// ----------------------------------------------------
// 4. Guardrail: D1 <= 2/8 caps displayed_category to SEDENTARITE_A_REDUIRE
// ----------------------------------------------------
// D1 = SD01(1) + SD02(1) = 2/8 (<= 2). Other dimensions all 4s.
// Raw score = 2 + 40 = 42. Normally TRES_BONNES_HABITUDES_ANTI_SEDENTARITE, but capped!
$answers_guardrail_capped = array(
    'SD01' => '1', 'SD02' => '1',
    'SD03' => '4', 'SD04' => '4',
    'SD05' => '4', 'SD06' => '4',
    'SD07' => '4', 'SD08' => '4',
    'SD09' => '4', 'SD10' => '4',
    'SD11' => '4', 'SD12' => '4'
);
$res_capped = $engine->score($config, $answers_guardrail_capped);
sd_assert($res_capped['final_score'] === 42, 'Numeric final score is unchanged (42)');
sd_assert($res_capped['calculated_category'] === 'TRES_BONNES_HABITUDES_ANTI_SEDENTARITE', 'Calculated category is TRES_BONNES_HABITUDES_ANTI_SEDENTARITE');
sd_assert($res_capped['displayed_category'] === 'SEDENTARITE_A_REDUIRE', 'Displayed category is capped at SEDENTARITE_A_REDUIRE');
sd_assert(in_array('CAP_HIGH_SEDENTARY_TIME', $res_capped['applied_classification_rules'], true), 'Classification rule CAP_HIGH_SEDENTARY_TIME recorded');

// Boundary test: D1 = 3/8 (SD01=2, SD02=1). Other dimensions all 4s -> Total 43.
// No cap applied at D1 = 3!
$answers_guardrail_uncapped = $answers_guardrail_capped;
$answers_guardrail_uncapped['SD01'] = '2';
$res_uncapped = $engine->score($config, $answers_guardrail_uncapped);
sd_assert($res_uncapped['final_score'] === 43, 'Numeric score is 43');
sd_assert($res_uncapped['calculated_category'] === 'TRES_BONNES_HABITUDES_ANTI_SEDENTARITE', 'Calculated is TRES_BONNES');
sd_assert($res_uncapped['displayed_category'] === 'TRES_BONNES_HABITUDES_ANTI_SEDENTARITE', 'Displayed category is NOT capped when D1 = 3');

// ----------------------------------------------------
// 5. Dimension Attention & Weakest Dimensions
// ----------------------------------------------------
// D1=2 (<=2) triggers attention
$d1 = get_dim($res_capped, 'temps-sedentaire-quotidien');
$d2 = get_dim($res_capped, 'continuite-periodes-assises');
sd_assert($d1 !== null && $d1['attention'] === true, 'D1 attention triggered when <= 2');
sd_assert($d2 !== null && $d2['attention'] === false, 'D2 attention false when > 2');
sd_assert(count($res_capped['weakest_dimensions']) === 2, '2 weakest dimensions returned');
sd_assert($res_capped['weakest_dimensions'][0] === 'temps-sedentaire-quotidien', 'D1 is the weakest dimension');

// ----------------------------------------------------
// 6. Synthetic Profiles A through F (from PDF Section 16)
// ----------------------------------------------------
// Profile B: 8-9h assis (SD01=1, SD02=0 => D1=1), pauses freq (4s) -> final 41/48, capped at SEDENTARITE_A_REDUIRE
$profile_b = array(
    'SD01' => '1', 'SD02' => '0',
    'SD03' => '4', 'SD04' => '4',
    'SD05' => '4', 'SD06' => '4',
    'SD07' => '4', 'SD08' => '4',
    'SD09' => '4', 'SD10' => '4',
    'SD11' => '4', 'SD12' => '4'
);
$res_b = $engine->score($config, $profile_b);
sd_assert($res_b['final_score'] === 41, 'Profile B score is 41');
sd_assert($res_b['displayed_category'] === 'SEDENTARITE_A_REDUIRE', 'Profile B displayed category is SEDENTARITE_A_REDUIRE');

// Profile C: Tout 4s -> 48/48, TRES_BONNES
$res_c = $engine->score($config, $answers_max);
sd_assert($res_c['final_score'] === 48, 'Profile C score is 48');
sd_assert($res_c['displayed_category'] === 'TRES_BONNES_HABITUDES_ANTI_SEDENTARITE', 'Profile C is TRES_BONNES');

// Profile E: sans travail (SD07=na), otherwise 4s -> 48/48 normalisé
$res_e = $engine->score($config, $answers_na_sd07);
sd_assert($res_e['final_score'] === 48, 'Profile E score is 48');
sd_assert($res_e['displayed_category'] === 'TRES_BONNES_HABITUDES_ANTI_SEDENTARITE', 'Profile E is TRES_BONNES');

// ----------------------------------------------------
// 7. Backend Integration & Apps Script Sheet Mapping
// ----------------------------------------------------
$registry = new LifeMetrics_Questionnaire_Registry(
    __DIR__ . '/../questionnaires',
    array('sedentarite' => 'sedentarite/questionnaire.php'),
    $validator
);
$loaded_config = $registry->get_internal('sedentarite');
sd_assert($loaded_config !== null, 'Registry resolves sedentarite configuration');

echo "Questionnaire Sédentarité PHP Unit & Scoring Tests: ALL PASSED.\n";
