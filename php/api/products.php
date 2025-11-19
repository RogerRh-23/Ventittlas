<?php
require_once __DIR__ . '/../conect.php';
// Ensure JSON response and avoid accidental HTML/PHP warnings breaking the frontend
header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', 0);

// Capture any unexpected output so we can log it and still return valid JSON
ob_start();
try {
    // Devolver también la categoría (nombre) e id_categoria para que el frontend pueda poblar filtros
    $sql = 'SELECT p.id_producto AS id, p.nombre, p.precio, p.stock AS cantidad, p.imagen_url, p.id_categoria, c.nombre AS categoria FROM Productos p LEFT JOIN Categorias c ON p.id_categoria = c.id_categoria';
    $stmt = $pdo->query($sql);
    $productos = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $buf = ob_get_clean();
    if (!empty($buf)) {
        error_log('products.php unexpected output: ' . substr($buf, 0, 1000));
    }

    echo json_encode(['success' => true, 'productos' => $productos], JSON_UNESCAPED_UNICODE);
} catch (PDOException $e) {
    // Clean buffer and log error
    @ob_end_clean();
    error_log('Fetch products error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Error fetching products']);
}
?>