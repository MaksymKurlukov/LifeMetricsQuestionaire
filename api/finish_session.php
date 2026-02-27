<?php
/**
 * API POST : finalise la session, calcule le score et la catégorie
 * Body JSON: { session_id }
 * Retourne: final_score, category, interpretation_title, analysis_text
 */

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$sessionId = isset($input['session_id']) ? (int) $input['session_id'] : 0;

if ($sessionId < 1) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid session_id']);
    exit;
}

require_once __DIR__ . '/db.php';

$analysisTexts = [
    'low' => "0-20 : vous n'avez pas trop de souci pour gérer vos stress. En suivant votre programme personnalisé, vous pourrez encore gagner en sérénité, vous relaxer et apprendre tous les outils pour gérer le stress et les émotions liées à celui-ci.",
    'medium' => "21-26 : il arrive que vous vous sentiez tendu et que vous ayez du mal à gérer certaines situations provoquant du stress. Cela peut vous amener à un sentiment d'impuissance qui peut affecter vos émotions. En suivant votre programme, vous aurez tous les outils pour gérer le stress et les émotions liées à celui-ci. Pensez également à contacter un de nos praticiens certifiés.",
    'high' => "27 ou plus : vous êtes très affecté par le stress. Vous avez également très souvent le sentiment de ne pas contrôler certaines situations et que vos émotions prennent le dessus. Pas d'inquiétude, nous allons vous accompagner vers le mieux-être grâce au programme personnalisé conçu sur mesure pour gérer cette problématique qui importune votre quotidien. Pensez également à contacter un de nos praticiens certifiés.",
];

$interpretationTitles = [
    'low' => 'Votre niveau de stress est bas, félicitations.',
    'medium' => 'Votre niveau de stress est assez élevé.',
    'high' => 'Votre niveau de stress est très élevé.',
];

try {
    $pdo = getPdo();

    // Récupérer la somme des score_value pour cette session
    $stmt = $pdo->prepare('SELECT COALESCE(SUM(score_value), 0) AS total FROM pss_answers WHERE session_id = ?');
    $stmt->execute([$sessionId]);
    $row = $stmt->fetch();
    $finalScore = (int) $row['total'];

    // Borner entre 10 et 50 (sécurité)
    $finalScore = max(10, min(50, $finalScore));

    // Catégorie
    if ($finalScore <= 20) {
        $category = 'low';
    } elseif ($finalScore <= 26) {
        $category = 'medium';
    } else {
        $category = 'high';
    }

    // Mise à jour de la session
    $stmt = $pdo->prepare('UPDATE pss_sessions SET finished_at = NOW(), final_score = ?, category = ? WHERE id = ?');
    $stmt->execute([$finalScore, $category, $sessionId]);

    echo json_encode([
        'final_score'          => $finalScore,
        'category'             => $category,
        'interpretation_title' => $interpretationTitles[$category],
        'analysis_text'        => $analysisTexts[$category],
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error', 'message' => $e->getMessage()]);
}
