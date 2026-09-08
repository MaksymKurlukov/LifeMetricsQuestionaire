<?php
define('ABSPATH', true);

function wp_unique_id($prefix = '') {
    static $counter = 0;
    return $prefix . (++$counter);
}
function wp_json_encode($data) {
    return json_encode($data);
}
function esc_attr($str) {
    return $str; // dummy
}
function esc_url_raw($str) {
    return $str; // dummy
}

class LifeMetrics_Questionnaire_Assets {
    public $enqueued = false;
    public function enqueue() {
        $this->enqueued = true;
    }
}

require_once __DIR__ . '/../includes/class-questionnaire-renderer.php';

// dummy template
file_put_contents(__DIR__ . '/dummy-template.php', '<?php $modal_title_id = $instance_id . "-modal"; $gradient_id = $instance_id . "-grad"; ?><div id="<?php echo esc_attr($modal_title_id); ?>"></div><svg><linearGradient id="<?php echo esc_attr($gradient_id); ?>"></linearGradient></svg>');;

$assets = new LifeMetrics_Questionnaire_Assets();
$renderer = new LifeMetrics_Questionnaire_Renderer($assets, __DIR__ . '/dummy-template.php');

$config = array(
    'id' => 'test_1',
    'approvals' => array('content_scoring' => true)
);

$html1 = $renderer->render($config, '/submit/test1');
$html2 = $renderer->render($config);

// Verifications
if (!$assets->enqueued) die("Assets not enqueued\n");

// Unique ID contract
if (!str_contains($html1, 'id="lmq-test_1-1"')) die("Missing lmq-test_1-1\n");
if (!str_contains($html2, 'id="lmq-test_1-2"')) die("Missing lmq-test_1-2\n");

// JSON config
if (!str_contains($html1, '<script type="application/json" data-lmq-config>')) die("Missing config script\n");
if (str_contains($html1, 'approvals')) die("Approvals leaked\n");

// Submit URL
if (!str_contains($html1, '<script type="application/json" data-lmq-submit-url>')) die("Missing submit URL script\n");
if (str_contains($html2, 'data-lmq-submit-url')) die("Should not invent submit URL\n");

echo "Renderer tests passed.\n";

unlink(__DIR__ . '/dummy-template.php');
