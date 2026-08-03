'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input, Select } from '@/components/ui/Input'
import { NumberInput } from '@/components/ui/NumberInput'
import { Button } from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'
import { Phone, MessageCircle } from 'lucide-react'
import type { Lead, LeadStatus, LeadSource, PropertyType, LeadGrade, ActivityLog } from '@/types'
import { cn } from '@/utils/cn'

const STATUSES: LeadStatus[] = ['New', 'Contacted', 'Qualified', 'Negotiating', 'Won', 'Lost']
const SOURCES: LeadSource[] = ['Referral', 'Website', 'Social Media', 'Cold Call', 'Walk-in', 'Other']
const PROPERTY_TYPES: PropertyType[] = ['HDB', 'Condo', 'Landed', 'Commercial', 'Industrial', 'Other']

const GRADE_OPTIONS: { value: LeadGrade; label: string; desc: string; style: string; active: string }[] = [
  { value: 'A', label: 'A', desc: 'Urgent & Motivated', style: 'border-border text-muted-foreground hover:border-red-300', active: 'bg-red-50 border-red-400 text-red-600' },
  { value: 'B', label: 'B', desc: 'Not Urgent, Motivated', style: 'border-border text-muted-foreground hover:border-amber-300', active: 'bg-amber-50 border-amber-400 text-amber-600' },
  { value: 'C', label: 'C', desc: 'Not Urgent or Motivated', style: 'border-border text-muted-foreground hover:border-blue-300', active: 'bg-blue-50 border-blue-400 text-blue-600' },
]

function formatActivityTime(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-SG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
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
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [activities, setActivities] = useState<ActivityLog[]>([])
  const [form, setForm] = useState({
    name: '', email: '', phone: '', status: defaultStatus, source: '' as LeadSource | '',
    property_type: '' as PropertyType | '', budget: '', notes: '', follow_up_date: '',
    grade: '' as LeadGrade | '', reminder_at: '',
  })

  useEffect(() => {
    setSaveError(null)
    if (lead) {
      setForm({
        name: lead.name,
        email: lead.email || '',
        phone: lead.phone || '',
        status: lead.status,
        source: lead.source || '',
        property_type: lead.property_type || '',
        budget: lead.budget ? String(lead.budget) : '',
        notes: lead.notes || '',
        follow_up_date: lead.follow_up_date || '',
        grade: lead.grade || '',
        reminder_at: lead.reminder_at ? lead.reminder_at.slice(0, 16) : '',
      })
    } else {
      setForm({ name: '', email: '', phone: '', status: defaultStatus, source: '', property_type: '', budget: '', notes: '', follow_up_date: '', grade: '', reminder_at: '' })
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

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    setSaveError(null)
    const payload = {
      user_id: userId,
      name: form.name.trim(),
      email: form.email || null,
      phone: form.phone || null,
      status: form.status,
      source: (form.source as LeadSource) || null,
      property_type: (form.property_type as PropertyType) || null,
      budget: form.budget ? parseInt(form.budget) : null,
      notes: form.notes || null,
      follow_up_date: form.follow_up_date || null,
      grade: (form.grade as LeadGrade) || null,
      reminder_at: form.reminder_at ? new Date(form.reminder_at).toISOString() : null,
      updated_at: new Date().toISOString(),
    }
    const { error } = lead
      ? await supabase.from('leads').update(payload).eq('id', lead.id)
      : await supabase.from('leads').insert({ ...payload, created_at: new Date().toISOString() })

    setSaving(false)
    if (error) {
      setSaveError(error.message)
      return
    }
    onSaved()
    onClose()
  }

  const handleDelete = async () => {
    if (!lead) return
    setDeleting(true)
    await supabase.from('leads').delete().eq('id', lead.id)
    setDeleting(false)
    onSaved()
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={lead ? 'Edit Lead' : 'Add Lead'} size="md">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Input label="Full Name *" value={form.name} onChange={set('name')} placeholder="John Tan" />
          </div>
          <Input label="Email" type="email" value={form.email} onChange={set('email')} placeholder="john@email.com" />
          <Input label="Phone" type="tel" value={form.phone} onChange={set('phone')} placeholder="9123 4567" />
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
            <Input label="Follow-up Date" type="date" value={form.follow_up_date} onChange={set('follow_up_date')} />
          </div>
        </div>

        {/* Grade selector */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Customer Grade</label>
          <div className="flex gap-2">
            {GRADE_OPTIONS.map(g => (
              <button
                key={g.value}
                type="button"
                onClick={() => toggleGrade(g.value)}
                className={cn(
                  'flex-1 py-2 px-2 rounded-lg text-center border-2 transition-colors',
                  form.grade === g.value ? g.active : `bg-card ${g.style}`
                )}
              >
                <span className="block text-sm font-bold">{g.label}</span>
                <span className="block text-xs font-normal mt-0.5 leading-tight">{g.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Reminder */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Reminder</label>
          <input
            type="datetime-local"
            value={form.reminder_at}
            onChange={set('reminder_at')}
            className="w-full h-9 rounded-lg border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
          />
          {form.reminder_at && (
            <p className="text-xs text-muted-foreground">You&apos;ll receive a browser notification at this time.</p>
          )}
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Notes</label>
          <textarea
            value={form.notes}
            onChange={set('notes')}
            rows={3}
            placeholder="Any notes about this lead..."
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none transition-colors"
          />
        </div>

        {/* Activity timeline */}
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
                  <span className="text-muted-foreground ml-auto">{formatActivityTime(a.created_at)}</span>
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
          {lead ? (
            <Button variant="destructive" size="sm" onClick={handleDelete} loading={deleting}>Delete</Button>
          ) : <div />}
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>{lead ? 'Save Changes' : 'Add Lead'}</Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
