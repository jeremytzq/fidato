import { createClient } from '@/lib/supabase/server'
import TransactionsClient from './TransactionsClient'

export const dynamic = 'force-dynamic'

export default async function TransactionsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: transactions } = await supabase
    .from('transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false })

  return <TransactionsClient initialTransactions={transactions || []} userId={user.id} />
}
