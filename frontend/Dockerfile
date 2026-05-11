FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY angular.json tsconfig.json tsconfig.app.json tsconfig.spec.json public ./
COPY src/ src/
RUN npm run build -- --configuration production

FROM nginx:1.27-alpine AS serve
COPY --from=build /app/dist/moujtahid/browser /usr/share/nginx/html
COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost/ || exit 1
