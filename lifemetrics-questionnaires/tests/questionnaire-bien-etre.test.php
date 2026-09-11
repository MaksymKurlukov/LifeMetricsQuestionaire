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

function be_assert($condition, string $msg): void {
    if (!$condition) {
        fwrite(STDERR, "BIEN-ETRE TEST FAILED: $msg\n");
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
$config = require __DIR__ . "/../questionnaires/bien-etre/questionnaire.php";

// ----------------------------------------------------
// 1. Schema 2.0.0 Validation & No Safety Guarantee
// ----------------------------------------------------
$validation_errors = $validator->validate($config);
be_assert(empty($validation_errors), "Bien-être passes strict Schema 2.0.0 validation (errors: " . implode(", ", $validation_errors) . ")");
be_assert(empty($config["safety_questions"]), "Bien-être has NO safety questions");
be_assert(empty($config["safety_messages"]), "Bien-être has NO safety messages");

// ----------------------------------------------------
// 2. Score Boundaries (12, 24, 25, 32, 33, 60)
// ----------------------------------------------------
// Min score 12 (all 1s) -> BIEN_ETRE_FAVORABLE
$answers_12 = array_fill_keys(array("BE01","BE02","BE03","BE04","BE05","BE06","BE07","BE08","BE09","BE10","BE11","BE12"), "1");
$res_12 = $engine->score($config, $answers_12);
be_assert($res_12["final_score"] === 12, "Min score is 12");
be_assert($res_12["calculated_category"] === "BIEN_ETRE_FAVORABLE", "12 is BIEN_ETRE_FAVORABLE");
be_assert($res_12["displayed_category"] === "BIEN_ETRE_FAVORABLE", "Displayed category is BIEN_ETRE_FAVORABLE");
be_assert(empty($res_12["safety_flag_codes"]), "Safety flag codes empty");

// Score 24 -> BIEN_ETRE_FAVORABLE (all 2s)
$answers_24 = array_fill_keys(array("BE01","BE02","BE03","BE04","BE05","BE06","BE07","BE08","BE09","BE10","BE11","BE12"), "2");
$res_24 = $engine->score($config, $answers_24);
be_assert($res_24["final_score"] === 24, "Score 24 test");
be_assert($res_24["calculated_category"] === "BIEN_ETRE_FAVORABLE", "24 is BIEN_ETRE_FAVORABLE");
be_assert($res_24["displayed_category"] === "BIEN_ETRE_FAVORABLE", "24 displayed is BIEN_ETRE_FAVORABLE");

// Score 25 -> BIEN_ETRE_A_RENFORCER (+1 on BE01 = 3)
$answers_25 = array_merge($answers_24, array("BE01" => "3"));
$res_25 = $engine->score($config, $answers_25);
be_assert($res_25["final_score"] === 25, "Score 25 test");
be_assert($res_25["calculated_category"] === "BIEN_ETRE_A_RENFORCER", "25 is BIEN_ETRE_A_RENFORCER");
be_assert($res_25["displayed_category"] === "BIEN_ETRE_A_RENFORCER", "25 displayed is BIEN_ETRE_A_RENFORCER");

// Score 32 -> BIEN_ETRE_A_RENFORCER (8 questions at 3, 4 questions at 2 = 24 + 8 = 32, all dimensions <= 6/10)
$answers_32 = array(
    "BE01" => "3", "BE02" => "3",
    "BE03" => "3", "BE04" => "3",
    "BE05" => "3", "BE06" => "3",
    "BE07" => "3", "BE08" => "3",
    "BE09" => "2", "BE10" => "2",
    "BE11" => "2", "BE12" => "2",
);
$res_32 = $engine->score($config, $answers_32);
be_assert($res_32["final_score"] === 32, "Score 32 test");
be_assert($res_32["calculated_category"] === "BIEN_ETRE_A_RENFORCER", "32 is BIEN_ETRE_A_RENFORCER");
be_assert($res_32["displayed_category"] === "BIEN_ETRE_A_RENFORCER", "32 displayed is BIEN_ETRE_A_RENFORCER");

// Score 33 -> BIEN_ETRE_FRAGILISE (+1 on BE09 = 3)
$answers_33 = array_merge($answers_32, array("BE09" => "3"));
$res_33 = $engine->score($config, $answers_33);
be_assert($res_33["final_score"] === 33, "Score 33 test");
be_assert($res_33["calculated_category"] === "BIEN_ETRE_FRAGILISE", "33 is BIEN_ETRE_FRAGILISE");
be_assert($res_33["displayed_category"] === "BIEN_ETRE_FRAGILISE", "33 displayed is BIEN_ETRE_FRAGILISE");

// Max score 60 (all 5s) -> BIEN_ETRE_FRAGILISE
$answers_60 = array_fill_keys(array("BE01","BE02","BE03","BE04","BE05","BE06","BE07","BE08","BE09","BE10","BE11","BE12"), "5");
$res_60 = $engine->score($config, $answers_60);
be_assert($res_60["final_score"] === 60, "Max score is 60");
be_assert($res_60["calculated_category"] === "BIEN_ETRE_FRAGILISE", "60 is BIEN_ETRE_FRAGILISE");
be_assert($res_60["displayed_category"] === "BIEN_ETRE_FRAGILISE", "60 displayed is BIEN_ETRE_FRAGILISE");

// ----------------------------------------------------
// 3. Dimensional Guardrails (dimension_mean >= 4.00, raw_score >= 8)
// ----------------------------------------------------
// Test all 6 dimensions individually with green overall calculated score (10 questions at 1, 2 questions at 4 -> sum 18)
$dim_cases = array(
    array("name" => "satisfaction", "id" => "satisfaction-globale-quotidien", "q1" => "BE01", "q2" => "BE02", "rule" => "BE_GUARDRAIL_SATISFACTION"),
    array("name" => "emotionnel", "id" => "equilibre-emotionnel", "q1" => "BE03", "q2" => "BE04", "rule" => "BE_GUARDRAIL_EMOTIONNEL"),
    array("name" => "engagement", "id" => "engagement-interet-quotidien", "q1" => "BE05", "q2" => "BE06", "rule" => "BE_GUARDRAIL_ENGAGEMENT"),
    array("name" => "maitrise", "id" => "maitrise-capacite-faire-face", "q1" => "BE07", "q2" => "BE08", "rule" => "BE_GUARDRAIL_MAITRISE"),
    array("name" => "sens", "id" => "sens-accomplissement-personnel", "q1" => "BE09", "q2" => "BE10", "rule" => "BE_GUARDRAIL_SENS"),
    array("name" => "connexion", "id" => "connexion-sociale-ressentie", "q1" => "BE11", "q2" => "BE12", "rule" => "BE_GUARDRAIL_CONNEXION"),
);

foreach ($dim_cases as $case) {
    $answers_gr = array_merge($answers_12, array($case["q1"] => "4", $case["q2"] => "4")); // raw = 18 <= 24 (calculated green), dim = 8 (mean 4.00)
    $res_gr = $engine->score($config, $answers_gr);
    be_assert($res_gr["final_score"] === 18, $case["name"] . " final_score is 18 (unchanged)");
    be_assert($res_gr["calculated_category"] === "BIEN_ETRE_FAVORABLE", $case["name"] . " calculated is green");
    be_assert($res_gr["displayed_category"] === "BIEN_ETRE_A_RENFORCER", $case["name"] . " displayed is capped to orange");
    be_assert(in_array($case["rule"], $res_gr["applied_classification_rules"], true), $case["name"] . " rule applied");
    be_assert($res_gr["weakest_dimensions"][0] === $case["id"], $case["name"] . " responsible dimension is in weakest dimensions");
}

// Guardrail never forces RED (capped at ORANGE: BIEN_ETRE_A_RENFORCER)
$answers_gr_d1 = array_merge($answers_12, array("BE01" => "5", "BE02" => "5")); // raw = 20 <= 24 (green), dim = 10 (mean 5.0)
$res_gr_d1 = $engine->score($config, $answers_gr_d1);
be_assert($res_gr_d1["calculated_category"] === "BIEN_ETRE_FAVORABLE", "Calculated remains green");
be_assert($res_gr_d1["displayed_category"] === "BIEN_ETRE_A_RENFORCER", "Displayed is capped to orange (not forced red)");

// If already RED (e.g. score 40), guardrail does not alter red category
$answers_red_gr = array_merge($answers_60, array("BE01" => "4", "BE02" => "4"));
$res_red_gr = $engine->score($config, $answers_red_gr);
be_assert($res_red_gr["final_score"] === 58, "Red score is 58");
be_assert($res_red_gr["calculated_category"] === "BIEN_ETRE_FRAGILISE", "Calculated is red");
be_assert($res_red_gr["displayed_category"] === "BIEN_ETRE_FRAGILISE", "Displayed remains red");

// ----------------------------------------------------
// 4. Dimension Averages & Weakest Dimensions Selection
// ----------------------------------------------------
$answers_dim = array_merge($answers_12, array(
    "BE01" => "3", "BE02" => "5", // D1 sum = 8, avg = 4.0
    "BE03" => "1", "BE04" => "2", // D2 sum = 3, avg = 1.5
    "BE05" => "2", "BE06" => "4", // D3 sum = 6, avg = 3.0
    "BE07" => "1", "BE08" => "1", // D4 sum = 2, avg = 1.0
    "BE09" => "5", "BE10" => "5", // D5 sum = 10, avg = 5.0
    "BE11" => "2", "BE12" => "2", // D6 sum = 4, avg = 2.0
));
$res_dim = $engine->score($config, $answers_dim);
$d1 = get_dim($res_dim, "satisfaction-globale-quotidien");
$d2 = get_dim($res_dim, "equilibre-emotionnel");
$d3 = get_dim($res_dim, "engagement-interet-quotidien");
$d4 = get_dim($res_dim, "maitrise-capacite-faire-face");
$d5 = get_dim($res_dim, "sens-accomplissement-personnel");
$d6 = get_dim($res_dim, "connexion-sociale-ressentie");

be_assert($d1["raw_score"] === 8 && ($d1["raw_score"] / 2) == 4.0, "D1 avg is 4.0");
be_assert($d2["raw_score"] === 3 && ($d2["raw_score"] / 2) == 1.5, "D2 avg is 1.5");
be_assert($d3["raw_score"] === 6 && ($d3["raw_score"] / 2) == 3.0, "D3 avg is 3.0");
be_assert($d4["raw_score"] === 2 && ($d4["raw_score"] / 2) == 1.0, "D4 avg is 1.0");
be_assert($d5["raw_score"] === 10 && ($d5["raw_score"] / 2) == 5.0, "D5 avg is 5.0");
be_assert($d6["raw_score"] === 4 && ($d6["raw_score"] / 2) == 2.0, "D6 avg is 2.0");

// Weakest dimensions: D5 (10) and D1 (8)
be_assert($res_dim["weakest_dimensions"] === array("sens-accomplissement-personnel", "satisfaction-globale-quotidien"), "Top 2 weakest dimensions selected");

// ----------------------------------------------------
// 5. Registry & Submission Service Integration
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
        "bien-etre" => "bien-etre/questionnaire.php",
    ),
    $validator
);
$loaded_config = $registry->get_internal("bien-etre");
be_assert($loaded_config !== null, "Registry resolves bien-etre questionnaire");
be_assert($loaded_config["id"] === "bien-etre", "Loaded config id is bien-etre");
be_assert($loaded_config["status"] === "review", "Status in review");

// Submission Service flow
$adapter = new LifeMetrics_Google_Apps_Script_Adapter();
$submission_service = new LifeMetrics_Submission_Service($registry, $engine, $adapter);

$server_scored = $engine->score($loaded_config, $answers_dim);
be_assert($server_scored["final_score"] === 33, "Server scoring is authoritative (33/60)");
be_assert($server_scored["calculated_category"] === "BIEN_ETRE_FRAGILISE", "Server category is authoritative");
be_assert($server_scored["weakest_dimensions"] === array("sens-accomplissement-personnel", "satisfaction-globale-quotidien"), "Weakest dimensions correctly identified");

echo "Questionnaire Bien-être PHP Unit & Scoring Tests: ALL PASSED.\n";
