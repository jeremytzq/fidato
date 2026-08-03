'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Modal } from '@/components/ui/Modal'
import { Input, Select } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { createClient } from '@/lib/supabase/client'
import { Plus, Pencil, Trash2, Search, Building2 } from 'lucide-react'
import type { Transaction, TransactionType, TransactionStatus } from '@/types'
import { formatCurrency, formatDate } from '@/utils/format'
import { NumberInput } from '@/components/ui/NumberInput'

const TX_TYPES: TransactionType[] = ['Lease', 'Purchase', 'Rental', 'Sale']
const TX_STATUSES: TransactionStatus[] = ['Active', 'Cancelled', 'Completed', 'Pending']

function TxModal({ open, onClose, tx, userId, onSaved }: {
  open: boolean; onClose: () => void; tx: Transaction | null
  userId: string; onSaved: () => void
}) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    client_name: '', property_address: '', transaction_type: 'Sale' as TransactionType,
    status: 'Active' as TransactionStatus, amount: '', commission_rate: '2',
    closing_date: '', notes: '',
  })

  useEffect(() => {
    if (!open) return
    if (tx) setForm({
      client_name: tx.client_name, property_address: tx.property_address,
      transaction_type: tx.transaction_type, status: tx.status,
      amount: String(tx.amount), commission_rate: String(tx.commission_rate),
      closing_date: tx.closing_date || '', notes: tx.notes || '',
    })
    else setForm({ client_name: '', property_address: '', transaction_type: 'Sale', status: 'Active', amount: '', commission_rate: '2', closing_date: '', notes: '' })
  }, [open, tx])

  const set = (k: string) => (e: React.ChangeEvent<any>) => setForm(f => ({ ...f, [k]: e.target.value }))

  const commission = form.amount && form.commission_rate
    ? Math.round(parseFloat(form.amount) * parseFloat(form.commission_rate) / 100) : 0

  const handleSave = async () => {
    if (!form.client_name.trim() || !form.property_address.trim() || !form.amount) return
    setSaving(true)
    const payload = {
      user_id: userId, client_name: form.client_name.trim(), property_address: form.property_address.trim(),
      transaction_type: form.transaction_type, status: form.status,
      amount: parseFloat(form.amount), commission_rate: parseFloat(form.commission_rate),
      commission_amount: commission, closing_date: form.closing_date || null,
      notes: form.notes || null, updated_at: new Date().toISOString(),
    }

    let txId = tx?.id
    if (tx) {
      await supabase.from('transactions').update(payload).eq('id', tx.id)
    } else {
      const { data: inserted } = await supabase
        .from('transactions')
        .insert({ ...payload, created_at: new Date().toISOString() })
        .select('id')
        .single()
      txId = inserted?.id
    }

    // Keep income table in sync: one Commission record per Completed transaction
    if (txId) {
      await supabase.from('income').delete().eq('transaction_id', txId)
      if (payload.status === 'Completed' && commission > 0) {
        await supabase.from('income').insert({
          user_id: userId,
          transaction_id: txId,
          category: 'Commission',
          amount: commission,
          date: payload.closing_date || new Date().toISOString().split('T')[0],
          description: `${form.client_name.trim()} — ${form.property_address.trim()}`,
          created_at: new Date().toISOString(),
        })
      }
    }

    setSaving(false)
    onSaved()
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={tx ? 'Edit Transaction' : 'New Transaction'} size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Client Name *" value={form.client_name} onChange={set('client_name')} placeholder="John Tan" />
          <Input label="Property Address *" value={form.property_address} onChange={set('property_address')} placeholder="123 Orchard Road #01-01" />
          <Select label="Type" value={form.transaction_type} onChange={set('transaction_type')}>
            {TX_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </Select>
          <Select label="Status" value={form.status} onChange={set('status')}>
            {TX_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
          <NumberInput label="Transaction Value (SGD) *" value={form.amount} onChange={raw => setForm(f => ({ ...f, amount: raw }))} placeholder="1,000,000" />
          <Input label="Commission Rate (%)" type="number" step="0.1" value={form.commission_rate} onChange={set('commission_rate')} />
          <Input label="Closing Date" type="date" value={form.closing_date} onChange={set('closing_date')} />
          <div className="flex items-end">
            <div className="bg-muted/60 rounded-lg px-4 py-2.5 w-full">
              <p className="text-xs text-muted-foreground">Commission Earned</p>
              <p className="text-lg font-bold text-primary">{formatCurrency(commission)}</p>
            </div>
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Notes</label>
          <textarea value={form.notes} onChange={set('notes')} rows={2} placeholder="Transaction notes..." className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none" />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} loading={saving}>{tx ? 'Save Changes' : 'Add Transaction'}</Button>
        </div>
      </div>
    </Modal>
  )
}

export default function TransactionsClient({ initialTransactions, userId }: {
  initialTransactions: Transaction[]; userId: string
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const supabase = createClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const handleSaved = () => startTransition(() => router.refresh())

  const handleDelete = async (id: string) => {
    await supabase.from('income').delete().eq('transaction_id', id)
    await supabase.from('transactions').delete().eq('id', id)
    handleSaved()
  }

  const filtered = initialTransactions.filter(tx => {
    const matchSearch = tx.client_name.toLowerCase().includes(search.toLowerCase()) || tx.property_address.toLowerCase().includes(search.toLowerCase())
    const matchStatus = !statusFilter || tx.status === statusFilter
    return matchSearch && matchStatus
  })

  const totalCommission = filtered.reduce((s, tx) => s + tx.commission_amount, 0)

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Transactions</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Total commission: <span className="font-semibold text-foreground">{formatCurrency(totalCommission)}</span></p>
        </div>
        <Button onClick={() => { setEditingTx(null); setModalOpen(true) }}><Plus size={15} /> New Transaction</Button>
      </div>

      <div className="flex gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search transactions..." className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-9 px-3 rounded-lg border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
          <option value="">All Status</option>
          {TX_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr style={{ background: 'hsl(var(--muted))' }}>
              {['Client', 'Property', 'Type', 'Value', 'Commission', 'Status', 'Closing Date', ''].map(h => (
                <th key={h} className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((tx, i) => (
              <motion.tr
                key={tx.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="hover:bg-muted/30 transition-colors"
              >
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">{tx.client_name[0]}</div>
                    <span className="text-sm font-medium text-foreground">{tx.client_name}</span>
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Building2 size={13} />
                    <span className="max-w-36 truncate">{tx.property_address}</span>
                  </div>
                </td>
                <td className="px-4 py-3.5"><span className="text-sm text-muted-foreground">{tx.transaction_type}</span></td>
                <td className="px-4 py-3.5"><span className="text-sm font-semibold text-foreground">{formatCurrency(tx.amount)}</span></td>
                <td className="px-4 py-3.5"><span className="text-sm font-semibold text-primary">{formatCurrency(tx.commission_amount)}</span></td>
                <td className="px-4 py-3.5"><Badge label={tx.status} /></td>
                <td className="px-4 py-3.5"><span className="text-sm text-muted-foreground">{tx.closing_date ? formatDate(tx.closing_date) : '—'}</span></td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-1">
                    <button onClick={() => { setEditingTx(tx); setModalOpen(true) }} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><Pencil size={13} /></button>
                    <button onClick={() => handleDelete(tx.id)} className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"><Trash2 size={13} /></button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">No transactions found.</div>
        )}
      </div>

      <TxModal open={modalOpen} onClose={() => setModalOpen(false)} tx={editingTx} userId={userId} onSaved={handleSaved} />
    </div>
  )
}
