<?php
// php/config.php - Configuración global para todas las APIs
if (!defined('API_CONFIG_LOADED')) {
    define('API_CONFIG_LOADED', true);
    
    // Configuración de errores para producción
    ini_set('display_errors', 0);
    error_reporting(E_ALL);
    
    // Headers de seguridad y respuesta JSON
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY');
    header('X-XSS-Protection: 1; mode=block');
    
    // CORS básico (ajustar según necesidades)
    if (isset($_SERVER['HTTP_ORIGIN'])) {
        $allowed_origins = [
            'http://localhost',
            'http://localhost:3000',
            'http://localhost:8000',
            'https://ventittlas.com' // Agregar tu dominio real aquí
        ];
        
        if (in_array($_SERVER['HTTP_ORIGIN'], $allowed_origins)) {
            header("Access-Control-Allow-Origin: {$_SERVER['HTTP_ORIGIN']}");
        }
    }
    
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Access-Control-Allow-Credentials: true');
    
    // Manejo de preflight requests
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit;
    }
    
    // Función helper para respuestas de error
    function api_error($message, $code = 500, $details = null) {
        http_response_code($code);
        $response = ['ok' => false, 'message' => $message];
        if ($details !== null && (defined('DEBUG_MODE') && DEBUG_MODE)) {
            $response['details'] = $details;
        }
        echo json_encode($response, JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    // Función helper para respuestas de éxito
    function api_success($data = [], $message = null) {
        $response = ['ok' => true];
        if ($message !== null) {
            $response['message'] = $message;
        }
        if (!empty($data)) {
            if (is_array($data) && isset($data[0])) {
                $response['data'] = $data;
            } else {
                $response = array_merge($response, $data);
            }
        }
        echo json_encode($response, JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    // Función para validar campos requeridos
    function validate_required_fields($data, $required_fields) {
        $missing = [];
        foreach ($required_fields as $field) {
            if (!isset($data[$field]) || (is_string($data[$field]) && trim($data[$field]) === '')) {
                $missing[] = $field;
            }
        }
        
        if (!empty($missing)) {
            api_error('Campos requeridos faltantes: ' . implode(', ', $missing), 400);
        }
    }
    
    // Función para obtener datos de input (JSON o POST)
    function get_input_data() {
        $raw = file_get_contents('php://input');
        $data = json_decode($raw, true);
        
        if (!is_array($data)) {
            $data = $_POST;
        }
        
        return $data;
    }
}
?>