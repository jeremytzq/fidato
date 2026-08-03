import { createClient } from '@/lib/supabase/server'
import DatabaseClient from './DatabaseClient'

export const dynamic = 'force-dynamic'

export default async function DatabasePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: leads }, { data: clients }, { data: transactions }] = await Promise.all([
    supabase.from('leads').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('clients').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
  ])

  return <DatabaseClient leads={leads || []} clients={clients || []} transactions={transactions || []} userId={user.id} />
}
