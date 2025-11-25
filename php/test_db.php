<?php
// Test database connection and tables
header('Content-Type: application/json; charset=utf-8');

try {
    require_once __DIR__ . '/conect.php';
    
    $results = [];
    $results['connection'] = 'OK';
    
    // Test connection
    if (!$conn) {
        throw new Exception('No database connection');
    }
    
    // Check required tables
    $tables = ['Usuarios', 'Productos', 'Ventas'];
    $results['tables'] = [];
    
    foreach ($tables as $table) {
        try {
            $stmt = $conn->query("SELECT COUNT(*) as count FROM $table LIMIT 1");
            $count = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
            $results['tables'][$table] = "OK ($count records)";
        } catch (Exception $e) {
            $results['tables'][$table] = "ERROR: " . $e->getMessage();
        }
    }
    
    // Check if Metodos_Pago_Usuario table exists
    try {
        $stmt = $conn->query("SELECT COUNT(*) as count FROM Metodos_Pago_Usuario LIMIT 1");
        $count = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
        $results['tables']['Metodos_Pago_Usuario'] = "OK ($count records)";
    } catch (Exception $e) {
        $results['tables']['Metodos_Pago_Usuario'] = "MISSING - will be created automatically";
    }
    
    // Test session
    session_start();
    $results['session'] = [
        'session_id' => session_id(),
        'user_logged' => isset($_SESSION['user']) ? 'YES' : 'NO',
        'user_data' => $_SESSION['user'] ?? null
    ];
    
    // Test some sample products
    try {
        $stmt = $conn->query("SELECT id_producto, nombre, precio, stock FROM Productos LIMIT 3");
        $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $results['sample_products'] = $products;
    } catch (Exception $e) {
        $results['sample_products'] = "ERROR: " . $e->getMessage();
    }
    
    echo json_encode([
        'ok' => true,
        'timestamp' => date('Y-m-d H:i:s'),
        'results' => $results
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'error' => $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_PRETTY_PRINT);
}
?>