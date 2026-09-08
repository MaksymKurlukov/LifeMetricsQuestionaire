<?php
define('ABSPATH', true);

$enqueued = [];
$registered = [];

function wp_register_style($handle, $src, $deps, $ver) {
    global $registered;
    $registered[$handle] = $ver;
}
function wp_register_script($handle, $src, $deps, $ver, $args) {
    global $registered;
    $registered[$handle] = $ver;
}
function wp_enqueue_style($handle) {
    global $enqueued;
    $enqueued[] = $handle;
}
function wp_enqueue_script($handle) {
    global $enqueued;
    $enqueued[] = $handle;
}
function plugin_dir_url($file) { return '/wp-content/plugins/lifemetrics-questionnaires/'; }
function plugin_dir_path($file) { return __DIR__ . '/../'; }

require_once __DIR__ . '/../includes/class-assets.php';

$assets = new LifeMetrics_Questionnaire_Assets('/wp-content/plugins/lifemetrics-questionnaires/', __DIR__ . '/../', '1.0.0');
$assets->register();

// Verify filemtime logic is present
// The CSS file exists, so it should get filemtime.
$css_time = filemtime(__DIR__ . '/../assets/css/questionnaire.css');
$js_ui_time = filemtime(__DIR__ . '/../assets/js/questionnaire-ui.js');
$js_engine_time = filemtime(__DIR__ . '/../assets/js/questionnaire-engine.js');

if ($registered['lmq-shared-style'] !== $css_time) die("CSS version mismatch\n");
if ($registered['lmq-shared-ui'] !== $js_ui_time) die("UI version mismatch\n");
if ($registered['lmq-shared-engine'] !== $js_engine_time) die("Engine version mismatch\n");

$assets->enqueue();

if (!in_array('lmq-shared-style', $enqueued)) die("CSS not enqueued\n");
if (!in_array('lmq-shared-ui', $enqueued)) die("UI not enqueued\n");

echo "Asset filemtime tests passed.\n";
