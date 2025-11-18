<?php
require_once __DIR__ . '/../conect.php';
header('Content-Type: application/json; charset=utf-8');

try {
    $stmt = $pdo->query('SELECT id_categoria, nombre FROM Categorias ORDER BY nombre ASC');
    $cats = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode(['success' => true, 'categorias' => $cats], JSON_UNESCAPED_UNICODE);
} catch (PDOException $e) {
    error_log('Fetch categories error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Error fetching categories']);
}

?>
