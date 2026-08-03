import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { page_id } = await request.json()
  if (!page_id) return new Response('Missing page_id', { status: 400 })

  const admin = createAdminClient()

  // Get the page token before deleting so we can unsubscribe
  const { data: conn } = await admin
    .from('meta_connections')
    .select('page_access_token')
    .eq('page_id', page_id)
    .eq('user_id', user.id)
    .single()

  if (conn?.page_access_token) {
    await fetch(
      `https://graph.facebook.com/v19.0/${page_id}/subscribed_apps?access_token=${conn.page_access_token}`,
      { method: 'DELETE' }
    )
  }

  await admin
    .from('meta_connections')
    .delete()
    .eq('page_id', page_id)
    .eq('user_id', user.id)

  return new Response('OK', { status: 200 })
}
