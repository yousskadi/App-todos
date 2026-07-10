/** Helpers de calendrier en heure locale, semaine commençant le lundi. */

import type { Appointment } from '@/types/api'

const MINUTES_PER_DAY = 24 * 60

/** Clé locale "YYYY-MM-DD" d'une date (pas d'UTC : le calendrier est local). */
export function dayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** Minuit local du jour de `date`. */
export function startOfDay(date: Date): Date {
  const day = new Date(date)
  day.setHours(0, 0, 0, 0)
  return day
}

/** `date` décalée de `days` jours (l'heure locale est conservée malgré les changements d'heure). */
export function addDays(date: Date, days: number): Date {
  const shifted = new Date(date)
  shifted.setDate(shifted.getDate() + days)
  return shifted
}

/** Le lundi minuit de la semaine de `date`. */
export function startOfWeek(date: Date): Date {
  // getDay() : 0 = dimanche → décalage pour démarrer le lundi
  const offset = (date.getDay() + 6) % 7
  return addDays(startOfDay(date), -offset)
}

/** Les 7 jours de la semaine de `date`, du lundi au dimanche. */
export function weekDays(date: Date): Date[] {
  const monday = startOfWeek(date)
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
}

/** Le jour de `date` à `hour` heures pile. */
export function atHour(date: Date, hour: number): Date {
  const slot = startOfDay(date)
  slot.setHours(hour)
  return slot
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

/** Un rendez-vous placé dans la grille horaire d'un jour. */
export interface PositionedAppointment {
  appointment: Appointment
  /** Minutes écoulées depuis minuit. */
  startMinutes: number
  durationMinutes: number
  /** Colonne occupée parmi `columns`, pour les rendez-vous qui se chevauchent. */
  column: number
  columns: number
}

/**
 * Place les rendez-vous commençant ce jour-là dans une grille horaire.
 * Les rendez-vous qui se chevauchent sont répartis côte à côte : chaque groupe de
 * chevauchement transitif est découpé en colonnes, chacun prenant la première libre.
 */
export function layoutDay(appointments: Appointment[], day: Date): PositionedAppointment[] {
  const dayStart = startOfDay(day).getTime()
  const dayEnd = addDays(startOfDay(day), 1).getTime()

  const items = appointments
    .map((appointment) => ({
      appointment,
      start: new Date(appointment.start_at).getTime(),
      end: new Date(appointment.end_at).getTime(),
    }))
    // Comme la grille du mois, un rendez-vous n'apparaît que le jour où il commence
    .filter((item) => item.start >= dayStart && item.start < dayEnd)
    .sort((a, b) => a.start - b.start || b.end - a.end)

  const positioned: PositionedAppointment[] = []
  let group: typeof items = []
  let groupEnd = -Infinity

  const flushGroup = () => {
    const columnEnds: number[] = []
    const columns = group.map((item) => {
      const free = columnEnds.findIndex((end) => end <= item.start)
      const column = free === -1 ? columnEnds.length : free
      columnEnds[column] = item.end
      return column
    })
    group.forEach((item, index) => {
      const startMinutes = (item.start - dayStart) / 60000
      const duration = (Math.min(item.end, dayEnd) - item.start) / 60000
      positioned.push({
        appointment: item.appointment,
        startMinutes,
        // Une hauteur minimale pour rester lisible, sans déborder de la journée
        durationMinutes: Math.min(Math.max(duration, 20), MINUTES_PER_DAY - startMinutes),
        column: columns[index],
        columns: columnEnds.length,
      })
    })
    group = []
    groupEnd = -Infinity
  }

  for (const item of items) {
    if (group.length > 0 && item.start >= groupEnd) flushGroup()
    group.push(item)
    groupEnd = Math.max(groupEnd, item.end)
  }
  if (group.length > 0) flushGroup()

  return positioned
}

/** Valeur pour <input type="datetime-local"> ("YYYY-MM-DDTHH:mm" en heure locale). */
export function toLocalInputValue(iso: string): string {
  const date = new Date(iso)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${dayKey(date)}T${hours}:${minutes}`
}
