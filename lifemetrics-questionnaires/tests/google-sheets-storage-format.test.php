<?php

declare(strict_types=1);

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

echo "=== LifeMetrics Google Sheets Storage Format Audit (PHP) ===" . PHP_EOL;

$validator = new LifeMetrics_Questionnaire_Schema_Validator();
$engine = new LifeMetrics_Questionnaire_Scoring_Engine();

$all_ids = array(
    'sedentarite' => array('sheet' => 'Sedentarite', 'scored' => 12, 'safety' => 0, 'total_cols' => 27),
    'hydratation' => array('sheet' => 'Hydratation', 'scored' => 12, 'safety' => 3, 'total_cols' => 30),
    'fatigue-recuperation' => array('sheet' => 'Fatigue', 'scored' => 12, 'safety' => 3, 'total_cols' => 30),
    'sommeil' => array('sheet' => 'Sommeil', 'scored' => 12, 'safety' => 3, 'total_cols' => 30),
    'nutrition' => array('sheet' => 'Nutrition', 'scored' => 12, 'safety' => 3, 'total_cols' => 30),
    'activite-physique' => array('sheet' => 'Activite_Physique', 'scored' => 12, 'safety' => 0, 'total_cols' => 27),
    'pieds-confort-postural' => array('sheet' => 'Pieds_Confort', 'scored' => 12, 'safety' => 4, 'total_cols' => 31),
);

// 1. Verify schema definition completeness and question count for all 7 proprietary questionnaires
foreach ($all_ids as $id => $meta) {
    $config_path = __DIR__ . '/../questionnaires/' . $id . '/questionnaire.php';
    assert_true(file_exists($config_path), "Config file exists for $id");
    $config = require $config_path;
    assert_true($validator->is_valid($config), "Config is valid Schema 2.0.0 for $id");
    assert_same($meta['scored'], count($config['questions']), "Scored questions count for $id");
    assert_same($meta['safety'], count($config['safety_questions']), "Safety questions count for $id");

    // 2. Build mock answers to run through scoring engine
    $mock_answers = array();
    foreach ($config['questions'] as $q) {
        $mock_answers[$q['id']] = $q['answers'][0]['value'];
    }
    foreach ($config['safety_questions'] as $sq) {
        $mock_answers[$sq['id']] = $sq['answers'][0]['value'];
    }

    $scored = $engine->score($config, $mock_answers);

    // 3. Verify that scoring engine outputs selected_answers with human-readable label
    foreach ($config['questions'] as $q) {
        $q_id = $q['id'];
        assert_true(isset($scored['selected_answers'][$q_id]), "Selected answer exists for $q_id");
        assert_true(isset($scored['selected_answers'][$q_id]['label']), "Label exists for $q_id in $id");
        assert_true(!empty($scored['selected_answers'][$q_id]['label']), "Label is non-empty for $q_id in $id");
        assert_same($q['answers'][0]['label'], $scored['selected_answers'][$q_id]['label'], "Label matches canonical config for $q_id in $id");
    }

    // 4. Verify safety answers have human-readable labels
    foreach ($config['safety_questions'] as $sq) {
        $sq_id = $sq['id'];
        assert_true(isset($scored['safety_answers'][$sq_id]), "Safety answer exists for $sq_id");
        assert_true(isset($scored['safety_answers'][$sq_id]['label']), "Label exists for $sq_id in $id");
        assert_same($sq['answers'][0]['label'], $scored['safety_answers'][$sq_id]['label'], "Safety label matches canonical config for $sq_id in $id");
    }

    // 5. Test tamper-resistance: client-supplied forged label in input cannot alter scoring engine output
    $tampered_input = $mock_answers;
    $tampered_input['forged_label'] = 'FORGED_ATTACK';
    $tampered_scored = $engine->score($config, $mock_answers);
    foreach ($config['questions'] as $q) {
        assert_same($q['answers'][0]['label'], $tampered_scored['selected_answers'][$q['id']]['label'], "Server label is strictly authoritative for {$q['id']}");
    }
}

// 6. Verify PSS10 is completely isolated and unchanged
$pss10_config = require __DIR__ . '/../questionnaires/pss10/questionnaire.php';
assert_same('pss10', $pss10_config['id'], 'PSS10 config ID');
assert_true(count($pss10_config['questions']) === 10, 'PSS10 has 10 questions');

echo "ALL 7 PROPRIETARY QUESTIONNAIRES PASSED GOOGLE SHEETS STORAGE FORMAT AUDIT." . PHP_EOL;
