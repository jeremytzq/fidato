import { createClient } from '@/lib/supabase/server'
import ContentHubClient from './ContentHubClient'

export const dynamic = 'force-dynamic'

export default async function ContentHubPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: templates }, { data: shareLinks }] = await Promise.all([
    supabase.from('message_templates').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('share_links').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
  ])

  return (
    <ContentHubClient
      initialTemplates={templates || []}
      initialShareLinks={shareLinks || []}
      userId={user.id}
      senderName={user.user_metadata?.full_name || user.email?.split('@')[0] || 'Jeremy'}
      senderEmail={user.email || ''}
    />
  )
}
