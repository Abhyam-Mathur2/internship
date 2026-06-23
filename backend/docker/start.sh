#!/bin/sh
set -e

mkdir -p bootstrap/cache
mkdir -p storage/app/private storage/app/public storage/framework/cache storage/framework/sessions storage/framework/views storage/logs
chmod -R 775 bootstrap/cache storage

composer install --no-interaction --prefer-dist --optimize-autoloader

php artisan config:clear
php artisan migrate --force
php artisan cache:clear

php artisan serve --host=0.0.0.0 --port=8000
