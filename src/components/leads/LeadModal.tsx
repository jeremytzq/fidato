'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input, Select } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'
import type { Lead, LeadStatus, LeadSource, PropertyType } from '@/types'

const STATUSES: LeadStatus[] = ['New', 'Contacted', 'Qualified', 'Negotiating', 'Won', 'Lost']
const SOURCES: LeadSource[] = ['Referral', 'Website', 'Social Media', 'Cold Call', 'Walk-in', 'Other']
const PROPERTY_TYPES: PropertyType[] = ['HDB', 'Condo', 'Landed', 'Commercial', 'Industrial', 'Other']

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
  const [form, setForm] = useState({
    name: '', email: '', phone: '', status: defaultStatus, source: '' as LeadSource | '',
    property_type: '' as PropertyType | '', budget: '', notes: '', follow_up_date: '',
  })

  useEffect(() => {
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
      })
    } else {
      setForm({ name: '', email: '', phone: '', status: defaultStatus, source: '', property_type: '', budget: '', notes: '', follow_up_date: '' })
    }
  }, [lead, defaultStatus, open])

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
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
      updated_at: new Date().toISOString(),
    }
    if (lead) {
      await supabase.from('leads').update(payload).eq('id', lead.id)
    } else {
      await supabase.from('leads').insert({ ...payload, created_at: new Date().toISOString() })
    }
    setSaving(false)
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
          <Input label="Budget (SGD)" type="number" value={form.budget} onChange={set('budget')} placeholder="500000" />
          <div className="col-span-2">
            <Input label="Follow-up Date" type="date" value={form.follow_up_date} onChange={set('follow_up_date')} />
          </div>
          <div className="col-span-2 space-y-1.5">
            <label className="text-sm font-medium text-foreground">Notes</label>
            <textarea
              value={form.notes}
              onChange={set('notes')}
              rows={3}
              placeholder="Any notes about this lead..."
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none transition-colors"
            />
          </div>
        </div>
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
