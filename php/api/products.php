<?php
require_once __DIR__ . '/../conect.php';
header('Content-Type: application/json; charset=utf-8');

try {
    // Devolver también la categoría (nombre) e id_categoria para que el frontend pueda poblar filtros
    $sql = 'SELECT p.id_producto AS id, p.nombre, p.precio, p.stock AS cantidad, p.imagen_url, p.id_categoria, c.nombre AS categoria FROM Productos p LEFT JOIN Categorias c ON p.id_categoria = c.id_categoria';
    $stmt = $pdo->query($sql);
    $productos = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode(['success' => true, 'productos' => $productos], JSON_UNESCAPED_UNICODE);
} catch (PDOException $e) {
    // No exponer el mensaje de error al cliente en producción
    error_log('Fetch products error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Error fetching products']);
}
?>