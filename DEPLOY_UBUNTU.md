# Despliegue en Ubuntu — Pasos detallados

Este archivo contiene una guía paso a paso para subir y desplegar el proyecto `Ventittlas` en un servidor Ubuntu (o WSL) usando Apache + MySQL.

Requisitos previos: acceso SSH al servidor, usuario con sudo, y el proyecto listo en tu máquina local o en un repositorio remoto.

1) Preparación del servidor

```bash
sudo apt update && sudo apt upgrade -y
# crear usuario de despliegue (opcional)
sudo adduser deploy
sudo usermod -aG sudo deploy
```

2) Transferir el proyecto al servidor

- Usar git (recomendado si tienes un repo):

```bash
sudo mkdir -p /var/www/ventittlas
sudo chown deploy:deploy /var/www/ventittlas
cd /var/www/ventittlas
git clone <tu-repo-url> .
```

- O usar rsync desde tu máquina local:

```bash
rsync -avz --exclude='.git' ./ deploy@tu-servidor:/var/www/ventittlas
```

3) Instalar dependencias (Apache, PHP, MySQL)

```bash
sudo apt install apache2 php libapache2-mod-php php-mysql mysql-server -y
sudo systemctl enable --now apache2 mysql
```

4) Crear base de datos y usuario MySQL

```bash
sudo mysql -u root -p
-- dentro del cliente mysql:
CREATE DATABASE tienda_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'tienda_user'@'127.0.0.1' IDENTIFIED BY 'TU_PASSWORD_SEGURO';
GRANT ALL PRIVILEGES ON tienda_db.* TO 'tienda_user'@'127.0.0.1';
FLUSH PRIVILEGES;
EXIT;
```

Importar tablas (si tienes `sql/init_db.sql` en el proyecto):

```bash
mysql -u root -p < /var/www/ventittlas/sql/init_db.sql
```

5) Configurar Apache (VirtualHost)

Crear `/etc/apache2/sites-available/ventittlas.conf` con:

```apacheconf
<VirtualHost *:80>
    ServerName ejemplo.com
    DocumentRoot /var/www/ventittlas
    <Directory /var/www/ventittlas>
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
    ErrorLog ${APACHE_LOG_DIR}/ventittlas_error.log
    CustomLog ${APACHE_LOG_DIR}/ventittlas_access.log combined
</VirtualHost>
```

Habilitar y recargar:

```bash
sudo a2ensite ventittlas.conf
sudo a2enmod rewrite
sudo systemctl reload apache2
```

6) Configurar `.env` y permisos

```bash
nano /var/www/ventittlas/php/.env
sudo chown www-data:www-data /var/www/ventittlas/php/.env
sudo chmod 640 /var/www/ventittlas/php/.env

sudo chown -R www-data:www-data /var/www/ventittlas
sudo find /var/www/ventittlas -type d -exec chmod 755 {} \;
sudo find /var/www/ventittlas -type f -exec chmod 644 {} \;
```

7) Habilitar HTTPS (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-apache -y
sudo certbot --apache -d ejemplo.com
```

8) Pruebas y logs

```bash
curl -s http://127.0.0.1/php/api/products.php | jq .
sudo tail -n 200 /var/log/apache2/ventittlas_error.log
sudo tail -n 200 /var/log/mysql/error.log
```

9) Firewall básico (UFW)

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Apache Full'
sudo ufw enable
```

10) Backups (ejemplo simple con cron)

```bash
sudo tee /usr/local/bin/backup_mysql.sh > /dev/null <<'BASH'
#!/bin/bash
mysqldump -u root -p'TU_ROOT_PASS' --all-databases > /var/backups/mysql/all_databases_$(date +%F).sql
BASH
sudo chmod +x /usr/local/bin/backup_mysql.sh
sudo bash -c "(crontab -l 2>/dev/null; echo '0 2 * * * /usr/local/bin/backup_mysql.sh') | crontab -"
```

11) Troubleshooting rápido

- Si PDO falla, instala `php-mysql` y reinicia Apache: `sudo apt install php-mysql && sudo systemctl restart apache2`.
- Revisa permisos de `php/.env` y que `php/conect.php` cargue las variables.
- Logs principales: `/var/log/apache2/*.log` y `/var/log/mysql/error.log`.

Si quieres, puedo generar `sql/seed.sql` y un pequeño `php/cli/seed.php` para poblar la base con datos de prueba y facilitar las pruebas. ¿Lo genero ahora?
