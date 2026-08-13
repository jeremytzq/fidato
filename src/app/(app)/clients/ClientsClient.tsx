'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Modal } from '@/components/ui/Modal'
import { Input, Select } from '@/components/ui/Input'
import { NumberInput } from '@/components/ui/NumberInput'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { createClient } from '@/lib/supabase/client'
import { Plus, Phone, MessageCircle, Mail, Pencil, Trash2, Search, FileSpreadsheet, ExternalLink, Building2, Banknote, MapPin, Cake, Home, Tag, Calendar } from 'lucide-react'
import type { Client, PropertyType, ClientType } from '@/types'
import { formatDate, toTitleCase, formatCurrency } from '@/utils/format'
import { pushClientsToGoogleSheets } from '@/lib/googleSheets'
import { cn } from '@/utils/cn'

const PROPERTY_TYPES: PropertyType[] = ['Commercial', 'Condo', 'EC', 'HDB', 'Industrial', 'Landed', 'Other']

const CLIENT_TYPE_OPTIONS: { value: ClientType; emoji: string; style: string; active: string }[] = [
  { value: 'Hot',  emoji: '🔥', style: 'border-border text-muted-foreground hover:border-red-300',    active: 'bg-red-50 border-red-400 text-red-600' },
  { value: 'Warm', emoji: '☀️', style: 'border-border text-muted-foreground hover:border-amber-300', active: 'bg-amber-50 border-amber-400 text-amber-600' },
  { value: 'Cold', emoji: '🧊', style: 'border-border text-muted-foreground hover:border-blue-300',  active: 'bg-blue-50 border-blue-400 text-blue-600' },
]

const EMPTY_FORM = {
  name: '', display_name: '', email: '', phone: '', whatsapp_number: '',
  property_type: '' as PropertyType | '', budget: '',
  project_interested: '', birthday: '',
  property_address: '', correspondence_address: '',
  client_type: '' as ClientType | '', notes: '',
}

const AVATAR_COLORS = ['#5B6CF8', '#E88C30', '#4CAF7D', '#E05C5C', '#8A6FA8', '#6786A1', '#364863']
function avatarBg(name: string) {
  return AVATAR_COLORS[name ? name.charCodeAt(0) % AVATAR_COLORS.length : 0]
}

function ClientFormModal({ open, onClose, client, userId, onSaved }: {
  open: boolean; onClose: () => void; client: Client | null; userId: string; onSaved: () => void
}) {
  const supabase = createClient()
  const [mode, setMode] = useState<'view' | 'edit'>('view')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  useEffect(() => {
    if (!open) return
    setConfirmDelete(false)
    setMode(client ? 'view' : 'edit')
    if (client) setForm({
      name: client.name,
      display_name: client.display_name || '',
      email: client.email || '',
      phone: client.phone || '',
      whatsapp_number: client.whatsapp_number || '',
      property_type: client.property_type || '',
      budget: client.budget ? String(client.budget) : '',
      project_interested: client.project_interested || '',
      birthday: client.birthday || '',
      property_address: client.property_address || '',
      correspondence_address: client.correspondence_address || '',
      client_type: client.client_type || '',
      notes: client.notes || '',
    })
    else setForm(EMPTY_FORM)
  }, [open, client])

  const set = (k: string) => (e: React.ChangeEvent<any>) => setForm(f => ({ ...f, [k]: e.target.value }))
  const toggleClientType = (t: ClientType) => setForm(f => ({ ...f, client_type: f.client_type === t ? '' : t }))

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    const payload = {
      user_id: userId,
      name: form.name.trim(),
      display_name: form.display_name.trim() || null,
      email: form.email || null,
      phone: form.phone || null,
      whatsapp_number: form.whatsapp_number || null,
      property_type: (form.property_type as PropertyType) || null,
      budget: form.budget ? parseInt(form.budget) : null,
      project_interested: form.project_interested || null,
      birthday: form.birthday || null,
      property_address: form.property_address || null,
      correspondence_address: form.correspondence_address || null,
      client_type: (form.client_type as ClientType) || null,
      notes: form.notes || null,
      updated_at: new Date().toISOString(),
    }
    if (client) {
      await supabase.from('clients').update(payload).eq('id', client.id)
      setSaving(false)
      setMode('view')
    } else {
      await supabase.from('clients').insert({ ...payload, created_at: new Date().toISOString() })
      setSaving(false)
      onClose()
    }
    onSaved()
  }

  const handleDelete = async () => {
    if (!client) return
    setDeleting(true)
    await supabase.from('clients').delete().eq('id', client.id)
    setDeleting(false)
    onSaved()
    onClose()
  }

  // ── View mode ──────────────────────────────────────────
  if (mode === 'view' && client) {
    const displayName = toTitleCase(client.display_name || client.name)
    const initial = displayName.charAt(0).toUpperCase()
    const clientTypeCfg = CLIENT_TYPE_OPTIONS.find(o => o.value === client.client_type)
    const waNum = (client.whatsapp_number || client.phone)?.replace(/\D/g, '')

    const fields = [
      { label: 'Mobile',         value: client.phone,                                              icon: <Phone size={14} /> },
      { label: 'WhatsApp',       value: client.whatsapp_number || client.phone,                    icon: <MessageCircle size={14} /> },
      { label: 'Email',          value: client.email,                                              icon: <Mail size={14} /> },
      { label: 'Property Type',  value: client.property_type,                                      icon: <Building2 size={14} /> },
      { label: 'Budget',         value: client.budget ? formatCurrency(client.budget) : null,         icon: <Banknote size={14} /> },
      { label: 'Project',        value: client.project_interested,                                 icon: <MapPin size={14} /> },
      { label: 'Birthday',       value: client.birthday ? formatDate(client.birthday) : null,      icon: <Cake size={14} /> },
      { label: 'Property Addr.', value: client.property_address,                                   icon: <Home size={14} /> },
      { label: 'Correspondence', value: client.correspondence_address,                             icon: <Tag size={14} /> },
      { label: 'Added',          value: formatDate(client.created_at),                             icon: <Calendar size={14} /> },
    ].filter(f => f.value)

    return (
      <Modal open={open} onClose={onClose} title={displayName} size="md">
        <div className="-mx-6 -my-5">

          {/* Profile header */}
          <div className="px-6 pt-6 pb-5 text-center border-b border-border bg-card/50">
            <div
              className="rounded-full flex items-center justify-center text-2xl font-bold text-white mx-auto mb-3 ring-4 ring-background shadow-sm"
              style={{ background: avatarBg(client.name), width: 72, height: 72 }}
            >
              {initial}
            </div>
            <div className="text-xl font-bold text-foreground tracking-tight">{displayName}</div>
            {client.display_name && client.display_name !== client.name && (
              <div className="text-sm text-muted-foreground mt-0.5">{toTitleCase(client.name)}</div>
            )}

            {/* Client type chip */}
            {clientTypeCfg && (
              <div className="flex items-center justify-center mt-2">
                <span className={cn('inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border', clientTypeCfg.active)}>
                  {clientTypeCfg.emoji} {client.client_type}
                </span>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex justify-center gap-5 mt-5">
              {client.phone && (
                <a href={`tel:${client.phone}`} className="flex flex-col items-center gap-1.5 group">
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
              {client.email && (
                <a href={`mailto:${client.email}`} className="flex flex-col items-center gap-1.5 group">
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
            {client.notes && (
              <div>
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Notes</div>
                <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap bg-muted/40 border border-border rounded-2xl px-4 py-3">{client.notes}</div>
              </div>
            )}

            {/* Delete */}
            <div className="pt-1 border-t border-border">
              {!confirmDelete ? (
                <button onClick={() => setConfirmDelete(true)} className="w-full text-sm text-destructive/60 hover:text-destructive py-2.5 transition-colors">
                  Delete Client
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
    <Modal open={open} onClose={onClose} title={client ? 'Edit Client' : 'Add Client'} size="md">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Input label="Full Name *" value={form.name} onChange={set('name')} placeholder="Jane Lim" />
          </div>
          <div className="col-span-2">
            <Input label="Display Name" value={form.display_name} onChange={set('display_name')} placeholder="e.g. Jane (used in templates)" />
          </div>
          <Input label="Mobile Number" type="tel" value={form.phone} onChange={set('phone')} placeholder="9123 4567" />
          <Input label="WhatsApp Number" type="tel" value={form.whatsapp_number} onChange={set('whatsapp_number')} placeholder="9123 4567" />
          <div className="col-span-2">
            <Input label="Email" type="email" value={form.email} onChange={set('email')} placeholder="jane@email.com" />
          </div>
          <Select label="Property Type" value={form.property_type} onChange={set('property_type')}>
            <option value="">— Select type —</option>
            {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </Select>
          <NumberInput label="Budget (SGD)" value={form.budget} onChange={raw => setForm(f => ({ ...f, budget: raw }))} placeholder="500,000" />
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
        </div>

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

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Notes</label>
          <textarea value={form.notes} onChange={set('notes')} rows={3} placeholder="Notes about this client..." className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none transition-colors" />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => client ? setMode('view') : onClose()}>Cancel</Button>
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
  const [syncing, setSyncing] = useState(false)
  const [sheetUrl, setSheetUrl] = useState<string | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)

  const handleSaved = () => startTransition(() => router.refresh())

  const handleSync = async () => {
    setSyncing(true)
    setSyncError(null)
    try {
      const { data: freshClients } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      const url = await pushClientsToGoogleSheets((freshClients ?? initialClients) as Client[])
      setSheetUrl(url)
    } catch (e: any) {
      setSyncError(e.message)
    } finally {
      setSyncing(false)
    }
  }

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
        <div className="flex items-center gap-2">
          <button
            onClick={handleSync}
            disabled={syncing}
            title="Sync with Google Sheets"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-card text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            <FileSpreadsheet size={14} className="text-green-600" />
            <span className="hidden sm:inline">{syncing ? 'Syncing…' : 'Sheets'}</span>
          </button>
          <Button onClick={() => { setEditingClient(null); setModalOpen(true) }}>
            <Plus size={15} /> Add Client
          </Button>
        </div>
      </div>

      {sheetUrl && (
        <div className="flex items-center justify-between gap-3 mb-4 px-3 py-2.5 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">
          <span className="font-medium">Exported to Google Sheets</span>
          <a href={sheetUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 font-semibold hover:underline flex-shrink-0">
            Open <ExternalLink size={12} />
          </a>
        </div>
      )}
      {syncError && (
        <p className="mb-4 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
          {syncError}
        </p>
      )}

      <div className="relative mb-4 max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search clients..."
          className="w-full h-10 pl-9 pr-3 rounded-lg border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
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
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.2 }}
                  whileHover={{ backgroundColor: 'hsl(220 14% 94%)' }}
                  className="transition-colors cursor-pointer"
                  onClick={() => { setEditingClient(c); setModalOpen(true) }}
                >
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                        style={{ background: avatarBg(c.name) }}
                      >
                        {c.name[0].toUpperCase()}
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-foreground">{toTitleCase(c.name)}</span>
                        {c.client_type && (
                          <span className="ml-2 text-xs">{c.client_type === 'Hot' ? '🔥' : c.client_type === 'Warm' ? '☀️' : '🧊'}</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-muted-foreground">{c.phone || '—'}</td>
                  <td className="px-4 py-3.5 text-sm text-muted-foreground hidden sm:table-cell">{c.email || '—'}</td>
                  <td className="px-4 py-3.5 hidden md:table-cell">
                    {c.property_type ? <Badge label={c.property_type} /> : <span className="text-sm text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3.5 text-sm text-muted-foreground hidden lg:table-cell max-w-48">
                    <span className="line-clamp-1">{c.notes || '—'}</span>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-muted-foreground hidden md:table-cell whitespace-nowrap">{formatDate(c.created_at)}</td>
                  <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
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
