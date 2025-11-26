<?php
// Disable HTML error output to prevent JSON corruption
ini_set('display_errors', 0);
error_reporting(E_ALL);

// Capture any unexpected output
ob_start();

header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../conect.php';

session_start();

$userId = 0;
if (isset($_SESSION['user']['id_usuario'])) {
    $userId = intval($_SESSION['user']['id_usuario']);
} else if (isset($_SESSION['user']['id'])) {
    $userId = intval($_SESSION['user']['id']);
}

// Clean any output buffer
$output = ob_get_clean();
if (!empty($output)) {
    error_log('Unexpected output in create_sale.php: ' . $output);
}

// Use $pdo from conect.php
if (!isset($pdo)) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'message' => 'Error de conexión a base de datos']);
    exit;
}

// Log request data for debugging
error_log('create_sale.php request data: ' . file_get_contents('php://input'));

$raw = file_get_contents('php://input');
$data = json_decode($raw, true);
if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'message' => 'Invalid JSON body']);
    exit;
}

$items = isset($data['items']) && is_array($data['items']) ? $data['items'] : [];
$metodo = isset($data['metodo_pago_id']) ? $data['metodo_pago_id'] : null;

if (empty($items)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'message' => 'No items provided']);
    exit;
}

if ($userId <= 0) {
    http_response_code(401);
    echo json_encode(['ok' => false, 'message' => 'Usuario no autenticado']);
    exit;
}

try {
    $pdo->beginTransaction();

    // Validate stock and compute total
    $total = 0.0;
    foreach ($items as $it) {
        $pid = isset($it['id_producto']) ? intval($it['id_producto']) : (isset($it['id']) ? intval($it['id']) : 0);
        $qty = isset($it['cantidad']) ? intval($it['cantidad']) : (isset($it['cantidad']) ? intval($it['cantidad']) : 1);
        $price = isset($it['precio']) ? floatval($it['precio']) : 0.0;
        if ($pid <= 0 || $qty <= 0) {
            throw new Exception('Item inválido en carrito');
        }

        // Lock product row and check stock
        $q = $pdo->prepare('SELECT stock FROM Productos WHERE id_producto = ? FOR UPDATE');
        $q->execute([$pid]);
        $r = $q->fetch(PDO::FETCH_ASSOC);
        if (!$r) throw new Exception('Producto no encontrado: ' . $pid);
        $stock = intval($r['stock']);
        if ($stock < $qty) {
            throw new Exception("Stock insuficiente para producto $pid (disponible: $stock, pedido: $qty)");
        }

        $total += $price * $qty;
    }

    // Insert venta - usar valores cortos para evitar truncación
    $estado = ($metodo ? 'pagado' : 'pending');
    $metodo_pago = $metodo ? substr(strval($metodo), 0, 10) : 'efectivo';
    $monto_total = number_format($total, 2, '.', '');
    
    error_log("Inserting sale: user=$userId, total=$monto_total, estado=$estado, metodo=$metodo_pago");
    
    // Verificar si existe la columna estado_pago, si no usar una alternativa
    try {
        $ins = $pdo->prepare('INSERT INTO Ventas (id_comprador, fecha_venta, monto_total, estado_pago, metodo_pago) VALUES (?, NOW(), ?, ?, ?)');
        $ins->execute([$userId, $monto_total, $estado, $metodo_pago]);
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), 'estado_pago') !== false) {
            // Si falla por estado_pago, intentar sin ese campo
            error_log("estado_pago column issue, trying without it");
            $ins = $pdo->prepare('INSERT INTO Ventas (id_comprador, fecha_venta, monto_total, metodo_pago) VALUES (?, NOW(), ?, ?)');
            $ins->execute([$userId, $monto_total, $metodo_pago]);
        } else {
            throw $e;
        }
    }
    $idVenta = (int)$pdo->lastInsertId();

    // Insert detalle filas and update stock
    foreach ($items as $it) {
        $pid = isset($it['id_producto']) ? intval($it['id_producto']) : (isset($it['id']) ? intval($it['id']) : 0);
        $qty = isset($it['cantidad']) ? intval($it['cantidad']) : 1;
        $price = isset($it['precio']) ? number_format(floatval($it['precio']),2,'.','') : 0.0;

        // Try to insert into Detalle_Venta if table exists
        try {
            $dIns = $pdo->prepare('INSERT INTO Detalle_Venta (id_venta, id_producto, cantidad, precio_unitario) VALUES (?, ?, ?, ?)');
            $dIns->execute([$idVenta, $pid, $qty, $price]);
        } catch (Exception $e) {
            // table might not exist; ignore but continue
        }

        // decrement stock
        $u = $pdo->prepare('UPDATE Productos SET stock = stock - ? WHERE id_producto = ?');
        $u->execute([$qty, $pid]);
    }

    $pdo->commit();
    
    error_log("Sale created successfully: ID $idVenta, Total: $total, Items: " . count($items));

    echo json_encode(['ok' => true, 'id_venta' => $idVenta, 'monto' => $total, 'items' => count($items)]);
    exit;

} catch (PDOException $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    error_log('create_sale PDO error: ' . $e->getMessage());
    error_log('SQL State: ' . $e->getCode());
    http_response_code(500);
    
    // Proporcionar mensaje más específico para errores comunes
    $message = 'Error de base de datos';
    if (strpos($e->getMessage(), 'Data truncated') !== false) {
        $message = 'Error de formato de datos. Verifique la información ingresada.';
    } elseif (strpos($e->getMessage(), 'Duplicate entry') !== false) {
        $message = 'Ya existe una venta con estos datos.';
    }
    
    echo json_encode(['ok' => false, 'message' => $message, 'debug' => $e->getMessage()]);
    exit;
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    error_log('create_sale error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['ok' => false, 'message' => 'Error creando venta', 'detail' => $e->getMessage()]);
    exit;
}

?>
