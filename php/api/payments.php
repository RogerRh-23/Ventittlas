<?php
// Disable HTML error output to prevent JSON corruption
ini_set('display_errors', 0);
error_reporting(E_ALL);

session_start();
header('Content-Type: application/json; charset=utf-8');

// Capture any unexpected output
ob_start();

require_once __DIR__ . '/../conect.php';

try {
    // Initialize response
    $response = ['ok' => false, 'message' => 'Error desconocido'];
    
    // Check connection
    if (!isset($pdo)) {
        throw new Exception('Error de conexión a base de datos');
    }
    
    // Clean any output buffer
    $output = ob_get_clean();
    if (!empty($output)) {
        error_log('Unexpected output in payments.php: ' . $output);
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
            $tableExists = $pdo->query($checkTable);
            
            if (!$tableExists || $tableExists->rowCount() == 0) {
                // Create table if it doesn't exist
                $createTable = "
                CREATE TABLE IF NOT EXISTS `Metodos_Pago_Usuario` (
                    `id_metodo` int(11) NOT NULL AUTO_INCREMENT,
                    `id_usuario` int(11) NOT NULL,
                    `tipo_tarjeta` varchar(50) NOT NULL DEFAULT 'VISA',
                    `nombre_titular` varchar(255) NOT NULL,
                    `ultimos_cuatro` varchar(4) NOT NULL,
                    `fecha_expiracion` varchar(7) DEFAULT NULL,
                    `es_predeterminada` tinyint(1) DEFAULT 0,
                    `fecha_creacion` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (`id_metodo`),
                    KEY `id_usuario` (`id_usuario`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
                
                $pdo->exec($createTable);
            }
            
            // Get user payment methods
            $stmt = $pdo->prepare("SELECT id_metodo, tipo_tarjeta, nombre_titular, ultimos_cuatro, fecha_expiracion, es_predeterminada FROM Metodos_Pago_Usuario WHERE id_usuario = ?");
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
            $tipo_tarjeta = $input['tipo_tarjeta'] ?? '';
            $nombre_titular = $input['nombre_titular'] ?? '';
            $ultimos_cuatro = $input['ultimos_cuatro'] ?? '';
            $fecha_expiracion = $input['fecha_expiracion'] ?? null;
            $es_predeterminada = isset($input['es_predeterminada']) ? 1 : 0;
            
            // Validar campos requeridos
            if (empty($nombre_titular) || empty($ultimos_cuatro)) {
                throw new Exception('Nombre del titular y últimos 4 dígitos son requeridos');
            }
            
            // Validar tipo de tarjeta permitido
            $tipos_permitidos = ['VISA', 'MC'];
            if (!in_array($tipo_tarjeta, $tipos_permitidos)) {
                throw new Exception('Tipo de tarjeta no válido. Solo se permiten VISA y MC');
            }
            
            // Validar últimos 4 dígitos
            if (strlen($ultimos_cuatro) !== 4 || !ctype_digit($ultimos_cuatro)) {
                throw new Exception('Los últimos 4 dígitos deben ser exactamente 4 números');
            }
            
            // Validar fecha de expiración
            if (empty($fecha_expiracion)) {
                throw new Exception('La fecha de expiración es requerida');
            }
            
            // Verificar que la fecha no esté vencida
            $fechaExp = DateTime::createFromFormat('Y-m', $fecha_expiracion);
            $fechaActual = new DateTime();
            if (!$fechaExp || $fechaExp < $fechaActual) {
                throw new Exception('La fecha de expiración debe ser futura');
            }
            
            // Si es predeterminado, desmarcar otros métodos
            if ($es_predeterminada) {
                $pdo->prepare("UPDATE Metodos_Pago_Usuario SET es_predeterminada = 0 WHERE id_usuario = ?")->execute([$id_usuario]);
            }
            
            // Insert new payment method
            $stmt = $pdo->prepare("INSERT INTO Metodos_Pago_Usuario (id_usuario, tipo_tarjeta, nombre_titular, ultimos_cuatro, fecha_expiracion, es_predeterminada) VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->execute([$id_usuario, $tipo_tarjeta, $nombre_titular, $ultimos_cuatro, $fecha_expiracion, $es_predeterminada]);
            
            $response = [
                'ok' => true,
                'id' => $pdo->lastInsertId(),
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
        
        $stmt = $pdo->prepare("
            SELECT v.id_venta, v.fecha_venta, v.monto_total, v.estado_pago, u.correo
            FROM Ventas v 
            LEFT JOIN Usuarios u ON v.id_comprador = u.id_usuario 
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