import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { toast } from 'sonner'

import { useAppointments } from '@/features/appointments/api'
import type { Appointment } from '@/types/api'

/** Cadence de vérification : suffisant pour un rappel « N minutes avant ». */
const TICK_MS = 30_000
/** Fenêtre de rattrapage : un rappel n'est notifié que s'il vient d'échoir. */
const LEEWAY_MS = 3 * 60_000
/** Horizon des rendez-vous chargés pour surveiller les rappels (couvre « 1 jour avant »). */
const WINDOW_DAYS = 8
const STORAGE_KEY = 'todos.remindersNotified'
/** Plafond du journal des rappels notifiés, pour ne pas gonfler indéfiniment. */
const MAX_STORED = 500

/**
 * Jeton de déduplication opaque d'un rappel (hash FNV-1a de l'id + de l'heure de début).
 * On stocke ce hash plutôt que les données du rendez-vous : rien d'exploitable ne
 * persiste, et il change si l'heure du rendez-vous bouge, ce qui ré-arme le rappel.
 */
function reminderToken(id: string, startAt: string): string {
  const input = `${id}@${startAt}`
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16)
}

function loadNotified(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return new Set(raw ? (JSON.parse(raw) as string[]) : [])
  } catch {
    return new Set()
  }
}

function saveNotified(tokens: Set<string>): void {
  const trimmed = Array.from(tokens).slice(-MAX_STORED)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
}

/** « dans 5 minutes » / « dans 1 heure » / « dans 1 jour » selon le délai du rappel. */
function humanDelay(t: TFunction, minutes: number): string {
  if (minutes % 1440 === 0) return t('reminders.inDays', { count: minutes / 1440 })
  if (minutes % 60 === 0) return t('reminders.inHours', { count: minutes / 60 })
  return t('reminders.inMinutes', { count: minutes })
}

function notify(t: TFunction, appointment: Appointment): void {
  const time = new Date(appointment.start_at).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })
  const title = t('reminders.title', { title: appointment.title })
  // Ex. « dans 5 minutes · 14:37 · Cabinet du centre »
  const minutes = appointment.reminder_minutes_before
  const parts = [time]
  if (minutes != null) parts.unshift(humanDelay(t, minutes))
  if (appointment.location) parts.push(appointment.location)
  const body = parts.join(' · ')

  // Onglet en arrière-plan et permission accordée : notification OS pour alerter
  // hors de l'app. Sinon (onglet au premier plan, ou permission absente) : toast —
  // une notif OS est souvent supprimée quand l'onglet a le focus.
  const canNotify = typeof Notification !== 'undefined' && Notification.permission === 'granted'
  if (canNotify && document.visibilityState === 'hidden') {
    new Notification(title, { body })
  } else {
    // Un rappel ne doit pas s'effacer tout seul : il reste jusqu'à fermeture manuelle
    toast(title, { description: body, duration: Infinity, closeButton: true })
  }
}

/**
 * Surveille les rendez-vous à venir et déclenche leur rappel à l'heure dite.
 * Notification navigateur si l'utilisateur l'a autorisée, sinon repli sur un toast.
 * Chaque rappel n'est joué qu'une fois (journal en localStorage) ; ceux déjà
 * échus avant le chargement au-delà de la fenêtre de rattrapage sont ignorés.
 * `enabled` à false met le moteur en veille (l'utilisateur a coupé les rappels).
 */
export function useReminders(enabled: boolean): void {
  const { t } = useTranslation()
  // Figé au montage : un `new Date()` recalculé à chaque rendu ferait boucler la requête
  const [range] = useState(() => {
    const from = new Date()
    const to = new Date(from.getTime() + WINDOW_DAYS * 24 * 60 * 60 * 1000)
    return { from: from.toISOString(), to: to.toISOString() }
  })
  const { data } = useAppointments(range)
  const appointments = data?.items

  useEffect(() => {
    if (!enabled || !appointments) return

    const check = () => {
      const now = Date.now()
      const notified = loadNotified()
      let changed = false
      for (const appointment of appointments) {
        if (appointment.reminder_minutes_before == null) continue
        const remindAt =
          new Date(appointment.start_at).getTime() - appointment.reminder_minutes_before * 60_000
        // Seulement les rappels qui viennent d'échoir : ni à venir, ni trop anciens
        if (remindAt > now || remindAt <= now - LEEWAY_MS) continue
        const token = reminderToken(appointment.id, appointment.start_at)
        if (notified.has(token)) continue
        notify(t, appointment)
        notified.add(token)
        changed = true
      }
      if (changed) saveNotified(notified)
    }

    check()
    const timer = setInterval(check, TICK_MS)
    return () => clearInterval(timer)
  }, [enabled, appointments, t])
}
