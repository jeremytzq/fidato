'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, X, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'
import type { LeadStatus, LeadSource, LeadGrade, ClientType } from '@/types'
import { cn } from '@/utils/cn'

// ── Field config ──────────────────────────────────────────────────────────────

const FIELD_LABELS: Record<string, string> = {
  name: 'Full Name *',
  display_name: 'Display Name',
  phone: 'Mobile Number',
  whatsapp_number: 'WhatsApp Number',
  email: 'Email',
  status: 'Status',
  grade: 'Grade',
  client_type: 'Client Type',
  source: 'Source',
  property_type: 'Property Type',
  budget: 'Budget',
  project_interested: 'Project Interested',
  birthday: 'Birthday',
  property_address: 'Property Address',
  correspondence_address: 'Correspondence Address',
  notes: 'Notes',
  follow_up_date: 'Follow-up Date',
}

// Ordered: important fields first, extras below
const IMPORTANT = ['name', 'phone', 'email', 'status', 'grade', 'client_type', 'source', 'property_type', 'budget', 'notes']
const EXTRA = ['display_name', 'whatsapp_number', 'project_interested', 'birthday', 'property_address', 'correspondence_address', 'follow_up_date']

// Common column name aliases → field key
const ALIASES: Record<string, string> = {
  'name': 'name', 'full name': 'name', 'fullname': 'name', 'contact name': 'name', 'contact': 'name',
  'display name': 'display_name', 'displayname': 'display_name', 'nickname': 'display_name', 'preferred name': 'display_name',
  'email': 'email', 'email address': 'email', 'e-mail': 'email',
  'phone': 'phone', 'mobile': 'phone', 'mobile number': 'phone', 'phone number': 'phone',
  'tel': 'phone', 'contact number': 'phone', 'handphone': 'phone', 'hp': 'phone', 'hp number': 'phone',
  'whatsapp': 'whatsapp_number', 'whatsapp number': 'whatsapp_number', 'wa': 'whatsapp_number', 'wa number': 'whatsapp_number',
  'status': 'status', 'lead status': 'status',
  'grade': 'grade', 'lead grade': 'grade',
  'client type': 'client_type', 'clienttype': 'client_type', 'type': 'client_type', 'urgency': 'client_type',
  'source': 'source', 'lead source': 'source',
  'property type': 'property_type', 'propertytype': 'property_type', 'property': 'property_type', 'property interest': 'property_type',
  'budget': 'budget', 'price range': 'budget', 'max budget': 'budget',
  'project': 'project_interested', 'project interested': 'project_interested', 'interested in': 'project_interested',
  'birthday': 'birthday', 'dob': 'birthday', 'date of birth': 'birthday', 'birth date': 'birthday',
  'property address': 'property_address', 'property addr': 'property_address', 'address': 'property_address',
  'correspondence': 'correspondence_address', 'mailing address': 'correspondence_address', 'correspondence address': 'correspondence_address',
  'notes': 'notes', 'note': 'notes', 'remarks': 'notes', 'comments': 'notes',
  'follow up': 'follow_up_date', 'follow-up': 'follow_up_date', 'followup': 'follow_up_date', 'follow up date': 'follow_up_date',
}

const VALID_STATUSES: LeadStatus[] = ['New', 'Contacted', 'Qualified', 'Negotiating', 'Won', 'Lost']
const VALID_GRADES: LeadGrade[] = ['A', 'B', 'C']
const VALID_CLIENT_TYPES: ClientType[] = ['Hot', 'Warm', 'Cold']
const VALID_SOURCES: LeadSource[] = ['Cold Call', 'Doorknock', 'Flyers / Mailers', 'Google PPC', 'Meta Ads', 'Referral', 'Roadshow', 'Walk-in', 'Website', 'Other']

// ── CSV parser ────────────────────────────────────────────────────────────────

function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  for (const line of lines) {
    if (!line.trim()) continue
    const row: string[] = []
    let field = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { field += '"'; i++ }
        else inQuotes = !inQuotes
      } else if (ch === ',' && !inQuotes) {
        row.push(field.trim())
        field = ''
      } else {
        field += ch
      }
    }
    row.push(field.trim())
    rows.push(row)
  }
  return rows
}

function autoMap(headers: string[]): Record<string, string> {
  const used = new Set<string>()
  const result: Record<string, string> = {}
  headers.forEach((h, i) => {
    const key = ALIASES[h.toLowerCase().trim()]
    if (key && !used.has(key)) {
      result[key] = String(i)
      used.add(key)
    }
  })
  return result
}

// ── Row builder ───────────────────────────────────────────────────────────────

type MappingType = Record<string, string>

function buildLead(row: string[], mapping: MappingType) {
  const get = (key: string) => {
    const idx = mapping[key]
    if (idx === undefined || idx === '') return ''
    return (row[parseInt(idx)] ?? '').trim()
  }
  const statusRaw = get('status')
  const gradeRaw = get('grade').toUpperCase()
  const ctRaw = get('client_type')
  const srcRaw = get('source')

  return {
    name: get('name'),
    display_name: get('display_name') || null,
    email: get('email') || null,
    phone: get('phone') || null,
    whatsapp_number: get('whatsapp_number') || null,
    status: (VALID_STATUSES.find(s => s.toLowerCase() === statusRaw.toLowerCase()) ?? 'New') as LeadStatus,
    grade: (VALID_GRADES.find(g => g === gradeRaw) ?? null) as LeadGrade | null,
    client_type: (VALID_CLIENT_TYPES.find(t => t.toLowerCase() === ctRaw.toLowerCase()) ?? null) as ClientType | null,
    source: (VALID_SOURCES.find(s => s.toLowerCase() === srcRaw.toLowerCase()) ?? null) as LeadSource | null,
    property_type: get('property_type') || null,
    budget: get('budget') ? (parseInt(get('budget').replace(/[^0-9]/g, '')) || null) : null,
    project_interested: get('project_interested') || null,
    birthday: get('birthday') || null,
    property_address: get('property_address') || null,
    correspondence_address: get('correspondence_address') || null,
    notes: get('notes') || null,
    follow_up_date: get('follow_up_date') || null,
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

type Step = 'upload' | 'map' | 'preview' | 'done'

interface Props {
  userId: string
  onClose: () => void
  onImported: () => void
}

export function ImportLeadsModal({ userId, onClose, onImported }: Props) {
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<Step>('upload')
  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState('')
  const [headers, setHeaders] = useState<string[]>([])
  const [dataRows, setDataRows] = useState<string[][]>([])
  const [mapping, setMapping] = useState<MappingType>({})
  const [importing, setImporting] = useState(false)
  const [importedCount, setImportedCount] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const processFile = useCallback((file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please upload a .csv file')
      return
    }
    const reader = new FileReader()
    reader.onload = e => {
      const text = e.target?.result as string
      const parsed = parseCSV(text)
      if (parsed.length < 2) { setError('File must have a header row and at least one data row'); return }
      const [hdr, ...rows] = parsed
      setFileName(file.name)
      setHeaders(hdr)
      setDataRows(rows)
      setMapping(autoMap(hdr))
      setError(null)
      setStep('map')
    }
    reader.readAsText(file)
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files[0]; if (file) processFile(file)
  }, [processFile])

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (file) processFile(file)
  }

  const setField = (key: string, val: string) => setMapping(m => ({ ...m, [key]: val }))

  const validRows = dataRows.filter(row => {
    const idx = mapping.name
    if (!idx && idx !== '0') return false
    return (row[parseInt(idx)] ?? '').trim() !== ''
  })

  const handleImport = async () => {
    setImporting(true); setError(null)
    try {
      const now = new Date().toISOString()
      const payload = validRows.map(row => ({ ...buildLead(row, mapping), user_id: userId, created_at: now, updated_at: now }))
      for (let i = 0; i < payload.length; i += 100) {
        const { error: err } = await supabase.from('leads').insert(payload.slice(i, i + 100))
        if (err) throw err
      }
      setImportedCount(payload.length)
      setStep('done')
    } catch (e: any) {
      setError(e.message || 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  const stepIndex = ['upload', 'map', 'preview'].indexOf(step)

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm"
        onClick={e => { if (e.target === e.currentTarget) onClose() }}
      >
        <motion.div
          initial={{ opacity: 0, y: 48 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 48 }}
          transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="w-full max-w-xl bg-card border border-border border-b-0 sm:border-b rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90dvh] sm:max-h-[calc(100dvh-2rem)]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
            <div>
              <h2 className="text-base font-semibold text-foreground">Import Leads</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {step === 'upload' && 'Upload a CSV file to import leads'}
                {step === 'map' && `${fileName} · ${dataRows.length} rows`}
                {step === 'preview' && `${validRows.length} leads ready to import`}
                {step === 'done' && 'Import complete'}
              </p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <X size={16} />
            </button>
          </div>

          {/* Step indicator */}
          {step !== 'done' && (
            <div className="flex items-center gap-1.5 px-5 py-2.5 border-b border-border flex-shrink-0">
              {(['Upload', 'Map Columns', 'Preview'] as const).map((label, i) => {
                const done = i < stepIndex
                const active = i === stepIndex
                return (
                  <div key={label} className="flex items-center gap-1.5">
                    {i > 0 && <div className="w-5 h-px bg-border" />}
                    <div className={cn('flex items-center gap-1.5 text-[11px] font-medium', active ? 'text-primary' : done ? 'text-muted-foreground' : 'text-muted-foreground/40')}>
                      <div className={cn('w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold border', active ? 'bg-primary text-white border-primary' : done ? 'bg-muted border-border' : 'border-border/50')}>
                        {done ? '✓' : i + 1}
                      </div>
                      <span className="hidden sm:inline">{label}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Body */}
          <div className="flex-1 overflow-y-auto">

            {/* ── Step 1: Upload ── */}
            {step === 'upload' && (
              <div className="p-5 space-y-4">
                <div
                  onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={onDrop}
                  onClick={() => fileRef.current?.click()}
                  className={cn(
                    'border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors select-none',
                    dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-muted/40'
                  )}
                >
                  <Upload size={28} className={cn('mx-auto mb-3', dragOver ? 'text-primary' : 'text-muted-foreground')} />
                  <p className="text-sm font-medium text-foreground mb-1">Drop a CSV here</p>
                  <p className="text-xs text-muted-foreground">or click to browse your files</p>
                  <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={onFileInput} />
                </div>

                {error && (
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
                    <AlertCircle size={14} className="flex-shrink-0" /> {error}
                  </div>
                )}

                <div className="rounded-xl bg-muted/60 border border-border p-3.5 space-y-1.5">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">CSV Format</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>· First row must be column headers</li>
                    <li>· Common names (<span className="font-mono text-foreground">Name</span>, <span className="font-mono text-foreground">Phone</span>, <span className="font-mono text-foreground">Email</span>) are auto-mapped</li>
                    <li>· Only <span className="font-mono text-foreground">Name</span> is required — all others optional</li>
                    <li>· Valid status values: New, Contacted, Qualified, Negotiating, Won, Lost</li>
                  </ul>
                </div>
              </div>
            )}

            {/* ── Step 2: Map columns ── */}
            {step === 'map' && (
              <div className="p-5 space-y-4">
                <p className="text-xs text-muted-foreground">
                  Match your CSV columns to lead fields. Auto-mapped where column names matched.
                </p>

                <div className="space-y-1.5">
                  {[...IMPORTANT, ...EXTRA].map(fieldKey => (
                    <div key={fieldKey} className="flex items-center gap-3">
                      <label className={cn('text-xs w-36 flex-shrink-0', fieldKey === 'name' ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
                        {FIELD_LABELS[fieldKey]}
                      </label>
                      <select
                        value={mapping[fieldKey] ?? ''}
                        onChange={e => setField(fieldKey, e.target.value)}
                        className={cn(
                          'flex-1 h-8 rounded-lg border bg-background text-xs text-foreground px-2 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary cursor-pointer transition-colors',
                          mapping[fieldKey] ? 'border-primary/40 text-foreground' : 'border-border'
                        )}
                      >
                        <option value="">— skip —</option>
                        {headers.map((h, i) => (
                          <option key={i} value={String(i)}>{h || `Column ${i + 1}`}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>

                {(!mapping.name && mapping.name !== '0') && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
                    <AlertCircle size={13} className="flex-shrink-0" />
                    Map the <strong className="mx-0.5">Full Name</strong> field to continue
                  </div>
                )}
              </div>
            )}

            {/* ── Step 3: Preview ── */}
            {step === 'preview' && (
              <div className="p-5">
                <p className="text-xs text-muted-foreground mb-3">
                  Showing {Math.min(6, validRows.length)} of {validRows.length} leads.
                  {dataRows.length - validRows.length > 0 && ` ${dataRows.length - validRows.length} rows skipped (no name).`}
                </p>
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-xs">
                    <thead style={{ background: 'hsl(var(--muted))' }}>
                      <tr>
                        <th className="text-left px-3 py-2 font-semibold text-muted-foreground whitespace-nowrap">Name</th>
                        <th className="text-left px-3 py-2 font-semibold text-muted-foreground whitespace-nowrap">Phone</th>
                        <th className="text-left px-3 py-2 font-semibold text-muted-foreground hidden sm:table-cell whitespace-nowrap">Email</th>
                        <th className="text-left px-3 py-2 font-semibold text-muted-foreground whitespace-nowrap">Status</th>
                        <th className="text-left px-3 py-2 font-semibold text-muted-foreground hidden sm:table-cell whitespace-nowrap">Source</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {validRows.slice(0, 6).map((row, i) => {
                        const lead = buildLead(row, mapping)
                        return (
                          <tr key={i} className="hover:bg-muted/30 transition-colors">
                            <td className="px-3 py-2 font-medium text-foreground whitespace-nowrap">{lead.name}</td>
                            <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{lead.phone || '—'}</td>
                            <td className="px-3 py-2 text-muted-foreground hidden sm:table-cell max-w-[140px] truncate">{lead.email || '—'}</td>
                            <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{lead.status}</td>
                            <td className="px-3 py-2 text-muted-foreground hidden sm:table-cell whitespace-nowrap">{lead.source || '—'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                {validRows.length > 6 && (
                  <p className="text-xs text-muted-foreground mt-2 text-center">+ {validRows.length - 6} more rows</p>
                )}
                {error && (
                  <div className="mt-3 flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
                    <AlertCircle size={14} className="flex-shrink-0" /> {error}
                  </div>
                )}
              </div>
            )}

            {/* ── Step 4: Done ── */}
            {step === 'done' && (
              <div className="flex flex-col items-center justify-center py-14 px-5 gap-4">
                <div className="w-16 h-16 rounded-full bg-green-50 border-2 border-green-200 flex items-center justify-center">
                  <CheckCircle2 size={30} className="text-green-600" />
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-foreground">{importedCount} lead{importedCount !== 1 ? 's' : ''} imported</p>
                  <p className="text-sm text-muted-foreground mt-1">They've been added to your pipeline</p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-5 py-4 border-t border-border flex-shrink-0">
            {step === 'upload' && (
              <><div /><Button variant="secondary" onClick={onClose}>Cancel</Button></>
            )}
            {step === 'map' && (
              <>
                <Button variant="ghost" onClick={() => setStep('upload')}>Back</Button>
                <Button
                  onClick={() => setStep('preview')}
                  disabled={!mapping.name && mapping.name !== '0'}
                >
                  Preview · {validRows.length} leads
                </Button>
              </>
            )}
            {step === 'preview' && (
              <>
                <Button variant="ghost" onClick={() => setStep('map')}>Back</Button>
                <Button onClick={handleImport} loading={importing} disabled={validRows.length === 0}>
                  Import {validRows.length} Lead{validRows.length !== 1 ? 's' : ''}
                </Button>
              </>
            )}
            {step === 'done' && (
              <><div /><Button onClick={() => { onImported(); onClose() }}>Done</Button></>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
