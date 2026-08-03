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
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clients</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{initialClients.length} clients</p>
        </div>
        <Button onClick={() => { setEditingClient(null); setModalOpen(true) }}>
          <Plus size={15} /> Add Client
        </Button>
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search clients..."
          className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        />
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ background: 'hsl(var(--muted))' }}>
              <tr>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">Name</th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">Phone</th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3 hidden sm:table-cell">Email</th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3 hidden md:table-cell">Property</th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3 hidden lg:table-cell">Notes</th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3 hidden md:table-cell">Added</th>
                <th className="px-4 py-3 w-28" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((c, i) => (
                <motion.tr
                  key={c.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className="hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                        {c.name[0].toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-foreground">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{c.phone || '—'}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground hidden sm:table-cell">{c.email || '—'}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {c.property_type ? <Badge label={c.property_type} /> : <span className="text-sm text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground hidden lg:table-cell max-w-48">
                    <span className="line-clamp-1">{c.notes || '—'}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell whitespace-nowrap">{formatDate(c.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {c.phone && (
                        <>
                          <a
                            href={`tel:${c.phone}`}
                            title="Call"
                            className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                          >
                            <Phone size={13} />
                          </a>
                          <a
                            href={`https://wa.me/65${c.phone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="WhatsApp"
                            className="p-1.5 rounded-lg hover:bg-green-50 text-muted-foreground hover:text-green-600 transition-colors"
                          >
                            <MessageCircle size={13} />
                          </a>
                        </>
                      )}
                      <button
                        onClick={() => { setEditingClient(c); setModalOpen(true) }}
                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="text-center py-16 text-muted-foreground text-sm">
              {search ? 'No clients match your search.' : 'No clients yet. Add your first client!'}
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-border bg-muted/30">
          <p className="text-xs text-muted-foreground">{filtered.length} of {initialClients.length} clients</p>
        </div>
      </div>

      <ClientFormModal open={modalOpen} onClose={() => setModalOpen(false)} client={editingClient} userId={userId} onSaved={handleSaved} />
    </div>
  )
}
