FROM node:22-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Tag de famille, pas une version figée : comme `python:3.12-slim` côté
# backend, il continue de recevoir les correctifs Alpine. `1.27-alpine` ne
# bougeait plus (Alpine 3.21) et portait 35 vulnérabilités corrigeables.
FROM nginx:1.31-alpine

# Alpine has published the libexpat and pcre2 fixes but nginx:1.31-alpine has
# not been rebuilt since. Without this step the Trivy scan of the
# `image-frontend` job fails on fixable HIGH CVEs (pcre2: CVE-2026-103111).
# Drop a package from the list once the upstream image ships its fix.
RUN apk upgrade --no-cache libexpat pcre2

# Rendu en /etc/nginx/conf.d/default.conf au démarrage, après substitution de
# BACKEND_URL. Le défaut vaut pour docker compose ; le homelab l'écrase par le
# Service Kubernetes (http://todos-backend:8000).
ENV BACKEND_URL=http://backend:8000
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080
