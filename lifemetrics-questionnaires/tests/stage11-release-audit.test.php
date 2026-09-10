<?php

error_reporting(E_ALL);
set_error_handler(static function ($severity, $message, $file, $line) {
    throw new ErrorException($message, 0, $severity, $file, $line);
});

define('ABSPATH', __DIR__ . '/');
if (!defined('LMQ_PLUGIN_PATH')) {
    define('LMQ_PLUGIN_PATH', dirname(__DIR__) . '/');
}
if (!defined('LMQ_PLUGIN_URL')) {
    define('LMQ_PLUGIN_URL', 'https://example.test/wp-content/plugins/lifemetrics-questionnaires/');
}

if (!class_exists('WP_Error')) {
    class WP_Error {
        public function __construct(public string $code, public string $message = '', public array $data = array()) {}
        public function get_error_code(): string { return $this->code; }
        public function get_error_message(): string { return $this->message; }
        public function get_error_data(): array { return $this->data; }
    }
}
if (!function_exists('is_wp_error')) {
    function is_wp_error($thing) { return $thing instanceof WP_Error; }
}
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
if (!function_exists('rest_url')) {
    function rest_url($path = '') { return 'https://example.test/wp-json/' . ltrim($path, '/'); }
}
if (!function_exists('shortcode_atts')) {
    function shortcode_atts($pairs, $atts, $shortcode = '') {
        $out = array();
        foreach ($pairs as $name => $default) {
            $out[$name] = array_key_exists($name, (array)$atts) ? $atts[$name] : $default;
        }
        return $out;
    }
}
if (!function_exists('wp_generate_uuid4')) {
    function wp_generate_uuid4() { return '123e4567-e89b-42d3-a456-426614174000'; }
}
if (!function_exists('wp_unique_id')) {
    function wp_unique_id($prefix = '') { static $c = 0; return $prefix . (++$c); }
}
if (!function_exists('esc_attr')) {
    function esc_attr($str) { return htmlspecialchars((string)$str, ENT_QUOTES, 'UTF-8'); }
}
if (!function_exists('esc_url')) {
    function esc_url($str) { return htmlspecialchars((string)$str, ENT_QUOTES, 'UTF-8'); }
}
if (!function_exists('esc_html')) {
    function esc_html($str) { return htmlspecialchars((string)$str, ENT_QUOTES, 'UTF-8'); }
}
if (!function_exists('wp_register_style')) {
    function wp_register_style($handle, $src, $deps = array(), $ver = false) {}
}
if (!function_exists('wp_register_script')) {
    function wp_register_script($handle, $src, $deps = array(), $ver = false, $in_footer = false) {}
}
if (!function_exists('wp_enqueue_style')) {
    function wp_enqueue_style($handle) {}
}
if (!function_exists('wp_enqueue_script')) {
    function wp_enqueue_script($handle) {}
}

require_once __DIR__ . '/../includes/class-questionnaire-schema-validator.php';
require_once __DIR__ . '/../includes/class-questionnaire-scoring-engine.php';
require_once __DIR__ . '/../includes/class-questionnaire-registry.php';
require_once __DIR__ . '/../includes/class-assets.php';
require_once __DIR__ . '/../includes/class-questionnaire-renderer.php';
require_once __DIR__ . '/../includes/class-google-apps-script-adapter.php';
require_once __DIR__ . '/../includes/class-submission-service.php';
require_once __DIR__ . '/../includes/class-legacy-pss10-runtime.php';
require_once __DIR__ . '/../includes/class-shortcodes.php';

function audit_assert(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException("Stage 11 Audit Assertion failed: {$message}");
    }
}

$validator = new LifeMetrics_Questionnaire_Schema_Validator();
$engine = new LifeMetrics_Questionnaire_Scoring_Engine();

// ----------------------------------------------------
// 1. Questionnaire Inventory & Registry Audit (All 8)
// ----------------------------------------------------
$expected_questionnaires = array(
    'pss10' => array(
        'path' => 'pss10/questionnaire.php',
        'schema_version' => '2.0.0',
        'version' => '1.0.0',
        'status' => 'review',
        'target_min' => 10,
        'target_max' => 50,
        'direction' => 'higher_is_worse',
        'storage_worksheet' => 'PSS10',
    ),
    'sedentarite' => array(
        'path' => 'sedentarite/questionnaire.php',
        'schema_version' => '2.0.0',
        'version' => '1.0.0',
        'status' => 'review',
        'target_min' => 0,
        'target_max' => 48,
        'direction' => 'higher_is_better',
        'storage_worksheet' => 'Sedentarite',
    ),
    'hydratation' => array(
        'path' => 'hydratation/questionnaire.php',
        'schema_version' => '2.0.0',
        'version' => '1.0.0',
        'status' => 'review',
        'target_min' => 0,
        'target_max' => 48,
        'direction' => 'higher_is_better',
        'storage_worksheet' => 'Hydratation',
    ),
    'fatigue-recuperation' => array(
        'path' => 'fatigue-recuperation/questionnaire.php',
        'schema_version' => '2.0.0',
        'version' => '1.0.0',
        'status' => 'review',
        'target_min' => 0,
        'target_max' => 48,
        'direction' => 'higher_is_better',
        'storage_worksheet' => 'Fatigue',
    ),
    'sommeil' => array(
        'path' => 'sommeil/questionnaire.php',
        'schema_version' => '2.0.0',
        'version' => '1.0.0',
        'status' => 'review',
        'target_min' => 0,
        'target_max' => 48,
        'direction' => 'higher_is_better',
        'storage_worksheet' => 'Sommeil',
    ),
    'nutrition' => array(
        'path' => 'nutrition/questionnaire.php',
        'schema_version' => '2.0.0',
        'version' => '1.0.0',
        'status' => 'review',
        'target_min' => 0,
        'target_max' => 48,
        'direction' => 'higher_is_better',
        'storage_worksheet' => 'Nutrition',
    ),
    'activite-physique' => array(
        'path' => 'activite-physique/questionnaire.php',
        'schema_version' => '2.0.0',
        'version' => '1.0.0',
        'status' => 'review',
        'target_min' => 0,
        'target_max' => 48,
        'direction' => 'higher_is_better',
        'storage_worksheet' => 'Activite_Physique',
    ),
    'pieds-confort-postural' => array(
        'path' => 'pieds-confort-postural/questionnaire.php',
        'schema_version' => '2.0.0',
        'version' => '1.0.0',
        'status' => 'review',
        'target_min' => 0,
        'target_max' => 48,
        'direction' => 'higher_is_better',
        'storage_worksheet' => 'Pieds_Confort',
    ),
);

$registry_map = array();
foreach ($expected_questionnaires as $id => $meta) {
    $registry_map[$id] = $meta['path'];
}

$registry = new LifeMetrics_Questionnaire_Registry(
    __DIR__ . '/../questionnaires',
    $registry_map,
    $validator
);

foreach ($expected_questionnaires as $id => $expected) {
    $config = $registry->get_internal($id);
    audit_assert($config !== null, "[$id] Registry resolves canonical config");
    audit_assert($config['id'] === $id, "[$id] Config id matches registry key");
    audit_assert($config['schema_version'] === $expected['schema_version'], "[$id] Schema version is 2.0.0");
    audit_assert($config['version'] === $expected['version'], "[$id] Version matches");
    audit_assert($config['status'] === $expected['status'], "[$id] Status is in review");
    audit_assert($config['score']['target_min'] === $expected['target_min'], "[$id] Target min matches");
    audit_assert($config['score']['target_max'] === $expected['target_max'], "[$id] Target max matches");
    audit_assert($config['scoring_direction'] === $expected['direction'], "[$id] Scoring direction matches");
    audit_assert($validator->is_valid($config), "[$id] Schema 2.0.0 strict validation passes");
}

// ----------------------------------------------------
// 2. Lifecycle / Publication Gate Audit
// ----------------------------------------------------
// All proprietary review questionnaires must return NULL for get_public()
foreach (array_keys($expected_questionnaires) as $id) {
    audit_assert($registry->get_public($id) === null, "[$id] get_public() returns null while status is review");
}

// ----------------------------------------------------
// 3. Shortcode Audit & Safe Fallbacks
// ----------------------------------------------------
$adapter = new LifeMetrics_Google_Apps_Script_Adapter();
$submission_service = new LifeMetrics_Submission_Service($registry, $engine, $adapter);
$assets = new LifeMetrics_Questionnaire_Assets('https://example.test/wp-content/plugins/lifemetrics-questionnaires', dirname(__DIR__), '1.0.0');
$renderer = new LifeMetrics_Questionnaire_Renderer($assets, dirname(__DIR__) . '/templates/questionnaire.php');
$legacy_pss10 = new LifeMetrics_Legacy_PSS10_Runtime($submission_service);
$shortcodes = new LifeMetrics_Shortcodes($legacy_pss10, $registry, $renderer);

// Unknown shortcode ID returns empty string safely (no fatal error, no leak)
$unknown_res = $shortcodes->render(array('id' => 'unknown_questionnaire'));
audit_assert($unknown_res === '', 'Unknown shortcode ID returns empty string');

// Empty attribute returns empty string safely
$empty_res = $shortcodes->render(array());
audit_assert($empty_res === '', 'Empty shortcode attribute returns empty string');

// PSS10 renders legacy template
$pss10_res = $shortcodes->render(array('id' => 'pss10'));
audit_assert(!empty($pss10_res), 'PSS10 shortcode renders legacy template');
audit_assert(str_contains($pss10_res, 'id="lmq-pss10-'), 'PSS10 contains dynamic instance ID');

// All 7 proprietary questionnaires render generic frontend via explicit shortcode
foreach (array_keys($expected_questionnaires) as $id) {
    if ($id === 'pss10') continue;
    $res = $shortcodes->render(array('id' => $id));
    audit_assert(!empty($res), "[$id] Proprietary questionnaire shortcode renders non-empty frontend HTML");
    audit_assert(str_contains($res, 'class="lmq-questionnaire-root"'), "[$id] Contains root container");
    audit_assert(str_contains($res, "data-lmq-questionnaire=\"$id\""), "[$id] Contains questionnaire data attribute");
}

// ----------------------------------------------------
// 4. Secret & Absolute Path Scan
// ----------------------------------------------------
$plugin_root = dirname(__DIR__);
$runtime_files = array_merge(
    glob($plugin_root . '/*.php'),
    glob($plugin_root . '/includes/*.php'),
    glob($plugin_root . '/templates/*.php'),
    glob($plugin_root . '/assets/css/*.css'),
    glob($plugin_root . '/assets/js/*.js'),
    glob($plugin_root . '/questionnaires/*/*.php')
);

$forbidden_patterns = array(
    '/Volumes/T7',
    '/Applications/XAMPP',
    '/Users/maksymkurlukov',
    'sk_live_',
    'AKIA',
    'password',
);

foreach ($runtime_files as $file) {
    $content = file_get_contents($file);
    foreach ($forbidden_patterns as $pattern) {
        if (str_contains($content, $pattern) && !str_contains($file, 'test')) {
            audit_assert(false, "Forbidden pattern '$pattern' found in runtime file: $file");
        }
    }
}

echo "Stage 11 Production Packaging & Release Readiness Audit: ALL PASSED.\n";
