<?php

defined('ABSPATH') || exit;

final class LifeMetrics_Questionnaire_Renderer
{
    private LifeMetrics_Questionnaire_Assets $assets;
    private string $template_path;

    public function __construct(LifeMetrics_Questionnaire_Assets $assets, string $template_path)
    {
        $this->assets = $assets;
        $this->template_path = $template_path;
    }

    public function render(array $config, string $submit_url = ''): string
    {
        $this->assets->enqueue();

        $instance_id = wp_unique_id('lmq-');

        $client_config = $config;
        unset($client_config['approvals']);

        $json_config = wp_json_encode($client_config);

        ob_start();
        ?>
        <div class="lmq-questionnaire-root" id="<?php echo esc_attr($instance_id); ?>">
            <script type="application/json" data-lmq-config>
                <?php echo $json_config; ?>
            </script>
            <?php if ($submit_url !== ''): ?>
            <script type="application/json" data-lmq-submit-url>
                <?php echo wp_json_encode(esc_url_raw($submit_url)); ?>
            </script>
            <?php endif; ?>
            <?php include $this->template_path; ?>
        </div>
        <?php
        return ob_get_clean();
    }
}
