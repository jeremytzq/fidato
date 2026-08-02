'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Modal } from '@/components/ui/Modal'
import { Input, Select } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { createClient } from '@/lib/supabase/client'
import { Plus, Phone, MessageCircle, Pencil, Trash2, Search } from 'lucide-react'
import type { Client, PropertyType } from '@/types'
import { formatDate } from '@/utils/format'

const PROPERTY_TYPES: PropertyType[] = ['HDB', 'Condo', 'Landed', 'Commercial', 'Industrial', 'Other']

function ClientCard({ client, onEdit, onDelete }: { client: Client; onEdit: (c: Client) => void; onDelete: (id: string) => void }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, boxShadow: '0 6px 20px rgba(0,0,0,0.07)' }}
      className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
            {client.name[0].toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-foreground">{client.name}</p>
            {client.property_type && <Badge label={client.property_type} />}
          </div>
        </div>
        <div className="flex gap-1">
          <button onClick={() => onEdit(client)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <Pencil size={13} />
          </button>
          <button onClick={() => onDelete(client.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <div className="text-sm text-muted-foreground space-y-1">
        {client.email && <p>{client.email}</p>}
        {client.phone && <p>{client.phone}</p>}
        {client.notes && <p className="text-xs line-clamp-2">{client.notes}</p>}
      </div>

      <div className="text-xs text-muted-foreground">Added {formatDate(client.created_at)}</div>

      {client.phone && (
        <div className="flex gap-2 pt-1">
          <a href={`tel:${client.phone}`} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors">
            <Phone size={14} /> Call
          </a>
          <a href={`https://wa.me/65${client.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-green-50 text-green-700 hover:bg-green-100 transition-colors">
            <MessageCircle size={14} /> WhatsApp
          </a>
        </div>
      )}
    </motion.div>
  )
}

function ClientFormModal({ open, onClose, client, userId, onSaved }: {
  open: boolean; onClose: () => void; client: Client | null; userId: string; onSaved: () => void
}) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', property_type: '' as PropertyType | '', notes: '' })

  useState(() => {
    if (client) setForm({ name: client.name, email: client.email || '', phone: client.phone || '', property_type: client.property_type || '', notes: client.notes || '' })
    else setForm({ name: '', email: '', phone: '', property_type: '', notes: '' })
  })

  const set = (k: string) => (e: React.ChangeEvent<any>) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    const payload = { user_id: userId, name: form.name.trim(), email: form.email || null, phone: form.phone || null, property_type: (form.property_type as PropertyType) || null, notes: form.notes || null, updated_at: new Date().toISOString() }
    if (client) await supabase.from('clients').update(payload).eq('id', client.id)
    else await supabase.from('clients').insert({ ...payload, created_at: new Date().toISOString() })
    setSaving(false)
    onSaved()
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={client ? 'Edit Client' : 'Add Client'}>
      <div className="space-y-4">
        <Input label="Full Name *" value={form.name} onChange={set('name')} placeholder="Jane Lim" />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Email" type="email" value={form.email} onChange={set('email')} placeholder="jane@email.com" />
          <Input label="Phone" value={form.phone} onChange={set('phone')} placeholder="9123 4567" />
        </div>
        <Select label="Property Type" value={form.property_type} onChange={set('property_type')}>
          <option value="">— Select type —</option>
          {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </Select>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Notes</label>
          <textarea value={form.notes} onChange={set('notes')} rows={3} placeholder="Notes about this client..." className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none transition-colors" />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} loading={saving}>{client ? 'Save Changes' : 'Add Client'}</Button>
        </div>
      </div>
    </Modal>
  )
}

export default function ClientsClient({ initialClients, userId }: { initialClients: Client[]; userId: string }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const supabase = createClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [search, setSearch] = useState('')

  const handleSaved = () => startTransition(() => router.refresh())

  const handleDelete = async (id: string) => {
    await supabase.from('clients').delete().eq('id', id)
    handleSaved()
  }

  const filtered = initialClients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  )

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clients</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{initialClients.length} clients</p>
        </div>
        <Button onClick={() => { setEditingClient(null); setModalOpen(true) }}>
          <Plus size={15} /> Add Client
        </Button>
      </div>

      <div className="relative mb-6 max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search clients..."
          className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(c => (
          <ClientCard key={c.id} client={c} onEdit={(c) => { setEditingClient(c); setModalOpen(true) }} onDelete={handleDelete} />
        ))}
        {filtered.length === 0 && (
          <div className="col-span-3 text-center py-16 text-muted-foreground">
            {search ? 'No clients match your search.' : 'No clients yet. Add your first client!'}
          </div>
        )}
      </div>

      <ClientFormModal open={modalOpen} onClose={() => setModalOpen(false)} client={editingClient} userId={userId} onSaved={handleSaved} />
    </div>
  )
}
