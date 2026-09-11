<?php

define('ABSPATH', __DIR__ . '/');
require __DIR__ . '/../includes/class-questionnaire-schema-validator.php';
require __DIR__ . '/../includes/class-questionnaire-registry.php';

function schema_expect($condition, string $label): void
{
    if (!$condition) { fwrite(STDERR, $label . "\n"); exit(1); }
}

$config = json_decode(file_get_contents(__DIR__ . '/fixtures/generic-scoring-v2.json'), true);
$validator = new LifeMetrics_Questionnaire_Schema_Validator();
schema_expect($validator->validate($config) === array(), 'valid ready fixture');

$mutations = array(
    'missing required' => function (&$c) { unset($c['questions']); },
    'unknown ready field' => function (&$c) { $c['unexpected'] = true; },
    'unknown nested field' => function (&$c) { $c['questions'][0]['answers'][0]['unexpected'] = true; },
    'invalid version' => function (&$c) { $c['version'] = 'v1'; },
    'duplicate question' => function (&$c) { $c['questions'][] = $c['questions'][0]; },
    'duplicate answer' => function (&$c) { $c['questions'][0]['answers'][] = $c['questions'][0]['answers'][0]; },
    'bad applicability' => function (&$c) { $c['questions'][0]['answers'][0]['points'] = null; },
    'unknown dimension question' => function (&$c) { $c['dimensions'][0]['question_ids'][] = 'MISSING'; },
    'range gap' => function (&$c) { $c['result_levels'][1]['min'] = 8; },
    'duplicate rank' => function (&$c) { $c['result_levels'][1]['rank'] = 0; },
    'bad operator' => function (&$c) { $c['classification_rules'][0]['operator'] = '!='; },
    'unknown classification message' => function (&$c) { $c['classification_rules'][0]['message_code'] = 'MISSING'; },
    'unknown attention message' => function (&$c) { $c['dimensions'][0]['attention']['message_code'] = 'MISSING'; },
    'unknown safety trigger' => function (&$c) { $c['safety_questions'][0]['answers'][0]['triggers'][] = 'MISSING'; },
    'safety points' => function (&$c) { $c['safety_questions'][0]['points'] = 1; },
    'invalid CTA' => function (&$c) { $c['result_ctas'][0]['url'] = 'javascript:alert(1)'; },
    'missing approval' => function (&$c) { $c['approvals']['publication'] = false; },
    'bad scoring direction' => function (&$c) { $c['scoring_direction'] = 'invalid_direction'; },
    'bad calculation mode' => function (&$c) { $c['dimensions'][0]['calculation_mode'] = 'median'; },
);
foreach ($mutations as $label => $mutate) {
    $invalid = $config;
    $mutate($invalid);
    schema_expect($validator->validate($invalid) !== array(), $label . ' rejected');
}

$v2_features = $config;
$v2_features['scoring_direction'] = 'lower_is_better';
$v2_features['dimensions'][0]['calculation_mode'] = 'average';
$v2_features['dimensions'][0]['improvement_messages'] = array('low' => 'Improvement text');
schema_expect($validator->validate($v2_features) === array(), 'lower_is_better, calculation_mode average and improvement_messages accepted');

$review = $config;
$review['status'] = 'review';
unset($review['approvals']);
schema_expect($validator->validate($review) === array(), 'review does not require final approvals');
$disabled = $review;
$disabled['status'] = 'disabled';
schema_expect($validator->validate($disabled) === array(), 'disabled does not require final approvals');

$root = sys_get_temp_dir() . '/lmq-schema-' . bin2hex(random_bytes(6));
mkdir($root, 0700, true);
$valid = $config;
$valid['id'] = 'valid';
$invalid = $config;
$invalid['id'] = 'invalid';
$invalid['approvals']['publication'] = false;
file_put_contents($root . '/valid.php', "<?php return " . var_export($valid, true) . ";\n");
file_put_contents($root . '/invalid.php', "<?php return " . var_export($invalid, true) . ";\n");
$registry = new LifeMetrics_Questionnaire_Registry($root, array('valid' => 'valid.php', 'invalid' => 'invalid.php'), $validator);
schema_expect($registry->get_public('valid') !== null, 'valid ready config passes public registry gate');
schema_expect($registry->get_public('invalid') === null, 'invalid ready config fails closed in registry');
unlink($root . '/valid.php');
unlink($root . '/invalid.php');
rmdir($root);

echo "Questionnaire schema tests passed.\n";
