import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const userId = searchParams.get('state')
  const error = searchParams.get('error')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://fidatolabs.vercel.app'

  if (error || !code || !userId) {
    return Response.redirect(`${appUrl}/settings?error=meta_denied`)
  }

  const appId = process.env.META_APP_ID!
  const appSecret = process.env.META_APP_SECRET!
  const callbackUrl = process.env.META_CALLBACK_URL ?? `${appUrl}/api/meta/callback`

  // Exchange code for short-lived token
  const tokenRes = await fetch(
    `https://graph.facebook.com/v19.0/oauth/access_token?` +
    new URLSearchParams({ client_id: appId, client_secret: appSecret, redirect_uri: callbackUrl, code })
  )
  if (!tokenRes.ok) return Response.redirect(`${appUrl}/settings?error=meta_token`)
  const { access_token: shortToken } = await tokenRes.json()

  // Extend to long-lived token
  const extendRes = await fetch(
    `https://graph.facebook.com/v19.0/oauth/access_token?` +
    new URLSearchParams({ grant_type: 'fb_exchange_token', client_id: appId, client_secret: appSecret, fb_exchange_token: shortToken })
  )
  if (!extendRes.ok) return Response.redirect(`${appUrl}/settings?error=meta_extend`)
  const { access_token: longToken } = await extendRes.json()

  // Get pages the user manages
  const pagesRes = await fetch(
    `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token&access_token=${longToken}`
  )
  if (!pagesRes.ok) return Response.redirect(`${appUrl}/settings?error=meta_pages`)
  const { data: pages } = await pagesRes.json()

  console.log('meta callback pages:', JSON.stringify(pages))
  if (!pages?.length) return Response.redirect(`${appUrl}/settings?error=meta_no_pages`)

  const supabase = createAdminClient()

  let saved = 0
  for (const page of pages) {
    if (!page.access_token) continue

    const { error: upsertError } = await supabase.from('meta_connections').upsert({
      user_id: userId,
      page_id: page.id,
      page_name: page.name,
      page_access_token: page.access_token,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'page_id' })

    if (upsertError) {
      console.error('meta_connections upsert error:', upsertError)
      continue
    }

    saved++

    // Subscribe page to webhook
    const subRes = await fetch(
      `https://graph.facebook.com/v19.0/${page.id}/subscribed_apps`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscribed_fields: ['leadgen'],
          access_token: page.access_token,
        }),
      }
    )
    if (!subRes.ok) {
      console.error('webhook subscribe error:', await subRes.text())
    }
  }

  if (saved === 0) return Response.redirect(`${appUrl}/settings?error=meta_save_failed`)

  return Response.redirect(`${appUrl}/settings?connected=true`)
}
