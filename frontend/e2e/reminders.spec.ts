import { expect, test } from '@playwright/test'

import { registerUser } from './helpers.ts'

/** Valeur "YYYY-MM-DDTHH:mm" en heure locale pour un <input datetime-local>. */
function localInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

test.beforeEach(async ({ page }) => {
  await registerUser(page)
  await page.getByRole('link', { name: 'Rendez-vous' }).click()
  await expect(page).toHaveURL(/\/appointments$/)
})

test('déclenche le rappel (repli toast) quand son échéance est atteinte', async ({ page }) => {
  // Rendez-vous dans 5 min avec rappel « 5 minutes avant » → l'échéance vient de tomber
  const start = new Date()
  start.setMinutes(start.getMinutes() + 5, 0, 0)
  const end = new Date(start)
  end.setHours(end.getHours() + 1)

  await page.getByRole('button', { name: 'Nouveau rendez-vous' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Titre').fill('Dentiste')
  await dialog.getByLabel('Lieu').fill('Cabinet du centre')
  await dialog.getByLabel('Début').fill(localInput(start))
  await dialog.getByLabel('Fin').fill(localInput(end))
  await dialog.getByRole('combobox', { name: 'Rappel' }).click()
  await page.getByRole('option', { name: '5 minutes avant', exact: true }).click()
  await dialog.getByRole('button', { name: 'Enregistrer' }).click()

  // Permission Notification non accordée dans Playwright → repli sur un toast
  await expect(page.getByText('Rappel : Dentiste')).toBeVisible()
  // Le message indique le délai restant, l'heure et le lieu
  await expect(page.getByText(/dans 5 minutes · \d{2}:\d{2} · Cabinet du centre/)).toBeVisible()
})

test('affiche un toast même permission accordée quand l’onglet est au premier plan', async ({
  page,
}) => {
  // Permission accordée mais onglet visible : la notif OS serait supprimée → toast attendu
  await page.addInitScript(() => {
    const g = globalThis as unknown as { __notifs: number; Notification: unknown }
    g.__notifs = 0
    class Stub {
      static permission = 'granted'
      static requestPermission() {
        return Promise.resolve('granted')
      }
      constructor() {
        g.__notifs += 1
      }
    }
    g.Notification = Stub
  })
  // Recharge pour que le stub Notification s'applique (le beforeEach a déjà navigué)
  await page.reload()
  await expect(page).toHaveURL(/\/appointments$/)

  const start = new Date()
  start.setMinutes(start.getMinutes() + 5, 0, 0)
  const end = new Date(start)
  end.setHours(end.getHours() + 1)

  await page.getByRole('button', { name: 'Nouveau rendez-vous' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Titre').fill('Réunion')
  await dialog.getByLabel('Début').fill(localInput(start))
  await dialog.getByLabel('Fin').fill(localInput(end))
  await dialog.getByRole('combobox', { name: 'Rappel' }).click()
  await page.getByRole('option', { name: '5 minutes avant', exact: true }).click()
  await dialog.getByRole('button', { name: 'Enregistrer' }).click()

  await expect(page.getByText('Rappel : Réunion')).toBeVisible()
  // Aucune notif OS émise tant que l'onglet est visible
  expect(
    await page.evaluate(() => (globalThis as unknown as { __notifs: number }).__notifs),
  ).toBe(0)
})

test('ne rappelle pas un rendez-vous sans rappel configuré', async ({ page }) => {
  const start = new Date()
  start.setMinutes(start.getMinutes() + 5, 0, 0)
  const end = new Date(start)
  end.setHours(end.getHours() + 1)

  await page.getByRole('button', { name: 'Nouveau rendez-vous' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Titre').fill('Sans rappel')
  await dialog.getByLabel('Début').fill(localInput(start))
  await dialog.getByLabel('Fin').fill(localInput(end))
  await dialog.getByRole('button', { name: 'Enregistrer' }).click()
  await expect(page.getByText('Rendez-vous créé')).toBeVisible()

  await expect(page.getByText('Rappel : Sans rappel')).not.toBeVisible()
})
