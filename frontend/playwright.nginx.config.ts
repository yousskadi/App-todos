import { defineConfig, devices } from '@playwright/test'

// Suite dirigée contre l'IMAGE nginx, là où playwright.config.ts vise le
// serveur de développement Vite. La distinction est le sujet même de ces
// tests : les en-têtes de sécurité n'existent que dans nginx.conf.template, et
// le serveur de dev sert des scripts inline (HMR) qu'une CSP de production
// refuserait — le mesurer sur Vite ne prouverait rien.
//
// Le conteneur est démarré par la CI (job e2e) avant l'appel, pas par ce
// fichier : il lui faut l'image construite et les tmpfs du homelab.
export default defineConfig({
  testDir: './e2e-nginx',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: process.env.NGINX_BASE_URL ?? 'http://localhost:8080',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      // Même invocation que playwright.config.ts : le proxy /api de nginx doit
      // avoir un vrai backend derrière lui, sinon la CSP n'est éprouvée que
      // sur une page morte.
      command:
        'sh -c \'set -a; . ../.env; set +a; ' +
        'DATABASE_URL="postgresql+asyncpg://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:5432/${POSTGRES_DB}" ' +
        "RATE_LIMIT_ENABLED=0 exec .venv/bin/uvicorn app.main:app --port 8000'",
      cwd: '../backend',
      url: 'http://localhost:8000/api/docs',
      reuseExistingServer: !process.env.CI,
    },
  ],
})
