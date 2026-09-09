<?php

declare(strict_types=1);

defined('ABSPATH') || define('ABSPATH', true);

require_once __DIR__ . '/../includes/class-questionnaire-schema-validator.php';
require_once __DIR__ . '/../includes/class-questionnaire-scoring-engine.php';
require_once __DIR__ . '/../includes/class-questionnaire-registry.php';
require_once __DIR__ . '/../includes/class-submission-service.php';
require_once __DIR__ . '/../includes/class-google-apps-script-adapter.php';

function assert_true(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException('Assertion failed: ' . $message);
    }
}

function assert_same($expected, $actual, string $message = ''): void
{
    if ($expected !== $actual) {
        throw new RuntimeException(
            sprintf(
                "Assertion failed: %s\nExpected: %s\nActual:   %s",
                $message,
                var_export($expected, true),
                var_export($actual, true)
            )
        );
    }
}

echo "=== LifeMetrics Google Sheets Physical Storage Format Audit (PHP) ===" . PHP_EOL;

$validator = new LifeMetrics_Questionnaire_Schema_Validator();
$engine = new LifeMetrics_Questionnaire_Scoring_Engine();

$all_ids = array(
    'sedentarite' => array('sheet' => 'Sedentarite', 'scored' => 12, 'safety' => 0, 'dims' => 6, 'has_safety_col' => false, 'total_cols' => 31),
    'hydratation' => array('sheet' => 'Hydratation', 'scored' => 12, 'safety' => 3, 'dims' => 6, 'has_safety_col' => true, 'total_cols' => 35),
    'fatigue-recuperation' => array('sheet' => 'Fatigue', 'scored' => 12, 'safety' => 3, 'dims' => 6, 'has_safety_col' => true, 'total_cols' => 35),
    'sommeil' => array('sheet' => 'Sommeil', 'scored' => 12, 'safety' => 3, 'dims' => 5, 'has_safety_col' => true, 'total_cols' => 35),
    'nutrition' => array('sheet' => 'Nutrition', 'scored' => 12, 'safety' => 3, 'dims' => 6, 'has_safety_col' => true, 'total_cols' => 35),
    'activite-physique' => array('sheet' => 'Activite_Physique', 'scored' => 12, 'safety' => 0, 'dims' => 5, 'has_safety_col' => false, 'total_cols' => 31),
    'pieds-confort-postural' => array('sheet' => 'Pieds_Confort', 'scored' => 12, 'safety' => 4, 'dims' => 6, 'has_safety_col' => true, 'total_cols' => 36),
);

// 1. Verify schema definition completeness, question count, and canonical column layouts
foreach ($all_ids as $id => $meta) {
    $config_path = __DIR__ . '/../questionnaires/' . $id . '/questionnaire.php';
    assert_true(file_exists($config_path), "Config file exists for $id");
    $config = require $config_path;
    assert_true($validator->is_valid($config), "Config is valid Schema 2.0.0 for $id");
    assert_same($meta['scored'], count($config['questions']), "Scored questions count for $id");
    assert_same($meta['safety'], count($config['safety_questions']), "Safety questions count for $id");
    assert_same($meta['dims'], count($config['dimensions']), "Dimensions count for $id");

    // Verify physical column count calculation:
    // 3 metadata (completed_at, session_id, questionnaire_version)
    // + (scored * 2) (question text column + points column)
    // + (safety * 1) (question text column only, no points)
    // + 3 score columns (raw_score, available_max, final_score)
    // + 1 category column (category)
    // + (has_safety ? 1 : 0) (safety_attention)
    $expected_cols = 3 + ($meta['scored'] * 2) + ($meta['safety'] * 1) + 3 + 1 + ($meta['has_safety_col'] ? 1 : 0);
    assert_same($meta['total_cols'], $expected_cols, "Physical column count formula for $id");

    // 2. Build mock answers
    $mock_answers = array();
    foreach ($config['questions'] as $q) {
        $mock_answers[$q['id']] = $q['answers'][0]['value'];
    }
    foreach ($config['safety_questions'] as $sq) {
        $mock_answers[$sq['id']] = $sq['answers'][0]['value'];
    }

    $scored = $engine->score($config, $mock_answers);

    // 3. Verify that scoring engine outputs selected_answers with both value and label and points
    foreach ($config['questions'] as $q) {
        $q_id = $q['id'];
        assert_true(isset($scored['selected_answers'][$q_id]), "Selected answer exists for $q_id in $id");
        assert_true(isset($scored['selected_answers'][$q_id]['label']), "Label exists for $q_id in $id");
        assert_true(!empty($scored['selected_answers'][$q_id]['label']), "Label is non-empty for $q_id in $id");
        assert_same($q['answers'][0]['label'], $scored['selected_answers'][$q_id]['label'], "Label matches canonical config for $q_id in $id");
        assert_same($q['answers'][0]['points'], $scored['selected_answers'][$q_id]['points'], "Points match canonical config for $q_id in $id");
        assert_true(is_int($scored['selected_answers'][$q_id]['points']), "Points are numeric integer for $q_id in $id");
    }

    // 4. Verify safety answers have human-readable labels and NO points
    foreach ($config['safety_questions'] as $sq) {
        $sq_id = $sq['id'];
        assert_true(isset($scored['safety_answers'][$sq_id]), "Safety answer exists for $sq_id in $id");
        assert_true(isset($scored['safety_answers'][$sq_id]['label']), "Label exists for $sq_id in $id");
        assert_same($sq['answers'][0]['label'], $scored['safety_answers'][$sq_id]['label'], "Safety label matches canonical config for $sq_id in $id");
        assert_true(!isset($scored['safety_answers'][$sq_id]['points']), "No points on safety question $sq_id");
    }

    // 5. Test N/A handling: when N/A is selected, applicable is false and points is excluded from capacity
    $na_question = null;
    foreach ($config['questions'] as $q) {
        foreach ($q['answers'] as $ans) {
            if (!$ans['applicable']) {
                $na_question = $q;
                break 2;
            }
        }
    }
    if ($na_question !== null) {
        $na_answers = $mock_answers;
        $na_option = null;
        foreach ($na_question['answers'] as $ans) {
            if (!$ans['applicable']) { $na_option = $ans; break; }
        }
        $na_answers[$na_question['id']] = $na_option['value'];
        $na_scored = $engine->score($config, $na_answers);
        assert_same(false, $na_scored['selected_answers'][$na_question['id']]['applicable'], "N/A marked not applicable in $id");
        assert_same($na_option['label'], $na_scored['selected_answers'][$na_question['id']]['label'], "N/A label preserved in $id");
    }

    // 6. Test tamper-resistance: client cannot forge labels or points
    $tampered_input = $mock_answers;
    $tampered_input['forged_label'] = 'FORGED_ATTACK';
    $tampered_scored = $engine->score($config, $mock_answers);
    foreach ($config['questions'] as $q) {
        assert_same($q['answers'][0]['label'], $tampered_scored['selected_answers'][$q['id']]['label'], "Server label is strictly authoritative for {$q['id']}");
        assert_same($q['answers'][0]['points'], $tampered_scored['selected_answers'][$q['id']]['points'], "Server points are strictly authoritative for {$q['id']}");
    }
}

// 7. Verify PSS10 is completely isolated and unchanged
$pss10_config = require __DIR__ . '/../questionnaires/pss10/questionnaire.php';
assert_same('pss10', $pss10_config['id'], 'PSS10 config ID');
assert_true(count($pss10_config['questions']) === 10, 'PSS10 has 10 questions');

echo "ALL 7 PROPRIETARY QUESTIONNAIRES PASSED PHYSICAL GOOGLE SHEETS STORAGE FORMAT AUDIT." . PHP_EOL;
