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
// 2. Score Boundaries (12, 24, 25, 32, 33, 60) - 3 Categories
// ----------------------------------------------------
// Min score 12 (all 1s) -> HABITUDES_FAVORABLES (D1 = 1+1 = 2)
$answers_12 = array_fill_keys(array('SD01','SD02','SD03','SD04','SD05','SD06','SD07','SD08','SD09','SD10','SD11','SD12'), '1');
$res_12 = $engine->score($config, $answers_12);
sd_assert($res_12['final_score'] === 12, 'Min score is 12');
sd_assert($res_12['calculated_category'] === 'HABITUDES_FAVORABLES', '12 is HABITUDES_FAVORABLES');
sd_assert($res_12['displayed_category'] === 'HABITUDES_FAVORABLES', 'Displayed category is HABITUDES_FAVORABLES');

// Boundary 24 -> HABITUDES_FAVORABLES (all 2s, D1 = 2+2 = 4)
$answers_24 = array_fill_keys(array('SD01','SD02','SD03','SD04','SD05','SD06','SD07','SD08','SD09','SD10','SD11','SD12'), '2');
$res_24 = $engine->score($config, $answers_24);
sd_assert($res_24['final_score'] === 24, 'Score 24 test');
sd_assert($res_24['calculated_category'] === 'HABITUDES_FAVORABLES', '24 is HABITUDES_FAVORABLES');
sd_assert($res_24['displayed_category'] === 'HABITUDES_FAVORABLES', 'Displayed category is HABITUDES_FAVORABLES');

// Boundary 25 -> SEDENTARITE_A_REDUIRE (11 answers of 2, 1 answer of 3, D1 = 4)
$answers_25 = array_merge($answers_24, array('SD03' => '3'));
$res_25 = $engine->score($config, $answers_25);
sd_assert($res_25['final_score'] === 25, 'Score 25 test');
sd_assert($res_25['calculated_category'] === 'SEDENTARITE_A_REDUIRE', '25 is SEDENTARITE_A_REDUIRE');
sd_assert($res_25['displayed_category'] === 'SEDENTARITE_A_REDUIRE', 'Displayed category is SEDENTARITE_A_REDUIRE');

// Boundary 32 -> SEDENTARITE_A_REDUIRE (8 answers of 3, 4 answers of 2, D1 = 4)
$answers_32 = array(
    'SD01' => '2', 'SD02' => '2', 'SD03' => '3', 'SD04' => '3',
    'SD05' => '3', 'SD06' => '3', 'SD07' => '3', 'SD08' => '3',
    'SD09' => '3', 'SD10' => '3', 'SD11' => '2', 'SD12' => '2'
);
$res_32 = $engine->score($config, $answers_32);
sd_assert($res_32['final_score'] === 32, 'Score 32 test');
sd_assert($res_32['calculated_category'] === 'SEDENTARITE_A_REDUIRE', '32 is SEDENTARITE_A_REDUIRE');
sd_assert($res_32['displayed_category'] === 'SEDENTARITE_A_REDUIRE', 'Displayed category is SEDENTARITE_A_REDUIRE');

// Boundary 33 -> SEDENTARITE_ELEVEE (9 answers of 3, 3 answers of 2, D1 = 4)
$answers_33 = array_merge($answers_32, array('SD11' => '3'));
$res_33 = $engine->score($config, $answers_33);
sd_assert($res_33['final_score'] === 33, 'Score 33 test');
sd_assert($res_33['calculated_category'] === 'SEDENTARITE_ELEVEE', '33 is SEDENTARITE_ELEVEE');
sd_assert($res_33['displayed_category'] === 'SEDENTARITE_ELEVEE', 'Displayed category is SEDENTARITE_ELEVEE');

// Max score 60 (all 5s) -> SEDENTARITE_ELEVEE
$answers_60 = array_fill_keys(array('SD01','SD02','SD03','SD04','SD05','SD06','SD07','SD08','SD09','SD10','SD11','SD12'), '5');
$res_60 = $engine->score($config, $answers_60);
sd_assert($res_60['final_score'] === 60, 'Max score is 60');
sd_assert($res_60['calculated_category'] === 'SEDENTARITE_ELEVEE', '60 is SEDENTARITE_ELEVEE');
sd_assert($res_60['displayed_category'] === 'SEDENTARITE_ELEVEE', 'Displayed category is SEDENTARITE_ELEVEE');

// ----------------------------------------------------
// 3. N/A Normalization (SD07 and SD08)
// Formula: ROUND((raw_score / applicable_question_count) * 12)
// ----------------------------------------------------
// Case A: 11 questions (SD07 = 'na')
$answers_na_sd07_min = array_merge($answers_12, array('SD07' => 'na'));
$res_na_sd07_min = $engine->score($config, $answers_na_sd07_min);
sd_assert($res_na_sd07_min['raw_score'] === 11, 'Raw score with SD07 na is 11');
sd_assert($res_na_sd07_min['available_min'] === 11, 'Available min with SD07 na is 11');
sd_assert($res_na_sd07_min['available_max'] === 55, 'Available max with SD07 na is 55');
sd_assert($res_na_sd07_min['final_score'] === 12, '11/55 normalizes to 12');
sd_assert($res_na_sd07_min['calculated_category'] === 'HABITUDES_FAVORABLES', '12 is HABITUDES_FAVORABLES');

// Dimension travail-etudes-deplacements with SD07 = 'na'
$dim_travail_sd07 = get_dim($res_na_sd07_min, 'travail-etudes-deplacements');
sd_assert($dim_travail_sd07 !== null, 'travail dimension present');
sd_assert($dim_travail_sd07['raw_score'] === 1, 'travail dimension raw score is 1 (from SD08)');
sd_assert($dim_travail_sd07['available_min'] === 1, 'travail available min is 1');
sd_assert($dim_travail_sd07['available_max'] === 5, 'travail available max is 5 (SD07 excluded)');
sd_assert((float)$dim_travail_sd07['percentage'] === 0.0, 'travail percentage is 0%');

// Case B: 11 questions (SD08 = 'na')
$answers_na_sd08_max = array_merge($answers_60, array('SD08' => 'na'));
$res_na_sd08_max = $engine->score($config, $answers_na_sd08_max);
sd_assert($res_na_sd08_max['raw_score'] === 55, 'Raw score with SD08 na is 55');
sd_assert($res_na_sd08_max['available_min'] === 11, 'Available min with SD08 na is 11');
sd_assert($res_na_sd08_max['available_max'] === 55, 'Available max with SD08 na is 55');
sd_assert($res_na_sd08_max['final_score'] === 60, '55/55 normalizes to 60');
sd_assert($res_na_sd08_max['calculated_category'] === 'SEDENTARITE_ELEVEE', '60 is SEDENTARITE_ELEVEE');

// Case C: 10 questions (SD07 = 'na' AND SD08 = 'na')
// applicable_question_count = 10
$answers_na_both_min = array_merge($answers_12, array('SD07' => 'na', 'SD08' => 'na'));
$res_na_both_min = $engine->score($config, $answers_na_both_min);
sd_assert($res_na_both_min['raw_score'] === 10, 'Raw score with both na is 10');
sd_assert($res_na_both_min['available_min'] === 10, 'Available min with both na is 10');
sd_assert($res_na_both_min['available_max'] === 50, 'Available max with both na is 50');
sd_assert($res_na_both_min['final_score'] === 12, '10/50 normalizes to 12');

// Dimension travail-etudes-deplacements when BOTH are N/A: excluded completely
$dim_travail_both = get_dim($res_na_both_min, 'travail-etudes-deplacements');
sd_assert($dim_travail_both !== null, 'travail dimension present');
sd_assert($dim_travail_both['unavailable'] === true, 'travail dimension is unavailable when both are N/A');
sd_assert($dim_travail_both['percentage'] === null, 'travail percentage is null');
sd_assert(!in_array('travail-etudes-deplacements', $res_na_both_min['weakest_dimensions'], true), 'travail dimension excluded from weakest dimensions');

// Case D: 10 questions intermediate values:
// raw = 20 -> (20/10)*12 = 24 -> HABITUDES_FAVORABLES
$answers_na_both_20 = array_merge($answers_24, array('SD07' => 'na', 'SD08' => 'na'));
$res_na_both_20 = $engine->score($config, $answers_na_both_20);
sd_assert($res_na_both_20['raw_score'] === 20, 'Raw score is 20');
sd_assert($res_na_both_20['final_score'] === 24, '20/10*12 normalizes to 24');
sd_assert($res_na_both_20['calculated_category'] === 'HABITUDES_FAVORABLES', '24 is HABITUDES_FAVORABLES');

// raw = 21 -> ROUND((21/10)*12) = ROUND(25.2) = 25 -> SEDENTARITE_A_REDUIRE
$answers_na_both_21 = array_merge($answers_24, array('SD01' => '3', 'SD07' => 'na', 'SD08' => 'na'));
$res_na_both_21 = $engine->score($config, $answers_na_both_21);
sd_assert($res_na_both_21['raw_score'] === 21, 'Raw score is 21');
sd_assert($res_na_both_21['final_score'] === 25, '21/10*12 normalizes to 25');
sd_assert($res_na_both_21['calculated_category'] === 'SEDENTARITE_A_REDUIRE', '25 is SEDENTARITE_A_REDUIRE');

// raw = 27 -> ROUND((27/10)*12) = ROUND(32.4) = 32 -> SEDENTARITE_A_REDUIRE
$answers_na_both_27 = array(
    'SD01' => '3', 'SD02' => '3', 'SD03' => '3', 'SD04' => '3',
    'SD05' => '3', 'SD06' => '3', 'SD07' => 'na', 'SD08' => 'na',
    'SD09' => '3', 'SD10' => '2', 'SD11' => '2', 'SD12' => '2'
);
$res_na_both_27 = $engine->score($config, $answers_na_both_27);
sd_assert($res_na_both_27['raw_score'] === 27, 'Raw score is 27');
sd_assert($res_na_both_27['final_score'] === 32, '27/10*12 normalizes to 32');
sd_assert($res_na_both_27['calculated_category'] === 'SEDENTARITE_A_REDUIRE', '32 is SEDENTARITE_A_REDUIRE');

// raw = 28 -> ROUND((28/10)*12) = ROUND(33.6) = 34 -> SEDENTARITE_ELEVEE
$answers_na_both_28 = array_merge($answers_na_both_27, array('SD10' => '3'));
$res_na_both_28 = $engine->score($config, $answers_na_both_28);
sd_assert($res_na_both_28['raw_score'] === 28, 'Raw score is 28');
sd_assert($res_na_both_28['final_score'] === 34, '28/10*12 normalizes to 34');
sd_assert($res_na_both_28['calculated_category'] === 'SEDENTARITE_ELEVEE', '34 is SEDENTARITE_ELEVEE');

// ----------------------------------------------------
// 4. Guardrail: D1 = SD01 + SD02 >= 8
// ----------------------------------------------------
// Case A: D1 = 7 (SD01=4, SD02=3). Other 10 questions = 1.
// Raw score = 4 + 3 + 10 = 17 -> In 12-24 (HABITUDES_FAVORABLES).
// D1 = 7 < 8 -> No guardrail applied!
$answers_d1_7 = array(
    'SD01' => '4', 'SD02' => '3',
    'SD03' => '1', 'SD04' => '1',
    'SD05' => '1', 'SD06' => '1',
    'SD07' => '1', 'SD08' => '1',
    'SD09' => '1', 'SD10' => '1',
    'SD11' => '1', 'SD12' => '1'
);
$res_d1_7 = $engine->score($config, $answers_d1_7);
sd_assert($res_d1_7['final_score'] === 17, 'Score is 17');
sd_assert($res_d1_7['calculated_category'] === 'HABITUDES_FAVORABLES', 'Calculated is HABITUDES_FAVORABLES');
sd_assert($res_d1_7['displayed_category'] === 'HABITUDES_FAVORABLES', 'Displayed is HABITUDES_FAVORABLES (no guardrail at D1=7)');
sd_assert(empty($res_d1_7['applied_classification_rules']), 'No classification rules applied at D1=7');

// Case B: D1 = 8 (SD01=4, SD02=4). Other 10 questions = 1.
// Raw score = 4 + 4 + 10 = 18 -> In 12-24 (HABITUDES_FAVORABLES).
// D1 = 8 >= 8 -> Guardrail applied!
$answers_d1_8 = array(
    'SD01' => '4', 'SD02' => '4',
    'SD03' => '1', 'SD04' => '1',
    'SD05' => '1', 'SD06' => '1',
    'SD07' => '1', 'SD08' => '1',
    'SD09' => '1', 'SD10' => '1',
    'SD11' => '1', 'SD12' => '1'
);
$res_d1_8 = $engine->score($config, $answers_d1_8);
sd_assert($res_d1_8['final_score'] === 18, 'Final score strictly unchanged (18)');
sd_assert($res_d1_8['calculated_category'] === 'HABITUDES_FAVORABLES', 'Calculated category remains VERTE');
sd_assert($res_d1_8['displayed_category'] === 'SEDENTARITE_A_REDUIRE', 'Displayed category is capped at SEDENTARITE_A_REDUIRE (ORANGE)');
sd_assert(in_array('GUARDRAIL_TEMPS_SEDENTAIRE_D1', $res_d1_8['applied_classification_rules'], true), 'GUARDRAIL_TEMPS_SEDENTAIRE_D1 applied');
sd_assert(in_array('SEDENTARITE_VOLUME_CAP', $res_d1_8['classification_message_codes'], true), 'SEDENTARITE_VOLUME_CAP message attached');

// Case C: D1 = 10 (SD01=5, SD02=5). Other 10 questions = 1.
// Raw score = 5 + 5 + 10 = 20 -> In 12-24 (HABITUDES_FAVORABLES).
// D1 = 10 >= 8 -> Guardrail caps to SEDENTARITE_A_REDUIRE (never red!)
$answers_d1_10 = array(
    'SD01' => '5', 'SD02' => '5',
    'SD03' => '1', 'SD04' => '1',
    'SD05' => '1', 'SD06' => '1',
    'SD07' => '1', 'SD08' => '1',
    'SD09' => '1', 'SD10' => '1',
    'SD11' => '1', 'SD12' => '1'
);
$res_d1_10 = $engine->score($config, $answers_d1_10);
sd_assert($res_d1_10['final_score'] === 20, 'Final score strictly unchanged (20)');
sd_assert($res_d1_10['calculated_category'] === 'HABITUDES_FAVORABLES', 'Calculated category remains VERTE');
sd_assert($res_d1_10['displayed_category'] === 'SEDENTARITE_A_REDUIRE', 'Displayed category is capped at ORANGE (never RED)');

// Case D: Calculated is already SEDENTARITE_A_REDUIRE (e.g. 26) with D1 = 8.
// Guardrail does not alter displayed category.
$answers_orange = array_merge($answers_d1_8, array('SD03' => '5', 'SD04' => '4')); // raw = 8 + 9 + 8 = 25
$res_orange = $engine->score($config, $answers_orange);
sd_assert($res_orange['final_score'] === 25, 'Score is 25');
sd_assert($res_orange['calculated_category'] === 'SEDENTARITE_A_REDUIRE', 'Calculated is already SEDENTARITE_A_REDUIRE');
sd_assert($res_orange['displayed_category'] === 'SEDENTARITE_A_REDUIRE', 'Displayed is SEDENTARITE_A_REDUIRE');

// Case E: Calculated is already SEDENTARITE_ELEVEE (e.g. 40) with D1 = 10.
// Guardrail does not downgrade from RED to ORANGE!
$answers_red = array(
    'SD01' => '5', 'SD02' => '5',
    'SD03' => '3', 'SD04' => '3',
    'SD05' => '3', 'SD06' => '3',
    'SD07' => '3', 'SD08' => '3',
    'SD09' => '3', 'SD10' => '3',
    'SD11' => '3', 'SD12' => '3'
);
$res_red = $engine->score($config, $answers_red);
sd_assert($res_red['final_score'] === 40, 'Score is 40');
sd_assert($res_red['calculated_category'] === 'SEDENTARITE_ELEVEE', 'Calculated is SEDENTARITE_ELEVEE');
sd_assert($res_red['displayed_category'] === 'SEDENTARITE_ELEVEE', 'Displayed remains SEDENTARITE_ELEVEE (RED)');

// ----------------------------------------------------
// 5. Weakest Dimensions Selection
// ----------------------------------------------------
// In lower_is_better: highest percentage is weakest
$d1_score = get_dim($res_d1_8, 'temps-sedentaire-quotidien');
sd_assert($d1_score['raw_score'] === 8, 'D1 raw score is 8');
sd_assert((float)$d1_score['percentage'] === 75.0, 'D1 percentage is (8-2)/8*100 = 75%');
sd_assert($res_d1_8['weakest_dimensions'][0] === 'temps-sedentaire-quotidien', 'D1 is selected as the weakest dimension');

// ----------------------------------------------------
// 6. Registry & Submission Service Integration
// ----------------------------------------------------
$registry = new LifeMetrics_Questionnaire_Registry(
    __DIR__ . '/../questionnaires',
    array('sedentarite' => 'sedentarite/questionnaire.php'),
    $validator
);
$loaded_config = $registry->get_internal('sedentarite');
sd_assert($loaded_config !== null, 'Registry resolves sedentarite configuration');
sd_assert($loaded_config['scoring_direction'] === 'lower_is_better', 'Direction is lower_is_better');
sd_assert($loaded_config['score']['target_min'] === 12, 'Target min is 12');
sd_assert($loaded_config['score']['target_max'] === 60, 'Target max is 60');

$adapter = new LifeMetrics_Google_Apps_Script_Adapter();
$submission_service = new LifeMetrics_Submission_Service($registry, $engine, $adapter);

$server_scored = $engine->score($loaded_config, $answers_d1_8);
sd_assert($server_scored['final_score'] === 18, 'Server scoring authoritative (18/60)');
sd_assert($server_scored['calculated_category'] === 'HABITUDES_FAVORABLES', 'Server calculated category authoritative');
sd_assert($server_scored['displayed_category'] === 'SEDENTARITE_A_REDUIRE', 'Server displayed category authoritative');

echo "Questionnaire Sédentarité PHP Unit & Scoring Tests: ALL PASSED.\n";

