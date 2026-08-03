import type { Lead } from '@/types'
import { createClient } from '@/lib/supabase/client'

const API = 'https://sheets.googleapis.com/v4/spreadsheets'

const HEADERS = [
  'Name', 'Phone', 'Email', 'Status', 'Grade',
  'Property Type', 'Budget (SGD)', 'Source',
  'Follow-up Date', 'Notes', 'Created',
]

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

export async function syncLeadsToGoogleSheets(leads: Lead[]): Promise<string> {
  const token = await getProviderToken()

  // Find or create the sheet
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

  // Build rows
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
  ])

  // Clear existing content
  await fetch(`${API}/${sheetId}/values/Leads!A:K:clear`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })

  // Write data
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

  // Bold headers + freeze first row
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
