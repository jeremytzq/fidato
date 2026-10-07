import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SettingsClient from '@/components/settings/SettingsClient'

export const dynamic = 'force-dynamic'

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: { connected?: string; error?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: connections } = await supabase
    .from('meta_connections')
    .select('page_id, page_name, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const metaConfigured = Boolean(
    process.env.META_APP_ID && process.env.META_APP_SECRET
  )

  return (
    <SettingsClient
      userId={user.id}
      metaConnections={connections || []}
      metaConfigured={metaConfigured}
      connected={searchParams.connected === 'true'}
      error={searchParams.error ?? null}
    />
  )
}
