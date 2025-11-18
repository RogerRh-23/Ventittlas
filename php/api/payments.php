<?php
// php/api/payments.php
// Endpoint para: listar ventas (log) y gestionar métodos de pago de usuarios
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../conect.php';

// Simple router por método + type
$method = $_SERVER['REQUEST_METHOD'];
$type = isset($_GET['type']) ? $_GET['type'] : (isset($_POST['type']) ? $_POST['type'] : 'sales');

try {
    if ($method === 'GET') {
        if ($type === 'sales') {
            // Listar ventas (log) con datos del comprador
            $sql = "SELECT v.id_venta, v.id_comprador, u.nombre AS comprador_nombre, v.fecha_venta, v.monto_total, v.estado_pago, v.metodo_pago
                    FROM Ventas v
                    LEFT JOIN Usuarios u ON u.id_usuario = v.id_comprador
                    ORDER BY v.fecha_venta DESC";

            // filtros opcionales: date_from, date_to, estado, limit
            $conds = [];
            $params = [];
            if (!empty($_GET['date_from'])) { $conds[] = 'v.fecha_venta >= ?'; $params[] = $_GET['date_from']; }
            if (!empty($_GET['date_to'])) { $conds[] = 'v.fecha_venta <= ?'; $params[] = $_GET['date_to']; }
            if (!empty($_GET['estado'])) { $conds[] = 'v.estado_pago = ?'; $params[] = $_GET['estado']; }
            if (count($conds) > 0) {
                $sql = "SELECT v.id_venta, v.id_comprador, u.nombre AS comprador_nombre, v.fecha_venta, v.monto_total, v.estado_pago, v.metodo_pago
                        FROM Ventas v
                        LEFT JOIN Usuarios u ON u.id_usuario = v.id_comprador
                        WHERE " . implode(' AND ', $conds) . " ORDER BY v.fecha_venta DESC";
            }

            if (!empty($_GET['limit']) && intval($_GET['limit']) > 0) {
                $limit = intval($_GET['limit']);
                $sql .= " LIMIT $limit";
            }

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['ok' => true, 'data' => $rows]);
            exit;
        }

        if ($type === 'methods') {
            // Listar métodos de pago de usuarios
            // opcional: id_usuario filter
            $sql = "SELECT m.id_metodo, m.id_usuario, u.nombre AS usuario_nombre, u.correo_electronico, m.tipo_tarjeta, m.ultimos_cuatro, m.fecha_expiracion, m.nombre_titular, m.es_predeterminada
                    FROM Metodos_Pago_Usuario m
                    LEFT JOIN Usuarios u ON u.id_usuario = m.id_usuario
                    ORDER BY m.es_predeterminada DESC, m.id_metodo DESC";
            $params = [];
            if (!empty($_GET['id_usuario'])) {
                $sql = "SELECT m.id_metodo, m.id_usuario, u.nombre AS usuario_nombre, u.correo_electronico, m.tipo_tarjeta, m.ultimos_cuatro, m.fecha_expiracion, m.nombre_titular, m.es_predeterminada
                        FROM Metodos_Pago_Usuario m
                        LEFT JOIN Usuarios u ON u.id_usuario = m.id_usuario
                        WHERE m.id_usuario = ? ORDER BY m.es_predeterminada DESC, m.id_metodo DESC";
                $params[] = intval($_GET['id_usuario']);
            }
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['ok' => true, 'data' => $rows]);
            exit;
        }
    }

    // Crear nuevo método de pago (POST)
    if ($method === 'POST' && ($type === 'methods' || isset($_GET['type']) && $_GET['type']==='methods')) {
        $raw = file_get_contents('php://input');
        $data = json_decode($raw, true);
        if (!is_array($data)) $data = $_POST;

        $required = ['id_usuario','tipo_tarjeta','ultimos_cuatro','fecha_expiracion','nombre_titular'];
        foreach ($required as $f) {
            if (empty($data[$f]) && $data[$f] !== '0') {
                http_response_code(400);
                echo json_encode(['ok' => false, 'message' => "Campo requerido: $f"]);
                exit;
            }
        }

        $id_usuario = intval($data['id_usuario']);
        $tipo = substr(trim($data['tipo_tarjeta']),0,50);
        $ult4 = substr(trim($data['ultimos_cuatro']),0,4);
        $exp = substr(trim($data['fecha_expiracion']),0,7);
        $titular = substr(trim($data['nombre_titular']),0,255);
        $pred = !empty($data['es_predeterminada']) ? 1 : 0;

        // If setting as predeterminada, clear others
        if ($pred) {
            $pdo->prepare('UPDATE Metodos_Pago_Usuario SET es_predeterminada = 0 WHERE id_usuario = ?')->execute([$id_usuario]);
        }

        $sql = "INSERT INTO Metodos_Pago_Usuario (id_usuario, tipo_tarjeta, ultimos_cuatro, fecha_expiracion, nombre_titular, es_predeterminada)
                VALUES (:uid, :tipo, :ult4, :exp, :tit, :pred)";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            ':uid' => $id_usuario,
            ':tipo' => $tipo,
            ':ult4' => $ult4,
            ':exp' => $exp,
            ':tit' => $titular,
            ':pred' => $pred
        ]);
        $id = $pdo->lastInsertId();
        echo json_encode(['ok' => true, 'id_metodo' => $id, 'message' => 'Método de pago creado']);
        exit;
    }

    // Eliminar método (DELETE) - recibir id_metodo en query
    if ($method === 'DELETE' && isset($_GET['id_metodo'])) {
        $id = intval($_GET['id_metodo']);
        $stmt = $pdo->prepare('DELETE FROM Metodos_Pago_Usuario WHERE id_metodo = ?');
        $stmt->execute([$id]);
        echo json_encode(['ok' => true, 'deleted' => $stmt->rowCount()]);
        exit;
    }

    // Actualizar método (PUT) - accept JSON body with id_metodo + fields
    if ($method === 'PUT') {
        $raw = file_get_contents('php://input');
        $data = json_decode($raw, true);
        if (!is_array($data) || empty($data['id_metodo'])) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'message' => 'id_metodo requerido en body']);
            exit;
        }
        $id = intval($data['id_metodo']);
        $fields = [];
        $params = [];
        $allowed = ['tipo_tarjeta','ultimos_cuatro','fecha_expiracion','nombre_titular','es_predeterminada'];
        foreach ($allowed as $f) {
            if (isset($data[$f])) { $fields[] = "$f = ?"; $params[] = $data[$f]; }
        }
        if (empty($fields)) {
            echo json_encode(['ok' => false, 'message' => 'Nada que actualizar']);
            exit;
        }
        // handle es_predeterminada specially
        if (isset($data['es_predeterminada']) && $data['es_predeterminada']) {
            // find id_usuario for this method
            $q = $pdo->prepare('SELECT id_usuario FROM Metodos_Pago_Usuario WHERE id_metodo = ?');
            $q->execute([$id]);
            $r = $q->fetch(PDO::FETCH_ASSOC);
            if ($r) {
                $pdo->prepare('UPDATE Metodos_Pago_Usuario SET es_predeterminada = 0 WHERE id_usuario = ?')->execute([$r['id_usuario']]);
            }
        }
        $params[] = $id;
        $sql = 'UPDATE Metodos_Pago_Usuario SET ' . implode(', ', $fields) . ' WHERE id_metodo = ?';
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        echo json_encode(['ok' => true, 'updated' => $stmt->rowCount()]);
        exit;
    }

    // Si no coincide nada
    http_response_code(400);
    echo json_encode(['ok' => false, 'message' => 'Parámetros inválidos. Usa GET?type=sales|methods, POST?type=methods']);
    exit;

} catch (PDOException $e) {
    error_log('payments.php error: '. $e->getMessage());
    http_response_code(500);
    echo json_encode(['ok' => false, 'message' => 'Error interno en payments', 'detail' => $e->getMessage()]);
    exit;
}

?>
