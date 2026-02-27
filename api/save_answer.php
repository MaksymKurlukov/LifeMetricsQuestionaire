<?php
/**
 * API POST : enregistre une réponse (UPSERT)
 * Body JSON: { session_id, question_id, selected_value }
 * Pas d'inversion : score_value = selected_value
 */

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$sessionId = isset($input['session_id']) ? (int) $input['session_id'] : 0;
$questionId = isset($input['question_id']) ? (int) $input['question_id'] : 0;
$selectedValue = isset($input['selected_value']) ? (int) $input['selected_value'] : 0;

if ($sessionId < 1 || $questionId < 1 || $questionId > 10 || $selectedValue < 1 || $selectedValue > 5) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid parameters']);
    exit;
}

$scoreValue = $selectedValue;

require_once __DIR__ . '/db.php';

try {
    $pdo = getPdo();
    $stmt = $pdo->prepare('
        INSERT INTO pss_answers (session_id, question_id, selected_value, score_value, answered_at)
        VALUES (:session_id, :question_id, :selected_value, :score_value, NOW())
        ON DUPLICATE KEY UPDATE selected_value = :sv2, score_value = :score_value2, answered_at = NOW()
    ');
    $stmt->execute([
        'session_id'     => $sessionId,
        'question_id'    => $questionId,
        'selected_value' => $selectedValue,
        'score_value'    => $scoreValue,
        'sv2'            => $selectedValue,
        'score_value2'   => $scoreValue,
    ]);
    echo json_encode(['ok' => true]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error', 'message' => $e->getMessage()]);
}
