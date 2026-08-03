'use client'

import { useEffect } from 'react'
import type { Lead } from '@/types'

export function useReminders(leads: Lead[]) {
  useEffect(() => {
    if (typeof Notification === 'undefined') return

    const requestAndCheck = async () => {
      if (Notification.permission === 'default') {
        await Notification.requestPermission()
      }
      checkReminders()
    }

    const checkReminders = () => {
      if (Notification.permission !== 'granted') return
      const now = new Date()
      const firedRaw = localStorage.getItem('fidato_fired_reminders')
      const fired: string[] = firedRaw ? JSON.parse(firedRaw) : []

      for (const lead of leads) {
        // Follow-up reminders
        if (lead.reminder_at) {
          const key = `${lead.id}:${lead.reminder_at}`
          if (!fired.includes(key) && new Date(lead.reminder_at) <= now) {
            new Notification(`Reminder: ${lead.name}`, {
              body: `Time to follow up with ${lead.name}${lead.phone ? ` · ${lead.phone}` : ''}`,
              icon: '/favicon.ico',
              tag: `reminder-${lead.id}`,
            })
            fired.push(key)
          }
        }

        // Birthday reminders — fire once per year on the matching day
        if (lead.birthday) {
          const [, month, day] = lead.birthday.split('-').map(Number)
          const todayMonth = now.getMonth() + 1
          const todayDay = now.getDate()
          const yearKey = `birthday:${lead.id}:${now.getFullYear()}`
          if (month === todayMonth && day === todayDay && !fired.includes(yearKey)) {
            new Notification(`🎂 ${lead.name}'s Birthday Today!`, {
              body: `Don't forget to wish ${lead.name} a happy birthday${lead.phone ? ` · ${lead.phone}` : ''}.`,
              icon: '/favicon.ico',
              tag: yearKey,
            })
            fired.push(yearKey)
          }
        }
      }

      localStorage.setItem('fidato_fired_reminders', JSON.stringify(fired))
    }

    requestAndCheck()
    const interval = setInterval(checkReminders, 30_000)
    return () => clearInterval(interval)
  }, [leads])
}
