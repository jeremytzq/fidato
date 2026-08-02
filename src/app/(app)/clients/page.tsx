import { createClient } from '@/lib/supabase/server'
import ClientsClient from './ClientsClient'

export const dynamic = 'force-dynamic'

export default async function ClientsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return <ClientsClient initialClients={clients || []} userId={user.id} />
}
