<?php
/**
 * LifeMetrics Standalone Questionnaire Previewer
 * 
 * Allows viewing, testing and debugging any LifeMetrics questionnaire
 * directly in the browser without needing WordPress or a database.
 */

define('ABSPATH', __DIR__ . '/');

if (!function_exists('esc_attr')) {
    function esc_attr($str) { return htmlspecialchars((string)$str, ENT_QUOTES, 'UTF-8'); }
}
if (!function_exists('esc_html')) {
    function esc_html($str) { return htmlspecialchars((string)$str, ENT_QUOTES, 'UTF-8'); }
}
if (!function_exists('esc_url_raw')) {
    function esc_url_raw($url) { return (string)$url; }
}
if (!function_exists('wp_json_encode')) {
    function wp_json_encode($data) { return json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE); }
}

$questionnaires = array(
    'bien-etre' => 'Bien-être V1',
    'sommeil' => 'Sommeil V1',
    'nutrition' => 'Nutrition V2',
    'fatigue-recuperation' => 'Fatigue & Récupération V2',
    'risque-nutritionnel' => 'Risque nutritionnel V1',
    'pieds-confort-postural' => 'Pieds & Confort postural V2',
    'sedentarite' => 'Sédentarité V2',
    'hydratation' => 'Hydratation V2',
    'activite-physique' => 'Activité physique V1',
    'pss10' => 'Stress PSS-10',
);

$selected_q = isset($_GET['q']) && isset($questionnaires[$_GET['q']]) ? $_GET['q'] : 'bien-etre';
$config_path = __DIR__ . '/questionnaires/' . $selected_q . '/questionnaire.php';

$config = file_exists($config_path) ? require $config_path : null;
$instance_id = 'lmq-' . $selected_q . '-preview';
$gradient_id = $instance_id . '-gauge-gradient';
$modal_title_id = $instance_id . '-modal-title';
?>
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LifeMetrics — Preview Frontend (<?php echo esc_html($questionnaires[$selected_q] ?? $selected_q); ?>)</title>
  
  <link rel="stylesheet" href="assets/css/questionnaire.css">
  
  <style>
    /* Dev Toolbar Styling */
    .lmq-dev-toolbar {
      position: sticky;
      top: 0;
      z-index: 9999;
      background: #1e293b;
      color: #f8fafc;
      padding: 10px 20px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 15px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .lmq-dev-toolbar a {
      color: #38bdf8;
      text-decoration: none;
    }
    .lmq-dev-toolbar select {
      background: #0f172a;
      color: #f8fafc;
      border: 1px solid #334155;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
    }
    .lmq-dev-toolbar .device-toggles {
      display: flex;
      gap: 6px;
      background: #0f172a;
      padding: 3px;
      border-radius: 6px;
      border: 1px solid #334155;
    }
    .lmq-dev-toolbar .device-btn {
      background: transparent;
      border: none;
      color: #94a3b8;
      padding: 4px 10px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
      transition: all 0.2s;
    }
    .lmq-dev-toolbar .device-btn.active {
      background: #38bdf8;
      color: #0f172a;
    }
    .lmq-preview-stage {
      display: flex;
      justify-content: center;
      background: #e2e8f0;
      min-height: calc(100vh - 60px);
      padding: 20px;
      transition: all 0.3s ease;
    }
    .lmq-preview-viewport {
      width: 100%;
      max-width: 100%;
      background: #faf8f5;
      box-shadow: 0 10px 25px rgba(0,0,0,0.1);
      border-radius: 8px;
      overflow: hidden;
      transition: max-width 0.3s ease;
    }
    .lmq-preview-viewport.device-tablet {
      max-width: 768px;
    }
    .lmq-preview-viewport.device-mobile {
      max-width: 375px;
    }
    .badge-status {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      background: #22c55e;
      color: #ffffff;
      margin-left: 8px;
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background: #faf8f5;">

  <!-- Dev Bar -->
  <div class="lmq-dev-toolbar">
    <div style="display: flex; align-items: center; gap: 10px;">
      <strong style="color: #38bdf8; font-size: 15px;">LifeMetrics Preview</strong>
      <label for="q-select" style="color: #94a3b8;">Questionnaire :</label>
      <select id="q-select" onchange="location.href='?q=' + this.value">
        <?php foreach ($questionnaires as $slug => $label): ?>
          <option value="<?php echo esc_attr($slug); ?>" <?php echo $slug === $selected_q ? 'selected' : ''; ?>>
            <?php echo esc_html($label); ?> (<?php echo esc_html($slug); ?>)
          </option>
        <?php endforeach; ?>
      </select>
      <span class="badge-status"><?php echo esc_html($config['status'] ?? 'ok'); ?></span>
    </div>

    <div class="device-toggles">
      <button type="button" class="device-btn active" onclick="setDevice('desktop', this)">🖥️ Desktop</button>
      <button type="button" class="device-btn" onclick="setDevice('tablet', this)">📱 Tablet (768px)</button>
      <button type="button" class="device-btn" onclick="setDevice('mobile', this)">📱 Mobile (375px)</button>
    </div>
  </div>

  <!-- Preview Canvas -->
  <div class="lmq-preview-stage">
    <div id="preview-viewport" class="lmq-preview-viewport">
      <?php if ($config): ?>
        <div class="lmq-questionnaire-root" id="<?php echo esc_attr($instance_id); ?>" data-lmq-questionnaire="<?php echo esc_attr($config['id']); ?>">
          <script type="application/json" data-lmq-config>
            <?php echo wp_json_encode($config); ?>
          </script>
          <?php include __DIR__ . '/templates/questionnaire.php'; ?>
        </div>
      <?php else: ?>
        <div style="padding: 40px; text-align: center; color: #ef4444;">
          <h3>Configuration non trouvée pour <?php echo esc_html($selected_q); ?></h3>
        </div>
      <?php endif; ?>
    </div>
  </div>

  <script src="assets/js/questionnaire-engine.js"></script>
  <script src="assets/js/questionnaire-ui.js"></script>
  
  <script>
    function setDevice(type, btn) {
      const vp = document.getElementById('preview-viewport');
      vp.className = 'lmq-preview-viewport' + (type === 'desktop' ? '' : ' device-' + type);
      document.querySelectorAll('.device-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    }
  </script>
</body>
</html>
