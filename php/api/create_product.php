<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/../conect.php';

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON body']);
    exit;
}

$nombre = isset($input['nombre']) ? trim($input['nombre']) : null;
$descripcion = isset($input['descripcion']) ? trim($input['descripcion']) : null;
$precio = isset($input['precio']) ? $input['precio'] : null;
$stock = isset($input['stock']) ? (int)$input['stock'] : 1;
$categoriaName = isset($input['categoria']) ? trim($input['categoria']) : null;
$id_categoria_input = isset($input['id_categoria']) && $input['id_categoria'] !== '' ? (int)$input['id_categoria'] : null;
$estado = isset($input['estado']) ? trim($input['estado']) : 'disponible';


$porcentaje_descuento = isset($input['porcentaje_descuento']) ? $input['porcentaje_descuento'] : 0;
$imagen_base64 = isset($input['imagen_base64']) ? $input['imagen_base64'] : null;
$imagen_nombre = isset($input['imagen_nombre']) ? trim($input['imagen_nombre']) : null;
$imagen_url = isset($input['imagen_url']) ? trim($input['imagen_url']) : null;
$id_proveedor = isset($input['id_proveedor']) && $input['id_proveedor'] !== '' ? (int)$input['id_proveedor'] : null;
$id_vendedor = isset($input['id_vendedor']) && $input['id_vendedor'] !== '' ? (int)$input['id_vendedor'] : null;

$allowedEstados = ['disponible', 'sin stock'];

// Basic validation
if (!$nombre || !$descripcion || $precio === null || $precio === '') {
    http_response_code(400);
    echo json_encode(['error' => 'Missing required fields: nombre, descripcion, precio']);
    exit;
}
if (!is_numeric($precio)) {
    http_response_code(400);
    echo json_encode(['error' => 'precio must be a number']);
    exit;
}
$precio = number_format((float)$precio, 2, '.', '');

if ($stock < 0) $stock = 0;

if (!in_array($estado, $allowedEstados, true)) {
    $estado = 'disponible';
}

try {
    $pdo->beginTransaction();

    $id_categoria = null;
    if ($id_categoria_input !== null) {
        $id_categoria = $id_categoria_input;
    } elseif ($categoriaName) {
        $stmt = $pdo->prepare('SELECT id_categoria FROM Categorias WHERE LOWER(nombre) = LOWER(?) LIMIT 1');
        $stmt->execute([$categoriaName]);
        $row = $stmt->fetch();
        if ($row && isset($row['id_categoria'])) {
            $id_categoria = (int)$row['id_categoria'];
        } else {
            $ins = $pdo->prepare('INSERT INTO Categorias (nombre, descripcion) VALUES (?, ?)');
            $ins->execute([$categoriaName, 'Creado automáticamente']);
            $id_categoria = (int)$pdo->lastInsertId();
        }
    }

    // fecha_publicacion y campos adicionales: porcentaje_descuento, imagen_url, id_proveedor
    $fecha_publicacion = date('Y-m-d H:i:s');

    // Handle image: either imagen_url provided, or imagen_base64 + imagen_nombre -> save file
    if ($imagen_base64 && !$imagen_url) {
        $uploadsDir = __DIR__ . '/../../assets/img/products';
        if (!is_dir($uploadsDir)) {
            @mkdir($uploadsDir, 0755, true);
        }
        // sanitize filename
        $safeName = preg_replace('/[^a-zA-Z0-9\-_\.]/', '_', ($imagen_nombre ?: 'img'));
        $ext = pathinfo($safeName, PATHINFO_EXTENSION);
        if (!$ext) $ext = 'png';
        $filename = time() . '_' . bin2hex(random_bytes(6)) . '.' . $ext;
        $filePath = $uploadsDir . '/' . $filename;
        $decoded = base64_decode($imagen_base64);
        if ($decoded !== false) {
            @file_put_contents($filePath, $decoded);
            // store web path
            $imagen_url = '/assets/img/products/' . $filename;
        }
    }

    $insert = $pdo->prepare('INSERT INTO Productos (nombre, descripcion, precio, stock, id_categoria, id_vendedor, fecha_publicacion, estado, porcentaje_descuento, imagen_url, id_proveedor) VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?)');
    $insert->execute([$nombre, $descripcion, $precio, $stock, $id_categoria, $id_vendedor, $estado, $porcentaje_descuento, $imagen_url, $id_proveedor]);
    $newId = (int)$pdo->lastInsertId();

    $pdo->commit();

    http_response_code(201);
    echo json_encode([
        'ok' => true,
        'id_producto' => $newId,
        'product' => [
            'id_producto' => $newId,
            'nombre' => $nombre,
            'descripcion' => $descripcion,
            'precio' => (float)$precio,
            'stock' => $stock,
            'id_categoria' => $id_categoria,
            'id_vendedor' => $id_vendedor,
            'fecha_publicacion' => $fecha_publicacion,
            'estado' => $estado,
            'porcentaje_descuento' => (float)$porcentaje_descuento,
            'imagen_url' => $imagen_url,
            'id_proveedor' => $id_proveedor,
        ],
    ], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    error_log('Create product error: ' . $e->getMessage());
    echo json_encode(['error' => 'Internal server error']);
}

?>
