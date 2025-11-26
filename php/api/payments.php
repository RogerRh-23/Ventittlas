<?php
session_start();
header('Content-Type: application/json; charset=utf-8');

include '../conect.php';

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

try {
    // Initialize response
    $response = ['ok' => false, 'message' => 'Error desconocido'];
    
    // Check connection
    if (!$conn) {
        throw new Exception('Error de conexión a base de datos');
    }
    
    $type = $_GET['type'] ?? '';
    $method = $_SERVER['REQUEST_METHOD'];
    
    // Validate type parameter
    if (empty($type)) {
        throw new Exception('Parámetro type requerido');
    }
    
    // Handle payment methods
    if ($type === 'methods') {
        if ($method === 'GET') {
            // Get user payment methods
            $id_usuario = $_GET['id_usuario'] ?? null;
            
            if (!$id_usuario) {
                // Return empty methods list if no user
                $response = [
                    'ok' => true,
                    'data' => [],
                    'message' => 'Sin métodos de pago disponibles'
                ];
                echo json_encode($response);
                exit;
            }
            
            // Check if table exists, create it if it doesn't
            $checkTable = "SHOW TABLES LIKE 'Metodos_Pago_Usuario'";
            $tableExists = $conn->query($checkTable);
            
            if (!$tableExists || $tableExists->rowCount() == 0) {
                // Create table if it doesn't exist
                $createTable = "
                CREATE TABLE IF NOT EXISTS `Metodos_Pago_Usuario` (
                    `id` int(11) NOT NULL AUTO_INCREMENT,
                    `id_usuario` int(11) NOT NULL,
                    `tipo` varchar(50) NOT NULL DEFAULT 'tarjeta',
                    `titular` varchar(255) NOT NULL,
                    `numero_enmascarado` varchar(20) NOT NULL,
                    `fecha_expiracion` varchar(10) DEFAULT NULL,
                    `fecha_creacion` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (`id`),
                    KEY `id_usuario` (`id_usuario`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
                
                $conn->exec($createTable);
            }
            
            // Get user payment methods
            $stmt = $conn->prepare("SELECT id, tipo, titular, numero_enmascarado, fecha_expiracion FROM Metodos_Pago_Usuario WHERE id_usuario = ?");
            $stmt->execute([$id_usuario]);
            $methods = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $response = [
                'ok' => true,
                'data' => $methods,
                'message' => 'Métodos de pago obtenidos correctamente'
            ];
            
        } else if ($method === 'POST') {
            // Add new payment method
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!$input || !isset($input['id_usuario'])) {
                throw new Exception('Datos de usuario requeridos');
            }
            
            $id_usuario = $input['id_usuario'];
            $tipo = $input['tipo'] ?? 'tarjeta';
            $titular = $input['titular'] ?? '';
            $numero = $input['numero'] ?? '';
            
            if (empty($titular) || empty($numero)) {
                throw new Exception('Titular y número son requeridos');
            }
            
            // Mask card number (show only last 4 digits)
            $numero_enmascarado = '**** **** **** ' . substr($numero, -4);
            $fecha_expiracion = $input['fecha_expiracion'] ?? null;
            
            // Check if table exists, create it if it doesn't
            $checkTable = "SHOW TABLES LIKE 'Metodos_Pago_Usuario'";
            $tableExists = $conn->query($checkTable);
            
            if (!$tableExists || $tableExists->rowCount() == 0) {
                // Create table if it doesn't exist
                $createTable = "
                CREATE TABLE IF NOT EXISTS `Metodos_Pago_Usuario` (
                    `id` int(11) NOT NULL AUTO_INCREMENT,
                    `id_usuario` int(11) NOT NULL,
                    `tipo` varchar(50) NOT NULL DEFAULT 'tarjeta',
                    `titular` varchar(255) NOT NULL,
                    `numero_enmascarado` varchar(20) NOT NULL,
                    `fecha_expiracion` varchar(10) DEFAULT NULL,
                    `fecha_creacion` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (`id`),
                    KEY `id_usuario` (`id_usuario`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
                
                $conn->exec($createTable);
            }
            
            // Insert new payment method
            $stmt = $conn->prepare("INSERT INTO Metodos_Pago_Usuario (id_usuario, tipo, titular, numero_enmascarado, fecha_expiracion) VALUES (?, ?, ?, ?, ?)");
            $stmt->execute([$id_usuario, $tipo, $titular, $numero_enmascarado, $fecha_expiracion]);
            
            $response = [
                'ok' => true,
                'id' => $conn->lastInsertId(),
                'message' => 'Método de pago agregado correctamente'
            ];
        } else {
            throw new Exception('Método HTTP no permitido');
        }
        
    } else if ($type === 'sales') {
        // Get sales data (for admin)
        if ($method !== 'GET') {
            throw new Exception('Solo método GET permitido para sales');
        }
        
        $stmt = $conn->prepare("
            SELECT v.id_venta, v.fecha_venta, v.total, v.estado, u.usuario
            FROM Ventas v 
            LEFT JOIN Usuarios u ON v.id_usuario = u.id 
            ORDER BY v.fecha_venta DESC 
            LIMIT 100
        ");
        $stmt->execute();
        $sales = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $response = [
            'ok' => true,
            'data' => $sales,
            'message' => 'Ventas obtenidas correctamente'
        ];
        
    } else {
        throw new Exception('Tipo de operación no válido: ' . $type);
    }
    
} catch (PDOException $e) {
    error_log('Database error in payments.php: ' . $e->getMessage());
    $response = [
        'ok' => false,
        'message' => 'Error de base de datos: ' . $e->getMessage(),
        'error_type' => 'database'
    ];
} catch (Exception $e) {
    error_log('Error in payments.php: ' . $e->getMessage());
    $response = [
        'ok' => false,
        'message' => $e->getMessage(),
        'error_type' => 'general'
    ];
}

echo json_encode($response, JSON_UNESCAPED_UNICODE);
?>