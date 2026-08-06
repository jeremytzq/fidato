import type { Lead, LeadStatus, LeadGrade, LeadSource, PropertyType, ClientType, Client } from '@/types'
import { createClient } from '@/lib/supabase/client'

const API = 'https://sheets.googleapis.com/v4/spreadsheets'

// ID is last so the sheet reads naturally; it's the anchor for 2-way sync
const HEADERS = [
  'Name', 'Display Name', 'Mobile', 'WhatsApp', 'Email', 'Status', 'Grade', 'Client Type',
  'Property Type', 'Budget (SGD)', 'Source', 'Project Interested',
  'Birthday', 'Property Address', 'Correspondence Address',
  'Follow-up Date', 'Notes', 'Created', 'ID',
]

const VALID_STATUSES: LeadStatus[] = ['New', 'Contacted', 'Qualified', 'Negotiating', 'Won', 'Lost']
const VALID_GRADES: LeadGrade[] = ['A', 'B', 'C']
const VALID_CLIENT_TYPES: ClientType[] = ['Hot', 'Warm', 'Cold']
const VALID_SOURCES: LeadSource[] = ['Cold Call', 'Doorknock', 'Flyers / Mailers', 'Google PPC', 'Meta Ads', 'Referral', 'Roadshow', 'Walk-in', 'Website', 'Other']
const VALID_PROPERTY_TYPES: PropertyType[] = ['Commercial', 'Condo', 'EC', 'HDB', 'Industrial', 'Landed', 'Other']

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
      properties: { title: 'Fidato Labs — My Leads' },
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
    l.display_name ?? '',
    l.phone ?? '',
    l.whatsapp_number ?? '',
    l.email ?? '',
    l.status,
    l.grade ?? '',
    l.client_type ?? '',
    l.property_type ?? '',
    l.budget != null ? l.budget : '',
    l.source ?? '',
    l.project_interested ?? '',
    l.birthday ?? '',
    l.property_address ?? '',
    l.correspondence_address ?? '',
    l.follow_up_date ?? '',
    l.notes ?? '',
    l.created_at.slice(0, 10),
    l.id,
  ])

  await fetch(`${API}/${sheetId}/values/Leads!A:S:clear`, {
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

  const res = await fetch(`${API}/${sheetId}/values/Leads!A1:S`, {
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
    const [name, display_name, phone, whatsapp_number, email, status, grade, client_type, property_type, budget, source, project_interested, birthday, property_address, correspondence_address, follow_up_date, notes, , id] = row
    if (!name?.trim()) continue

    const payload = {
      user_id: userId,
      name: name.trim(),
      display_name: display_name?.trim() || null,
      phone: phone?.trim() || null,
      whatsapp_number: whatsapp_number?.trim() || null,
      email: email?.trim() || null,
      status: (VALID_STATUSES.includes(status as LeadStatus) ? status : 'New') as LeadStatus,
      grade: (VALID_GRADES.includes(grade as LeadGrade) ? grade : null) as LeadGrade | null,
      client_type: (VALID_CLIENT_TYPES.includes(client_type as ClientType) ? client_type : null) as ClientType | null,
      property_type: (VALID_PROPERTY_TYPES.includes(property_type as PropertyType) ? property_type : null) as PropertyType | null,
      budget: budget ? parseInt(budget.replace(/[^0-9]/g, '')) || null : null,
      source: (VALID_SOURCES.includes(source as LeadSource) ? source : null) as LeadSource | null,
      project_interested: project_interested?.trim() || null,
      birthday: birthday?.trim() || null,
      property_address: property_address?.trim() || null,
      correspondence_address: correspondence_address?.trim() || null,
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

// ─── Clients: Push & Pull ─────────────────────────────────────────────────────

const CLIENT_HEADERS = ['Name', 'Phone', 'Email', 'Property Type', 'Notes', 'Created', 'ID']

async function ensureClientsTab(token: string, spreadsheetId: string): Promise<number> {
  const res = await fetch(`${API}/${spreadsheetId}?fields=sheets.properties`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json()
  const sheets: any[] = data.sheets ?? []
  const existing = sheets.find((s: any) => s.properties.title === 'Clients')
  if (existing) return existing.properties.sheetId as number

  const addRes = await fetch(`${API}/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests: [{ addSheet: { properties: { title: 'Clients' } } }] }),
  })
  const addData = await addRes.json()
  return addData.replies[0].addSheet.properties.sheetId as number
}

export async function pushClientsToGoogleSheets(clients: Client[]): Promise<string> {
  const token = await getProviderToken()
  const sheetId = await resolveSheetId(token)
  const tabId = await ensureClientsTab(token, sheetId)

  const rows = clients.map(c => [
    c.name,
    c.phone ?? '',
    c.email ?? '',
    c.property_type ?? '',
    c.notes ?? '',
    c.created_at.slice(0, 10),
    c.id,
  ])

  await fetch(`${API}/${sheetId}/values/Clients!A:G:clear`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })

  const writeRes = await fetch(
    `${API}/${sheetId}/values/Clients!A1?valueInputOption=RAW`,
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [CLIENT_HEADERS, ...rows] }),
    }
  )
  if (writeRes.status === 401) throw new Error('Google session expired. Sign out and sign back in.')
  if (!writeRes.ok) {
    const err = await writeRes.json().catch(() => ({}))
    throw new Error(err.error?.message || 'Failed to write clients to Google Sheets.')
  }

  await fetch(`${API}/${sheetId}:batchUpdate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: [
        {
          repeatCell: {
            range: { sheetId: tabId, startRowIndex: 0, endRowIndex: 1 },
            cell: { userEnteredFormat: { textFormat: { bold: true } } },
            fields: 'userEnteredFormat.textFormat.bold',
          },
        },
        {
          updateSheetProperties: {
            properties: { sheetId: tabId, gridProperties: { frozenRowCount: 1 } },
            fields: 'gridProperties.frozenRowCount',
          },
        },
      ],
    }),
  })

  return `https://docs.google.com/spreadsheets/d/${sheetId}/edit`
}

// ─── Clear: wipe all data rows from Leads + Clients tabs ─────────────────────

export async function clearGoogleSheets(): Promise<void> {
  let token: string
  try { token = await getProviderToken() } catch { return } // not connected — skip silently

  const sheetId = await getStoredSheetId()
  if (!sheetId) return // no sheet created yet — nothing to clear

  // Clear data rows only (keep header row 1)
  await Promise.allSettled([
    fetch(`${API}/${sheetId}/values/Leads!A2:S:clear`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }),
    fetch(`${API}/${sheetId}/values/Clients!A2:G:clear`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }),
  ])
}

export async function pullClientsFromGoogleSheets(userId: string): Promise<{ updated: number; created: number }> {
  const token = await getProviderToken()
  const sheetId = await getStoredSheetId()
  if (!sheetId) throw new Error('No sheet found. Sync leads to Google Sheets first.')

  const res = await fetch(`${API}/${sheetId}/values/Clients!A1:G`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (res.status === 401) throw new Error('Google session expired. Sign out and sign back in.')
  if (!res.ok) return { updated: 0, created: 0 } // Clients tab doesn't exist yet — push will create it

  const data = await res.json()
  const rows: string[][] = data.values ?? []
  if (rows.length <= 1) return { updated: 0, created: 0 }

  const supabase = createClient()
  const now = new Date().toISOString()
  let updated = 0, created = 0

  for (const row of rows.slice(1)) {
    const [name, phone, email, property_type, notes, , id] = row
    if (!name?.trim()) continue

    const payload = {
      user_id: userId,
      name: name.trim(),
      phone: phone?.trim() || null,
      email: email?.trim() || null,
      property_type: (VALID_PROPERTY_TYPES.includes(property_type as PropertyType) ? property_type : null) as PropertyType | null,
      notes: notes?.trim() || null,
      updated_at: now,
    }

    if (id?.trim()) {
      const { error } = await supabase.from('clients').update(payload).eq('id', id.trim()).eq('user_id', userId)
      if (!error) updated++
    } else {
      const { error } = await supabase.from('clients').insert({ ...payload, created_at: now })
      if (!error) created++
    }
  }

  return { updated, created }
}
