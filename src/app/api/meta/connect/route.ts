import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const appId = process.env.META_APP_ID
  const callbackUrl = process.env.META_CALLBACK_URL ?? `${process.env.NEXT_PUBLIC_APP_URL}/api/meta/callback`

  const params = new URLSearchParams({
    client_id: appId!,
    redirect_uri: callbackUrl,
    scope: 'leads_retrieval,pages_read_engagement,pages_show_list',
    state: user.id,
    response_type: 'code',
  })

  redirect(`https://www.facebook.com/v19.0/dialog/oauth?${params}`)
}
