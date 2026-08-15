import { createClient } from '@/lib/supabase/client'
import type { AutomationSettings } from '@/types'

const DEFAULTS: Omit<AutomationSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  auto_set_deal_value: false,
  default_deal_value: null,
  auto_set_due_date: false,
  due_date_days_offset: 7,
  auto_reminder: false,
  reminder_days_offset: 1,
  auto_create_activity: true,
  stage_notification: false,
  notify_stages: [],
}

export async function getAutomationSettings(userId: string): Promise<AutomationSettings> {
  const supabase = createClient()
  const { data } = await supabase.from('automation_settings').select('*').eq('user_id', userId).maybeSingle()
  if (data) return data as AutomationSettings
  return { id: '', user_id: userId, created_at: '', updated_at: '', ...DEFAULTS }
}

export async function upsertAutomationSettings(userId: string, patch: Partial<AutomationSettings>) {
  const supabase = createClient()
  const { error } = await supabase
    .from('automation_settings')
    .upsert({ user_id: userId, ...patch, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  return error
}

export function addDays(days: number): Date {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d
}

export function dateOnly(d: Date): string {
  return d.toISOString().slice(0, 10)
}
