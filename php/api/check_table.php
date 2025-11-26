<?php
header('Content-Type: text/plain; charset=utf-8');
require_once __DIR__ . '/../conect.php';

try {
    echo "=== VERIFICACIÓN DE TABLA VENTAS ===\n\n";
    
    // Verificar si la tabla existe
    $stmt = $pdo->query("SHOW TABLES LIKE 'Ventas'");
    $tableExists = $stmt->rowCount() > 0;
    
    if (!$tableExists) {
        echo "❌ La tabla Ventas no existe.\n";
        echo "Creando tabla...\n";
        
        $createTable = "
        CREATE TABLE IF NOT EXISTS `Ventas` (
            `id_venta` int(11) NOT NULL AUTO_INCREMENT,
            `id_comprador` int(11) NOT NULL,
            `fecha_venta` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
            `monto_total` decimal(10,2) NOT NULL,
            `estado_pago` varchar(20) DEFAULT 'pending',
            `metodo_pago` varchar(50) DEFAULT NULL,
            PRIMARY KEY (`id_venta`),
            KEY `id_comprador` (`id_comprador`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        ";
        
        $pdo->exec($createTable);
        echo "✅ Tabla Ventas creada.\n";
    } else {
        echo "✅ La tabla Ventas existe.\n";
    }
    
    // Mostrar estructura
    echo "\n--- ESTRUCTURA DE LA TABLA ---\n";
    $stmt = $pdo->query("DESCRIBE Ventas");
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($columns as $col) {
        echo sprintf("%-15s %-20s %-5s %-10s\n", 
            $col['Field'], 
            $col['Type'], 
            $col['Null'], 
            $col['Default'] ?? 'NULL'
        );
    }
    
    // Verificar problemas comunes
    echo "\n--- VERIFICACIONES ---\n";
    $estadoPagoOk = false;
    $metodoPagoOk = false;
    
    foreach ($columns as $col) {
        if ($col['Field'] === 'estado_pago') {
            if (preg_match('/varchar\((\d+)\)/', $col['Type'], $matches)) {
                $length = intval($matches[1]);
                if ($length >= 20) {
                    echo "✅ Campo estado_pago: VARCHAR($length) - OK\n";
                    $estadoPagoOk = true;
                } else {
                    echo "⚠ Campo estado_pago: VARCHAR($length) - Muy pequeño\n";
                }
            }
        }
        
        if ($col['Field'] === 'metodo_pago') {
            if (preg_match('/varchar\((\d+)\)/', $col['Type'], $matches)) {
                $length = intval($matches[1]);
                if ($length >= 50) {
                    echo "✅ Campo metodo_pago: VARCHAR($length) - OK\n";
                    $metodoPagoOk = true;
                } else {
                    echo "⚠ Campo metodo_pago: VARCHAR($length) - Puede ser pequeño\n";
                }
            }
        }
    }
    
    // Ejecutar correcciones si es necesario
    if (!$estadoPagoOk || !$metodoPagoOk) {
        echo "\n--- APLICANDO CORRECCIONES ---\n";
        
        if (!$estadoPagoOk) {
            try {
                $pdo->exec("ALTER TABLE Ventas MODIFY COLUMN estado_pago VARCHAR(20) DEFAULT 'pending'");
                echo "✅ Campo estado_pago actualizado a VARCHAR(20)\n";
            } catch (Exception $e) {
                echo "❌ Error actualizando estado_pago: " . $e->getMessage() . "\n";
            }
        }
        
        if (!$metodoPagoOk) {
            try {
                $pdo->exec("ALTER TABLE Ventas MODIFY COLUMN metodo_pago VARCHAR(50) DEFAULT NULL");
                echo "✅ Campo metodo_pago actualizado a VARCHAR(50)\n";
            } catch (Exception $e) {
                echo "❌ Error actualizando metodo_pago: " . $e->getMessage() . "\n";
            }
        }
    }
    
    echo "\n=== VERIFICACIÓN COMPLETADA ===\n";
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
?>