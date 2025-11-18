<?php
require_once __DIR__ . '/../conect.php';
header('Content-Type: application/json; charset=utf-8');

try {
    // Ajuste: usar la tabla y columnas reales según la base de datos
    // id_producto -> id, stock -> cantidad
    $stmt = $pdo->query('SELECT id_producto AS id, nombre, precio, stock AS cantidad FROM Productos');
    $productos = $stmt->fetchAll();
    echo json_encode(['success' => true, 'productos' => $productos], JSON_UNESCAPED_UNICODE);
} catch (PDOException $e) {
    // No exponer el mensaje de error al cliente en producción
    error_log('Fetch products error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Error fetching products']);
}
?>