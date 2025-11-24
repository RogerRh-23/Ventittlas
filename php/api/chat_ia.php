<?php


header('Content-Type: application/json');


$apiKey = '';


require_once '../conect.php';

// Load API key from environment (php/.env via conect.php)
$apiKey = getenv('GEN_API_KEY') ?: getenv('GOOGLE_API_KEY') ?: getenv('API_KEY');
if (!$apiKey) {
    http_response_code(500);
    echo json_encode(['error' => 'Server configuration error: missing GEN_API_KEY']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['error' => 'Método no permitido.']);
    http_response_code(405);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
if (!isset($data['mensaje']) || empty(trim($data['mensaje']))) {
    echo json_encode(['error' => 'El mensaje es obligatorio.']);
    http_response_code(400);
    exit;
}

$mensajeUsuario = trim($data['mensaje']);

try {
    // default to empty array so response always contains the key
    $productosEncontrados = [];
    
    $sql = "SELECT nombre, descripcion, precio, stock FROM Productos WHERE estado = 'disponible'";
    $stmt = $pdo->prepare($sql);
    $stmt->execute();
    $todosLosProductos = $stmt->fetchAll(PDO::FETCH_ASSOC);

    
    $contextoProductos = "INVENTARIO ACTUAL DE LA TIENDA:\n";
    if (count($todosLosProductos) > 0) {
        foreach ($todosLosProductos as $p) {
            $stockMsg = ($p['stock'] > 0) ? "En stock ({$p['stock']} unid.)" : "Agotado";
            $contextoProductos .= "- Producto: {$p['nombre']} | Precio: $ {$p['precio']} | Info: {$p['descripcion']} | Estado: $stockMsg\n";
        }
    } else {
        $contextoProductos .= "No hay productos registrados en el sistema actualmente.\n";
    }

    $promptFinal = "Eres KikaBot, el asistente experto de la tienda Ventittlas.
    Tu misión es vender. Sé amable, breve y persuasivo.
    
    INSTRUCCIONES:
    1. Usa EXCLUSIVAMENTE la siguiente lista de inventario para responder precios y existencias.
    2. Si el usuario pregunta por algo que SÍ está en la lista, dale el precio exacto y véndeselo.
    3. Si pregunta por algo que NO está en la lista (ej: 'Pizza'), dile amablemente que no vendemos eso.
    4. Si te preguntan tu nombre, di 'Soy KikaBot'.
    5. Si te preguntan por el horario de la tienda, di 'Nuestro horario es de 9am a 9pm de lunes a sábado'.
    6. Nunca inventes productos, precios o existencias.
    7. Si te piden recomendaciones, sugiere los productos más baratos que estén en stock.
    8. Si te piden la descripción de un producto, usa la que está en la lista de productos.
    9. Si un producto está agotado, ofréceles otro similar que SÍ esté en stock.
    10. Intenta no repetir productos ya mencionados en la conversación.
    11. Si te piden el artículo más barato, revisa la lista de productos, dáselo siempre y cuando esté en stock.
    12. Si te piden el artículo más caro, revisa la lista de productos, dáselo siempre y cuando esté en stock.
    13. Si te llegan a pedir multiples recomendaciones, sugiere hasta 3 productos diferentes que estén en stock.
    14. Si el usuario pregunta por descuentos o promociones, revísalo en la lista de productos y responde acorde.
    15. Si el usuario pregunta por métodos de pago, responde 'Aceptamos tarjetas de crédito, débito, pagos en efectivo y transferencias'.
    16. Si el usuario quiere comprar varios productos, haz un resumen final con los precios y el total a pagar.
    
    " . $contextoProductos . "
    
    Pregunta del cliente: " . $mensajeUsuario;

    
    $url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" . $apiKey;

    $payload = [
        "contents" => [
            [
                "parts" => [
                    ["text" => $promptFinal]
                ]
            ]
        ]
    ];

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false); 
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));

    $response = curl_exec($ch);
    $curlErrno = curl_errno($ch);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($curlErrno) {
        throw new Exception('cURL error: ' . $curlError);
    }

    if ($response === false || $response === null || trim($response) === '') {
        // no response body
        throw new Exception('Empty response from IA endpoint');
    }

    $jsonRespuesta = json_decode($response, true);
    if ($jsonRespuesta === null && json_last_error() !== JSON_ERROR_NONE) {
        // invalid JSON returned
        echo json_encode(['error' => 'Respuesta inválida de la IA', 'raw' => substr($response,0,2000), 'json_error' => json_last_error_msg()]);
        exit;
    }

    // Try known path for Generative Language API
    $textoIA = null;
    if (isset($jsonRespuesta['candidates'][0]['content']['parts'][0]['text'])) {
        $textoIA = $jsonRespuesta['candidates'][0]['content']['parts'][0]['text'];
    } elseif (isset($jsonRespuesta['output'] ) && is_string($jsonRespuesta['output'])) {
        $textoIA = $jsonRespuesta['output'];
    } elseif (isset($jsonRespuesta['result']) && is_string($jsonRespuesta['result'])) {
        $textoIA = $jsonRespuesta['result'];
    }

    if ($textoIA !== null) {
        echo json_encode([
            'respuesta' => $textoIA,
            'productos_encontrados' => $productosEncontrados
        ]);
    } else {
        echo json_encode(['error' => 'La IA no respondió correctamente.', 'debug' => $jsonRespuesta]);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error del servidor: ' . $e->getMessage()]);
}
?>