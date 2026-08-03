'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useReminders } from '@/lib/useReminders'
import type { Lead } from '@/types'

export function NotificationProvider({ userId }: { userId: string }) {
  const [leads, setLeads] = useState<Lead[]>([])

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('leads')
      .select('id, name, phone, reminder_at, birthday')
      .eq('user_id', userId)
      .then(({ data }) => setLeads((data as Lead[]) || []))
  }, [userId])

  useReminders(leads)
  return null
}
