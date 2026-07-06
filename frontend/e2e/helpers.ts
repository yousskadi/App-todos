import { expect, type Page } from '@playwright/test'

export const PASSWORD = 'MotDePasseE2e123!'

let counter = 0

export function uniqueEmail(): string {
  return `e2e-${Date.now()}-${process.pid}-${counter++}@test.dev`
}

/** Crée un compte via le formulaire d'inscription et attend l'arrivée sur /tasks. */
export async function registerUser(page: Page): Promise<string> {
  const email = uniqueEmail()
  await page.goto('/register')
  await page.getByLabel('Nom affiché').fill('Youssef E2E')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Mot de passe').fill(PASSWORD)
  await page.getByRole('button', { name: 'Créer un compte' }).click()
  await expect(page).toHaveURL(/\/tasks$/)
  return email
}

/** Crée une tâche via le dialogue. Suppose qu'on est sur /tasks. */
export async function createTask(page: Page, title: string): Promise<void> {
  await page.getByRole('button', { name: 'Nouvelle tâche' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Titre').fill(title)
  await dialog.getByRole('button', { name: 'Enregistrer' }).click()
  await expect(dialog).toBeHidden()
}

/** La carte de tâche contenant ce titre. */
export function taskCard(page: Page, title: string) {
  return page.getByTestId('task-card').filter({ hasText: title })
}
