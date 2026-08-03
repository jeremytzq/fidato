import { createHmac } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// ── Webhook verification (GET) ────────────────────────────────────────────────
// Meta calls this once when you register the webhook URL
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

  // Verify signature
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

  // Meta sends an array of entry objects; each entry can have multiple changes
  const leads: Promise<void>[] = []
  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field === 'leadgen') {
        leads.push(handleLead(change.value.leadgen_id))
      }
    }
  }
  await Promise.allSettled(leads)

  // Always return 200 quickly — Meta retries if it doesn't get 200
  return new Response('OK', { status: 200 })
}

// ── Fetch lead data from Meta Graph API and insert to Supabase ───────────────
async function handleLead(leadgenId: string) {
  const token = process.env.META_PAGE_ACCESS_TOKEN
  const userId = process.env.META_LEAD_USER_ID
  if (!token || !userId) return

  // Fetch the actual form field data
  const res = await fetch(
    `https://graph.facebook.com/v19.0/${leadgenId}?fields=field_data,created_time&access_token=${token}`
  )
  if (!res.ok) return
  const data = await res.json()

  // Map Meta field names → CRM fields
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

  const supabase = createAdminClient()
  await supabase.from('leads').insert({
    user_id: userId,
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

// Capture any extra custom question answers as notes
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
