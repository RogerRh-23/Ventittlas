<?php
header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', 0);
error_reporting(E_ALL);

try {
    require_once __DIR__ . '/../conect.php';
    
    if (!isset($pdo)) {
        throw new Exception('Database connection not available');
    }
    
    $stmt = $pdo->query('SELECT id_categoria, nombre FROM Categorias ORDER BY nombre ASC');
    $cats = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode(['success' => true, 'categorias' => $cats], JSON_UNESCAPED_UNICODE);
} catch (PDOException $e) {
    error_log('Fetch categories PDO error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error while fetching categories', 'details' => $e->getMessage()]);
} catch (Exception $e) {
    error_log('Fetch categories general error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Error fetching categories', 'details' => $e->getMessage()]);
}

?>
