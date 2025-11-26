<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../conect.php';

session_start();

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

$userId = 0;
if (isset($_SESSION['user']['id_usuario'])) {
    $userId = intval($_SESSION['user']['id_usuario']);
} else if (isset($_SESSION['user']['id'])) {
    $userId = intval($_SESSION['user']['id']);
}

// Use $conn instead of $pdo (from conect.php)
$pdo = $conn;

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

    // Insert venta
    $estado = ($metodo ? 'completado' : 'pendiente');
    $ins = $pdo->prepare('INSERT INTO Ventas (id_comprador, fecha_venta, monto_total, estado_pago, metodo_pago) VALUES (?, NOW(), ?, ?, ?)');
    $ins->execute([$userId, number_format($total,2,'.',''), $estado, $metodo]);
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

    echo json_encode(['ok' => true, 'id_venta' => $idVenta, 'monto' => $total, 'items' => count($items)]);
    exit;

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    error_log('create_sale error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['ok' => false, 'message' => 'Error creando venta', 'detail' => $e->getMessage()]);
    exit;
}

?>
