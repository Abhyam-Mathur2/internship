FROM php:8.3-cli

RUN apt-get update \
    && apt-get install -y git unzip libzip-dev libpng-dev libjpeg-dev libonig-dev tesseract-ocr \
    && docker-php-ext-install pdo_mysql mbstring zip gd \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

