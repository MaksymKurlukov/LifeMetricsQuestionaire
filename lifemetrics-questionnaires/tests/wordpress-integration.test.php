<?php

// Test strict error reporting: no notices, no warnings, no deprecations
error_reporting(E_ALL);
set_error_handler(static function ($severity, $message, $file, $line) {
    throw new ErrorException($message, 0, $severity, $file, $line);
});

define('ABSPATH', __DIR__ . '/');
define('LMQ_PSS10_GOOGLE_ENDPOINT', 'https://script.google.com/macros/s/AKfycbx_mock_endpoint/exec');

$GLOBALS['wp_actions'] = array();
$GLOBALS['wp_shortcodes'] = array();
$GLOBALS['wp_rest_routes'] = array();
$GLOBALS['wp_styles'] = array();
$GLOBALS['wp_scripts'] = array();
$GLOBALS['wp_enqueued_styles'] = array();
$GLOBALS['wp_enqueued_scripts'] = array();

function plugin_dir_path($file) {
    return dirname(__DIR__) . '/';
}

function plugin_dir_url($file) {
    return 'https://example.test/wp-content/plugins/lifemetrics-questionnaires/';
}

function add_action($tag, $callback, $priority = 10, $accepted_args = 1) {
    $GLOBALS['wp_actions'][] = array('tag' => $tag, 'callback' => $callback, 'priority' => $priority);
}

function add_shortcode($tag, $callback) {
    $GLOBALS['wp_shortcodes'][$tag] = $callback;
}

function do_shortcode($content) {
    if (preg_match('/\[lifemetrics_questionnaire\s+id="([^"]+)"\]/', $content, $m)) {
        if (isset($GLOBALS['wp_shortcodes']['lifemetrics_questionnaire'])) {
            return call_user_func($GLOBALS['wp_shortcodes']['lifemetrics_questionnaire'], array('id' => $m[1]));
        }
    }
    return '';
}

function register_rest_route($namespace, $route, $args) {
    $GLOBALS['wp_rest_routes'][$namespace . $route] = $args;
}

function rest_url($path = '') {
    return 'https://example.test/wp-json/' . ltrim($path, '/');
}

function wp_register_style($handle, $src, $deps = array(), $ver = false, $media = 'all') {
    $GLOBALS['wp_styles'][$handle] = array('src' => $src, 'ver' => $ver);
}

function wp_register_script($handle, $src, $deps = array(), $ver = false, $in_footer = false) {
    $GLOBALS['wp_scripts'][$handle] = array('src' => $src, 'ver' => $ver, 'deps' => $deps);
}

function wp_enqueue_style($handle) {
    $GLOBALS['wp_enqueued_styles'][] = $handle;
}

function wp_enqueue_script($handle) {
    $GLOBALS['wp_enqueued_scripts'][] = $handle;
}

function wp_style_is($handle, $list = 'enqueued') {
    return in_array($handle, $GLOBALS['wp_enqueued_styles'], true);
}

function wp_print_styles($handle) {
    // mock
}

function sanitize_key($key) {
    return preg_replace('/[^a-z0-9_\-]/', '', strtolower($key));
}

function esc_attr($text) {
    return htmlspecialchars((string)$text, ENT_QUOTES, 'UTF-8');
}

function esc_url($url) {
    return htmlspecialchars((string)$url, ENT_QUOTES, 'UTF-8');
}

function esc_url_raw($url) {
    return (string)$url;
}

function wp_json_encode($data) {
    return json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
}

function shortcode_atts($pairs, $atts, $shortcode = '') {
    $out = array();
    foreach ($pairs as $name => $default) {
        $out[$name] = array_key_exists($name, (array)$atts) ? $atts[$name] : $default;
    }
    return $out;
}

function wp_unique_id($prefix = '') {
    static $i = 0;
    return $prefix . (++$i);
}

function wp_generate_uuid4() {
    return sprintf(
        '%04x%04x-%04x-4%03x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff), mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );
}

function is_wp_error($thing) {
    return $thing instanceof WP_Error;
}

function rest_ensure_response($response) {
    return $response;
}

class WP_Error {
    public function __construct(private string $code, private string $message, private array $data = array()) {}
    public function get_error_code(): string { return $this->code; }
    public function get_error_message(): string { return $this->message; }
    public function get_error_data(): array { return $this->data; }
}

class WP_REST_Server {
    public const CREATABLE = 'POST';
}

class WP_REST_Request {
    public function __construct(private string $method, private string $route, private array $json_params = array(), private bool $is_json = true, private string $body = '') {}
    public function get_method(): string { return $this->method; }
    public function get_route(): string { return $this->route; }
    public function is_json_content_type(): bool { return $this->is_json; }
    public function get_json_params(): array { return $this->json_params; }
    public function get_body(): string { return $this->body ?: json_encode($this->json_params); }
}

function wp_remote_post($url, $args = array()) {
    $GLOBALS['wp_last_remote_post'] = array('url' => $url, 'args' => $args);
    return array(
        'response' => array('code' => 200),
        'body' => json_encode(array('ok' => true, 'duplicate' => false)),
    );
}

function wp_remote_get($url, $args = array()) {
    return array(
        'response' => array('code' => 200),
        'body' => json_encode(array('ok' => true, 'duplicate' => false)),
    );
}

function wp_remote_retrieve_response_code($response) {
    return is_array($response) && isset($response['response']['code']) ? $response['response']['code'] : 500;
}

function wp_remote_retrieve_body($response) {
    return is_array($response) && isset($response['body']) ? $response['body'] : '';
}

function wp_remote_retrieve_header($response, $header) {
    return is_array($response) && isset($response['headers'][$header]) ? $response['headers'][$header] : '';
}

// ----------------------------------------------------
// BOOTSTRAP WORKFLOW
// ----------------------------------------------------
require_once dirname(__DIR__) . '/lifemetrics-questionnaires.php';

function wp_assert($condition, string $msg): void {
    if (!$condition) {
        fwrite(STDERR, "WP Integration FAIL: $msg\n");
        exit(1);
    }
}

// 1. Verify plugin hooks registered
wp_assert(count($GLOBALS['wp_actions']) >= 3, 'WordPress actions registered (init, rest_api_init, wp_footer)');
wp_assert(isset($GLOBALS['wp_shortcodes']['lifemetrics_questionnaire']), 'Shortcode lifemetrics_questionnaire registered');

// 2. Trigger rest_api_init
foreach ($GLOBALS['wp_actions'] as $act) {
    if ($act['tag'] === 'rest_api_init') {
        call_user_func($act['callback']);
    }
}
wp_assert(isset($GLOBALS['wp_rest_routes']['lifemetrics-questionnaires/v1/pss10/submit']), 'REST route /v1/pss10/submit registered');

// 3. Render shortcode in simulated page
$html = do_shortcode('[lifemetrics_questionnaire id="pss10"]');
wp_assert(!empty($html), 'Shortcode renders non-empty HTML');
wp_assert(str_contains($html, 'class="lmq-questionnaire-root"'), 'HTML contains lmq-questionnaire-root');
wp_assert(str_contains($html, 'id="lmq-pss10-1"'), 'HTML contains dynamic instance ID lmq-pss10-1');
wp_assert(str_contains($html, 'data-lmq-config'), 'HTML contains inert config script');
wp_assert(str_contains($html, 'data-lmq-submit-url'), 'HTML contains submit URL script');
wp_assert(str_contains($html, 'https://example.test/wp-json/lifemetrics-questionnaires/v1/pss10/submit'), 'Submit URL points to exact REST endpoint');

// 4. Verify asset enqueues
wp_assert(in_array('lmq-pss10', $GLOBALS['wp_enqueued_styles'], true), 'PSS10 specific stylesheet enqueued');
wp_assert(in_array('lmq-shared-style', $GLOBALS['wp_enqueued_styles'], true), 'Shared stylesheet enqueued');
wp_assert(in_array('lmq-shared-ui', $GLOBALS['wp_enqueued_scripts'], true), 'Shared UI script enqueued');

// 4b. Render proprietary questionnaire shortcode (Hydratation)
$html_hydra = do_shortcode('[lifemetrics_questionnaire id="hydratation"]');
wp_assert(!empty($html_hydra), 'Hydratation shortcode renders non-empty HTML');
wp_assert(str_contains($html_hydra, 'class="lmq-questionnaire-root"'), 'Hydratation HTML contains root container');
wp_assert(str_contains($html_hydra, 'data-lmq-questionnaire="hydratation"'), 'Hydratation HTML contains questionnaire data attribute');
wp_assert(str_contains($html_hydra, 'data-lmq-config'), 'Hydratation HTML contains config script');
wp_assert(str_contains($html_hydra, 'https://example.test/wp-json/lifemetrics-questionnaires/v1/hydratation/submit'), 'Hydratation submit URL points to exact REST endpoint');

// 4c. Unknown shortcode ID renders empty string
$html_unknown = do_shortcode('[lifemetrics_questionnaire id="unknown_q"]');
wp_assert($html_unknown === '', 'Unknown shortcode renders empty string');

// 5. Test REST endpoint dispatch (Simulated generic client submission)
$route_args = $GLOBALS['wp_rest_routes']['lifemetrics-questionnaires/v1/pss10/submit'];
$callback = $route_args['callback'];

$generic_request_body = array(
    'answers' => array(
        'Q1' => '3',
        'Q2' => '2',
        'Q3' => '2',
        'Q4' => '4', // reverse: 6-4 = 2
        'Q5' => '4', // reverse: 6-4 = 2
        'Q6' => '2',
        'Q7' => '4', // reverse: 6-4 = 2
        'Q8' => '4', // reverse: 6-4 = 2
        'Q9' => '2',
        'Q10' => '2',
    ),
);
$request = new WP_REST_Request('POST', '/lifemetrics-questionnaires/v1/pss10/submit', $generic_request_body);
$response = call_user_func($callback, $request);

wp_assert(!is_wp_error($response), 'REST response is not WP_Error');
wp_assert(isset($response['success']) && $response['success'] === true, 'REST response returns success: true');

// Verify payload forwarded to Google Apps Script
wp_assert(isset($GLOBALS['wp_last_remote_post']), 'Payload posted to upstream Google Sheet');
$forwarded = json_decode($GLOBALS['wp_last_remote_post']['args']['body'], true);
wp_assert(isset($forwarded['session_id']) && strlen($forwarded['session_id']) === 36, 'Forwarded payload has UUID session_id');
wp_assert(isset($forwarded['final_score']) && $forwarded['final_score'] === 21, 'Forwarded payload score is exactly 21');
wp_assert($forwarded['category'] === 'Stress assez élevé', 'Forwarded category is Stress assez élevé');
wp_assert($forwarded['q1'] === 3 && $forwarded['q4'] === 2 && $forwarded['q5'] === 2, 'Forwarded answers are formatted flat for Google Sheet');

echo "Isolated local WordPress integration test: OK (0 errors, 0 warnings).\n";
