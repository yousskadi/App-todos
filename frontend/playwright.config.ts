import { defineConfig, devices } from '@playwright/test'

// Prérequis : Postgres démarré (docker compose up -d postgres à la racine).
// Le backend et Vite sont lancés automatiquement (voir webServer ci-dessous).
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      // Rate limiting désactivé : les tests enchaînent inscriptions et
      // connexions bien au-delà des 5/minute autorisées en fonctionnement normal
      command:
        'sh -c \'set -a; . ../.env; set +a; ' +
        'DATABASE_URL="postgresql+asyncpg://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:5432/${POSTGRES_DB}" ' +
        "RATE_LIMIT_ENABLED=0 exec .venv/bin/uvicorn app.main:app --port 8000'",
      cwd: '../backend',
      url: 'http://localhost:8000/api/docs',
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
    },
  ],
})
