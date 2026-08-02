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
        if (!lead.reminder_at) continue
        const key = `${lead.id}:${lead.reminder_at}`
        if (fired.includes(key)) continue
        const remAt = new Date(lead.reminder_at)
        if (remAt <= now) {
          new Notification(`Reminder: ${lead.name}`, {
            body: `Time to follow up with ${lead.name}${lead.phone ? ` · ${lead.phone}` : ''}`,
            icon: '/favicon.ico',
            tag: lead.id,
          })
          fired.push(key)
        }
      }

      localStorage.setItem('fidato_fired_reminders', JSON.stringify(fired))
    }

    requestAndCheck()
    const interval = setInterval(checkReminders, 30_000)
    return () => clearInterval(interval)
  }, [leads])
}
