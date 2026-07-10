/** Préférences de rappel, mémorisées localement (aucun backend). */

const ENABLED_KEY = 'todos.remindersEnabled'
const DEFAULT_DELAY_KEY = 'todos.defaultReminderMinutes'

/** Délais proposés comme rappel par défaut (minutes ; null = aucun). */
export const DEFAULT_REMINDER_OPTIONS = [null, 5, 15, 30, 60, 1440] as const

/** Rappels actifs par défaut ; l'utilisateur peut couper via l'en-tête. */
export function getRemindersEnabled(): boolean {
  return localStorage.getItem(ENABLED_KEY) !== 'false'
}

export function setRemindersEnabled(enabled: boolean): void {
  localStorage.setItem(ENABLED_KEY, String(enabled))
}

/** Délai pré-rempli à la création d'un rendez-vous (null = aucun rappel). */
export function getDefaultReminderMinutes(): number | null {
  const raw = localStorage.getItem(DEFAULT_DELAY_KEY)
  if (raw === null) return null
  const minutes = Number(raw)
  return Number.isFinite(minutes) ? minutes : null
}

export function setDefaultReminderMinutes(minutes: number | null): void {
  if (minutes === null) localStorage.removeItem(DEFAULT_DELAY_KEY)
  else localStorage.setItem(DEFAULT_DELAY_KEY, String(minutes))
}
