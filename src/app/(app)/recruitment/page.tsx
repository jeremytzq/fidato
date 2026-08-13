import { createClient } from '@/lib/supabase/server'
import RecruitmentClient from './RecruitmentClient'

export const dynamic = 'force-dynamic'

export default async function RecruitmentPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: recruits } = await supabase
    .from('recruitment_leads')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return <RecruitmentClient initialRecruits={recruits || []} userId={user.id} />
}
