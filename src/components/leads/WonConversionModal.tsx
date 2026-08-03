'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input, Select } from '@/components/ui/Input'
import { NumberInput } from '@/components/ui/NumberInput'
import { Button } from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'
import type { Lead, TransactionType } from '@/types'

const TRANSACTION_TYPES: TransactionType[] = ['Sale', 'Purchase', 'Rental', 'Lease']

interface WonConversionModalProps {
  open: boolean
  onClose: () => void
  lead: Lead
  userId: string
  onConverted: () => void
}

export function WonConversionModal({ open, onClose, lead, userId, onConverted }: WonConversionModalProps) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    property_address: '',
    transaction_type: 'Sale' as TransactionType,
    amount: '',
    commission_rate: '2',
    closing_date: '',
  })

  useEffect(() => {
    if (!open) return
    setForm({
      property_address: '',
      transaction_type: 'Sale',
      amount: lead.budget ? String(lead.budget) : '',
      commission_rate: '2',
      closing_date: '',
    })
    setError(null)
  }, [lead.id, open]) // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const amt = parseInt(form.amount) || 0
  const rate = parseFloat(form.commission_rate) || 0
  const commissionAmount = amt && rate ? Math.round(amt * rate / 100) : 0

  const handleConvert = async () => {
    if (!form.property_address.trim() || !form.amount) {
      setError('Property address and transaction value are required.')
      return
    }
    setSaving(true)
    setError(null)
    const now = new Date().toISOString()

    const { error: leadErr } = await supabase
      .from('leads')
      .update({ status: 'Won', updated_at: now })
      .eq('id', lead.id)
    if (leadErr) { setSaving(false); setError(leadErr.message); return }

    const { data: clientData, error: clientErr } = await supabase
      .from('clients')
      .insert({
        user_id: userId,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        property_type: lead.property_type,
        notes: lead.notes,
        created_at: now,
        updated_at: now,
      })
      .select('id')
      .single()
    if (clientErr) { setSaving(false); setError(clientErr.message); return }

    const { error: txErr } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        client_id: clientData.id,
        client_name: lead.name,
        property_address: form.property_address.trim(),
        transaction_type: form.transaction_type,
        status: 'Active',
        amount: amt,
        commission_rate: rate,
        commission_amount: commissionAmount,
        closing_date: form.closing_date || null,
        notes: null,
        created_at: now,
        updated_at: now,
      })
    if (txErr) { setSaving(false); setError(txErr.message); return }

    setSaving(false)
    onConverted()
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Convert Lead to Client" size="md">
      <div className="space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-xl p-3">
          <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-0.5">Lead Won</p>
          <p className="text-sm font-bold text-foreground">{lead.name}</p>
          {lead.phone && <p className="text-xs text-muted-foreground mt-0.5">{lead.phone}</p>}
        </div>
        <p className="text-xs text-muted-foreground">
          Fill in the deal details — a client profile and transaction will be created automatically.
        </p>

        <Input
          label="Property Address *"
          value={form.property_address}
          onChange={set('property_address')}
          placeholder="123 Toa Payoh Lorong 1, #05-01"
        />

        <div className="grid grid-cols-2 gap-3">
          <Select label="Transaction Type" value={form.transaction_type} onChange={set('transaction_type')}>
            {TRANSACTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </Select>
          <Input label="Closing Date" type="date" value={form.closing_date} onChange={set('closing_date')} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <NumberInput
            label="Transaction Value (SGD) *"
            value={form.amount}
            onChange={raw => setForm(f => ({ ...f, amount: raw }))}
            placeholder="1,200,000"
          />
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Commission Rate (%)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={form.commission_rate}
              onChange={set('commission_rate')}
              className="w-full h-9 rounded-lg border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            />
          </div>
        </div>

        {commissionAmount > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2.5">
            <p className="text-xs text-green-700">
              Estimated commission:{' '}
              <span className="font-bold text-sm">SGD {commissionAmount.toLocaleString('en-SG')}</span>
            </p>
          </div>
        )}

        {error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleConvert} loading={saving}>Convert & Save</Button>
        </div>
      </div>
    </Modal>
  )
}
