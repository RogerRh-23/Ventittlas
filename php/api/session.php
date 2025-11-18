<?php
// php/api/session.php
header('Content-Type: application/json; charset=utf-8');
if (session_status() !== PHP_SESSION_ACTIVE) session_start();
if (isset($_SESSION['user']) && is_array($_SESSION['user'])) {
    echo json_encode(['ok' => true, 'user' => $_SESSION['user']]);
} else {
    echo json_encode(['ok' => false, 'user' => null]);
}
?>