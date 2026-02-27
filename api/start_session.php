<?php
/**
 * API POST : démarre une nouvelle session PSS-10
 * Retourne { session_id: int }
 */

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

require_once __DIR__ . '/db.php';

try {
    $pdo = getPdo();
    $stmt = $pdo->prepare('INSERT INTO pss_sessions (created_at) VALUES (NOW())');
    $stmt->execute();
    $sessionId = (int) $pdo->lastInsertId();
    echo json_encode(['session_id' => $sessionId]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error', 'message' => $e->getMessage()]);
}
