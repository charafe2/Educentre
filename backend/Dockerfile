FROM composer:latest AS composer
WORKDIR /app
COPY backend/composer.json backend/composer.lock ./
RUN composer install --no-dev --optimize-autoloader --no-interaction --no-progress --no-scripts

FROM node:22-alpine AS node
WORKDIR /app
COPY backend/package.json backend/vite.config.js ./
COPY backend/resources/ resources/
RUN npm install --ignore-scripts && npm run build

FROM php:8.4-fpm-alpine AS laravel

RUN apk add --no-cache \
    postgresql-dev \
    libzip-dev \
    icu-dev \
    libpng-dev \
    oniguruma-dev \
    linux-headers \
    supervisor \
    $PHPIZE_DEPS \
  && docker-php-ext-install -j$(nproc) \
    pdo_pgsql \
    pgsql \
    bcmath \
    ctype \
    exif \
    gd \
    intl \
    mbstring \
    pcntl \
    sockets \
    zip \
  && pecl install redis \
  && docker-php-ext-enable redis \
  && pecl clear-cache \
  && apk del $PHPIZE_DEPS

RUN mv "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini"

COPY docker/php/php.ini /usr/local/etc/php/conf.d/overrides.ini
COPY docker/php/www.conf /usr/local/etc/php-fpm.d/www.conf

WORKDIR /var/www/html

COPY backend/ .
COPY --from=composer /app/vendor vendor
COPY --from=node /app/public/build public/build

RUN set -eux \
  && mkdir -p storage/framework/cache/data \
    storage/framework/sessions \
    storage/framework/views \
    storage/logs \
    bootstrap/cache \
  && chown -R www-data:www-data storage bootstrap/cache \
  && chmod -R 775 storage bootstrap/cache

COPY docker/php/entrypoint.sh /usr/local/bin/docker-entrypoint
RUN chmod +x /usr/local/bin/docker-entrypoint

ENTRYPOINT ["docker-entrypoint"]
CMD ["php-fpm"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD php-fpm-healthcheck || exit 1
