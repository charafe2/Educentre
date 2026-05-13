#!/bin/sh
set -e

if [ ! -f /var/www/html/.env ]; then
    cp /var/www/html/.env.example /var/www/html/.env
    php /var/www/html/artisan key:generate --force
fi

php /var/www/html/artisan storage:link --force 2>/dev/null || true

if [ "${APP_ENV}" = "production" ] || [ "${APP_ENV}" = "staging" ]; then
    php /var/www/html/artisan config:cache --quiet
    php /var/www/html/artisan route:cache --quiet
    php /var/www/html/artisan view:cache --quiet
    php /var/www/html/artisan event:cache --quiet
fi

chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache
chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

exec "$@"
