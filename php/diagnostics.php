<?php
// Archivo de diagnóstico para verificar la configuración del servidor
header('Content-Type: application/json; charset=utf-8');
error_reporting(E_ALL);
ini_set('display_errors', 0); // No mostrar errores en el navegador

$diagnostics = [];

// 1. Verificar PHP
$diagnostics['php_version'] = PHP_VERSION;
$diagnostics['php_extensions'] = [];

// Extensiones importantes
$required_extensions = ['pdo', 'pdo_mysql', 'json', 'curl'];
foreach ($required_extensions as $ext) {
    $diagnostics['php_extensions'][$ext] = extension_loaded($ext);
}

// 2. Verificar archivo .env
$env_path = __DIR__ . '/.env';
$diagnostics['env_file_exists'] = file_exists($env_path);

if (file_exists($env_path)) {
    $diagnostics['env_readable'] = is_readable($env_path);
} else {
    $diagnostics['env_readable'] = false;
}

// 3. Intentar cargar configuración
try {
    require_once __DIR__ . '/conect.php';
    $diagnostics['db_connection'] = 'success';
    
    // Probar una consulta simple
    $stmt = $pdo->query('SELECT 1 as test');
    $result = $stmt->fetch();
    $diagnostics['db_query_test'] = $result ? 'success' : 'failed';
    
} catch (Exception $e) {
    $diagnostics['db_connection'] = 'failed';
    $diagnostics['db_error'] = $e->getMessage();
}

// 4. Verificar permisos de archivos
$diagnostics['file_permissions'] = [
    'current_dir_writable' => is_writable(__DIR__),
    'api_dir_readable' => is_readable(__DIR__ . '/api'),
];

// 5. Información del servidor
$diagnostics['server_info'] = [
    'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'unknown',
    'document_root' => $_SERVER['DOCUMENT_ROOT'] ?? 'unknown',
    'script_name' => $_SERVER['SCRIPT_NAME'] ?? 'unknown',
];

echo json_encode($diagnostics, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
?>