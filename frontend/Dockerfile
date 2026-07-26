FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY angular.json tsconfig.json tsconfig.app.json tsconfig.spec.json ./
COPY public/ ./public/
COPY scripts/ ./scripts/
COPY src/ src/
# Runs `ng build` (prerenders public routes) then the postbuild sitemap/robots
# generator (scripts/generate-sitemap.mjs) — both must find their files above.
RUN npm run build -- --configuration production

FROM nginx:1.27-alpine AS serve
COPY --from=build /app/dist/moujtahid/browser /usr/share/nginx/html
COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ || exit 1
