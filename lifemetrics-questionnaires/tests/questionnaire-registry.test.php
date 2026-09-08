<?php

define('ABSPATH', __DIR__ . '/');

require __DIR__ . '/../includes/class-questionnaire-registry.php';

function registry_expect_same($expected, $actual, string $label): void
{
    if ($expected !== $actual) {
        fwrite(
            STDERR,
            $label . "\nExpected: " . var_export($expected, true) . "\nActual: " . var_export($actual, true) . "\n"
        );
        exit(1);
    }
}

function registry_write_fixture(string $path, $value): void
{
    $source = "<?php\nreturn " . var_export($value, true) . ";\n";

    if (file_put_contents($path, $source) === false) {
        throw new RuntimeException('Unable to write registry test fixture.');
    }
}

$temporary_root = sys_get_temp_dir() . '/lmq-registry-' . bin2hex(random_bytes(8));
$configuration_root = $temporary_root . '/questionnaires';

if (!mkdir($configuration_root, 0700, true)) {
    throw new RuntimeException('Unable to create registry test directory.');
}

$fixture_paths = array(
    $configuration_root . '/draft.php',
    $configuration_root . '/review.php',
    $configuration_root . '/ready.php',
    $configuration_root . '/disabled.php',
    $configuration_root . '/mismatch.php',
    $configuration_root . '/invalid-status.php',
    $configuration_root . '/not-array.php',
    $temporary_root . '/outside.php',
);

register_shutdown_function(static function () use ($fixture_paths, $configuration_root, $temporary_root): void {
    foreach ($fixture_paths as $fixture_path) {
        if (is_file($fixture_path)) {
            unlink($fixture_path);
        }
    }

    if (is_dir($configuration_root)) {
        rmdir($configuration_root);
    }

    if (is_dir($temporary_root)) {
        rmdir($temporary_root);
    }
});

foreach (array('draft', 'review', 'ready', 'disabled') as $status) {
    registry_write_fixture(
        $configuration_root . '/' . $status . '.php',
        array('id' => $status, 'status' => $status, 'title' => ucfirst($status))
    );
}

registry_write_fixture($configuration_root . '/mismatch.php', array('id' => 'other', 'status' => 'ready'));
registry_write_fixture($configuration_root . '/invalid-status.php', array('id' => 'invalid-status', 'status' => 'published'));
registry_write_fixture($configuration_root . '/not-array.php', 'not an array');
registry_write_fixture($temporary_root . '/outside.php', array('id' => 'outside', 'status' => 'ready'));

$registry = new LifeMetrics_Questionnaire_Registry(
    $configuration_root,
    array(
        'draft' => 'draft.php',
        'review' => 'review.php',
        'ready' => 'ready.php',
        'disabled' => 'disabled.php',
        'mismatch' => 'mismatch.php',
        'invalid-status' => 'invalid-status.php',
        'not-array' => 'not-array.php',
        'outside' => '../outside.php',
    )
);

foreach (array('draft', 'review', 'ready', 'disabled') as $status) {
    registry_expect_same($status, $registry->get_internal($status)['status'] ?? null, $status . ' is available internally');
}

registry_expect_same('ready', $registry->get_public('ready')['status'] ?? null, 'ready is available publicly');
registry_expect_same(null, $registry->get_public('draft'), 'draft fails the public gate');
registry_expect_same(null, $registry->get_public('review'), 'review fails the public gate');
registry_expect_same(null, $registry->get_public('disabled'), 'disabled fails the public gate');
registry_expect_same(null, $registry->get_internal('unknown'), 'unknown ID fails closed');
registry_expect_same(null, $registry->get_internal('../ready'), 'visitor path traversal fails closed');
registry_expect_same(null, $registry->get_internal('READY'), 'non-canonical ID fails closed');
registry_expect_same(null, $registry->get_internal('mismatch'), 'configuration ID mismatch fails closed');
registry_expect_same(null, $registry->get_internal('invalid-status'), 'unknown lifecycle status fails closed');
registry_expect_same(null, $registry->get_internal('not-array'), 'non-array configuration fails closed');
registry_expect_same(null, $registry->get_internal('outside'), 'mapped path outside base fails closed');

registry_write_fixture($configuration_root . '/ready.php', array('id' => 'ready', 'status' => 'disabled'));
registry_expect_same('ready', $registry->get_public('ready')['status'] ?? null, 'loaded configuration is cached');

try {
    new LifeMetrics_Questionnaire_Registry($temporary_root . '/missing', array());
    registry_expect_same(true, false, 'invalid base directory is rejected');
} catch (InvalidArgumentException $exception) {
    registry_expect_same(
        'Questionnaire registry base path must be a directory.',
        $exception->getMessage(),
        'invalid base directory error'
    );
}

fwrite(STDOUT, "Questionnaire registry tests passed.\n");
