import { createAdminClient } from '@/lib/supabase/admin'
import { verifyMetaSignature, parseLeadFields } from '@/lib/metaWebhook'

export const dynamic = 'force-dynamic'

// ── Webhook verification (GET) ────────────────────────────────────────────────
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 })
  }
  return new Response('Forbidden', { status: 403 })
}

// ── Incoming lead event (POST) ────────────────────────────────────────────────
export async function POST(request: Request) {
  const rawBody = await request.text()

  if (!verifyMetaSignature(rawBody, request.headers.get('x-hub-signature-256'), process.env.META_APP_SECRET)) {
    return new Response('Unauthorized', { status: 401 })
  }

  const body = JSON.parse(rawBody)

  const leads: Promise<void>[] = []
  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field === 'leadgen') {
        const pageId: string = change.value.page_id ?? entry.id
        leads.push(handleLead(change.value.leadgen_id, pageId))
      }
    }
  }
  await Promise.allSettled(leads)

  return new Response('OK', { status: 200 })
}

// ── Route lead to the right user via meta_connections ────────────────────────
async function handleLead(leadgenId: string, pageId: string) {
  const supabase = createAdminClient()

  const { data: conn } = await supabase
    .from('meta_connections')
    .select('user_id, page_access_token')
    .eq('page_id', pageId)
    .single()

  if (!conn) return

  const res = await fetch(
    `https://graph.facebook.com/v19.0/${leadgenId}?fields=field_data,created_time&access_token=${conn.page_access_token}`
  )
  if (!res.ok) return
  const data = await res.json()

  const { name, phone, email, notes } = parseLeadFields(data.field_data ?? [])

  // Meta redelivers the same leadgen_id on retries — dedupe on (user_id, meta_leadgen_id)
  // and keep the existing row rather than clobber status/notes the agent may have edited since.
  await supabase.from('leads').upsert({
    user_id: conn.user_id,
    meta_leadgen_id: leadgenId,
    name,
    phone,
    whatsapp_number: phone,
    email,
    status: 'New',
    source: 'Meta Ads',
    notes,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,meta_leadgen_id', ignoreDuplicates: true })
}
