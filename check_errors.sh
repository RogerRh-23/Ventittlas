#!/bin/bash

# check_errors.sh - Script para verificar errores comunes en Ventittlas

echo "🔍 Verificando errores comunes en Ventittlas..."
echo ""

# 1. Verificar que existe el archivo .env
echo "1. Verificando archivo .env..."
if [ -f "php/.env" ]; then
    echo "   ✅ php/.env existe"
    
    # Verificar contenido básico
    if grep -q "DB_HOST" php/.env && grep -q "DB_NAME" php/.env; then
        echo "   ✅ Configuración de DB presente"
    else
        echo "   ⚠️  Configuración de DB incompleta en .env"
    fi
else
    echo "   ❌ php/.env no existe"
    echo "   📋 Creando desde template..."
    
    if [ -f "php/.env.example" ]; then
        cp php/.env.example php/.env
        echo "   ✅ php/.env creado desde template"
        echo "   ⚠️  IMPORTANTE: Editar php/.env con las credenciales correctas"
    else
        echo "   ❌ Template php/.env.example no encontrado"
    fi
fi

echo ""

# 2. Verificar permisos de archivos PHP
echo "2. Verificando permisos..."
if [ -d "php" ]; then
    echo "   ✅ Directorio php/ existe"
    
    if [ -r "php/conect.php" ]; then
        echo "   ✅ php/conect.php es legible"
    else
        echo "   ❌ php/conect.php no es legible"
    fi
    
    if [ -d "php/api" ]; then
        echo "   ✅ Directorio php/api/ existe"
    else
        echo "   ❌ Directorio php/api/ no existe"
    fi
else
    echo "   ❌ Directorio php/ no existe"
fi

echo ""

# 3. Verificar archivos JavaScript críticos
echo "3. Verificando JavaScript..."
js_files=("js/main.js" "js/products_list.js" "js/navbar.js" "js/basket.js")

for file in "${js_files[@]}"; do
    if [ -f "$file" ]; then
        echo "   ✅ $file existe"
    else
        echo "   ❌ $file no encontrado"
    fi
done

echo ""

# 4. Verificar estructura de directorios críticos
echo "4. Verificando estructura..."
critical_dirs=("assets/data" "assets/img/products" "components" "pages")

for dir in "${critical_dirs[@]}"; do
    if [ -d "$dir" ]; then
        echo "   ✅ $dir/ existe"
    else
        echo "   ❌ $dir/ no encontrado"
    fi
done

echo ""

# 5. Verificar archivos de datos
echo "5. Verificando archivos de datos..."
if [ -f "assets/data/products.json" ]; then
    echo "   ✅ products.json existe"
    
    # Verificar si es JSON válido
    if python3 -m json.tool assets/data/products.json >/dev/null 2>&1 || python -m json.tool assets/data/products.json >/dev/null 2>&1; then
        echo "   ✅ products.json es JSON válido"
    else
        echo "   ⚠️  products.json podría tener formato inválido"
    fi
else
    echo "   ❌ assets/data/products.json no encontrado"
fi

echo ""

# 6. Consejos para debugging
echo "🛠️  Consejos para debugging del error 500:"
echo ""
echo "   1. Verificar logs del servidor web:"
echo "      - Apache: /var/log/apache2/error.log"
echo "      - Nginx: /var/log/nginx/error.log"
echo ""
echo "   2. Verificar logs de PHP:"
echo "      - Ubicación común: /var/log/php_errors.log"
echo "      - O verificar php.ini para log_errors"
echo ""
echo "   3. Probar endpoints individualmente:"
echo "      - Abrir http://tu-servidor/php/api/test.php"
echo "      - Abrir http://tu-servidor/php/diagnostics.php"
echo "      - Abrir http://tu-servidor/test_api.html"
echo ""
echo "   4. Verificar base de datos:"
echo "      - Conexión: mysql -h HOST -u USER -p DATABASE"
echo "      - Tablas: SHOW TABLES;"
echo ""
echo "   5. Verificar configuración del servidor:"
echo "      - Módulos PHP: php -m"
echo "      - Configuración: php --ini"
echo ""

echo "✅ Verificación completa!"