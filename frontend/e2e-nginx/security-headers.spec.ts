import { expect, test } from '@playwright/test'

import { createTask, registerUser, taskCard } from '../e2e/helpers.ts'

// Le HTML réellement interprété par le navigateur est servi par ce pod, pas par
// l'API : c'est ici que les en-têtes comptent. Ils étaient absents (#54), et le
// middleware du backend se durcissait en s'appuyant sur leur existence.
const EN_TETES = {
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'no-referrer',
}

test('nginx sert les quatre en-têtes de sécurité', async ({ request }) => {
  const response = await request.get('/')
  expect(response.status()).toBe(200)

  const headers = response.headers()
  for (const [nom, valeur] of Object.entries(EN_TETES)) {
    expect(headers[nom], nom).toBe(valeur)
  }
  const csp = headers['content-security-policy']
  expect(csp).toContain("default-src 'self'")
  expect(csp).toContain("frame-ancestors 'none'")
  // Le durcissement se paie en compatibilité : les scripts, eux, restent
  // strictement d'origine. Ce test tombe si 'unsafe-inline' y arrive un jour.
  expect(csp).toContain("script-src 'self';")
  expect(csp).not.toContain("script-src 'self' 'unsafe-inline'")
})

test('les assets du build sont servis, en-têtes compris', async ({ request }) => {
  const html = await (await request.get('/')).text()
  const references = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1])
  expect(references.length, 'aucun asset référencé par index.html').toBeGreaterThan(0)

  for (const reference of references) {
    const asset = await request.get(reference)
    expect(asset.status(), reference).toBe(200)
    expect(asset.headers()['x-content-type-options'], reference).toBe('nosniff')
  }
})

test('le proxy /api atteint le backend', async ({ request }) => {
  // `connect-src 'self'` ne vaut que parce que les appels d'API passent par
  // cette même origine. Si le proxy tombe, la CSP devient une mauvaise réponse.
  const response = await request.get('/api/v1/health')
  expect(response.status()).toBe(200)
  expect(await response.json()).toEqual({ status: 'ok' })
})

test("la CSP ne casse pas l'application", async ({ page }) => {
  // Une CSP trop serrée casse une SPA sans rien afficher : seules la console et
  // un parcours réel le révèlent. Le parcours traverse Radix (dialogue, styles
  // en attribut), sonner (balise <style> injectée) et un appel d'API.
  const violations: string[] = []
  page.on('console', (message) => {
    // Filtré sur la CSP : l'application logue aussi des 401 attendus avant
    // connexion, qui ne diraient rien du durcissement.
    if (message.type() === 'error' && /Content Security Policy/i.test(message.text()))
      violations.push(message.text())
  })
  // Chromium refuse une requête bloquée par la CSP avec ce motif exact.
  page.on('requestfailed', (requete) => {
    if (requete.failure()?.errorText === 'csp')
      violations.push(`requête refusée par la CSP : ${requete.url()}`)
  })
  // Une exception non rattrapée, elle, est une casse quelle qu'en soit la cause.
  page.on('pageerror', (error) => violations.push(`exception : ${error.message}`))

  await registerUser(page)
  await createTask(page, 'Tâche sous CSP')
  await expect(taskCard(page, 'Tâche sous CSP')).toBeVisible()

  expect(violations).toEqual([])
})
