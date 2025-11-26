<?php
// Disable error display but enable error logging
ini_set('display_errors', 0);
error_reporting(E_ALL);

function load_dotenv($path)
{
    if (!file_exists($path)) {
        error_log("Environment file not found: $path");
        return false;
    }
    
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines === false) {
        error_log("Could not read environment file: $path");
        return false;
    }
    
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#') continue;
        $parts = explode('=', $line, 2);
        if (count($parts) !== 2) continue;
        $key = trim($parts[0]);
        $val = trim($parts[1]);
        if ((strlen($val) >= 2) && ($val[0] === '"' && substr($val, -1) === '"' || $val[0] === "'" && substr($val, -1) === "'")) {
            $val = substr($val, 1, -1);
        }
        putenv("$key=$val");
        $_ENV[$key] = $val;
    }
    return true;
}

$envPath = __DIR__ . DIRECTORY_SEPARATOR . '.env';
$envLoaded = load_dotenv($envPath);

if (!$envLoaded) {
    error_log("Warning: Could not load .env file from $envPath");
}

$dbHost = getenv('DB_HOST') ?: '10.12.220.169';
$dbName = getenv('DB_NAME') ?: 'Tienda';
$dbUser = getenv('DB_USER') ?: 'Kika';
$dbPass = getenv('DB_PASS') ?: 'Kikaesunperro1214-';
$dbPort = getenv('DB_PORT') ?: '';

if ($dbPort !== '') {
    $dsn = "mysql:host=$dbHost;port=$dbPort;dbname=$dbName;charset=utf8mb4";
} else {
    $dsn = "mysql:host=$dbHost;dbname=$dbName;charset=utf8mb4";
}

try {
    $pdo = new PDO($dsn, $dbUser, $dbPass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    if (php_sapi_name() === 'cli') {
        echo "PDO OK\n";
    }
} catch (PDOException $e) {
    error_log('DB connection error: ' . $e->getMessage());
    if (php_sapi_name() === 'cli') {
        fwrite(STDERR, 'Error de conexión a la base de datos: ' . $e->getMessage() . PHP_EOL);
        exit(1);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Error de conexión a la base de datos']);
        exit;
    }
}
?>