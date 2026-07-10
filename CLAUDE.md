# CLAUDE.md — App-todos

Contexte et conventions du dépôt, pour Claude Code. Complète les règles génériques héritées ; en cas de conflit, ce fichier fait foi pour ce projet.

## Aperçu

App de gestion du quotidien (tâches + rendez-vous), FR, mono-repo :

- `backend/` — API FastAPI, SQLAlchemy 2 async + asyncpg, Alembic, PostgreSQL 17, auth JWT (access + refresh rotation) + Argon2. Sert aussi de démo d'observabilité (traces OTel, logs JSON, métriques Prometheus avec exemplars).
- `frontend/` — React + Vite + TypeScript, Tailwind, shadcn/ui, i18n (fr), react-query, react-hook-form + zod. Tests e2e Playwright dans `frontend/e2e/`.

## Conventions de code (frontend)

- **Ne PAS lancer Prettier** : aucune config Prettier dans le repo. Le style est écrit à la main — **pas de point-virgule, quotes simples, ~100 colonnes**. Un `prettier --write` réécrit tout dans le mauvais style. Le lint = **oxlint** (`npm run lint`), pas de vérif de formatage en CI.
- Les composants `src/components/ui/*` sont générés (shadcn) et suivent un autre style (double quotes, point-virgules) : y matcher le style **du fichier**.
- **Vérifier avec `npm run build`** (`tsc -b` + vite), pas seulement `npx tsc --noEmit` : les configs diffèrent. `tsconfig.node.json` couvre `e2e/` avec `lib:["ES2023"]` (sans DOM) → dans un `addInitScript`, utiliser `globalThis`, jamais `window`/`Notification` bruts.

## Tests

```bash
cd backend && .venv/bin/ruff check . && .venv/bin/pytest      # SQLite mém. par défaut
cd frontend && npm run lint && npm run build
cd frontend && npm run test:e2e                                # Postgres docker requis
```

Playwright démarre backend + Vite tout seuls, mais les ports 8000/5173 doivent être libres : si la stack docker tourne, `docker compose stop backend frontend` (garder `postgres`) avant les e2e, puis `docker compose start backend frontend`.

## Workflow git

- **Jamais de push direct sur `main`** (bloqué). Toute modif passe par une branche + PR ; un commit par étape, message « Étape N : … ».
- **Protection de `main`** : PR obligatoire, **9 checks requis** — `backend`, `frontend`, `e2e`, `gitleaks`, `deps`, `image`, `analyze (python)`, `analyze (javascript-typescript)`, et **`CodeQL`** (le check de *résultats*, pas seulement les jobs `analyze` : il échoue sur nouvelle alerte high+).
- CodeQL `js/clear-text-storage-of-sensitive-data` traite tout objet renvoyé par l'API comme « sensible » : ne pas persister de données de RDV/tâche en clair dans localStorage (stocker un jeton/hash opaque).
- Dependabot : Claude merge les mineures/patch vertes, signale les majeures. Merger une PR touchant `.github/workflows/` exige le scope OAuth `workflow` sur `gh`.

## Contrat inter-projets (homelab)

- La CI publie l'image backend sur **`ghcr.io/yousskadi/app-todos-backend`** à chaque push sur `main`, taguée **`sha-<court>`** (tags immuables).
- Le déploiement est piloté depuis **`gitlab.com/yk-devops/homelab-cloud-prive`** (GitOps ArgoCD), qui consomme cette image. Ce repo ne porte que le code + l'instrumentation, pas les manifestes.
- **Bumper l'image = mettre à jour le manifeste homelab** vers le nouveau tag `sha-…`.
- Flags backend, **tous à `False`/off par défaut**, activés côté homelab : `OTEL_ENABLED`, `LOG_JSON`, `METRICS_ENABLED` (et `RATE_LIMIT_ENABLED=0` seulement pour les e2e).
- **Signaler toute migration Alembic** dans la description de PR : le homelab doit le savoir avant de déployer.

## Démarrage rapide (dev)

Voir [README.md](README.md). En bref : `.env` racine avec `POSTGRES_PASSWORD` + `JWT_SECRET`, `docker compose up -d postgres`, backend `uvicorn`, frontend `npm run dev`. Stack complète : `docker compose up -d --build` (frontend nginx sur http://localhost:5173, proxy `/api`).
