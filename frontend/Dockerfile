FROM node:24-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Tag de famille, pas une version figée : comme `python:3.12-slim` côté
# backend, il continue de recevoir les correctifs Alpine. `1.27-alpine` ne
# bougeait plus (Alpine 3.21) et portait 35 vulnérabilités corrigeables.
FROM nginx:1.31-alpine

# Alpine ships libxslt 1.1.43-r4 (CVE-2026-125350, CVE-2026-87636, CVE-2026-9947)
# but nginx:1.31-alpine still has r3, so Trivy fails on fixable HIGH CVEs.
# Drop the package from this list once the upstream image ships the fix.
RUN apk upgrade --no-cache libxslt

# Rendu en /etc/nginx/conf.d/default.conf au démarrage, après substitution de
# BACKEND_URL. Le défaut vaut pour docker compose ; le homelab l'écrase par le
# Service Kubernetes (http://todos-backend:8000).
ENV BACKEND_URL=http://backend:8000
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080
