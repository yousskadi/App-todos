FROM node:22-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine

# Rendu en /etc/nginx/conf.d/default.conf au démarrage, après substitution de
# BACKEND_URL. Le défaut vaut pour docker compose ; le homelab l'écrase par le
# Service Kubernetes (http://todos-backend:8000).
ENV BACKEND_URL=http://backend:8000
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
