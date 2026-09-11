<?php

error_reporting(E_ALL);
set_error_handler(static function ($severity, $message, $file, $line) {
    throw new ErrorException($message, 0, $severity, $file, $line);
});

define("ABSPATH", __DIR__ . "/");

require_once __DIR__ . "/../includes/class-questionnaire-schema-validator.php";
require_once __DIR__ . "/../includes/class-questionnaire-scoring-engine.php";
require_once __DIR__ . "/../includes/class-questionnaire-registry.php";
require_once __DIR__ . "/../includes/class-google-apps-script-adapter.php";
require_once __DIR__ . "/../includes/class-submission-service.php";

if (!function_exists("esc_url_raw")) {
    function esc_url_raw($url) { return (string)$url; }
}
if (!function_exists("sanitize_key")) {
    function sanitize_key($key) { return preg_replace("/[^a-z0-9_\\-]/", "", strtolower($key)); }
}
if (!function_exists("sanitize_text_field")) {
    function sanitize_text_field($str) { return is_string($str) ? trim(strip_tags($str)) : ""; }
}
if (!function_exists("wp_json_encode")) {
    function wp_json_encode($data) { return json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE); }
}
if (!function_exists("rest_ensure_response")) {
    function rest_ensure_response($res) { return $res; }
}
if (!function_exists("wp_generate_uuid4")) {
    function wp_generate_uuid4() { return "123e4567-e89b-42d3-a456-426614174000"; }
}

function rn_assert($condition, string $msg): void {
    if (!$condition) {
        fwrite(STDERR, "RISQUE-NUTRITIONNEL TEST FAILED: $msg\n");
        exit(1);
    }
}

function get_dim(array $result, string $dim_id): ?array {
    foreach ($result["dimensions"] as $d) {
        if ($d["id"] === $dim_id) return $d;
    }
    return null;
}

$validator = new LifeMetrics_Questionnaire_Schema_Validator();
$engine = new LifeMetrics_Questionnaire_Scoring_Engine();
$config = require __DIR__ . "/../questionnaires/risque-nutritionnel/questionnaire.php";

// ----------------------------------------------------
// 1. Schema 2.0.0 Validation
// ----------------------------------------------------
$validation_errors = $validator->validate($config);
rn_assert(empty($validation_errors), "Risque nutritionnel passes strict Schema 2.0.0 validation (errors: " . implode(", ", $validation_errors) . ")");

// ----------------------------------------------------
// 2. Score Boundaries (12, 24, 25, 32, 33, 60)
// ----------------------------------------------------
$base_safety = array("RNSF01" => "no", "RNSF02" => "no", "RNSF03" => "no", "RNSF04" => "no");

// Min score 12 (all 1s) -> RISQUE_FAIBLE
$answers_12 = array_merge(array_fill_keys(array("RN01","RN02","RN03","RN04","RN05","RN06","RN07","RN08","RN09","RN10","RN11","RN12"), "1"), $base_safety);
$res_12 = $engine->score($config, $answers_12);
rn_assert($res_12["final_score"] === 12, "Min score is 12");
rn_assert($res_12["calculated_category"] === "RISQUE_FAIBLE", "12 is RISQUE_FAIBLE");
rn_assert($res_12["displayed_category"] === "RISQUE_FAIBLE", "Displayed category is RISQUE_FAIBLE");

// Score 24 -> RISQUE_FAIBLE (all 2s)
$answers_24 = array_merge(array_fill_keys(array("RN01","RN02","RN03","RN04","RN05","RN06","RN07","RN08","RN09","RN10","RN11","RN12"), "2"), $base_safety);
$res_24 = $engine->score($config, $answers_24);
rn_assert($res_24["final_score"] === 24, "Score 24 test");
rn_assert($res_24["calculated_category"] === "RISQUE_FAIBLE", "24 is RISQUE_FAIBLE");
rn_assert($res_24["displayed_category"] === "RISQUE_FAIBLE", "24 displayed is RISQUE_FAIBLE");

// Score 25 -> RISQUE_A_SURVEILLER (+1 on RN01 = 3)
$answers_25 = array_merge($answers_24, array("RN01" => "3"));
$res_25 = $engine->score($config, $answers_25);
rn_assert($res_25["final_score"] === 25, "Score 25 test");
rn_assert($res_25["calculated_category"] === "RISQUE_A_SURVEILLER", "25 is RISQUE_A_SURVEILLER");
rn_assert($res_25["displayed_category"] === "RISQUE_A_SURVEILLER", "25 displayed is RISQUE_A_SURVEILLER");

// Score 32 -> RISQUE_A_SURVEILLER (8 questions at 3, 4 questions at 2 = 24 + 8 = 32, ensuring RN03,04,05,08 <= 3)
$answers_32 = array_merge($base_safety, array(
    "RN01" => "3", "RN02" => "3",
    "RN03" => "3", "RN04" => "3",
    "RN05" => "3", "RN06" => "3",
    "RN07" => "3", "RN08" => "3",
    "RN09" => "2", "RN10" => "2",
    "RN11" => "2", "RN12" => "2",
));
$res_32 = $engine->score($config, $answers_32);
rn_assert($res_32["final_score"] === 32, "Score 32 test");
rn_assert($res_32["calculated_category"] === "RISQUE_A_SURVEILLER", "32 is RISQUE_A_SURVEILLER");
rn_assert($res_32["displayed_category"] === "RISQUE_A_SURVEILLER", "32 displayed is RISQUE_A_SURVEILLER");

// Score 33 -> RISQUE_IMPORTANT (+1 on RN09 = 3)
$answers_33 = array_merge($answers_32, array("RN09" => "3"));
$res_33 = $engine->score($config, $answers_33);
rn_assert($res_33["final_score"] === 33, "Score 33 test");
rn_assert($res_33["calculated_category"] === "RISQUE_IMPORTANT", "33 is RISQUE_IMPORTANT");
rn_assert($res_33["displayed_category"] === "RISQUE_IMPORTANT", "33 displayed is RISQUE_IMPORTANT");

// Max score 60 (all 5s) -> RISQUE_IMPORTANT
$answers_60 = array_merge(array_fill_keys(array("RN01","RN02","RN03","RN04","RN05","RN06","RN07","RN08","RN09","RN10","RN11","RN12"), "5"), $base_safety);
$res_60 = $engine->score($config, $answers_60);
rn_assert($res_60["final_score"] === 60, "Max score is 60");
rn_assert($res_60["calculated_category"] === "RISQUE_IMPORTANT", "60 is RISQUE_IMPORTANT");
rn_assert($res_60["displayed_category"] === "RISQUE_IMPORTANT", "60 displayed is RISQUE_IMPORTANT");

// ----------------------------------------------------
// 3. Guardrail Critical Tests (RN03, RN04, RN05, RN08 >= 4)
// ----------------------------------------------------
// Base green score: 11 questions at 1 pt, 1 critical question at 4 pts -> score = 15/60 (calculated = RISQUE_FAIBLE)

// Test RN03 = 4
$answers_gr_rn03 = array_merge($answers_12, array("RN03" => "4"));
$res_gr_rn03 = $engine->score($config, $answers_gr_rn03);
rn_assert($res_gr_rn03["final_score"] === 15, "RN03=4 final_score is 15 (unchanged)");
rn_assert($res_gr_rn03["calculated_category"] === "RISQUE_FAIBLE", "RN03=4 calculated is RISQUE_FAIBLE");
rn_assert($res_gr_rn03["displayed_category"] === "RISQUE_A_SURVEILLER", "RN03=4 displayed is capped to RISQUE_A_SURVEILLER");
rn_assert(in_array("RN_GUARDRAIL_RN03", $res_gr_rn03["applied_classification_rules"], true), "RN03 rule applied");
rn_assert(in_array("RN_GUARDRAIL_APPORT_REDUIT", $res_gr_rn03["classification_message_codes"], true), "RN03 message emitted");

// Test RN04 = 4
$answers_gr_rn04 = array_merge($answers_12, array("RN04" => "4"));
$res_gr_rn04 = $engine->score($config, $answers_gr_rn04);
rn_assert($res_gr_rn04["final_score"] === 15, "RN04=4 final_score is 15 (unchanged)");
rn_assert($res_gr_rn04["calculated_category"] === "RISQUE_FAIBLE", "RN04=4 calculated is RISQUE_FAIBLE");
rn_assert($res_gr_rn04["displayed_category"] === "RISQUE_A_SURVEILLER", "RN04=4 displayed is capped to RISQUE_A_SURVEILLER");
rn_assert(in_array("RN_GUARDRAIL_RN04", $res_gr_rn04["applied_classification_rules"], true), "RN04 rule applied");

// Test RN05 = 4
$answers_gr_rn05 = array_merge($answers_12, array("RN05" => "4"));
$res_gr_rn05 = $engine->score($config, $answers_gr_rn05);
rn_assert($res_gr_rn05["final_score"] === 15, "RN05=4 final_score is 15 (unchanged)");
rn_assert($res_gr_rn05["calculated_category"] === "RISQUE_FAIBLE", "RN05=4 calculated is RISQUE_FAIBLE");
rn_assert($res_gr_rn05["displayed_category"] === "RISQUE_A_SURVEILLER", "RN05=4 displayed is capped to RISQUE_A_SURVEILLER");
rn_assert(in_array("RN_GUARDRAIL_RN05", $res_gr_rn05["applied_classification_rules"], true), "RN05 rule applied");

// Test RN08 = 4
$answers_gr_rn08 = array_merge($answers_12, array("RN08" => "4"));
$res_gr_rn08 = $engine->score($config, $answers_gr_rn08);
rn_assert($res_gr_rn08["final_score"] === 15, "RN08=4 final_score is 15 (unchanged)");
rn_assert($res_gr_rn08["calculated_category"] === "RISQUE_FAIBLE", "RN08=4 calculated is RISQUE_FAIBLE");
rn_assert($res_gr_rn08["displayed_category"] === "RISQUE_A_SURVEILLER", "RN08=4 displayed is capped to RISQUE_A_SURVEILLER");
rn_assert(in_array("RN_GUARDRAIL_RN08", $res_gr_rn08["applied_classification_rules"], true), "RN08 rule applied");

// Guardrail never forces RED (capped at ORANGE: RISQUE_A_SURVEILLER)
rn_assert($res_gr_rn03["displayed_category"] !== "RISQUE_IMPORTANT", "Guardrail does not force red");

// If already RED (e.g. score 40), guardrail does not alter red category
$answers_red_gr = array_merge($answers_60, array("RN03" => "4", "RN04" => "4"));
$res_red_gr = $engine->score($config, $answers_red_gr);
rn_assert($res_red_gr["final_score"] === 58, "Red score is 58");
rn_assert($res_red_gr["calculated_category"] === "RISQUE_IMPORTANT", "Calculated category is red");
rn_assert($res_red_gr["displayed_category"] === "RISQUE_IMPORTANT", "Displayed category remains red (not downgraded to orange)");

// ----------------------------------------------------
// 4. Safety Questions Independence
// ----------------------------------------------------
// RNSF01 alone
$res_sf1 = $engine->score($config, array_merge($answers_12, array("RNSF01" => "yes")));
rn_assert($res_sf1["final_score"] === 12, "RNSF01 does not alter score (12)");
rn_assert($res_sf1["calculated_category"] === "RISQUE_FAIBLE", "RNSF01 does not alter category");
rn_assert($res_sf1["safety_flag_codes"] === array("RN_SAFETY_MESSAGE"), "RNSF01 emits RN_SAFETY_MESSAGE");

// RNSF02 alone
$res_sf2 = $engine->score($config, array_merge($answers_12, array("RNSF02" => "yes")));
rn_assert($res_sf2["safety_flag_codes"] === array("RN_SAFETY_MESSAGE"), "RNSF02 emits RN_SAFETY_MESSAGE");

// RNSF03 alone
$res_sf3 = $engine->score($config, array_merge($answers_12, array("RNSF03" => "yes")));
rn_assert($res_sf3["safety_flag_codes"] === array("RN_SAFETY_MESSAGE"), "RNSF03 emits RN_SAFETY_MESSAGE");

// RNSF04 alone
$res_sf4 = $engine->score($config, array_merge($answers_12, array("RNSF04" => "yes")));
rn_assert($res_sf4["safety_flag_codes"] === array("RN_SAFETY_MESSAGE"), "RNSF04 emits RN_SAFETY_MESSAGE");

// All 4 safety triggers simultaneously
$res_sf_all = $engine->score($config, array_merge($answers_12, array("RNSF01" => "yes", "RNSF02" => "yes", "RNSF03" => "yes", "RNSF04" => "yes")));
rn_assert($res_sf_all["final_score"] === 12, "Score unaffected by all safety flags");
rn_assert($res_sf_all["safety_flag_codes"] === array("RN_SAFETY_MESSAGE"), "Multiple triggers deduplicated to single safety flag");

// ----------------------------------------------------
// 5. Dimension Averages & Weakest Dimensions Selection
// ----------------------------------------------------
$answers_dim = array_merge($answers_12, array(
    "RN01" => "3", "RN02" => "5", // D1 sum = 8, avg = 4.0
    "RN03" => "1", "RN04" => "2", // D2 sum = 3, avg = 1.5
    "RN05" => "2", "RN06" => "4", // D3 sum = 6, avg = 3.0
    "RN07" => "1", "RN08" => "1", // D4 sum = 2, avg = 1.0
    "RN09" => "5", "RN10" => "5", // D5 sum = 10, avg = 5.0
    "RN11" => "2", "RN12" => "2", // D6 sum = 4, avg = 2.0
));
$res_dim = $engine->score($config, $answers_dim);
$d1 = get_dim($res_dim, "appetit-satiete");
$d2 = get_dim($res_dim, "reduction-apports-alimentaires");
$d3 = get_dim($res_dim, "evolution-ponderale-involontaire");
$d4 = get_dim($res_dim, "difficultes-alimenter");
$d5 = get_dim($res_dim, "symptomes-limitant-alimentation");
$d6 = get_dim($res_dim, "acces-autonomie-continuite-repas");

rn_assert($d1["raw_score"] === 8 && ($d1["raw_score"] / 2) == 4.0, "D1 avg is 4.0");
rn_assert($d2["raw_score"] === 3 && ($d2["raw_score"] / 2) == 1.5, "D2 avg is 1.5");
rn_assert($d3["raw_score"] === 6 && ($d3["raw_score"] / 2) == 3.0, "D3 avg is 3.0");
rn_assert($d4["raw_score"] === 2 && ($d4["raw_score"] / 2) == 1.0, "D4 avg is 1.0");
rn_assert($d5["raw_score"] === 10 && ($d5["raw_score"] / 2) == 5.0, "D5 avg is 5.0");
rn_assert($d6["raw_score"] === 4 && ($d6["raw_score"] / 2) == 2.0, "D6 avg is 2.0");

// Weakest dimensions: D5 (10) and D1 (8)
rn_assert($res_dim["weakest_dimensions"] === array("symptomes-limitant-alimentation", "appetit-satiete"), "Top 2 weakest dimensions selected");

// ----------------------------------------------------
// 6. Registry & Submission Service Integration
// ----------------------------------------------------
$registry = new LifeMetrics_Questionnaire_Registry(
    __DIR__ . "/../questionnaires",
    array(
        "pss10" => "pss10/questionnaire.php",
        "sedentarite" => "sedentarite/questionnaire.php",
        "hydratation" => "hydratation/questionnaire.php",
        "fatigue-recuperation" => "fatigue-recuperation/questionnaire.php",
        "sommeil" => "sommeil/questionnaire.php",
        "nutrition" => "nutrition/questionnaire.php",
        "activite-physique" => "activite-physique/questionnaire.php",
        "pieds-confort-postural" => "pieds-confort-postural/questionnaire.php",
        "risque-nutritionnel" => "risque-nutritionnel/questionnaire.php",
    ),
    $validator
);
$loaded_config = $registry->get_internal("risque-nutritionnel");
rn_assert($loaded_config !== null, "Registry resolves risque-nutritionnel questionnaire");
rn_assert($loaded_config["id"] === "risque-nutritionnel", "Loaded config id is risque-nutritionnel");
rn_assert($loaded_config["status"] === "review", "Status in review");

// Submission Service flow
$adapter = new LifeMetrics_Google_Apps_Script_Adapter();
$submission_service = new LifeMetrics_Submission_Service($registry, $engine, $adapter);

$server_scored = $engine->score($loaded_config, $answers_dim);
rn_assert($server_scored["final_score"] === 33, "Server scoring is authoritative (33/60)");
rn_assert($server_scored["calculated_category"] === "RISQUE_IMPORTANT", "Server category is authoritative");
rn_assert($server_scored["weakest_dimensions"] === array("symptomes-limitant-alimentation", "appetit-satiete"), "Weakest dimensions correctly identified");

echo "Questionnaire Risque nutritionnel PHP Unit & Scoring Tests: ALL PASSED.\n";
