/** Helpers de calendrier en heure locale, semaine commençant le lundi. */

/** Clé locale "YYYY-MM-DD" d'une date (pas d'UTC : le calendrier est local). */
export function dayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** Les 42 jours (6 semaines) de la grille du mois, du lundi au dimanche. */
export function monthGridDays(year: number, month: number): Date[] {
  const first = new Date(year, month, 1)
  // getDay() : 0 = dimanche → décalage pour démarrer le lundi
  const offset = (first.getDay() + 6) % 7
  const start = new Date(year, month, 1 - offset)
  return Array.from({ length: 42 }, (_, i) => {
    const day = new Date(start)
    day.setDate(start.getDate() + i)
    return day
  })
}

/** Valeur pour <input type="datetime-local"> ("YYYY-MM-DDTHH:mm" en heure locale). */
export function toLocalInputValue(iso: string): string {
  const date = new Date(iso)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${dayKey(date)}T${hours}:${minutes}`
}
