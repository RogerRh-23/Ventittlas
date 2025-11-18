<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../conect.php';

$body = file_get_contents('php://input');
$data = json_decode($body, true);
if (!is_array($data)) {
    if (strlen(trim($body)) > 0) {
        $jerr = json_last_error_msg();
        error_log("register_user: JSON decode error: $jerr | raw: " . substr($body,0,1000));
    }
    $data = $_POST;
}

$get = function($en, $es) use ($data) {
    if (isset($data[$en]) && $data[$en] !== '') return $data[$en];
    if (isset($data[$es]) && $data[$es] !== '') return $data[$es];
    return null;
};
// Determine request type: usuario (default) or proveedor
$tipo = trim((string)($get('tipo','type') ?? 'usuario'));

if ($tipo === 'proveedor') {
    $nombre_empresa = trim((string)($get('nombre_empresa','company_name') ?? ''));
    $rfc = trim((string)($get('rfc') ?? ''));
    $nombre_contacto = trim((string)($get('nombre_contacto','contact_name') ?? ''));
    $telefono = trim((string)($get('telefono','phone') ?? ''));
    $correo_prov = trim((string)($get('correo_electronico','email') ?? ''));
    $direccion = trim((string)($get('direccion','address') ?? ''));
    $tipo_mercancia = trim((string)($get('tipo_mercancia','goods_type') ?? ''));
    $estado = trim((string)($get('estado','state') ?? 'activo'));

    if ($nombre_empresa === '') {
        http_response_code(400);
        echo json_encode(['ok' => false, 'message' => 'Faltan campos obligatorios: nombre_empresa']);
        exit;
    }

    if ($correo_prov !== '' && !filter_var($correo_prov, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'message' => 'Email inválido para proveedor']);
        exit;
    }

    try {
        // check duplicates by RFC or email if provided
        if ($rfc !== '') {
            $stmt = $pdo->prepare('SELECT 1 FROM Proveedores WHERE rfc = ? LIMIT 1');
            $stmt->execute([$rfc]);
            if ($stmt->fetch()) {
                http_response_code(409);
                echo json_encode(['ok' => false, 'message' => 'El RFC ya está registrado']);
                exit;
            }
        }
        if ($correo_prov !== '') {
            $stmt = $pdo->prepare('SELECT 1 FROM Proveedores WHERE correo_electronico = ? LIMIT 1');
            $stmt->execute([$correo_prov]);
            if ($stmt->fetch()) {
                http_response_code(409);
                echo json_encode(['ok' => false, 'message' => 'El correo del proveedor ya está registrado']);
                exit;
            }
        }

        $sql = "INSERT INTO Proveedores (nombre_empresa, rfc, nombre_contacto, telefono, correo_electronico, direccion, tipo_mercancia, estado, fecha_alta) VALUES (:nombre_empresa, :rfc, :nombre_contacto, :telefono, :correo, :direccion, :tipo_mercancia, :estado, NOW())";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            ':nombre_empresa' => $nombre_empresa,
            ':rfc' => $rfc,
            ':nombre_contacto' => $nombre_contacto,
            ':telefono' => $telefono,
            ':correo' => $correo_prov,
            ':direccion' => $direccion,
            ':tipo_mercancia' => $tipo_mercancia,
            ':estado' => $estado
        ]);

        $id = $pdo->lastInsertId();
        echo json_encode(['ok' => true, 'message' => 'Proveedor registrado', 'id' => $id]);
        exit;
    } catch (PDOException $e) {
        error_log('register_user (proveedor) error: ' . $e->getMessage());
        http_response_code(500);
        // If ?debug=1 is present, include the DB error message to aid local debugging
        $show = isset($_GET['debug']) && $_GET['debug'] === '1';
        echo json_encode(['ok' => false, 'message' => $show ? ('Error interno al registrar proveedor: ' . $e->getMessage()) : 'Error interno al registrar proveedor']);
        exit;
    }
}

// Default: registro de usuario
$nombre = trim((string)($get('nombre','full_name') ?? ''));
$correo = trim((string)($get('correo_electronico','email') ?? ''));
$contrasena = $get('contrasena','password');
$rol = trim((string)($get('rol','role') ?? 'cliente'));

$allowed_roles = ['cliente','vendedor','administrador'];
if (!in_array($rol, $allowed_roles, true)) {
    $rol = 'cliente';
}

if ($nombre === '' || $correo === '' || $contrasena === null) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'message' => 'Faltan campos obligatorios: nombre, correo_electronico, contrasena']);
    exit;
}

if (!filter_var($correo, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'message' => 'Email inválido']);
    exit;
}

try {
    $stmt = $pdo->prepare('SELECT 1 FROM Usuarios WHERE correo_electronico = ? LIMIT 1');
    $stmt->execute([$correo]);
    if ($stmt->fetch()) {
        http_response_code(409);
        echo json_encode(['ok' => false, 'message' => 'El correo ya está registrado']);
        exit;
    }

    $hash = password_hash($contrasena, PASSWORD_DEFAULT);

    $sql = "INSERT INTO Usuarios (nombre, correo_electronico, contrasena_hash, rol) VALUES (:nombre, :correo, :hash, :rol)";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':nombre' => $nombre,
        ':correo' => $correo,
        ':hash' => $hash,
        ':rol' => $rol
    ]);

    echo json_encode(['ok' => true, 'message' => 'Usuario registrado']);
} catch (PDOException $e) {
    error_log('register_user error: ' . $e->getMessage());
    http_response_code(500);
    $show = isset($_GET['debug']) && $_GET['debug'] === '1';
    echo json_encode(['ok' => false, 'message' => $show ? ('Error interno al registrar usuario: ' . $e->getMessage()) : 'Error interno al registrar usuario']);

}
?>