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

function fr_assert($condition, string $msg): void {
    if (!$condition) {
        fwrite(STDERR, "FATIGUE-RECUPERATION TEST FAILED: $msg\n");
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
$config = require __DIR__ . '/../questionnaires/fatigue-recuperation/questionnaire.php';

// ----------------------------------------------------
// 1. Schema 2.0.0 Validation
// ----------------------------------------------------
$validation_errors = $validator->validate($config);
fr_assert(empty($validation_errors), 'Fatigue & Récupération passes strict Schema 2.0.0 validation (errors: ' . implode(', ', $validation_errors) . ')');

// ----------------------------------------------------
// 2. Score Boundaries (12, 24, 25, 32, 33, 60)
// ----------------------------------------------------
$base_safety = array('FRSF01' => 'no', 'FRSF02' => 'no', 'FRSF03' => 'no');

// Min score 12 (all 1s) -> RECUPERATION_FAVORABLE
$answers_12 = array_merge(array_fill_keys(array('FR01','FR02','FR03','FR04','FR05','FR06','FR07','FR08','FR09','FR10','FR11','FR12'), '1'), $base_safety);
$res_12 = $engine->score($config, $answers_12);
fr_assert($res_12['final_score'] === 12, 'Min score is 12 (got ' . $res_12['final_score'] . ')');
fr_assert($res_12['calculated_category'] === 'RECUPERATION_FAVORABLE', '12 is RECUPERATION_FAVORABLE');
fr_assert($res_12['displayed_category'] === 'RECUPERATION_FAVORABLE', 'Displayed category is RECUPERATION_FAVORABLE');

// Score 24 -> RECUPERATION_FAVORABLE
$answers_24 = array_merge(array(
    'FR01' => '2', 'FR02' => '2', 'FR03' => '2', 'FR04' => '2',
    'FR05' => '2', 'FR06' => '2', 'FR07' => '2', 'FR08' => '2',
    'FR09' => '2', 'FR10' => '2', 'FR11' => '2', 'FR12' => '2'
), $base_safety);
$res_24 = $engine->score($config, $answers_24);
fr_assert($res_24['final_score'] === 24, 'Score 24 test');
fr_assert($res_24['calculated_category'] === 'RECUPERATION_FAVORABLE', '24 is RECUPERATION_FAVORABLE');

// Score 25 -> RECUPERATION_FRAGILE
$answers_25 = array_merge($answers_24, array('FR12' => '3'));
$res_25 = $engine->score($config, $answers_25);
fr_assert($res_25['final_score'] === 25, 'Score 25 test');
fr_assert($res_25['calculated_category'] === 'RECUPERATION_FRAGILE', '25 is RECUPERATION_FRAGILE');

// Score 32 -> RECUPERATION_FRAGILE
$answers_32 = array_merge(array(
    'FR01' => '3', 'FR02' => '3', 'FR03' => '3', 'FR04' => '3',
    'FR05' => '3', 'FR06' => '3', 'FR07' => '3', 'FR08' => '3',
    'FR09' => '2', 'FR10' => '2', 'FR11' => '2', 'FR12' => '2'
), $base_safety);
$res_32 = $engine->score($config, $answers_32);
fr_assert($res_32['final_score'] === 32, 'Score 32 test');
fr_assert($res_32['calculated_category'] === 'RECUPERATION_FRAGILE', '32 is RECUPERATION_FRAGILE');

// Score 33 -> FATIGUE_IMPORTANTE
$answers_33 = array_merge($answers_32, array('FR12' => '3'));
$res_33 = $engine->score($config, $answers_33);
fr_assert($res_33['final_score'] === 33, 'Score 33 test');
fr_assert($res_33['calculated_category'] === 'FATIGUE_IMPORTANTE', '33 is FATIGUE_IMPORTANTE');

// Max score 60 (all 5s) -> FATIGUE_IMPORTANTE
$answers_60 = array_merge(array_fill_keys(array('FR01','FR02','FR03','FR04','FR05','FR06','FR07','FR08','FR09','FR10','FR11','FR12'), '5'), $base_safety);
$res_60 = $engine->score($config, $answers_60);
fr_assert($res_60['final_score'] === 60, 'Max score is 60');
fr_assert($res_60['calculated_category'] === 'FATIGUE_IMPORTANTE', '60 is FATIGUE_IMPORTANTE');

// ----------------------------------------------------
// 3. Dimension Averages Calculation
// ----------------------------------------------------
$answers_dim = array_merge($answers_12, array(
    'FR01' => '3', 'FR02' => '5', // D1 sum = 8, avg = (3+5)/2 = 4.0
    'FR03' => '1', 'FR04' => '2', // D2 sum = 3, avg = (1+2)/2 = 1.5
    'FR05' => '2', 'FR06' => '4', // D3 sum = 6, avg = (2+4)/2 = 3.0
    'FR07' => '1', 'FR08' => '1', // D4 sum = 2, avg = (1+1)/2 = 1.0
    'FR09' => '5', 'FR10' => '5', // D5 sum = 10, avg = (5+5)/2 = 5.0
    'FR11' => '2', 'FR12' => '2', // D6 sum = 4, avg = (2+2)/2 = 2.0
));
$res_dim = $engine->score($config, $answers_dim);
$d1 = get_dim($res_dim, 'energie-recuperation-reveil');
$d2 = get_dim($res_dim, 'energie-fonctionnement-journee');
$d3 = get_dim($res_dim, 'retentissement-fatigue');
$d4 = get_dim($res_dim, 'recuperation-apres-effort');
$d5 = get_dim($res_dim, 'efficacite-repos');
$d6 = get_dim($res_dim, 'stabilite-recuperation-globale');

fr_assert($d1['raw_score'] === 8 && ($d1['raw_score'] / 2) == 4.0, 'D1 raw score is 8 (avg 4.0)');
fr_assert($d2['raw_score'] === 3 && ($d2['raw_score'] / 2) == 1.5, 'D2 raw score is 3 (avg 1.5)');
fr_assert($d3['raw_score'] === 6 && ($d3['raw_score'] / 2) == 3.0, 'D3 raw score is 6 (avg 3.0)');
fr_assert($d4['raw_score'] === 2 && ($d4['raw_score'] / 2) == 1.0, 'D4 raw score is 2 (avg 1.0)');
fr_assert($d5['raw_score'] === 10 && ($d5['raw_score'] / 2) == 5.0, 'D5 raw score is 10 (avg 5.0)');
fr_assert($d6['raw_score'] === 4 && ($d6['raw_score'] / 2) == 2.0, 'D6 raw score is 4 (avg 2.0)');

// Weakest dimensions: D5 (raw 10) and D1 (raw 8)
fr_assert($res_dim['weakest_dimensions'] === array('efficacite-repos', 'energie-recuperation-reveil'), 'Weakest dimensions selected by highest score/percentage (worst)');

// ----------------------------------------------------
// 4. Safety Questions Independence
// ----------------------------------------------------
// FRSF01 alone
$res_sf1 = $engine->score($config, array_merge($answers_12, array('FRSF01' => 'yes')));
fr_assert($res_sf1['final_score'] === 12, 'Safety does not alter score (12)');
fr_assert($res_sf1['calculated_category'] === 'RECUPERATION_FAVORABLE', 'Safety does not alter category');
fr_assert($res_sf1['safety_flag_codes'] === array('FATIGUE_SAFETY_MESSAGE'), 'FRSF01 emits FATIGUE_SAFETY_MESSAGE');

// FRSF02 alone
$res_sf2 = $engine->score($config, array_merge($answers_12, array('FRSF02' => 'yes')));
fr_assert($res_sf2['safety_flag_codes'] === array('FATIGUE_SAFETY_MESSAGE'), 'FRSF02 emits FATIGUE_SAFETY_MESSAGE');

// FRSF03 alone
$res_sf3 = $engine->score($config, array_merge($answers_12, array('FRSF03' => 'yes')));
fr_assert($res_sf3['safety_flag_codes'] === array('FATIGUE_SAFETY_MESSAGE'), 'FRSF03 emits FATIGUE_SAFETY_MESSAGE');

// Multiple simultaneous safety triggers
$res_sf_all = $engine->score($config, array_merge($answers_12, array('FRSF01' => 'yes', 'FRSF02' => 'yes', 'FRSF03' => 'yes')));
fr_assert($res_sf_all['final_score'] === 12, 'Score unaffected by all safety flags');
fr_assert($res_sf_all['safety_flag_codes'] === array('FATIGUE_SAFETY_MESSAGE'), 'Multiple triggers deduplicated to unique flag code');

// ----------------------------------------------------
// 5. Registry & Submission Service Integration
// ----------------------------------------------------
$registry = new LifeMetrics_Questionnaire_Registry(
    __DIR__ . '/../questionnaires',
    array(
        'pss10' => 'pss10/questionnaire.php',
        'sedentarite' => 'sedentarite/questionnaire.php',
        'hydratation' => 'hydratation/questionnaire.php',
        'fatigue-recuperation' => 'fatigue-recuperation/questionnaire.php',
    ),
    $validator
);
$loaded_config = $registry->get_internal('fatigue-recuperation');
fr_assert($loaded_config !== null, 'Registry resolves fatigue-recuperation questionnaire');
fr_assert($loaded_config['id'] === 'fatigue-recuperation', 'Loaded config id is fatigue-recuperation');
fr_assert($loaded_config['status'] === 'review', 'Status in review');

// Submission Service flow
$adapter = new LifeMetrics_Google_Apps_Script_Adapter();
$submission_service = new LifeMetrics_Submission_Service($registry, $engine, $adapter);

$server_scored = $engine->score($loaded_config, $answers_dim);
fr_assert($server_scored['final_score'] === (3+5+1+2+2+4+1+1+5+5+2+2), 'Server scoring is authoritative (33/60)');
fr_assert($server_scored['calculated_category'] === 'FATIGUE_IMPORTANTE', 'Server category is authoritative');
fr_assert($server_scored['weakest_dimensions'] === array('efficacite-repos', 'energie-recuperation-reveil'), 'Weakest dimensions correctly identified');

echo "Questionnaire Fatigue & Récupération PHP Unit & Scoring Tests: ALL PASSED.\n";
