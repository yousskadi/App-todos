import { useTranslation } from 'react-i18next'

export function TasksPage() {
  const { t } = useTranslation()
  // Contenu réel à l'étape 6 (liste, filtres, formulaires)
  return <h2 className="text-xl font-semibold">{t('tasks.title')}</h2>
}
