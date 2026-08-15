import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'

const DEFAULTS: Omit<Profile, 'user_id' | 'created_at' | 'updated_at'> = {
  display_name: 'Jeremy Tan',
  agency_name: 'PropNex Realty',
  cea_reg_no: null,
  whatsapp_number: '6590039987',
}

export async function getProfile(userId: string): Promise<Profile> {
  const supabase = createClient()
  const { data } = await supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle()
  if (data) return data as Profile
  return { user_id: userId, created_at: '', updated_at: '', ...DEFAULTS }
}

export async function upsertProfile(userId: string, patch: Partial<Profile>) {
  const supabase = createClient()
  const { error } = await supabase
    .from('profiles')
    .upsert({ user_id: userId, ...patch, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  return error
}
