# check_errors.ps1 - Script PowerShell para verificar errores comunes en Ventittlas

Write-Host "🔍 Verificando errores comunes en Ventittlas..." -ForegroundColor Cyan
Write-Host ""

# 1. Verificar que existe el archivo .env
Write-Host "1. Verificando archivo .env..." -ForegroundColor Yellow

if (Test-Path "php\.env") {
    Write-Host "   ✅ php\.env existe" -ForegroundColor Green
    
    # Verificar contenido básico
    $envContent = Get-Content "php\.env" -ErrorAction SilentlyContinue
    if ($envContent -match "DB_HOST" -and $envContent -match "DB_NAME") {
        Write-Host "   ✅ Configuración de DB presente" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Configuración de DB incompleta en .env" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ❌ php\.env no existe" -ForegroundColor Red
    Write-Host "   📋 Creando desde template..." -ForegroundColor Yellow
    
    if (Test-Path "php\.env.example") {
        Copy-Item "php\.env.example" "php\.env"
        Write-Host "   ✅ php\.env creado desde template" -ForegroundColor Green
        Write-Host "   ⚠️  IMPORTANTE: Editar php\.env con las credenciales correctas" -ForegroundColor Yellow
    } else {
        Write-Host "   ❌ Template php\.env.example no encontrado" -ForegroundColor Red
    }
}

Write-Host ""

# 2. Verificar permisos de archivos PHP
Write-Host "2. Verificando estructura PHP..." -ForegroundColor Yellow

if (Test-Path "php") {
    Write-Host "   ✅ Directorio php\ existe" -ForegroundColor Green
    
    if (Test-Path "php\conect.php") {
        Write-Host "   ✅ php\conect.php existe" -ForegroundColor Green
    } else {
        Write-Host "   ❌ php\conect.php no encontrado" -ForegroundColor Red
    }
    
    if (Test-Path "php\api") {
        Write-Host "   ✅ Directorio php\api\ existe" -ForegroundColor Green
        
        # Contar archivos API
        $apiFiles = Get-ChildItem "php\api\*.php" -ErrorAction SilentlyContinue
        Write-Host "   📁 Archivos API encontrados: $($apiFiles.Count)" -ForegroundColor Cyan
    } else {
        Write-Host "   ❌ Directorio php\api\ no existe" -ForegroundColor Red
    }
} else {
    Write-Host "   ❌ Directorio php\ no existe" -ForegroundColor Red
}

Write-Host ""

# 3. Verificar archivos JavaScript críticos
Write-Host "3. Verificando JavaScript..." -ForegroundColor Yellow
$jsFiles = @("js\main.js", "js\products_list.js", "js\navbar.js", "js\basket.js")

foreach ($file in $jsFiles) {
    if (Test-Path $file) {
        Write-Host "   ✅ $file existe" -ForegroundColor Green
    } else {
        Write-Host "   ❌ $file no encontrado" -ForegroundColor Red
    }
}

Write-Host ""

# 4. Verificar estructura de directorios críticos
Write-Host "4. Verificando estructura..." -ForegroundColor Yellow
$criticalDirs = @("assets\data", "assets\img\products", "components", "pages")

foreach ($dir in $criticalDirs) {
    if (Test-Path $dir) {
        Write-Host "   ✅ $dir\ existe" -ForegroundColor Green
    } else {
        Write-Host "   ❌ $dir\ no encontrado" -ForegroundColor Red
    }
}

Write-Host ""

# 5. Verificar archivos de datos
Write-Host "5. Verificando archivos de datos..." -ForegroundColor Yellow

if (Test-Path "assets\data\products.json") {
    Write-Host "   ✅ products.json existe" -ForegroundColor Green
    
    # Verificar si es JSON válido
    try {
        $jsonContent = Get-Content "assets\data\products.json" -Raw | ConvertFrom-Json
        Write-Host "   ✅ products.json es JSON válido" -ForegroundColor Green
    } catch {
        Write-Host "   ⚠️  products.json podría tener formato inválido" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ❌ assets\data\products.json no encontrado" -ForegroundColor Red
}

Write-Host ""

# 6. Verificar si PHP está disponible
Write-Host "6. Verificando PHP..." -ForegroundColor Yellow

try {
    $phpVersion = php --version 2>$null
    if ($phpVersion) {
        $version = ($phpVersion -split "`n")[0]
        Write-Host "   ✅ PHP disponible: $version" -ForegroundColor Green
    } else {
        Write-Host "   ❌ PHP no encontrado en PATH" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ PHP no disponible" -ForegroundColor Red
}

Write-Host ""

# 7. Consejos para debugging
Write-Host "🛠️  Consejos para debugging del error 500:" -ForegroundColor Magenta
Write-Host ""
Write-Host "   1. Abrir navegador y probar:" -ForegroundColor Cyan
Write-Host "      - http://tu-servidor/php/api/test.php" -ForegroundColor Gray
Write-Host "      - http://tu-servidor/php/diagnostics.php" -ForegroundColor Gray
Write-Host "      - http://tu-servidor/test_api.html" -ForegroundColor Gray
Write-Host ""
Write-Host "   2. Verificar logs del servidor web (si tienes acceso):" -ForegroundColor Cyan
Write-Host "      - Buscar archivos .log en el servidor" -ForegroundColor Gray
Write-Host "      - Verificar error_log de PHP" -ForegroundColor Gray
Write-Host ""
Write-Host "   3. Probar conexión a base de datos:" -ForegroundColor Cyan
Write-Host "      - Verificar credenciales en php\.env" -ForegroundColor Gray
Write-Host "      - Probar conexión desde cliente MySQL" -ForegroundColor Gray
Write-Host ""
Write-Host "   4. Verificar configuración del hosting:" -ForegroundColor Cyan
Write-Host "      - PHP habilitado y versión compatible" -ForegroundColor Gray
Write-Host "      - Extensiones: PDO, PDO_MySQL, JSON" -ForegroundColor Gray
Write-Host "      - Permisos de lectura en archivos PHP" -ForegroundColor Gray
Write-Host ""

Write-Host "✅ Verificación completa!" -ForegroundColor Green
Write-Host ""
Write-Host "💡 Siguiente paso: Abrir test_api.html en tu navegador para probar los endpoints" -ForegroundColor Yellow