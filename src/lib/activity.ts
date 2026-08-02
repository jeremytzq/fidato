import { createClient } from '@/lib/supabase/client'

export async function logActivity(userId: string, leadId: string, action: string) {
  const supabase = createClient()
  await supabase.from('activity_log').insert({
    user_id: userId,
    lead_id: leadId,
    action,
    created_at: new Date().toISOString(),
  })
}
