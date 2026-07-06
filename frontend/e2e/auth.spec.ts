import { expect, test } from '@playwright/test'

import { PASSWORD, registerUser, uniqueEmail } from './helpers.ts'

test('redirige un visiteur non connecté vers /login', async ({ page }) => {
  await page.goto('/tasks')
  await expect(page).toHaveURL(/\/login$/)
})

test("l'inscription connecte et mène aux tâches", async ({ page }) => {
  await registerUser(page)
  await expect(page.getByRole('heading', { name: 'Tâches', exact: true })).toBeVisible()
  await expect(page.getByText('Youssef E2E')).toBeVisible()
})

test('affiche une erreur de validation si le mot de passe est trop court', async ({ page }) => {
  await page.goto('/register')
  await page.getByLabel('Nom affiché').fill('Youssef E2E')
  await page.getByLabel('Email').fill(uniqueEmail())
  await page.getByLabel('Mot de passe').fill('court')
  await page.getByRole('button', { name: 'Créer un compte' }).click()
  await expect(
    page.getByText('Le mot de passe doit contenir au moins 12 caractères'),
  ).toBeVisible()
  await expect(page).toHaveURL(/\/register$/)
})

test('refuse des identifiants invalides', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email').fill(uniqueEmail())
  await page.getByLabel('Mot de passe').fill('MauvaisMotDePasse1!')
  await page.getByRole('button', { name: 'Se connecter' }).click()
  await expect(page.getByText('Email ou mot de passe incorrect')).toBeVisible()
  await expect(page).toHaveURL(/\/login$/)
})

test('déconnexion puis reconnexion avec le même compte', async ({ page }) => {
  const email = await registerUser(page)

  await page.getByRole('button', { name: 'Se déconnecter' }).click()
  await expect(page).toHaveURL(/\/login$/)

  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Mot de passe').fill(PASSWORD)
  await page.getByRole('button', { name: 'Se connecter' }).click()
  await expect(page).toHaveURL(/\/tasks$/)
  await expect(page.getByText('Youssef E2E')).toBeVisible()
})

test('la session survit à un rechargement de page', async ({ page }) => {
  await registerUser(page)
  await page.reload()
  await expect(page).toHaveURL(/\/tasks$/)
  await expect(page.getByRole('heading', { name: 'Tâches', exact: true })).toBeVisible()
})
