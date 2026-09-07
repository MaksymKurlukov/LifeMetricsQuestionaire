<?php

define('ABSPATH', __DIR__ . '/');

class WP_REST_Request
{
    private $params;
    private $body;
    private $jsonContentType;

    public function __construct($params, $jsonContentType = true, $body = null)
    {
        $this->params = $params;
        $this->jsonContentType = $jsonContentType;
        $this->body = $body === null ? json_encode($params) : $body;
    }

    public function get_body()
    {
        return $this->body;
    }

    public function is_json_content_type()
    {
        return $this->jsonContentType;
    }

    public function get_json_params()
    {
        return $this->params;
    }
}

class WP_Error
{
    public $code;
    public $message;
    public $data;

    public function __construct($code, $message = '', $data = array())
    {
        $this->code = $code;
        $this->message = $message;
        $this->data = $data;
    }
}

function add_action() {}
function add_shortcode() {}
function plugin_dir_path($file) { return dirname($file) . '/'; }
function plugin_dir_url() { return 'https://example.test/wp-content/plugins/lifemetrics-questionnaires/'; }
function wp_register_style($handle, $src, $deps, $version) { $GLOBALS['lmq_registered_style'] = compact('handle', 'src', 'deps', 'version'); }
function wp_register_script($handle, $src, $deps, $version, $inFooter) { $GLOBALS['lmq_registered_script'] = compact('handle', 'src', 'deps', 'version', 'inFooter'); }
function esc_attr($value) { return htmlspecialchars($value, ENT_QUOTES, 'UTF-8'); }
function esc_url($value) { return htmlspecialchars($value, ENT_QUOTES, 'UTF-8'); }
function esc_url_raw($url) { return $url; }
function is_wp_error($value) { return $value instanceof WP_Error; }
function rest_ensure_response($value) { return $value; }
function wp_json_encode($value) { return json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); }
function wp_remote_retrieve_response_code($response) { return $response['status']; }
function wp_remote_retrieve_body($response) { return $response['body']; }
function wp_remote_retrieve_header($response, $header) { return isset($response['headers'][$header]) ? $response['headers'][$header] : ''; }
function wp_remote_post($url, $args)
{
    $GLOBALS['lmq_last_remote_request'] = array('url' => $url, 'args' => $args);
    $GLOBALS['lmq_remote_requests'][] = array('method' => 'POST', 'url' => $url, 'args' => $args);
    return $GLOBALS['lmq_remote_response'];
}
function wp_remote_get($url, $args)
{
    $GLOBALS['lmq_remote_requests'][] = array('method' => 'GET', 'url' => $url, 'args' => $args);
    return $GLOBALS['lmq_remote_get_response'];
}

require __DIR__ . '/../lifemetrics-questionnaires.php';

function expect_same($expected, $actual, $label)
{
    if ($expected !== $actual) {
        fwrite(STDERR, $label . "\nExpected: " . var_export($expected, true) . "\nActual: " . var_export($actual, true) . "\n");
        exit(1);
    }
}

function submit_pss10($input, $jsonContentType = true, $body = null)
{
    $GLOBALS['lmq_last_remote_request'] = null;
    $GLOBALS['lmq_remote_requests'] = array();
    return lmq_pss10_submit(new WP_REST_Request($input, $jsonContentType, $body));
}

function expect_error_code($expectedCode, $result, $label)
{
    expect_same(true, $result instanceof WP_Error, $label . ' returns WP_Error');
    expect_same($expectedCode, $result->code, $label . ' code');
}

$golden = json_decode(file_get_contents(__DIR__ . '/fixtures/pss10-golden-v1.json'), true);
$contract = json_decode(file_get_contents(__DIR__ . '/fixtures/pss10-backend-contract-v1.json'), true);
expect_same(true, is_array($golden), 'golden fixture parses');
expect_same(true, is_array($contract), 'backend fixture parses');

lmq_register_assets();
$assetRoot = realpath(__DIR__ . '/../questionnaires/pss10/assets');
expect_same(filemtime($assetRoot . '/css/style.css'), $GLOBALS['lmq_registered_style']['version'], 'CSS version uses filemtime');
expect_same(filemtime($assetRoot . '/js/app.js'), $GLOBALS['lmq_registered_script']['version'], 'JS version uses filemtime');
expect_same(false, $GLOBALS['lmq_registered_style']['version'] === '1.0.0', 'CSS version is not static plugin version');
expect_same(false, $GLOBALS['lmq_registered_script']['version'] === '1.0.0', 'JS version is not static plugin version');

$GLOBALS['lmq_remote_response'] = array('status' => 200, 'body' => '{"ok":true,"duplicate":false}');
$GLOBALS['lmq_remote_get_response'] = null;

foreach ($golden['vectors'] as $vector) {
    $request = array(
        'created_at' => $golden['payload_snapshot']['created_at'],
        'session_id' => $golden['payload_snapshot']['session_id'],
    );
    foreach ($vector['scored'] as $index => $value) {
        $request['q' . ($index + 1)] = $value;
    }
    $request['final_score'] = $vector['final_score'];
    $request['category'] = 'Stress bas';

    $response = submit_pss10($request);
    expect_same(array('success' => true, 'duplicate' => false), $response, $vector['name'] . ' response');
    $forwarded = json_decode($GLOBALS['lmq_last_remote_request']['args']['body'], true);
    expect_same($golden['categories'][$vector['category']]['stored'], $forwarded['category'], $vector['name'] . ' canonical category');
    expect_same($vector['final_score'], $forwarded['final_score'], $vector['name'] . ' score');
}

$response = submit_pss10($contract['request']);
expect_same($contract['success_response'], $response, 'success response snapshot');
expect_same($contract['forwarded'], json_decode($GLOBALS['lmq_last_remote_request']['args']['body'], true), 'forwarded payload snapshot');
expect_same(0, $GLOBALS['lmq_last_remote_request']['args']['redirection'], 'initial POST disables redirects');

$GLOBALS['lmq_remote_response'] = array('status' => 200, 'body' => '{"ok":true,"duplicate":true}');
expect_same($contract['duplicate_response'], submit_pss10($contract['request']), 'duplicate response snapshot');

$errors = $contract['validation_errors'];
expect_error_code($errors['body_too_large'], submit_pss10($contract['request'], true, str_repeat('x', $contract['maximum_body_bytes'] + 1)), 'oversized body');
expect_error_code($errors['content_type'], submit_pss10($contract['request'], false), 'content type');
expect_error_code($errors['json'], submit_pss10(null), 'invalid JSON params');

$invalid = $contract['request'];
$invalid['session_id'] = '../../bad';
expect_error_code($errors['session'], submit_pss10($invalid), 'session');
$invalid = $contract['request'];
$invalid['created_at'] = 'not-a-date';
expect_error_code($errors['timestamp'], submit_pss10($invalid), 'timestamp');
$invalid = $contract['request'];
$invalid['q1'] = '3';
expect_error_code($errors['answers'], submit_pss10($invalid), 'answer type');
$invalid = $contract['request'];
$invalid['final_score'] = 22;
expect_error_code($errors['score'], submit_pss10($invalid), 'score mismatch');
$invalid = $contract['request'];
$invalid['category'] = 'unexpected';
expect_error_code($errors['category'], submit_pss10($invalid), 'category allowlist');

$GLOBALS['lmq_remote_response'] = new WP_Error('network');
expect_error_code($contract['upstream_errors']['network'], submit_pss10($contract['request']), 'upstream network');
$GLOBALS['lmq_remote_response'] = array('status' => 500, 'body' => '{"ok":false}');
expect_error_code($contract['upstream_errors']['http'], submit_pss10($contract['request']), 'upstream HTTP');
$GLOBALS['lmq_remote_response'] = array('status' => 200, 'body' => '{"ok":false}');
expect_error_code($contract['upstream_errors']['rejected'], submit_pss10($contract['request']), 'upstream rejection');

$redirectUrl = 'https://script.googleusercontent.com/macros/echo?user_content_key=one-time';
$GLOBALS['lmq_remote_response'] = array(
    'status' => 302,
    'body' => '',
    'headers' => array('location' => $redirectUrl),
);
$GLOBALS['lmq_remote_get_response'] = array('status' => 200, 'body' => '{"ok":true,"duplicate":false}');
expect_same($contract['success_response'], submit_pss10($contract['request']), 'explicit ContentService redirect success');
expect_same(2, count($GLOBALS['lmq_remote_requests']), 'one POST and one GET');
expect_same('POST', $GLOBALS['lmq_remote_requests'][0]['method'], 'initial request method');
expect_same(0, $GLOBALS['lmq_remote_requests'][0]['args']['redirection'], 'initial request does not auto-follow');
expect_same('GET', $GLOBALS['lmq_remote_requests'][1]['method'], 'redirect request method');
expect_same($redirectUrl, $GLOBALS['lmq_remote_requests'][1]['url'], 'redirect URL');
expect_same(0, $GLOBALS['lmq_remote_requests'][1]['args']['redirection'], 'second redirect disabled');
expect_same(true, $GLOBALS['lmq_remote_requests'][1]['args']['sslverify'], 'redirect SSL verification');
expect_same(false, array_key_exists('body', $GLOBALS['lmq_remote_requests'][1]['args']), 'redirect has no body');
expect_same(false, array_key_exists('headers', $GLOBALS['lmq_remote_requests'][1]['args']), 'redirect forwards no headers');
expect_same(false, array_key_exists('cookies', $GLOBALS['lmq_remote_requests'][1]['args']), 'redirect forwards no cookies');

$invalidRedirects = array(
    'missing Location' => '',
    'HTTP Location' => 'http://script.googleusercontent.com/macros/echo?token=x',
    'untrusted Location' => 'https://example.test/macros/echo?token=x',
);
foreach ($invalidRedirects as $label => $location) {
    $GLOBALS['lmq_remote_response'] = array(
        'status' => 302,
        'body' => '',
        'headers' => array('location' => $location),
    );
    expect_error_code($contract['upstream_errors']['http'], submit_pss10($contract['request']), $label);
    expect_same(1, count($GLOBALS['lmq_remote_requests']), $label . ' does not follow');
}

$GLOBALS['lmq_remote_response'] = array('status' => 302, 'body' => '', 'headers' => array('location' => $redirectUrl));
$GLOBALS['lmq_remote_get_response'] = array(
    'status' => 302,
    'body' => '',
    'headers' => array('location' => 'https://script.googleusercontent.com/second'),
);
expect_error_code($contract['upstream_errors']['http'], submit_pss10($contract['request']), 'second redirect');
expect_same(2, count($GLOBALS['lmq_remote_requests']), 'second redirect is not followed');

$GLOBALS['lmq_remote_get_response'] = array('status' => 400, 'body' => '<html>Bad Request</html>');
expect_error_code($contract['upstream_errors']['http'], submit_pss10($contract['request']), 'redirect final HTTP error');
$GLOBALS['lmq_remote_get_response'] = array('status' => 200, 'body' => '<html>not JSON</html>');
expect_error_code($contract['upstream_errors']['rejected'], submit_pss10($contract['request']), 'redirect malformed JSON');
$GLOBALS['lmq_remote_get_response'] = array('status' => 200, 'body' => '{"ok":false}');
expect_error_code($contract['upstream_errors']['rejected'], submit_pss10($contract['request']), 'redirect rejected');
$GLOBALS['lmq_remote_get_response'] = array('status' => 200, 'body' => '{"ok":true,"duplicate":true}');
expect_same($contract['duplicate_response'], submit_pss10($contract['request']), 'redirect duplicate response');
$GLOBALS['lmq_remote_get_response'] = new WP_Error('network');
expect_error_code($contract['upstream_errors']['network'], submit_pss10($contract['request']), 'redirect network error');

function render_pss10_template($instanceId)
{
    $instance_id = $instanceId;
    $asset_url = 'https://example.test/assets/';
    $submit_url = 'https://example.test/wp-json/lifemetrics-questionnaires/v1/pss10/submit';
    ob_start();
    include __DIR__ . '/../questionnaires/pss10/template.php';
    return ob_get_clean();
}

$first = render_pss10_template('lmq-pss10-a');
$second = render_pss10_template('lmq-pss10-b');
expect_same(3, substr_count($first, 'data-lmq-section='), 'three sections');
expect_same(true, strpos($first, 'id="lmq-pss10-a"') !== false, 'first root ID');
expect_same(true, strpos($first, 'id="lmq-pss10-a-gauge-gradient"') !== false, 'first gradient ID');
expect_same(true, strpos($first, 'id="lmq-pss10-a-modal-title"') !== false, 'first modal ID');
expect_same(true, strpos($second, 'id="lmq-pss10-b"') !== false, 'second root ID');
expect_same(false, strpos($second, 'lmq-pss10-a'), 'instance IDs do not leak');
expect_same(true, strpos($first, $contract['route']) !== false, 'same-origin route shape');

echo "PSS10 PHP/REST characterization: OK\n";
