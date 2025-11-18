<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../conect.php';

$raw = file_get_contents('php://input');
$input = json_decode($raw, true);
$name = isset($input['nombre']) ? trim($input['nombre']) : '';
$desc = isset($input['descripcion']) ? trim($input['descripcion']) : null;

if ($name === '') {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'nombre is required']);
    exit;
}

try {
    // check if already exists (case-insensitive)
    $stmt = $pdo->prepare('SELECT id_categoria FROM Categorias WHERE LOWER(nombre) = LOWER(?) LIMIT 1');
    $stmt->execute([$name]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($row && isset($row['id_categoria'])) {
        $id = (int)$row['id_categoria'];
        echo json_encode(['ok' => true, 'id_categoria' => $id, 'categoria' => ['id_categoria' => $id, 'nombre' => $name]], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $ins = $pdo->prepare('INSERT INTO Categorias (nombre, descripcion) VALUES (?, ?)');
    $ins->execute([$name, $desc]);
    $id = (int)$pdo->lastInsertId();
    echo json_encode(['ok' => true, 'id_categoria' => $id, 'categoria' => ['id_categoria' => $id, 'nombre' => $name]], JSON_UNESCAPED_UNICODE);
} catch (PDOException $e) {
    error_log('Create category error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Internal server error']);
}

?>
