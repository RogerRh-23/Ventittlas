<?php
// Script para verificar y corregir la estructura de la tabla Ventas
require_once __DIR__ . '/conect.php';

try {
    // Verificar la estructura actual de la tabla Ventas
    echo "Verificando estructura de la tabla Ventas...\n";
    
    $stmt = $pdo->query("DESCRIBE Ventas");
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "Estructura actual:\n";
    foreach ($columns as $col) {
        echo "- {$col['Field']}: {$col['Type']} (NULL: {$col['Null']}, Default: {$col['Default']})\n";
    }
    
    // Verificar si necesitamos ajustar el campo estado_pago
    $needsUpdate = false;
    foreach ($columns as $col) {
        if ($col['Field'] === 'estado_pago') {
            // Si es varchar con menos de 10 caracteres, necesita actualización
            if (preg_match('/varchar\((\d+)\)/', $col['Type'], $matches)) {
                $length = intval($matches[1]);
                if ($length < 10) {
                    echo "El campo estado_pago tiene solo $length caracteres, necesita más espacio.\n";
                    $needsUpdate = true;
                }
            }
            break;
        }
    }
    
    // Actualizar la estructura si es necesario
    if ($needsUpdate) {
        echo "Actualizando estructura de la tabla...\n";
        
        $alterQueries = [
            "ALTER TABLE Ventas MODIFY COLUMN estado_pago VARCHAR(20) DEFAULT 'pending'",
            "ALTER TABLE Ventas MODIFY COLUMN metodo_pago VARCHAR(50) NULL"
        ];
        
        foreach ($alterQueries as $query) {
            try {
                $pdo->exec($query);
                echo "✓ Ejecutado: $query\n";
            } catch (PDOException $e) {
                echo "⚠ Error en query '$query': " . $e->getMessage() . "\n";
            }
        }
    } else {
        echo "✓ La estructura de la tabla está correcta.\n";
    }
    
    // Verificar estructura final
    echo "\nEstructura final:\n";
    $stmt = $pdo->query("DESCRIBE Ventas");
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($columns as $col) {
        echo "- {$col['Field']}: {$col['Type']}\n";
    }
    
    echo "\n✅ Verificación completada.\n";
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
?>