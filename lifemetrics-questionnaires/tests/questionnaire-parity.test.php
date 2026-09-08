<?php

define('ABSPATH', __DIR__ . '/');
require __DIR__ . '/../includes/class-questionnaire-scoring-engine.php';

$config = json_decode(file_get_contents(__DIR__ . '/fixtures/generic-scoring-v2.json'), true);
$answers = array('Q1' => 1, 'Q2' => 3, 'Q3' => 'high', 'SF1' => 'yes', 'SF2' => 'yes');
$php = (new LifeMetrics_Questionnaire_Scoring_Engine())->score($config, $answers);
$node = proc_open(
    array('node', '-e', 'const e=require(process.argv[1]);const c=JSON.parse(process.argv[2]);const a=JSON.parse(process.argv[3]);process.stdout.write(JSON.stringify(e.score(c,a)));', realpath(__DIR__ . '/../assets/js/questionnaire-engine.js'), json_encode($config), json_encode($answers)),
    array(1 => array('pipe', 'w'), 2 => array('pipe', 'w')),
    $pipes
);
if (!is_resource($node)) { fwrite(STDERR, "Unable to start Node parity runner.\n"); exit(1); }
$javascript = stream_get_contents($pipes[1]);
$error = stream_get_contents($pipes[2]);
fclose($pipes[1]); fclose($pipes[2]);
$status = proc_close($node);
if ($status !== 0 || $javascript !== json_encode($php)) {
    fwrite(STDERR, "PHP/JavaScript parity failed.\n" . $error . "\nPHP: " . json_encode($php) . "\nJS: " . $javascript . "\n");
    exit(1);
}
echo "Questionnaire PHP/JavaScript parity passed.\n";
