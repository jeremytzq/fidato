'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input, Select } from '@/components/ui/Input'
import { NumberInput } from '@/components/ui/NumberInput'
import { Button } from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'
import { Phone, MessageCircle, Mail, Pencil, Building2, Banknote, MapPin, Zap, Calendar, Cake, Home, Tag } from 'lucide-react'
import type { Lead, LeadStatus, LeadSource, PropertyType, LeadGrade, ClientType, ActivityLog } from '@/types'
import { cn } from '@/utils/cn'
import { toTitleCase, formatCurrency } from '@/utils/format'
import { scheduleCadence } from '@/lib/cadence'
import { FollowUpCadence } from './FollowUpCadence'

const STATUSES: LeadStatus[] = ['New', 'Contacted', 'Qualified', 'Negotiating', 'Won', 'Lost']
const SOURCES: LeadSource[] = ['Cold Call', 'Doorknock', 'Flyers / Mailers', 'Google PPC', 'Meta Ads', 'Referral', 'Roadshow', 'Walk-in', 'Website', 'Other']
const PROPERTY_TYPES: PropertyType[] = ['Commercial', 'Condo', 'EC', 'HDB', 'Industrial', 'Landed', 'Other']

const STATUS_CONFIG: Record<LeadStatus, { bg: string; text: string; border: string }> = {
  New:         { bg: 'bg-slate-100',  text: 'text-slate-600',  border: 'border-slate-200' },
  Contacted:   { bg: 'bg-blue-50',    text: 'text-blue-600',   border: 'border-blue-200' },
  Qualified:   { bg: 'bg-amber-50',   text: 'text-amber-600',  border: 'border-amber-200' },
  Negotiating: { bg: 'bg-purple-50',  text: 'text-purple-600', border: 'border-purple-200' },
  Won:         { bg: 'bg-green-50',   text: 'text-green-600',  border: 'border-green-200' },
  Lost:        { bg: 'bg-red-50',     text: 'text-red-500',    border: 'border-red-200' },
}

const CLIENT_TYPE_OPTIONS: { value: ClientType; emoji: string; style: string; active: string }[] = [
  { value: 'Hot',  emoji: '🔥', style: 'border-border text-muted-foreground hover:border-red-300',    active: 'bg-red-50 border-red-400 text-red-600' },
  { value: 'Warm', emoji: '☀️', style: 'border-border text-muted-foreground hover:border-amber-300', active: 'bg-amber-50 border-amber-400 text-amber-600' },
  { value: 'Cold', emoji: '🧊', style: 'border-border text-muted-foreground hover:border-blue-300',  active: 'bg-blue-50 border-blue-400 text-blue-600' },
]

const GRADE_OPTIONS: { value: LeadGrade; label: string; desc: string; style: string; active: string }[] = [
  { value: 'A', label: 'A', desc: 'Urgent & Motivated',      style: 'border-border text-muted-foreground hover:border-red-300',    active: 'bg-red-50 border-red-400 text-red-600' },
  { value: 'B', label: 'B', desc: 'Not Urgent, Motivated',   style: 'border-border text-muted-foreground hover:border-amber-300', active: 'bg-amber-50 border-amber-400 text-amber-600' },
  { value: 'C', label: 'C', desc: 'Not Urgent or Motivated', style: 'border-border text-muted-foreground hover:border-blue-300',  active: 'bg-blue-50 border-blue-400 text-blue-600' },
]

const AVATAR_COLORS = ['#5B6CF8', '#E88C30', '#4CAF7D', '#E05C5C', '#8A6FA8', '#6786A1', '#364863']
function avatarBg(name: string) {
  return AVATAR_COLORS[name ? name.charCodeAt(0) % AVATAR_COLORS.length : 0]
}

function fmtActivityTime(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function fmtDate(dateStr: string | null) {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })
}

interface LeadModalProps {
  open: boolean
  onClose: () => void
  lead?: Lead | null
  defaultStatus?: LeadStatus
  userId: string
  onSaved: () => void
}

export function LeadModal({ open, onClose, lead, defaultStatus = 'New', userId, onSaved }: LeadModalProps) {
  const supabase = createClient()
  const [mode, setMode] = useState<'view' | 'edit'>('view')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [activities, setActivities] = useState<ActivityLog[]>([])

  const [form, setForm] = useState({
    name: '', display_name: '', email: '', phone: '', whatsapp_number: '',
    status: defaultStatus, source: '' as LeadSource | '',
    property_type: '' as PropertyType | '', budget: '',
    client_type: '' as ClientType | '',
    project_interested: '', birthday: '',
    property_address: '', correspondence_address: '',
    notes: '', follow_up_date: '',
    grade: '' as LeadGrade | '', reminder_at: '',
  })

  useEffect(() => {
    setSaveError(null)
    setConfirmDelete(false)
    setMode(lead ? 'view' : 'edit')
    if (lead) {
      setForm({
        name: lead.name,
        display_name: lead.display_name || '',
        email: lead.email || '',
        phone: lead.phone || '',
        whatsapp_number: lead.whatsapp_number || '',
        status: lead.status,
        source: lead.source || '',
        property_type: lead.property_type || '',
        budget: lead.budget ? String(lead.budget) : '',
        client_type: lead.client_type || '',
        project_interested: lead.project_interested || '',
        birthday: lead.birthday || '',
        property_address: lead.property_address || '',
        correspondence_address: lead.correspondence_address || '',
        notes: lead.notes || '',
        follow_up_date: lead.follow_up_date || '',
        grade: lead.grade || '',
        reminder_at: lead.reminder_at ? lead.reminder_at.slice(0, 16) : '',
      })
    } else {
      setForm({ name: '', display_name: '', email: '', phone: '', whatsapp_number: '', status: defaultStatus, source: '', property_type: '', budget: '', client_type: '', project_interested: '', birthday: '', property_address: '', correspondence_address: '', notes: '', follow_up_date: '', grade: '', reminder_at: '' })
    }
  }, [lead, defaultStatus, open])

  useEffect(() => {
    if (!lead?.id) { setActivities([]); return }
    supabase
      .from('activity_log')
      .select('*')
      .eq('lead_id', lead.id)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => setActivities((data as ActivityLog[]) || []))
  }, [lead?.id, open]) // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const toggleGrade = (g: LeadGrade) => setForm(f => ({ ...f, grade: f.grade === g ? '' : g }))
  const toggleClientType = (t: ClientType) => setForm(f => ({ ...f, client_type: f.client_type === t ? '' : t }))

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    setSaveError(null)
    const payload = {
      user_id: userId,
      name: form.name.trim(),
      display_name: form.display_name.trim() || null,
      email: form.email || null,
      phone: form.phone || null,
      whatsapp_number: form.whatsapp_number || null,
      status: form.status,
      source: (form.source as LeadSource) || null,
      property_type: (form.property_type as PropertyType) || null,
      budget: form.budget ? parseInt(form.budget) : null,
      client_type: (form.client_type as ClientType) || null,
      project_interested: form.project_interested || null,
      birthday: form.birthday || null,
      property_address: form.property_address || null,
      correspondence_address: form.correspondence_address || null,
      notes: form.notes || null,
      follow_up_date: form.follow_up_date || null,
      grade: (form.grade as LeadGrade) || null,
      reminder_at: form.reminder_at ? new Date(form.reminder_at).toISOString() : null,
      updated_at: new Date().toISOString(),
    }
    if (lead) {
      const { error } = await supabase.from('leads').update(payload).eq('id', lead.id)
      setSaving(false)
      if (error) { setSaveError(error.message); return }
      setMode('view')
    } else {
      const { data: newLead, error } = await supabase
        .from('leads')
        .insert({ ...payload, created_at: new Date().toISOString() })
        .select()
        .single()
      setSaving(false)
      if (error) { setSaveError(error.message); return }
      if (newLead && form.client_type === 'Cold') {
        await scheduleCadence(supabase, userId, newLead.id)
      }
      onSaved()
      onClose()
    }
    onSaved()
  }

  const handleDelete = async () => {
    if (!lead) return
    setDeleting(true)
    await supabase.from('leads').delete().eq('id', lead.id)
    setDeleting(false)
    onSaved()
    onClose()
  }

  const modalTitle = mode === 'view' && lead
    ? (lead.display_name || lead.name)
    : (lead ? 'Edit Lead' : 'Add Lead')

  // ── View mode ──────────────────────────────────────────
  if (mode === 'view' && lead) {
    const displayName = toTitleCase(lead.display_name || lead.name)
    const initial = displayName.charAt(0).toUpperCase()
    const statusCfg = STATUS_CONFIG[lead.status]
    const clientTypeCfg = CLIENT_TYPE_OPTIONS.find(o => o.value === lead.client_type)
    const gradeOpt = GRADE_OPTIONS.find(g => g.value === lead.grade)
    const waNum = (lead.whatsapp_number || lead.phone)?.replace(/\D/g, '')
    const allActivities = [...activities, { id: 'added', action: 'Lead added', created_at: lead.created_at }]

    const fields = [
      { label: 'Mobile',          value: lead.phone,                                          icon: <Phone size={14} /> },
      { label: 'WhatsApp',        value: lead.whatsapp_number || lead.phone,                  icon: <MessageCircle size={14} /> },
      { label: 'Email',           value: lead.email,                                          icon: <Mail size={14} /> },
      { label: 'Property Type',   value: lead.property_type,                                  icon: <Building2 size={14} /> },
      { label: 'Budget',          value: lead.budget ? formatCurrency(lead.budget) : null,         icon: <Banknote size={14} /> },
      { label: 'Project',         value: lead.project_interested,                             icon: <MapPin size={14} /> },
      { label: 'Source',          value: lead.source,                                         icon: <Zap size={14} /> },
      { label: 'Follow-up',       value: fmtDate(lead.follow_up_date),                        icon: <Calendar size={14} /> },
      { label: 'Birthday',        value: fmtDate(lead.birthday),                              icon: <Cake size={14} /> },
      { label: 'Property Addr.',  value: lead.property_address,                               icon: <Home size={14} /> },
      { label: 'Correspondence',  value: lead.correspondence_address,                         icon: <Tag size={14} /> },
    ].filter(f => f.value)

    return (
      <Modal open={open} onClose={onClose} title={modalTitle} size="md">
        <div className="-mx-6 -my-5">

          {/* Profile header */}
          <div className="px-6 pt-6 pb-5 text-center border-b border-border bg-card/50">
            <div
              className="w-18 h-18 rounded-full flex items-center justify-center text-2xl font-bold text-white mx-auto mb-3 ring-4 ring-background shadow-sm"
              style={{ background: avatarBg(lead.name), width: 72, height: 72 }}
            >
              {initial}
            </div>
            <div className="text-xl font-bold text-foreground tracking-tight">{displayName}</div>
            {lead.display_name && lead.display_name !== lead.name && (
              <div className="text-sm text-muted-foreground mt-0.5">{toTitleCase(lead.name)}</div>
            )}

            {/* Status pills inline under name */}
            <div className="flex items-center justify-center gap-1.5 mt-2 flex-wrap">
              {clientTypeCfg && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-card border border-border text-foreground">
                  {clientTypeCfg.emoji} {lead.client_type}
                </span>
              )}
              {gradeOpt && (
                <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border', gradeOpt.active)}>
                  Grade {gradeOpt.label}
                </span>
              )}
              <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border', statusCfg.bg, statusCfg.text, statusCfg.border)}>
                {lead.status}
              </span>
            </div>

            {/* Action buttons */}
            <div className="flex justify-center gap-5 mt-5">
              {lead.phone && (
                <a href={`tel:${lead.phone}`} className="flex flex-col items-center gap-1.5 group">
                  <div className="w-12 h-12 rounded-2xl bg-green-50 border border-green-200 flex items-center justify-center text-green-600 group-hover:bg-green-100 group-hover:scale-105 transition-all shadow-sm">
                    <Phone size={18} />
                  </div>
                  <span className="text-[11px] text-muted-foreground font-medium">Call</span>
                </a>
              )}
              {waNum && (
                <a href={`https://wa.me/65${waNum}`} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1.5 group">
                  <div className="w-12 h-12 rounded-2xl bg-green-50 border border-green-200 flex items-center justify-center text-green-600 group-hover:bg-green-100 group-hover:scale-105 transition-all shadow-sm">
                    <MessageCircle size={18} />
                  </div>
                  <span className="text-[11px] text-muted-foreground font-medium">WhatsApp</span>
                </a>
              )}
              {lead.email && (
                <a href={`mailto:${lead.email}`} className="flex flex-col items-center gap-1.5 group">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-500 group-hover:bg-blue-100 group-hover:scale-105 transition-all shadow-sm">
                    <Mail size={18} />
                  </div>
                  <span className="text-[11px] text-muted-foreground font-medium">Email</span>
                </a>
              )}
              <button onClick={() => setMode('edit')} className="flex flex-col items-center gap-1.5 group">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:bg-primary/20 group-hover:scale-105 transition-all shadow-sm">
                  <Pencil size={16} />
                </div>
                <span className="text-[11px] text-muted-foreground font-medium">Edit</span>
              </button>
            </div>
          </div>

          <div className="px-6 py-5 space-y-5">

            {/* Contact & detail fields */}
            {fields.length > 0 && (
              <div className="border border-border rounded-2xl overflow-hidden divide-y divide-border">
                {fields.map(f => (
                  <div key={f.label} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                    <div className="text-muted-foreground flex-shrink-0 w-5 flex justify-center">
                      {f.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider leading-none mb-0.5">{f.label}</div>
                      <div className="text-sm font-medium text-foreground truncate">{f.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Notes */}
            {lead.notes && (
              <div>
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Notes</div>
                <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap bg-muted/40 border border-border rounded-2xl px-4 py-3">{lead.notes}</div>
              </div>
            )}

            {/* Cold lead cadence */}
            {lead.client_type === 'Cold' && <FollowUpCadence lead={lead} userId={lead.user_id} />}

            {/* Activity timeline — 2-column */}
            <div>
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Activity</div>
              <div>
                {allActivities.map((a, i) => (
                  <div key={a.id} className="flex gap-3">
                    {/* dot + vertical connector */}
                    <div className="flex flex-col items-center w-5 flex-shrink-0">
                      <div className="w-2 h-2 rounded-full bg-primary/60 mt-1.5 flex-shrink-0" />
                      {i < allActivities.length - 1 && <div className="w-px flex-1 bg-border mt-1.5 mb-0" />}
                    </div>
                    {/* 2-col: action left, date right */}
                    <div className="flex justify-between items-baseline gap-4 flex-1 pb-4">
                      <span className="text-sm font-medium text-foreground leading-snug">{a.action}</span>
                      <span className="text-xs text-muted-foreground flex-shrink-0 tabular-nums">{fmtActivityTime(a.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Delete */}
            <div className="pt-1 border-t border-border">
              {!confirmDelete ? (
                <button onClick={() => setConfirmDelete(true)} className="w-full text-sm text-destructive/60 hover:text-destructive py-2.5 transition-colors">
                  Delete Lead
                </button>
              ) : (
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setConfirmDelete(false)} className="flex-1 py-2.5 text-sm border border-border rounded-xl text-muted-foreground hover:bg-muted transition-colors">Cancel</button>
                  <button onClick={handleDelete} disabled={deleting} className="flex-1 py-2.5 text-sm bg-destructive/10 border border-destructive/20 rounded-xl text-destructive hover:bg-destructive/20 transition-colors font-medium">
                    {deleting ? 'Deleting…' : 'Confirm Delete'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>
    )
  }

  // ── Edit / Add form ────────────────────────────────────
  return (
    <Modal open={open} onClose={onClose} title={modalTitle} size="md">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Input label="Full Name *" value={form.name} onChange={set('name')} placeholder="John Tan" />
          </div>
          <div className="col-span-2">
            <Input label="Display Name" value={form.display_name} onChange={set('display_name')} placeholder="e.g. Johnny (used in templates)" />
          </div>
          <Input label="Mobile Number" type="tel" value={form.phone} onChange={set('phone')} placeholder="9123 4567" />
          <Input label="WhatsApp Number" type="tel" value={form.whatsapp_number} onChange={set('whatsapp_number')} placeholder="9123 4567" />
          <div className="col-span-2">
            <Input label="Email" type="email" value={form.email} onChange={set('email')} placeholder="john@email.com" />
          </div>
          <Select label="Status" value={form.status} onChange={set('status')}>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
          <Select label="Source" value={form.source} onChange={set('source')}>
            <option value="">— Select source —</option>
            {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
          <Select label="Property Type" value={form.property_type} onChange={set('property_type')}>
            <option value="">— Select type —</option>
            {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </Select>
          <NumberInput
            label="Budget (SGD)"
            value={form.budget}
            onChange={raw => setForm(f => ({ ...f, budget: raw }))}
            placeholder="500,000"
          />
          <div className="col-span-2">
            <Input label="Project Interested" value={form.project_interested} onChange={set('project_interested')} placeholder="e.g. The Arden, Lentor Modern" />
          </div>
          <div className="col-span-2">
            <Input label="Property Address" value={form.property_address} onChange={set('property_address')} placeholder="e.g. 123 Orchard Road #10-01" />
          </div>
          <div className="col-span-2">
            <Input label="Correspondence Address" value={form.correspondence_address} onChange={set('correspondence_address')} placeholder="Mailing address" />
          </div>
          <Input label="Birthday" type="date" value={form.birthday} onChange={set('birthday')} />
          <Input label="Follow-up Date" type="date" value={form.follow_up_date} onChange={set('follow_up_date')} />
        </div>

        {/* Client Type */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Client Type</label>
          <div className="flex gap-2">
            {CLIENT_TYPE_OPTIONS.map(t => (
              <button key={t.value} type="button" onClick={() => toggleClientType(t.value)}
                className={cn('flex-1 py-2 px-2 rounded-lg text-center border-2 transition-colors', form.client_type === t.value ? t.active : `bg-card ${t.style}`)}>
                <span className="block text-base">{t.emoji}</span>
                <span className="block text-xs font-semibold mt-0.5">{t.value}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Grade */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Customer Grade</label>
          <div className="flex gap-2">
            {GRADE_OPTIONS.map(g => (
              <button key={g.value} type="button" onClick={() => toggleGrade(g.value)}
                className={cn('flex-1 py-2 px-2 rounded-lg text-center border-2 transition-colors', form.grade === g.value ? g.active : `bg-card ${g.style}`)}>
                <span className="block text-sm font-bold">{g.label}</span>
                <span className="block text-xs font-normal mt-0.5 leading-tight">{g.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Reminder */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Reminder</label>
          <input type="datetime-local" value={form.reminder_at} onChange={set('reminder_at')}
            className="w-full h-10 rounded-lg border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors" />
          {form.reminder_at && (
            <p className="text-xs text-muted-foreground">You&apos;ll receive a browser notification at this time.</p>
          )}
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Notes</label>
          <textarea value={form.notes} onChange={set('notes')} rows={3} placeholder="Any notes about this lead..."
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none transition-colors" />
        </div>

        {!lead && form.client_type === 'Cold' && (
          <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2.5 text-xs text-blue-700">
            <span className="font-semibold">8-step follow-up cadence</span> will be auto-scheduled for this cold lead (Day 1 → 30).
          </div>
        )}

        {lead && lead.client_type === 'Cold' && <FollowUpCadence lead={lead} userId={userId} />}

        {lead && activities.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Activity</p>
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {activities.map(a => (
                <div key={a.id} className="flex items-center gap-2.5 text-xs">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/40 flex-shrink-0 mt-px" />
                  <span className="text-foreground font-medium flex items-center gap-1.5">
                    {a.action.includes('Call') ? <Phone size={10} /> : <MessageCircle size={10} />}
                    {a.action}
                  </span>
                  <span className="text-muted-foreground ml-auto">{fmtActivityTime(a.created_at)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {saveError && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            Failed to save: {saveError}
          </p>
        )}

        <div className="flex items-center justify-between pt-2">
          {lead ? <Button variant="destructive" size="sm" onClick={handleDelete} loading={deleting}>Delete</Button> : <div />}
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => lead ? setMode('view') : onClose()}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>{lead ? 'Save Changes' : 'Add Lead'}</Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
