import { createClient } from '@/lib/supabase/server'
import TransactionsClient from './TransactionsClient'

export const dynamic = 'force-dynamic'

export default async function TransactionsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: transactions }, { data: clients }] = await Promise.all([
    supabase.from('transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('clients').select('id, name').eq('user_id', user.id),
  ])

  return <TransactionsClient initialTransactions={transactions || []} clients={clients || []} userId={user.id} />
}
