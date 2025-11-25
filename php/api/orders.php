<?php
// php/api/orders.php - Gestión de órdenes de venta
require_once __DIR__ . '/../config.php';

try {
    require_once __DIR__ . '/../conect.php';
    
    if (!isset($pdo)) {
        throw new Exception('Database connection not available');
    }
} catch (Exception $e) {
    error_log('orders.php connection error: ' . $e->getMessage());
    api_error('Database connection failed', 500, $e->getMessage());
}

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? 'list';

try {
    if ($method === 'GET') {
        switch ($action) {
            case 'list':
                // Listar todas las órdenes con filtros opcionales
                $filters = [];
                $params = [];
                $sql = "SELECT 
                    v.id_venta,
                    v.id_comprador,
                    u.nombre AS comprador_nombre,
                    u.correo_electronico AS comprador_email,
                    v.fecha_venta,
                    v.monto_total,
                    v.estado_pago,
                    v.metodo_pago,
                    COUNT(dv.id_detalle) AS total_productos
                FROM Ventas v
                LEFT JOIN Usuarios u ON v.id_comprador = u.id_usuario
                LEFT JOIN Detalle_Venta dv ON v.id_venta = dv.id_venta";

                // Aplicar filtros
                if (!empty($_GET['date_from'])) {
                    $filters[] = "DATE(v.fecha_venta) >= ?";
                    $params[] = $_GET['date_from'];
                }
                
                if (!empty($_GET['date_to'])) {
                    $filters[] = "DATE(v.fecha_venta) <= ?";
                    $params[] = $_GET['date_to'];
                }
                
                if (!empty($_GET['status'])) {
                    $filters[] = "v.estado_pago = ?";
                    $params[] = $_GET['status'];
                }
                
                if (!empty($_GET['customer_id'])) {
                    $filters[] = "v.id_comprador = ?";
                    $params[] = (int)$_GET['customer_id'];
                }

                if (!empty($filters)) {
                    $sql .= " WHERE " . implode(' AND ', $filters);
                }

                $sql .= " GROUP BY v.id_venta ORDER BY v.fecha_venta DESC";

                // Paginación
                $page = (int)($_GET['page'] ?? 1);
                $limit = (int)($_GET['limit'] ?? 20);
                $offset = ($page - 1) * $limit;

                if ($limit > 0) {
                    $sql .= " LIMIT $limit OFFSET $offset";
                }

                $stmt = $pdo->prepare($sql);
                $stmt->execute($params);
                $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);

                // Contar total para paginación
                $countSql = "SELECT COUNT(DISTINCT v.id_venta) as total FROM Ventas v";
                if (!empty($filters)) {
                    $countSql .= " WHERE " . implode(' AND ', array_slice($filters, 0, count($filters) - (isset($_GET['customer_id']) ? 1 : 0)));
                }
                
                $countStmt = $pdo->prepare($countSql);
                $countStmt->execute(array_slice($params, 0, count($filters) - (isset($_GET['customer_id']) ? 1 : 0)));
                $totalOrders = $countStmt->fetchColumn();

                api_success([
                    'orders' => $orders,
                    'pagination' => [
                        'current_page' => $page,
                        'total_pages' => ceil($totalOrders / $limit),
                        'total_orders' => (int)$totalOrders,
                        'per_page' => $limit
                    ]
                ]);
                break;

            case 'details':
                // Obtener detalles de una orden específica
                $orderId = (int)($_GET['id'] ?? 0);
                if (!$orderId) {
                    api_error('ID de orden requerido', 400);
                }

                // Información de la orden
                $orderSql = "SELECT 
                    v.id_venta,
                    v.id_comprador,
                    u.nombre AS comprador_nombre,
                    u.correo_electronico AS comprador_email,
                    v.fecha_venta,
                    v.monto_total,
                    v.estado_pago,
                    v.metodo_pago
                FROM Ventas v
                LEFT JOIN Usuarios u ON v.id_comprador = u.id_usuario
                WHERE v.id_venta = ?";

                $orderStmt = $pdo->prepare($orderSql);
                $orderStmt->execute([$orderId]);
                $order = $orderStmt->fetch(PDO::FETCH_ASSOC);

                if (!$order) {
                    api_error('Orden no encontrada', 404);
                }

                // Detalles de productos
                $detailsSql = "SELECT 
                    dv.id_detalle,
                    dv.id_producto,
                    p.nombre AS producto_nombre,
                    p.descripcion AS producto_descripcion,
                    dv.cantidad,
                    dv.precio_unitario,
                    (dv.cantidad * dv.precio_unitario) AS subtotal,
                    p.imagen_url AS producto_imagen
                FROM Detalle_Venta dv
                LEFT JOIN Productos p ON dv.id_producto = p.id_producto
                WHERE dv.id_venta = ?
                ORDER BY dv.id_detalle";

                $detailsStmt = $pdo->prepare($detailsSql);
                $detailsStmt->execute([$orderId]);
                $details = $detailsStmt->fetchAll(PDO::FETCH_ASSOC);

                api_success([
                    'order' => $order,
                    'products' => $details
                ]);
                break;

            case 'stats':
                // Estadísticas de órdenes
                $today = date('Y-m-d');
                
                // Total de ventas
                $totalSalesStmt = $pdo->query("SELECT COALESCE(SUM(monto_total), 0) as total FROM Ventas");
                $totalSales = $totalSalesStmt->fetchColumn();

                // Órdenes de hoy
                $todayOrdersStmt = $pdo->prepare("SELECT COUNT(*) as count FROM Ventas WHERE DATE(fecha_venta) = ?");
                $todayOrdersStmt->execute([$today]);
                $todayOrders = $todayOrdersStmt->fetchColumn();

                // Promedio por orden
                $avgStmt = $pdo->query("SELECT COALESCE(AVG(monto_total), 0) as avg FROM Ventas");
                $avgOrder = $avgStmt->fetchColumn();

                // Órdenes pendientes
                $pendingStmt = $pdo->query("SELECT COUNT(*) as count FROM Ventas WHERE estado_pago = 'pendiente'");
                $pendingOrders = $pendingStmt->fetchColumn();

                api_success([
                    'total_sales' => (float)$totalSales,
                    'orders_today' => (int)$todayOrders,
                    'average_order' => (float)$avgOrder,
                    'pending_orders' => (int)$pendingOrders
                ]);
                break;

            default:
                api_error('Acción no válida', 400);
        }
    } elseif ($method === 'PUT') {
        // Actualizar estado de orden
        $data = get_input_data();
        validate_required_fields($data, ['id_venta', 'estado_pago']);
        
        $orderId = (int)$data['id_venta'];
        $newStatus = trim($data['estado_pago']);
        
        // Validar estado
        $validStatuses = ['pendiente', 'pagado', 'cancelado'];
        if (!in_array($newStatus, $validStatuses)) {
            api_error('Estado no válido. Debe ser: ' . implode(', ', $validStatuses), 400);
        }

        $updateSql = "UPDATE Ventas SET estado_pago = ? WHERE id_venta = ?";
        $updateStmt = $pdo->prepare($updateSql);
        $result = $updateStmt->execute([$newStatus, $orderId]);

        if ($result && $updateStmt->rowCount() > 0) {
            api_success(['message' => 'Estado actualizado correctamente', 'updated' => true]);
        } else {
            api_error('No se pudo actualizar el estado o la orden no existe', 400);
        }
    } else {
        api_error('Método no permitido', 405);
    }

} catch (PDOException $e) {
    error_log('orders.php PDO error: ' . $e->getMessage());
    api_error('Error de base de datos', 500, $e->getMessage());
} catch (Exception $e) {
    error_log('orders.php general error: ' . $e->getMessage());
    api_error('Error interno del servidor', 500, $e->getMessage());
}
?>