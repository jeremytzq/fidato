import { createHmac, timingSafeEqual } from 'crypto'

/** Verifies the `x-hub-signature-256` header Meta sends on webhook deliveries. */
export function verifyMetaSignature(rawBody: string, signatureHeader: string | null, appSecret: string | undefined): boolean {
  if (!signatureHeader || !appSecret) return false
  const sig = signatureHeader.replace('sha256=', '')
  const expected = createHmac('sha256', appSecret).update(rawBody).digest('hex')

  const sigBuf = Buffer.from(sig, 'hex')
  const expectedBuf = Buffer.from(expected, 'hex')
  if (sigBuf.length !== expectedBuf.length) return false
  return timingSafeEqual(sigBuf, expectedBuf)
}

export interface MetaLeadFields {
  name: string
  phone: string | null
  email: string | null
  notes: string | null
}

/** Maps Meta's field_data array (name/values pairs) into the shape a `leads` row needs. */
export function parseLeadFields(fieldData: Array<{ name: string; values?: string[] }>): MetaLeadFields {
  const fields: Record<string, string> = {}
  for (const f of fieldData ?? []) {
    fields[f.name] = f.values?.[0] ?? ''
  }

  const name =
    fields['full_name'] ||
    [fields['first_name'], fields['last_name']].filter(Boolean).join(' ') ||
    'Unknown'

  const phone = fields['phone_number'] || fields['phone'] || null
  const email = fields['email'] || null

  return { name, phone, email, notes: buildNotes(fields) }
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
