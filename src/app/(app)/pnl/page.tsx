import { createClient } from '@/lib/supabase/server'
import PnLClient from './PnLClient'

export const dynamic = 'force-dynamic'

export default async function PnLPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: incomes }, { data: expenses }] = await Promise.all([
    supabase.from('income').select('*').eq('user_id', user.id).order('date', { ascending: false }),
    supabase.from('expenses').select('*').eq('user_id', user.id).order('date', { ascending: false }),
  ])

  return <PnLClient initialIncomes={incomes || []} initialExpenses={expenses || []} userId={user.id} />
}
