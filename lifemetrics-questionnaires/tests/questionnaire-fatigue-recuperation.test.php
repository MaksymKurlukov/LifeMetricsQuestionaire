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
// 2. Score Boundaries (0, 15, 16, 27, 28, 38, 39, 48)
// ----------------------------------------------------
$base_safety = array('FRSF01' => 'no', 'FRSF02' => 'no', 'FRSF03' => 'no');

// Min score 0 -> FATIGUE_IMPORTANTE_RECUPERATION_INSUFFISANTE
$answers_min = array_merge(array_fill_keys(array('FR01','FR02','FR03','FR04','FR05','FR06','FR07','FR08','FR09','FR10','FR11','FR12'), '0'), $base_safety);
$res_0 = $engine->score($config, $answers_min);
fr_assert($res_0['final_score'] === 0, 'Min score is 0');
fr_assert($res_0['calculated_category'] === 'FATIGUE_IMPORTANTE_RECUPERATION_INSUFFISANTE', '0 is FATIGUE_IMPORTANTE_RECUPERATION_INSUFFISANTE');
fr_assert($res_0['displayed_category'] === 'FATIGUE_IMPORTANTE_RECUPERATION_INSUFFISANTE', 'Displayed category is FATIGUE_IMPORTANTE_RECUPERATION_INSUFFISANTE');

// Score 15 -> FATIGUE_IMPORTANTE_RECUPERATION_INSUFFISANTE
$answers_15 = array_merge(array(
    'FR01' => '2', 'FR02' => '2', 'FR03' => '2', 'FR04' => '2',
    'FR05' => '2', 'FR06' => '2', 'FR07' => '2', 'FR08' => '1',
    'FR09' => '0', 'FR10' => '0', 'FR11' => '0', 'FR12' => '0'
), $base_safety);
$res_15 = $engine->score($config, $answers_15);
fr_assert($res_15['final_score'] === 15, 'Score 15 test');
fr_assert($res_15['calculated_category'] === 'FATIGUE_IMPORTANTE_RECUPERATION_INSUFFISANTE', '15 is FATIGUE_IMPORTANTE_RECUPERATION_INSUFFISANTE');

// Score 16 -> RECUPERATION_A_RENFORCER
$answers_16 = array_merge(array(
    'FR01' => '2', 'FR02' => '2', 'FR03' => '2', 'FR04' => '2',
    'FR05' => '2', 'FR06' => '2', 'FR07' => '2', 'FR08' => '2',
    'FR09' => '0', 'FR10' => '0', 'FR11' => '0', 'FR12' => '0'
), $base_safety);
$res_16 = $engine->score($config, $answers_16);
fr_assert($res_16['final_score'] === 16, 'Score 16 test');
fr_assert($res_16['calculated_category'] === 'RECUPERATION_A_RENFORCER', '16 is RECUPERATION_A_RENFORCER');

// Score 27 -> RECUPERATION_A_RENFORCER
$answers_27 = array_merge(array(
    'FR01' => '2', 'FR02' => '2', 'FR03' => '2', 'FR04' => '2',
    'FR05' => '2', 'FR06' => '2', 'FR07' => '2', 'FR08' => '2',
    'FR09' => '3', 'FR10' => '3', 'FR11' => '3', 'FR12' => '2'
), $base_safety);
$res_27 = $engine->score($config, $answers_27);
fr_assert($res_27['final_score'] === 27, 'Score 27 test');
fr_assert($res_27['calculated_category'] === 'RECUPERATION_A_RENFORCER', '27 is RECUPERATION_A_RENFORCER');

// Score 28 -> RECUPERATION_GLOBALEMENT_FAVORABLE
$answers_28 = array_merge(array(
    'FR01' => '2', 'FR02' => '2', 'FR03' => '2', 'FR04' => '2',
    'FR05' => '2', 'FR06' => '2', 'FR07' => '2', 'FR08' => '2',
    'FR09' => '3', 'FR10' => '3', 'FR11' => '3', 'FR12' => '3'
), $base_safety);
$res_28 = $engine->score($config, $answers_28);
fr_assert($res_28['final_score'] === 28, 'Score 28 test');
fr_assert($res_28['calculated_category'] === 'RECUPERATION_GLOBALEMENT_FAVORABLE', '28 is RECUPERATION_GLOBALEMENT_FAVORABLE');

// Score 38 -> RECUPERATION_GLOBALEMENT_FAVORABLE
$answers_38 = array_merge(array(
    'FR01' => '3', 'FR02' => '3', 'FR03' => '3', 'FR04' => '3',
    'FR05' => '3', 'FR06' => '3', 'FR07' => '3', 'FR08' => '3',
    'FR09' => '4', 'FR10' => '4', 'FR11' => '3', 'FR12' => '3'
), $base_safety);
$res_38 = $engine->score($config, $answers_38);
fr_assert($res_38['final_score'] === 38, 'Score 38 test');
fr_assert($res_38['calculated_category'] === 'RECUPERATION_GLOBALEMENT_FAVORABLE', '38 is RECUPERATION_GLOBALEMENT_FAVORABLE');

// Score 39 -> TRES_BON_PROFIL_RECUPERATION
$answers_39 = array_merge(array(
    'FR01' => '3', 'FR02' => '3', 'FR03' => '3', 'FR04' => '3',
    'FR05' => '3', 'FR06' => '3', 'FR07' => '4', 'FR08' => '3',
    'FR09' => '4', 'FR10' => '4', 'FR11' => '3', 'FR12' => '3'
), $base_safety);
$res_39 = $engine->score($config, $answers_39);
fr_assert($res_39['final_score'] === 39, 'Score 39 test');
fr_assert($res_39['calculated_category'] === 'TRES_BON_PROFIL_RECUPERATION', '39 is TRES_BON_PROFIL_RECUPERATION');

// Max score 48 -> TRES_BON_PROFIL_RECUPERATION
$answers_max = array_merge(array_fill_keys(array('FR01','FR02','FR03','FR04','FR05','FR06','FR07','FR08','FR09','FR10','FR11','FR12'), '4'), $base_safety);
$res_48 = $engine->score($config, $answers_max);
fr_assert($res_48['final_score'] === 48, 'Max score is 48');
fr_assert($res_48['calculated_category'] === 'TRES_BON_PROFIL_RECUPERATION', '48 is TRES_BON_PROFIL_RECUPERATION');

// ----------------------------------------------------
// 3. Dimension Attention Threshold (score <= 2/8)
// ----------------------------------------------------
// Trigger attention on D1 (FR01=1, FR02=1 -> D1=2/8) and D2=3/8 (FR03=1, FR04=2)
$answers_att = array_merge($answers_max, array(
    'FR01' => '1', 'FR02' => '1', // D1 = 2 (triggers ATTENTION_ENERGIE_REVEIL)
    'FR03' => '1', 'FR04' => '2', // D2 = 3 (no attention)
));
$res_att = $engine->score($config, $answers_att);
$dim1 = get_dim($res_att, 'energie-recuperation-reveil');
$dim2 = get_dim($res_att, 'energie-fonctionnement-journee');
fr_assert($dim1['raw_score'] === 2 && $dim1['attention'] === true, 'D1 <= 2/8 triggers attention');
fr_assert($dim2['raw_score'] === 3 && $dim2['attention'] === false, 'D2 = 3/8 does NOT trigger attention');
fr_assert(in_array('ATTENTION_ENERGIE_REVEIL', $res_att['classification_message_codes'], true), 'Attention message code emitted');
fr_assert(!in_array('ATTENTION_ENERGIE_JOURNEE', $res_att['classification_message_codes'], true), 'D2 message code not emitted');

// ----------------------------------------------------
// 4. Safety Questions Independence
// ----------------------------------------------------
// FRSF01 alone
$res_sf1 = $engine->score($config, array_merge($answers_max, array('FRSF01' => 'yes')));
fr_assert($res_sf1['final_score'] === 48, 'Safety does not alter score (48)');
fr_assert($res_sf1['calculated_category'] === 'TRES_BON_PROFIL_RECUPERATION', 'Safety does not alter category');
fr_assert($res_sf1['safety_flag_codes'] === array('FATIGUE_ATTENTION_MESSAGE'), 'FRSF01 emits FATIGUE_ATTENTION_MESSAGE');

// FRSF02 alone
$res_sf2 = $engine->score($config, array_merge($answers_max, array('FRSF02' => 'yes')));
fr_assert($res_sf2['safety_flag_codes'] === array('FATIGUE_ATTENTION_MESSAGE'), 'FRSF02 emits FATIGUE_ATTENTION_MESSAGE');

// FRSF03 alone
$res_sf3 = $engine->score($config, array_merge($answers_max, array('FRSF03' => 'yes')));
fr_assert($res_sf3['safety_flag_codes'] === array('FATIGUE_ATTENTION_MESSAGE'), 'FRSF03 emits FATIGUE_ATTENTION_MESSAGE');

// Multiple simultaneous safety triggers
$res_sf_all = $engine->score($config, array_merge($answers_max, array('FRSF01' => 'yes', 'FRSF02' => 'yes', 'FRSF03' => 'yes')));
fr_assert($res_sf_all['final_score'] === 48, 'Score unaffected by all safety flags');
fr_assert($res_sf_all['safety_flag_codes'] === array('FATIGUE_ATTENTION_MESSAGE'), 'Multiple triggers deduplicated to unique flag code');

// ----------------------------------------------------
// 5. Authoritative Synthetic Profiles from PDF (Section 14)
// ----------------------------------------------------
// Profile 1: Très fatigué, mais organise bien son repos (14/48 -> Fatigue importante / récupération insuffisante)
$profile_1 = array_merge($base_safety, array(
    'FR01' => '0', 'FR02' => '0',
    'FR03' => '1', 'FR04' => '1',
    'FR05' => '1', 'FR06' => '1',
    'FR07' => '1', 'FR08' => '1',
    'FR09' => '4', 'FR10' => '0',
    'FR11' => '2', 'FR12' => '2' // 0+0+1+1+1+1+1+1+4+0+2+2 = 14
));
$res_p1 = $engine->score($config, $profile_1);
fr_assert($res_p1['final_score'] === 14, 'Profile 1 score is 14/48');
fr_assert($res_p1['calculated_category'] === 'FATIGUE_IMPORTANTE_RECUPERATION_INSUFFISANTE', 'Profile 1 category is FATIGUE_IMPORTANTE_RECUPERATION_INSUFFISANTE');

// Profile 2: Énergie élevée, mauvaise récupération après effort (34/48 -> Récupération globalement favorable)
$profile_2 = array_merge($base_safety, array(
    'FR01' => '4', 'FR02' => '4',
    'FR03' => '4', 'FR04' => '4',
    'FR05' => '4', 'FR06' => '4',
    'FR07' => '1', 'FR08' => '1', // mauvaise récupération après effort (D4 = 2 pts)
    'FR09' => '2', 'FR10' => '2', // efficacité moyenne du repos (D5 = 4 pts)
    'FR11' => '2', 'FR12' => '2'  // stabilité moyenne (D6 = 4 pts) -> total = 8+8+8+2+4+4 = 34
));
$res_p2 = $engine->score($config, $profile_2);
fr_assert($res_p2['final_score'] === 34, 'Profile 2 score is 34/48');
fr_assert($res_p2['calculated_category'] === 'RECUPERATION_GLOBALEMENT_FAVORABLE', 'Profile 2 category is RECUPERATION_GLOBALEMENT_FAVORABLE');
fr_assert(in_array('recuperation-effort', $res_p2['weakest_dimensions'], true), 'Profile 2 identifies recuperation-effort as weakest');

// Profile 3: Bon profil global (45/48 -> Très bon profil de récupération)
$profile_3 = array_merge($base_safety, array(
    'FR01' => '4', 'FR02' => '4',
    'FR03' => '4', 'FR04' => '4',
    'FR05' => '4', 'FR06' => '4',
    'FR07' => '3', 'FR08' => '4',
    'FR09' => '4', 'FR10' => '4',
    'FR11' => '3', 'FR12' => '3' // 45
));
$res_p3 = $engine->score($config, $profile_3);
fr_assert($res_p3['final_score'] === 45, 'Profile 3 score is 45/48');
fr_assert($res_p3['calculated_category'] === 'TRES_BON_PROFIL_RECUPERATION', 'Profile 3 category is TRES_BON_PROFIL_RECUPERATION');

// Profile 4: Fatigue modérée et irrégulière (24/48 -> Récupération à renforcer)
$profile_4 = array_merge($base_safety, array(
    'FR01' => '2', 'FR02' => '2',
    'FR03' => '2', 'FR04' => '2',
    'FR05' => '2', 'FR06' => '2',
    'FR07' => '2', 'FR08' => '2',
    'FR09' => '2', 'FR10' => '2',
    'FR11' => '2', 'FR12' => '2' // 24
));
$res_p4 = $engine->score($config, $profile_4);
fr_assert($res_p4['final_score'] === 24, 'Profile 4 score is 24/48');
fr_assert($res_p4['calculated_category'] === 'RECUPERATION_A_RENFORCER', 'Profile 4 category is RECUPERATION_A_RENFORCER');

// Profile 5: Fatigue importante + repos inefficace (5/48 -> Fatigue importante / récupération insuffisante)
$profile_5 = array_merge($base_safety, array(
    'FR01' => '0', 'FR02' => '0',
    'FR03' => '0', 'FR04' => '1',
    'FR05' => '0', 'FR06' => '1',
    'FR07' => '0', 'FR08' => '1',
    'FR09' => '0', 'FR10' => '1',
    'FR11' => '0', 'FR12' => '1' // 5
));
$res_p5 = $engine->score($config, $profile_5);
fr_assert($res_p5['final_score'] === 5, 'Profile 5 score is 5/48');
fr_assert($res_p5['calculated_category'] === 'FATIGUE_IMPORTANTE_RECUPERATION_INSUFFISANTE', 'Profile 5 category is FATIGUE_IMPORTANTE_RECUPERATION_INSUFFISANTE');

// Profile 6: Haute énergie mais énergie instable (37/48 -> Récupération globalement favorable)
$profile_6 = array_merge($base_safety, array(
    'FR01' => '4', 'FR02' => '4', // D1 = 8
    'FR03' => '4', 'FR04' => '4', // D2 = 8
    'FR05' => '4', 'FR06' => '4', // D3 = 8
    'FR07' => '4', 'FR08' => '3', // D4 = 7
    'FR09' => '2', 'FR10' => '2', // D5 = 4
    'FR11' => '1', 'FR12' => '1'  // D6 = 2 -> total = 8+8+8+7+4+2 = 37
));
$res_p6 = $engine->score($config, $profile_6);
fr_assert($res_p6['final_score'] === 37, 'Profile 6 score is 37/48');
fr_assert($res_p6['calculated_category'] === 'RECUPERATION_GLOBALEMENT_FAVORABLE', 'Profile 6 category is RECUPERATION_GLOBALEMENT_FAVORABLE');
fr_assert($res_p6['weakest_dimensions'][0] === 'stabilite-recuperation-globale', 'Profile 6 identifies D6 as weakest');

// Profile 7: Faible énergie au réveil, excellente journée ensuite (42/48 -> Très bon profil de récupération)
$profile_7 = array_merge($base_safety, array(
    'FR01' => '1', 'FR02' => '1', // D1 = 2 pts
    'FR03' => '4', 'FR04' => '4',
    'FR05' => '4', 'FR06' => '4',
    'FR07' => '4', 'FR08' => '4',
    'FR09' => '4', 'FR10' => '4',
    'FR11' => '4', 'FR12' => '4' // 42 total
));
$res_p7 = $engine->score($config, $profile_7);
fr_assert($res_p7['final_score'] === 42, 'Profile 7 score is 42/48');
fr_assert($res_p7['calculated_category'] === 'TRES_BON_PROFIL_RECUPERATION', 'Profile 7 category is TRES_BON_PROFIL_RECUPERATION');
fr_assert($res_p7['weakest_dimensions'][0] === 'energie-recuperation-reveil', 'Profile 7 identifies D1 as weakest');

// ----------------------------------------------------
// 6. Registry & Submission Service Integration
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

$server_scored = $engine->score($loaded_config, $profile_2);
fr_assert($server_scored['final_score'] === 34, 'Server scoring is authoritative (34/48)');
fr_assert($server_scored['calculated_category'] === 'RECUPERATION_GLOBALEMENT_FAVORABLE', 'Server category is authoritative');
fr_assert(in_array('recuperation-effort', $server_scored['weakest_dimensions'], true), 'Weakest dimensions correctly identified');

echo "Questionnaire Fatigue & Récupération PHP Unit & Scoring Tests: ALL PASSED.\n";
