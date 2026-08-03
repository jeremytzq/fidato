import { createHmac } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'

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

  const sig = request.headers.get('x-hub-signature-256')?.replace('sha256=', '')
  if (!sig || !process.env.META_APP_SECRET) {
    return new Response('Unauthorized', { status: 401 })
  }
  const expected = createHmac('sha256', process.env.META_APP_SECRET)
    .update(rawBody)
    .digest('hex')
  if (sig !== expected) {
    return new Response('Invalid signature', { status: 401 })
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

  const fields: Record<string, string> = {}
  for (const f of data.field_data ?? []) {
    fields[f.name] = f.values?.[0] ?? ''
  }

  const name =
    fields['full_name'] ||
    [fields['first_name'], fields['last_name']].filter(Boolean).join(' ') ||
    'Unknown'

  const phone = fields['phone_number'] || fields['phone'] || null
  const email = fields['email'] || null

  await supabase.from('leads').insert({
    user_id: conn.user_id,
    name,
    phone,
    whatsapp_number: phone,
    email,
    status: 'New',
    source: 'Social Media',
    notes: buildNotes(fields),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })
}

function buildNotes(fields: Record<string, string>): string | null {
  const standard = new Set([
    'full_name', 'first_name', 'last_name',
    'phone_number', 'phone', 'email',
  ])
  const extras = Object.entries(fields)
    .filter(([k]) => !standard.has(k))
    .map(([k, v]) => `${k}: ${v}`)
  return extras.length > 0 ? `[Meta Ad] ${extras.join(' | ')}` : '[Meta Ad]'
}
