import { expect, test } from '@playwright/test'

import { createTask, registerUser, taskCard } from './helpers.ts'

/** "YYYY-MM-DDTHH:mm" local pour un input datetime-local. */
function localInput(date: Date, time: string): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}T${time}`
}

async function createTaskDue(page: import('@playwright/test').Page, title: string, due: string) {
  await page.getByRole('button', { name: 'Nouvelle tâche' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Titre').fill(title)
  await dialog.getByLabel('Date limite').fill(due)
  await dialog.getByRole('button', { name: 'Enregistrer' }).click()
  await expect(dialog).toBeHidden()
}

test('Ma journée montre les tâches dues, les retards et les prochains rendez-vous', async ({
  page,
}) => {
  await registerUser(page)

  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  await createTaskDue(page, 'Tâche du jour', localInput(today, '23:59'))
  await createTaskDue(page, 'Tâche en retard', localInput(yesterday, '09:00'))
  await createTask(page, 'Tâche sans échéance')

  await page.getByRole('link', { name: 'Rendez-vous' }).click()
  await page.getByRole('button', { name: 'Nouveau rendez-vous' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Titre').fill('RDV à venir')
  await dialog.getByLabel('Début').fill(localInput(tomorrow, '09:00'))
  await dialog.getByLabel('Fin').fill(localInput(tomorrow, '10:00'))
  await dialog.getByRole('button', { name: 'Enregistrer' }).click()
  await expect(dialog).toBeHidden()

  await page.getByRole('link', { name: 'Ma journée' }).click()
  await expect(page).toHaveURL(/\/today$/)
  await expect(page.getByText('Bonjour Youssef E2E')).toBeVisible()

  await expect(taskCard(page, 'Tâche du jour')).toBeVisible()
  await expect(taskCard(page, 'Tâche en retard')).toBeVisible()
  await expect(page.getByText('En retard', { exact: true })).toBeVisible()
  await expect(taskCard(page, 'Tâche sans échéance')).toBeHidden()
  await expect(page.getByText('RDV à venir')).toBeVisible()
})

test('terminer une tâche depuis Ma journée la retire de la liste du jour', async ({ page }) => {
  await registerUser(page)
  await createTaskDue(page, 'À terminer aujourd’hui', localInput(new Date(), '23:59'))

  await page.getByRole('link', { name: 'Ma journée' }).click()
  const card = taskCard(page, 'À terminer aujourd’hui')
  await expect(card).toBeVisible()
  await card.getByRole('button', { name: 'Terminer' }).click()

  await expect(card).toBeHidden()
  await expect(page.getByText("Rien à faire aujourd'hui", { exact: false })).toBeVisible()
})
