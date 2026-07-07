# App-todos

[![CI](https://github.com/yousskadi/App-todos/actions/workflows/ci.yml/badge.svg)](https://github.com/yousskadi/App-todos/actions/workflows/ci.yml)

Application de gestion de tâches : API FastAPI + frontend React, avec authentification complète et interface en français.

## Stack

- **Backend** : FastAPI, SQLAlchemy 2 (async) + asyncpg, Alembic, PostgreSQL 17, auth JWT (access + refresh avec rotation) et hachage Argon2, rate limiting (slowapi).
- **Frontend** : React + Vite + TypeScript, Tailwind CSS, shadcn/ui, thème clair/sombre, i18n (fr).
- **Tests** : pytest (backend), Playwright (e2e), ruff et oxlint pour le lint.

## Structure

```
backend/    API FastAPI (app/), migrations Alembic, tests pytest
frontend/   App React (src/), tests e2e Playwright (e2e/)
docker-compose.yml
```

## Démarrage (dev)

Prérequis : Docker, Python ≥ 3.12, Node ≥ 20.

```bash
# 1. Variables d'environnement (ne jamais commiter .env)
cp .env.example .env   # remplir POSTGRES_PASSWORD et JWT_SECRET (openssl rand -hex 32)

# 2. Base de données
docker compose up -d postgres

# 3. Backend (http://localhost:8000)
cd backend
python -m venv .venv && .venv/bin/pip install -e ".[dev]"
export DATABASE_URL="postgresql+asyncpg://todos:<POSTGRES_PASSWORD>@localhost:5432/todos"
export JWT_SECRET=<JWT_SECRET>
.venv/bin/alembic upgrade head
.venv/bin/uvicorn app.main:app --port 8000

# 4. Frontend (http://localhost:5173, proxifie /api vers le backend)
cd frontend
npm install
npm run dev
```

L'API est documentée sur http://localhost:8000/docs. L'inscription demande un email, un nom d'affichage et un mot de passe d'au moins 12 caractères.

### Stack complète via Docker

```bash
docker compose up -d --build   # frontend sur http://localhost:5173 (nginx proxifie /api)
```

## Tests

```bash
# Backend (SQLite en mémoire par défaut ; TEST_DATABASE_URL pour cibler Postgres)
cd backend && .venv/bin/ruff check . && .venv/bin/pytest

# Frontend
cd frontend && npm run lint && npm run build

# E2e (Postgres docker requis ; Playwright démarre backend et Vite tout seul)
cd frontend && npm run test:e2e
```

## CI

Le workflow [`ci.yml`](.github/workflows/ci.yml) tourne sur chaque push/PR vers `main` : lint + tests backend contre Postgres 17, lint + build frontend, tests e2e Playwright (rapport uploadé en artefact en cas d'échec), plus les scans de sécurité — gitleaks (secrets), pip-audit/npm audit (dépendances), Trivy (image Docker, avant publication GHCR) et [CodeQL](.github/workflows/codeql.yml) (analyse statique). Guide de compréhension : [docs/securite-ci.md](docs/securite-ci.md).

## Documentation

- [docs/securite-ci.md](docs/securite-ci.md) — comprendre chaque scan de la CI et les réflexes associés
- [docs/adr/](docs/adr/) — décisions d'architecture (sécurité CI/CD, observabilité trois signaux)
