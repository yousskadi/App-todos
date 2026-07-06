import { expect, type Page, test } from '@playwright/test'

import { registerUser } from './helpers.ts'

/** Clé locale "YYYY-MM-DD" identique à celle du composant calendrier. */
function dayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** Le 15 du mois courant : toujours affiché dans la grille, loin des bords. */
function midMonth(): Date {
  const date = new Date()
  date.setDate(15)
  return date
}

function dayCell(page: Page, date: Date) {
  return page.getByTestId(`calendar-day-${dayKey(date)}`)
}

/** Crée un rendez-vous en cliquant sur la case du jour. */
async function createAppointment(page: Page, title: string, day: Date): Promise<void> {
  await dayCell(page, day).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Titre').fill(title)
  await dialog.getByRole('button', { name: 'Enregistrer' }).click()
  await expect(dialog).toBeHidden()
}

test.beforeEach(async ({ page }) => {
  await registerUser(page)
  await page.getByRole('link', { name: 'Rendez-vous' }).click()
  await expect(page).toHaveURL(/\/appointments$/)
})

test('crée un rendez-vous depuis une case du calendrier', async ({ page }) => {
  const day = midMonth()
  await dayCell(page, day).click()

  const dialog = page.getByRole('dialog')
  // Créneau prérempli : 9h–10h le jour cliqué
  await expect(dialog.getByLabel('Début')).toHaveValue(`${dayKey(day)}T09:00`)
  await expect(dialog.getByLabel('Fin')).toHaveValue(`${dayKey(day)}T10:00`)

  await dialog.getByLabel('Titre').fill('Dentiste')
  await dialog.getByLabel('Lieu').fill('Cabinet du centre')
  await dialog.getByRole('combobox', { name: 'Rappel' }).click()
  await page.getByRole('option', { name: '30 minutes avant' }).click()
  await dialog.getByRole('button', { name: 'Enregistrer' }).click()

  await expect(page.getByText('Rendez-vous créé')).toBeVisible()
  const cell = dayCell(page, day)
  await expect(cell.getByText('Dentiste')).toBeVisible()
  await expect(cell.getByText('09:00')).toBeVisible()
})

test('rejette une fin antérieure au début', async ({ page }) => {
  const day = midMonth()
  await dayCell(page, day).click()

  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Titre').fill('Impossible')
  await dialog.getByLabel('Fin').fill(`${dayKey(day)}T08:00`)
  await dialog.getByRole('button', { name: 'Enregistrer' }).click()

  await expect(dialog.getByText('La fin doit être après le début')).toBeVisible()
  await expect(dialog).toBeVisible()
})

test('modifie un rendez-vous et conserve le rappel', async ({ page }) => {
  const day = midMonth()
  await dayCell(page, day).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Titre').fill('Titre initial')
  await dialog.getByRole('combobox', { name: 'Rappel' }).click()
  await page.getByRole('option', { name: '1 heure avant' }).click()
  await dialog.getByRole('button', { name: 'Enregistrer' }).click()
  await expect(dialog).toBeHidden()

  await dayCell(page, day).getByText('Titre initial').click()
  // Le formulaire réaffiche les valeurs enregistrées, dont le rappel
  await expect(dialog.getByRole('combobox', { name: 'Rappel' })).toHaveText('1 heure avant')
  await dialog.getByLabel('Titre').fill('Titre corrigé')
  await dialog.getByRole('button', { name: 'Enregistrer' }).click()

  await expect(page.getByText('Rendez-vous mis à jour')).toBeVisible()
  await expect(dayCell(page, day).getByText('Titre corrigé')).toBeVisible()
})

test('supprime un rendez-vous', async ({ page }) => {
  const day = midMonth()
  await createAppointment(page, 'À supprimer', day)

  await dayCell(page, day).getByText('À supprimer').click()
  await page.getByRole('dialog').getByRole('button', { name: 'Supprimer' }).click()

  await expect(page.getByText('Rendez-vous supprimé')).toBeVisible()
  await expect(dayCell(page, day).getByText('À supprimer')).toBeHidden()
})

test('navigue entre les mois', async ({ page }) => {
  const day = midMonth()
  await createAppointment(page, 'Ce mois-ci', day)

  const monthLabel = (await page.getByTestId('calendar-month').textContent()) ?? ''
  await page.getByRole('button', { name: 'Mois suivant' }).click()
  await expect(page.getByTestId('calendar-month')).not.toHaveText(monthLabel)
  await expect(page.getByText('Ce mois-ci')).toBeHidden()

  await page.getByRole('button', { name: "Aujourd'hui" }).click()
  await expect(page.getByTestId('calendar-month')).toHaveText(monthLabel)
  await expect(page.getByText('Ce mois-ci')).toBeVisible()
})
