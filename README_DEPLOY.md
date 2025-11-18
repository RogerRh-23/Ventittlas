# Ventittlas — Instrucciones de despliegue y configuración en Ubuntu

Este proyecto es una pequeña tienda estática/mixta (frontend estático + endpoints PHP) que incluye:

- Frontend: HTML, CSS/SCSS y JS en la raíz (`index.html`, `pages/`, `components/`, `js/`).
- Backend mínimo en PHP: `php/conect.php`, `php/api/products.php`.
- Scripts SQL para crear la estructura de la base de datos en `sql/init_db.sql` (si existe) — si no, las DDL se encuentran en la documentación del proyecto.

Este README cubre cómo desplegar la aplicación en Ubuntu (o WSL), cómo configurar la conexión a la base de datos y pasos útiles para pruebas.

## 1. Requisitos (Ubuntu / WSL)

- PHP 7.4+ (o PHP 8.x) y la extensión `php-mysql` (PDO MySQL)
- MySQL (servidor de base de datos)
- Servidor web (Apache2) o `php -S` para pruebas rápidas
- (Opcional) Composer si deseas usar librerías PHP

Instalación rápida (ejemplo con Apache + MySQL):

```bash
sudo apt update
sudo apt install apache2 php libapache2-mod-php php-mysql mysql-server -y
sudo systemctl enable --now apache2 mysql
```

Si usas WSL2 y prefieres no instalar Apache, puedes probar con el servidor embebido de PHP (ver sección de pruebas).

## 2. Crear la base de datos y tablas

1. Asegúrate de que MySQL/MariaDB esté en ejecución:

```bash
sudo service mysql start
sudo service mysql status
```

2. Crea el archivo SQL `./sql/init_db.sql` si aún no existe. (El repositorio incluye un script sugerido; si no lo tienes, puedes solicitar que lo genere).

3. Ejecuta el script para crear la base y las tablas (usando el cliente `mysql` de MySQL):

```bash
mysql -u root -p < ./sql/init_db.sql
```

4. Verifica que la base `tienda_db` (o la que definiste) y las tablas están creadas:

```bash
mysql -u root -p -e "SHOW DATABASES;"
mysql -u root -p -e "USE tienda_db; SHOW TABLES;"
```

## 3. Configurar la conexión desde PHP

El archivo de conexión principal es `php/conect.php`. Para no dejar credenciales en el repo, este proyecto usa un archivo de entorno `php/.env`.

1. Edita `php/.env` con las credenciales de tu servidor (no lo subas al repo):

```
DB_HOST=127.0.0.1
DB_NAME=tienda_db
DB_USER=tienda_user
DB_PASS=TU_PASSWORD_SEGURO
```

2. `php/conect.php` carga automáticamente `php/.env` (si existe) y establece la conexión PDO. Puedes probar la conexión desde la terminal:

```bash
# exportar variables para la sesión actual (opcional)
export DB_HOST=127.0.0.1
export DB_NAME=tienda_db
export DB_USER=tienda_user
export DB_PASS='TU_PASSWORD_REAL'

php php/conect.php
# salida esperada: "PDO OK" si la conexión es correcta
```

Si ves un error, revisa `/var/log/mysql/error.log` o el log de PHP/Apache para obtener detalles.

## 4. Probar el endpoint de productos

Para pruebas rápidas puedes usar el servidor embebido de PHP desde la raíz del proyecto:

```bash
php -S 127.0.0.1:8000 -t .
# luego en otra terminal
curl -s http://127.0.0.1:8000/php/api/products.php | python -m json.tool
```

Deberías recibir un array JSON con los productos (vacío si no hay productos en la tabla).

Si usas Apache, coloca el proyecto en `/var/www/html/tu-carpeta` o configura un VirtualHost y reinicia Apache:

```bash
sudo cp -r . /var/www/html/ventittlas
sudo chown -R www-data:www-data /var/www/html/ventittlas
sudo systemctl restart apache2
```

## 5. Insertar un usuario administrador (opcional)

Genera un hash seguro para la contraseña usando PHP y luego inserta el usuario en la tabla `Usuarios`:

```bash
php -r "echo password_hash('MiPassSeguro123', PASSWORD_DEFAULT) . PHP_EOL;"
# copia el hash resultante y luego ejecuta (reemplaza HASH_GENERADO):
mysql -u root -p -e "USE tienda_db; INSERT INTO Usuarios (nombre, correo_electronico, contrasena_hash, rol) VALUES ('Admin','admin@ejemplo.com','HASH_GENERADO','administrador');"
```

## 6. Cambios en el frontend

Los archivos JS ya fueron actualizados para consumir el nuevo endpoint:

- `js/products_list.js` → fetch a `/php/api/products.php`
- `js/products_page.js` → fetch a `/php/api/products.php`

Si vuelves a usar archivos JSON estáticos, cambia las rutas en los JS a `/assets/data/products.json`.

## 7. Seguridad y buenas prácticas

- No subas `php/.env` al repositorio. Se añadió `php/.env` a `.gitignore` en este proyecto.
- Usa contraseñas seguras y, para producción, restringe el acceso a la base de datos por host/IP.
- Usa HTTPS en producción.
- Revoca permisos excesivos: crea un usuario MySQL con solo los privilegios necesarios para la app.

Ejemplo para crear un usuario limitado (reemplaza `TU_PASSWORD`):

```sql
CREATE USER 'app_user'@'127.0.0.1' IDENTIFIED BY 'TU_PASSWORD';
GRANT SELECT, INSERT, UPDATE ON tienda_db.* TO 'app_user'@'127.0.0.1';
FLUSH PRIVILEGES;
```

## 8. Siguientes mejoras sugeridas

- Implementar endpoints POST para crear ventas (`php/api/create_sale.php`) que inserten en `Ventas` y `Detalle_Venta` y actualicen `Productos.stock`.
- Implementar login (`php/api/login.php`) usando `password_verify()` y manejo de sesiones o JWT.
- Añadir tests automatizados (PHPUnit) para los endpoints.

## 9. Contacto y notas finales

Si algo falla en la conexión, pega la salida de:

```bash
sudo service mysql status
sudo tail -n 100 /var/log/mysql/error.log
php php/conect.php
```

Puedo generar un script `sql/seed.sql` y un `php/cli/seed.php` para insertar datos de prueba (categorías, productos) si quieres. Indica si lo deseas.
