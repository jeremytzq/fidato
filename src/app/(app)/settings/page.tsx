import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import SettingsClient from '@/components/settings/SettingsClient'

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: { connected?: string; error?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const admin = createAdminClient()
  const { data: connections } = await admin
    .from('meta_connections')
    .select('page_id, page_name, updated_at')
    .eq('user_id', user!.id)
    .order('updated_at', { ascending: false })

  return (
    <SettingsClient
      connections={connections ?? []}
      connected={searchParams.connected === 'true'}
      error={searchParams.error ?? null}
    />
  )
}
