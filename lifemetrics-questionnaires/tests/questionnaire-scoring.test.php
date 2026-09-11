<?php

define('ABSPATH', __DIR__ . '/');
require __DIR__ . '/../includes/class-questionnaire-scoring-engine.php';

function scoring_expect($expected, $actual, string $label): void
{
    if ($expected !== $actual) { fwrite(STDERR, $label . "\n" . var_export($actual, true) . "\n"); exit(1); }
}

$config = json_decode(file_get_contents(__DIR__ . '/fixtures/generic-scoring-v2.json'), true);
$engine = new LifeMetrics_Questionnaire_Scoring_Engine();
$cases = array(
    'ordinary' => array('answers' => array('Q1' => 4, 'Q2' => 0, 'Q3' => 'high', 'SF1' => 'no', 'SF2' => 'no'), 'score' => 20, 'category' => 'HIGH'),
    'half-up' => array('answers' => array('Q1' => 'na', 'Q2' => 2, 'Q3' => 'low', 'SF1' => 'no', 'SF2' => 'no'), 'score' => 3, 'category' => 'LOW'),
    'multiple-na' => array('answers' => array('Q1' => 'na', 'Q2' => 'na', 'Q3' => 'middle', 'SF1' => 'no', 'SF2' => 'no'), 'score' => 10, 'category' => 'MID'),
    'guardrail-safety' => array('answers' => array('Q1' => 1, 'Q2' => 3, 'Q3' => 'high', 'SF1' => 'yes', 'SF2' => 'yes'), 'score' => 14, 'category' => 'MID'),
);
foreach ($cases as $name => $case) {
    $result = $engine->score($config, $case['answers']);
    scoring_expect($case['score'], $result['final_score'], $name . ' score');
    scoring_expect($case['category'], $result['displayed_category'], $name . ' category');
}
$guarded = $engine->score($config, $cases['guardrail-safety']['answers']);
scoring_expect('HIGH', $guarded['calculated_category'], 'guardrail preserves calculated category');
scoring_expect(array('CAP_LOW_HABITS'), $guarded['applied_classification_rules'], 'guardrail recorded');
scoring_expect(array('URGENT', 'CHECK'), $guarded['safety_flag_codes'], 'safety priority and de-duplication');
scoring_expect(array('HABITS_CAP', 'LOW_HABITS'), $guarded['classification_message_codes'], 'classification messages remain separate');
$multiple_na = $engine->score($config, $cases['multiple-na']['answers']);
scoring_expect(true, $multiple_na['dimensions'][0]['unavailable'], 'unavailable dimension');
scoring_expect(array('energie'), $multiple_na['weakest_dimensions'], 'unavailable excluded from weakest');
$ordinary = $engine->score($config, $cases['ordinary']['answers']);
scoring_expect(array('habitudes', 'energie'), $ordinary['weakest_dimensions'], 'weakest tie uses configuration order');

$lower_is_better_config = $config;
$lower_is_better_config['scoring_direction'] = 'lower_is_better';
// In cases['guardrail-safety']: habitudes has Q1=1, Q2=3 -> 4/8 (50%), energie has Q3='high' -> 10/12 (83.33%)
// For lower_is_better, 83.33% (higher) is worse, so energie is the weakest dimension
$lower_result = $engine->score($lower_is_better_config, $cases['guardrail-safety']['answers']);
scoring_expect(array('energie', 'habitudes'), $lower_result['weakest_dimensions'], 'lower_is_better selects highest percentage as weakest');

try {
    $engine->score($config, array('Q1' => 'na', 'Q2' => 'na', 'Q3' => 'na', 'SF1' => 'no', 'SF2' => 'no'));
    scoring_expect(true, false, 'zero capacity rejected');
} catch (InvalidArgumentException $exception) {
    scoring_expect('unscorable_answers', $exception->getMessage(), 'zero capacity error');
}
try {
    $engine->score($config, array('Q1' => '4', 'Q2' => 0, 'Q3' => 'high', 'SF1' => 'no', 'SF2' => 'no'));
    scoring_expect(true, false, 'strict value mapping');
} catch (InvalidArgumentException $exception) {
    scoring_expect('invalid_submission', $exception->getMessage(), 'strict value error');
}

echo "Questionnaire PHP scoring tests passed.\n";
