<?php
// php/api/login.php
header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', 0);
error_reporting(E_ALL);

try {
    require_once __DIR__ . '/../conect.php';
    
    if (!isset($pdo)) {
        throw new Exception('Database connection not available');
    }
} catch (Exception $e) {
    error_log('login.php connection error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['ok' => false, 'message' => 'Database connection failed', 'details' => $e->getMessage()]);
    exit;
}

// allow CORS if necessary (optional)
// header('Access-Control-Allow-Origin: *');
// header('Access-Control-Allow-Methods: POST');

// Read input JSON or form
$raw = file_get_contents('php://input');
$data = json_decode($raw, true);
if (!is_array($data)) {
    $data = $_POST;
}

// Support english/spanish keys
$correo = isset($data['correo_electronico']) ? trim($data['correo_electronico']) : (isset($data['email']) ? trim($data['email']) : '');
$contrasena = isset($data['contrasena']) ? $data['contrasena'] : (isset($data['password']) ? $data['password'] : null);

if ($correo === '' || $contrasena === null) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'message' => 'Faltan correo o contraseña']);
    exit;
}

try {
    // find user by email
    $stmt = $pdo->prepare('SELECT id_usuario, nombre, correo_electronico, contrasena_hash, rol FROM Usuarios WHERE correo_electronico = ? LIMIT 1');
    $stmt->execute([$correo]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$user) {
        http_response_code(401);
        echo json_encode(['ok' => false, 'message' => 'Credenciales inválidas']);
        exit;
    }

    if (!password_verify($contrasena, $user['contrasena_hash'])) {
        http_response_code(401);
        echo json_encode(['ok' => false, 'message' => 'Credenciales inválidas']);
        exit;
    }

    // successful login: start session and set minimal user data
    if (session_status() !== PHP_SESSION_ACTIVE) session_start();
    // regenerate session id to avoid fixation
    session_regenerate_id(true);

    $_SESSION['user'] = [
        'id' => $user['id_usuario'],
        'nombre' => $user['nombre'],
        'correo' => $user['correo_electronico'],
        'rol' => $user['rol']
    ];

    // optional: return redirect path based on role
    $redirect = '/index.html';
    if ($user['rol'] === 'administrador' || $user['rol'] === 'vendedor') $redirect = '/pages/admin.html';

    echo json_encode(['ok' => true, 'message' => 'Autenticado', 'rol' => $user['rol'], 'redirect' => $redirect]);
} catch (PDOException $e) {
    error_log('login PDO error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['ok' => false, 'message' => 'Database error during authentication', 'details' => $e->getMessage()]);
} catch (Exception $e) {
    error_log('login general error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['ok' => false, 'message' => 'Error during authentication', 'details' => $e->getMessage()]);
}

?>