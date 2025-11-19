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

    // Normalize server-side: ensure precio is numeric, provide formatted price and currency,
    // and normalize imagen_url to a web path when DB stores only a filename.
    foreach ($productos as &$p) {
        // precio as float
        if (isset($p['precio'])) {
            $p['precio'] = (float)$p['precio'];
        } else {
            $p['precio'] = 0.0;
        }
        // formatted price and currency
        $p['currency'] = '$';
        $p['precio_formateado'] = $p['currency'] . ' ' . number_format($p['precio'], 2, '.', ',');

        // normalize imagen_url: if empty -> null, if already absolute (/ or http) keep, else prefix assets path
        if (empty($p['imagen_url'])) {
            $p['imagen_url'] = null;
        } else {
            $img = trim($p['imagen_url']);
            if ($img === '') {
                $p['imagen_url'] = null;
            } elseif (preg_match('#^https?://#i', $img) || strpos($img, '/') === 0) {
                // leave as is
                $p['imagen_url'] = $img;
            } elseif (strpos($img, 'assets/') === 0) {
                $p['imagen_url'] = '/' . $img;
            } else {
                $p['imagen_url'] = '/assets/img/products/' . $img;
            }
        }
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