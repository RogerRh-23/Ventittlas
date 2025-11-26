<?php
// php/api/test.php - Endpoint simple para probar la conectividad básica
require_once __DIR__ . '/../config.php';

try {
    // Test básico sin base de datos
    $test_results = [
        'php_version' => PHP_VERSION,
        'server_time' => date('Y-m-d H:i:s'),
        'request_method' => $_SERVER['REQUEST_METHOD'] ?? 'unknown',
        'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown'
    ];
    
    api_success($test_results, 'Test endpoint working');
    
} catch (Exception $e) {
    error_log('test.php error: ' . $e->getMessage());
    api_error('Test failed', 500, $e->getMessage());
}
?>