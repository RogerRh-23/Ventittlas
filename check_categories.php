<?php
require_once 'php/config.php';

try {
    $pdo = new PDO($dsn, $username, $password, $options);
    $stmt = $pdo->query('SELECT DISTINCT categoria FROM Productos WHERE categoria IS NOT NULL ORDER BY categoria');
    $categorias = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    echo "Categorías disponibles en la base de datos:\n";
    foreach($categorias as $cat) {
        echo "- '$cat'\n";
    }
    
    // También mostrar algunos productos de ejemplo
    echo "\nProductos de ejemplo por categoría:\n";
    $stmt = $pdo->query('SELECT nombre, categoria FROM Productos WHERE categoria IS NOT NULL LIMIT 20');
    $productos = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach($productos as $producto) {
        echo "- {$producto['nombre']} -> '{$producto['categoria']}'\n";
    }
    
} catch(Exception $e) {
    echo 'Error: ' . $e->getMessage();
}
?>