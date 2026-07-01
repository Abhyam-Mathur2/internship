FROM php:8.3-cli

RUN apt-get update \
    && apt-get install -y git unzip libzip-dev libpng-dev libjpeg-dev libonig-dev libpq-dev tesseract-ocr \
    && docker-php-ext-install pdo_mysql pdo_pgsql mbstring zip gd \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html
COPY . .

RUN mkdir -p bootstrap/cache storage/framework/sessions storage/framework/views storage/framework/cache/data storage/logs \
    && chmod -R 777 bootstrap/cache storage

RUN composer install --no-dev --optimize-autoloader

EXPOSE 10000
CMD php artisan migrate --force && php artisan serve --host=0.0.0.0 --port=10000

