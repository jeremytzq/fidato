import { createClient } from '@/lib/supabase/server'
import LeadsClient from './LeadsClient'

export const dynamic = 'force-dynamic'

export default async function LeadsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: leads } = await supabase
    .from('leads')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return <LeadsClient initialLeads={leads || []} userId={user.id} />
}
