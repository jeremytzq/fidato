import type { Lead, LeadStatus, LeadGrade, LeadSource, PropertyType } from '@/types'
import { createClient } from '@/lib/supabase/client'

const API = 'https://sheets.googleapis.com/v4/spreadsheets'

// ID is last so the sheet reads naturally; it's the anchor for 2-way sync
const HEADERS = [
  'Name', 'Phone', 'Email', 'Status', 'Grade',
  'Property Type', 'Budget (SGD)', 'Source',
  'Follow-up Date', 'Notes', 'Created', 'ID',
]

const VALID_STATUSES: LeadStatus[] = ['New', 'Contacted', 'Qualified', 'Negotiating', 'Won', 'Lost']
const VALID_GRADES: LeadGrade[] = ['A', 'B', 'C']
const VALID_SOURCES: LeadSource[] = ['Referral', 'Website', 'Social Media', 'Cold Call', 'Walk-in', 'Other']
const VALID_PROPERTY_TYPES: PropertyType[] = ['HDB', 'Condo', 'Landed', 'Commercial', 'Industrial', 'Other']

async function getProviderToken(): Promise<string> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.provider_token) {
    throw new Error('Google Sheets access not granted. Please sign out and sign back in.')
  }
  return session.provider_token
}

async function getStoredSheetId(): Promise<string | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.user_metadata?.leads_sheet_id ?? null
}

async function storeSheetId(sheetId: string): Promise<void> {
  const supabase = createClient()
  await supabase.auth.updateUser({ data: { leads_sheet_id: sheetId } })
}

async function createSheet(token: string): Promise<string> {
  const res = await fetch(API, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      properties: { title: 'Fidato — My Leads' },
      sheets: [{ properties: { title: 'Leads', sheetId: 0 } }],
    }),
  })
  if (res.status === 401) throw new Error('Google session expired. Sign out and sign back in.')
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || 'Failed to create Google Sheet.')
  }
  return (await res.json()).spreadsheetId
}

async function resolveSheetId(token: string): Promise<string> {
  let sheetId = await getStoredSheetId()
  if (sheetId) {
    const check = await fetch(`${API}/${sheetId}?fields=spreadsheetId`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!check.ok) sheetId = null
  }
  if (!sheetId) {
    sheetId = await createSheet(token)
    await storeSheetId(sheetId)
  }
  return sheetId
}

// ─── Push: Fidato → Sheets ────────────────────────────────────────────────────

export async function pushLeadsToGoogleSheets(leads: Lead[]): Promise<string> {
  const token = await getProviderToken()
  const sheetId = await resolveSheetId(token)

  const rows = leads.map(l => [
    l.name,
    l.phone ?? '',
    l.email ?? '',
    l.status,
    l.grade ?? '',
    l.property_type ?? '',
    l.budget != null ? l.budget : '',
    l.source ?? '',
    l.follow_up_date ?? '',
    l.notes ?? '',
    l.created_at.slice(0, 10),
    l.id,
  ])

  await fetch(`${API}/${sheetId}/values/Leads!A:L:clear`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })

  const writeRes = await fetch(
    `${API}/${sheetId}/values/Leads!A1?valueInputOption=RAW`,
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [HEADERS, ...rows] }),
    }
  )
  if (writeRes.status === 401) throw new Error('Google session expired. Sign out and sign back in.')
  if (!writeRes.ok) {
    const err = await writeRes.json().catch(() => ({}))
    throw new Error(err.error?.message || 'Failed to write to Google Sheets.')
  }

  // Bold + freeze header row
  await fetch(`${API}/${sheetId}:batchUpdate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: [
        {
          repeatCell: {
            range: { sheetId: 0, startRowIndex: 0, endRowIndex: 1 },
            cell: { userEnteredFormat: { textFormat: { bold: true } } },
            fields: 'userEnteredFormat.textFormat.bold',
          },
        },
        {
          updateSheetProperties: {
            properties: { sheetId: 0, gridProperties: { frozenRowCount: 1 } },
            fields: 'gridProperties.frozenRowCount',
          },
        },
      ],
    }),
  })

  return `https://docs.google.com/spreadsheets/d/${sheetId}/edit`
}

// ─── Pull: Sheets → Fidato ────────────────────────────────────────────────────

export async function pullLeadsFromGoogleSheets(userId: string): Promise<{ updated: number; created: number }> {
  const token = await getProviderToken()
  const sheetId = await getStoredSheetId()
  if (!sheetId) throw new Error('No sheet found. Push your leads to Google Sheets first.')

  const res = await fetch(`${API}/${sheetId}/values/Leads!A1:L`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (res.status === 401) throw new Error('Google session expired. Sign out and sign back in.')
  if (!res.ok) throw new Error('Failed to read Google Sheet.')

  const data = await res.json()
  const rows: string[][] = data.values ?? []
  if (rows.length <= 1) return { updated: 0, created: 0 }

  const supabase = createClient()
  const now = new Date().toISOString()
  let updated = 0, created = 0

  for (const row of rows.slice(1)) {
    const [name, phone, email, status, grade, property_type, budget, source, follow_up_date, notes, , id] = row
    if (!name?.trim()) continue

    const payload = {
      user_id: userId,
      name: name.trim(),
      phone: phone?.trim() || null,
      email: email?.trim() || null,
      status: (VALID_STATUSES.includes(status as LeadStatus) ? status : 'New') as LeadStatus,
      grade: (VALID_GRADES.includes(grade as LeadGrade) ? grade : null) as LeadGrade | null,
      property_type: (VALID_PROPERTY_TYPES.includes(property_type as PropertyType) ? property_type : null) as PropertyType | null,
      budget: budget ? parseInt(budget.replace(/[^0-9]/g, '')) || null : null,
      source: (VALID_SOURCES.includes(source as LeadSource) ? source : null) as LeadSource | null,
      follow_up_date: follow_up_date?.trim() || null,
      notes: notes?.trim() || null,
      updated_at: now,
    }

    if (id?.trim()) {
      const { error } = await supabase.from('leads').update(payload).eq('id', id.trim()).eq('user_id', userId)
      if (!error) updated++
    } else {
      const { error } = await supabase.from('leads').insert({ ...payload, created_at: now })
      if (!error) created++
    }
  }

  return { updated, created }
}
