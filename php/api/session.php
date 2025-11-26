<?php
// php/api/session.php
header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', 0);
error_reporting(E_ALL);

try {
    if (session_status() !== PHP_SESSION_ACTIVE) {
        session_start();
    }
    
    if (isset($_SESSION['user']) && is_array($_SESSION['user'])) {
        echo json_encode(['ok' => true, 'user' => $_SESSION['user']]);
    } else {
        echo json_encode(['ok' => false, 'user' => null]);
    }
} catch (Exception $e) {
    error_log('Session error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Session error', 'details' => $e->getMessage()]);
}
?>