import { expect, test } from '@playwright/test'

import { createTask, registerUser, taskCard } from './helpers.ts'

test.beforeEach(async ({ page }) => {
  await registerUser(page)
})

test("affiche l'état vide sans tâche", async ({ page }) => {
  await expect(page.getByText('Aucune tâche pour le moment')).toBeVisible()
})

test('crée une tâche complète (description, priorité, tags)', async ({ page }) => {
  await page.getByRole('button', { name: 'Nouvelle tâche' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Titre').fill('Préparer la démo')
  await dialog.getByLabel('Description').fill('Slides + environnement de test')
  await dialog.getByRole('combobox', { name: 'Priorité' }).click()
  await page.getByRole('option', { name: 'Urgent' }).click()
  await dialog.getByLabel('Tags (séparés par des virgules)').fill('démo, client')
  await dialog.getByRole('button', { name: 'Enregistrer' }).click()

  await expect(page.getByText('Tâche créée')).toBeVisible()
  const card = taskCard(page, 'Préparer la démo')
  await expect(card).toBeVisible()
  await expect(card.getByText('Slides + environnement de test')).toBeVisible()
  await expect(card.getByText('Urgent')).toBeVisible()
  await expect(card.getByText('#démo')).toBeVisible()
  await expect(card.getByText('#client')).toBeVisible()
})

test('termine une tâche', async ({ page }) => {
  await createTask(page, 'À terminer')
  await taskCard(page, 'À terminer').getByRole('button', { name: 'Terminer' }).click()

  await expect(page.getByText('Tâche terminée')).toBeVisible()
  const card = taskCard(page, 'À terminer')
  await expect(card.getByText('Terminée')).toBeVisible()
  // Une tâche terminée ne propose plus l'action « Terminer »
  await expect(card.getByRole('button', { name: 'Terminer' })).toBeHidden()
})

test('modifie le titre d’une tâche', async ({ page }) => {
  await createTask(page, 'Titre initial')
  await taskCard(page, 'Titre initial').getByRole('button', { name: 'Modifier la tâche' }).click()

  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Titre').fill('Titre corrigé')
  await dialog.getByRole('button', { name: 'Enregistrer' }).click()

  await expect(page.getByText('Tâche mise à jour')).toBeVisible()
  await expect(taskCard(page, 'Titre corrigé')).toBeVisible()
  await expect(taskCard(page, 'Titre initial')).toBeHidden()
})

test('filtre par recherche textuelle', async ({ page }) => {
  await createTask(page, 'Acheter du pain')
  await createTask(page, 'Réviser Kubernetes')

  await page.getByPlaceholder('Rechercher…').fill('pain')
  await expect(taskCard(page, 'Acheter du pain')).toBeVisible()
  await expect(taskCard(page, 'Réviser Kubernetes')).toBeHidden()
})

test('filtre par statut', async ({ page }) => {
  await createTask(page, 'Tâche restante')
  await createTask(page, 'Tâche finie')
  await taskCard(page, 'Tâche finie').getByRole('button', { name: 'Terminer' }).click()
  await expect(taskCard(page, 'Tâche finie').getByText('Terminée')).toBeVisible()

  await page.getByRole('combobox', { name: 'Statut' }).click()
  await page.getByRole('option', { name: 'Terminée' }).click()

  await expect(taskCard(page, 'Tâche finie')).toBeVisible()
  await expect(taskCard(page, 'Tâche restante')).toBeHidden()
})

test('archive une tâche (disparaît de la liste par défaut)', async ({ page }) => {
  await createTask(page, 'À archiver')
  await taskCard(page, 'À archiver').getByRole('button', { name: 'Archiver' }).click()

  await expect(page.getByText('Tâche archivée')).toBeVisible()
  await expect(taskCard(page, 'À archiver')).toBeHidden()

  // Reste accessible via le filtre de statut « Archivée »
  await page.getByRole('combobox', { name: 'Statut' }).click()
  await page.getByRole('option', { name: 'Archivée' }).click()
  await expect(taskCard(page, 'À archiver')).toBeVisible()
})

test('supprime une tâche après confirmation', async ({ page }) => {
  await createTask(page, 'À supprimer')

  page.on('dialog', (dialog) => void dialog.accept())
  await taskCard(page, 'À supprimer').getByRole('button', { name: 'Supprimer' }).click()

  await expect(page.getByText('Tâche supprimée')).toBeVisible()
  await expect(page.getByText('Aucune tâche pour le moment')).toBeVisible()
})
