'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Modal } from '@/components/ui/Modal'
import { Input, Select } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { createClient } from '@/lib/supabase/client'
import { formatDate, toTitleCase } from '@/utils/format'
import { cn } from '@/utils/cn'
import {
  Phone, MessageCircle, Mail, Pencil, Trash2,
  Search, X, Building2, Calendar, ChevronDown, ChevronUp,
  Users, UserPlus, Star, Clock, CheckCircle2, XCircle, Copy,
} from 'lucide-react'
import type { RecruitLead, RecruitStatus } from '@/types'

const STATUSES: RecruitStatus[] = ['New', 'Contacted', 'Interested', 'Scheduled', 'Joined', 'Not Interested']

const STATUS_CFG: Record<RecruitStatus, {
  bg: string; text: string; border: string; icon: React.ReactNode; pipelineBg: string
}> = {
  'New':           { bg: 'bg-slate-100',  text: 'text-slate-600',  border: 'border-slate-200',  icon: <Users size={13} />,        pipelineBg: 'bg-slate-400' },
  'Contacted':     { bg: 'bg-blue-50',    text: 'text-blue-600',   border: 'border-blue-200',   icon: <Phone size={13} />,        pipelineBg: 'bg-blue-500' },
  'Interested':    { bg: 'bg-amber-50',   text: 'text-amber-600',  border: 'border-amber-200',  icon: <Star size={13} />,         pipelineBg: 'bg-amber-500' },
  'Scheduled':     { bg: 'bg-purple-50',  text: 'text-purple-600', border: 'border-purple-200', icon: <Clock size={13} />,        pipelineBg: 'bg-purple-500' },
  'Joined':        { bg: 'bg-green-50',   text: 'text-green-700',  border: 'border-green-200',  icon: <CheckCircle2 size={13} />, pipelineBg: 'bg-green-500' },
  'Not Interested':{ bg: 'bg-red-50',     text: 'text-red-500',    border: 'border-red-200',    icon: <XCircle size={13} />,      pipelineBg: 'bg-red-400' },
}

const AVATAR_COLORS = ['#5B6CF8', '#E88C30', '#4CAF7D', '#E05C5C', '#8A6FA8', '#6786A1', '#364863']
function avatarBg(name: string) {
  return AVATAR_COLORS[name ? name.charCodeAt(0) % AVATAR_COLORS.length : 0]
}

const STARTER_LIST = [
  'Ivan Cheong', 'Wendy Lim', 'Kenneth Yee', 'Clarrence Fong', 'Clarisse Tan',
  'Tan Cheong', 'Alvin Ng', 'Nigel Ng', 'Samuel', 'Cheong Jin Wei',
  'Glenn Kuan', 'Maverick Ang', 'Meibin Tok', 'Rui Wen', 'Toh Lip An',
  'Jarhead James', 'Eric Goh', 'Lionel', 'Vyon Koh', 'Kanch Dass',
  'Choo Jin Eu', 'Daryl Yeo', 'Rachael Aang', 'Siddiq Alihaq', 'Pon Yong Leng',
]

// ── Bulk Edit Modal ────────────────────────────────────────────────────────────

function BulkEditModal({ count, onClose, onSave, saving }: {
  count: number
  onClose: () => void
  onSave: (fields: { status?: string; follow_up_date?: string }) => void
  saving: boolean
}) {
  const [status, setStatus] = useState('')
  const [followUp, setFollowUp] = useState('')

  const hasValue = status !== '' || followUp !== ''

  const handleSave = () => {
    const payload: { status?: string; follow_up_date?: string } = {}
    if (status) payload.status = status
    if (followUp) payload.follow_up_date = followUp
    if (Object.keys(payload).length === 0) return
    onSave(payload)
  }

  const selectCls = 'w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary cursor-pointer'
  const inputCls = 'w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary'
  const labelCls = 'block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Pencil size={14} className="text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">Bulk Edit</p>
              <p className="text-xs text-muted-foreground">{count} recruit{count !== 1 ? 's' : ''} selected</p>
            </div>
          </div>
          <motion.button
            onClick={onClose}
            whileHover={{ rotate: 90 }}
            transition={{ duration: 0.18 }}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded"
          >
            <X size={16} />
          </motion.button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <p className="text-xs text-muted-foreground">Only filled fields will be applied. Leave blank to keep existing values.</p>
          <div>
            <label className={labelCls}>Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)} className={selectCls}>
              <option value="">— keep existing —</option>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Follow-up Date</label>
            <input type="date" value={followUp} onChange={e => setFollowUp(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div className="flex gap-2 px-5 pb-5">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!hasValue || saving}
            className="flex-1 py-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving…' : 'Apply Changes'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Find Duplicates Modal ─────────────────────────────────────────────────────

function FindDupesModal({ recruits, onClose, onDeleted }: {
  recruits: RecruitLead[]
  onClose: () => void
  onDeleted: () => void
}) {
  const supabase = createClient()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Group by normalised phone
  const dupeGroups = (() => {
    const map = new Map<string, RecruitLead[]>()
    for (const r of recruits) {
      if (!r.phone) continue
      const key = r.phone.replace(/\D/g, '')
      if (!key) continue
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(r)
    }
    return Array.from(map.values()).filter(g => g.length > 1)
  })()

  const deleteOne = async (id: string) => {
    setDeletingId(id)
    await supabase.from('recruitment_leads').delete().eq('id', id)
    setDeletingId(null)
    onDeleted()
  }

  const keepOne = async (keepId: string, group: RecruitLead[]) => {
    const toDelete = group.filter(r => r.id !== keepId).map(r => r.id)
    setDeletingId(keepId)
    await supabase.from('recruitment_leads').delete().in('id', toDelete)
    setDeletingId(null)
    onDeleted()
  }

  return (
    <Modal open onClose={onClose} title="Duplicate Mobile Numbers" size="md">
      <div className="space-y-4">
        {dupeGroups.length === 0 ? (
          <div className="text-center py-10">
            <CheckCircle2 size={32} className="text-green-500 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">No duplicates found</p>
            <p className="text-xs text-muted-foreground mt-1">All mobile numbers are unique.</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {dupeGroups.length} duplicate group{dupeGroups.length !== 1 ? 's' : ''} found. Keep one record per group or delete individual entries.
            </p>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto -mx-1 px-1">
              {dupeGroups.map((group, gi) => (
                <div key={gi} className="rounded-xl border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-900 overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-2 border-b border-amber-200 dark:border-amber-900 bg-amber-100/60 dark:bg-amber-900/30">
                    <Phone size={12} className="text-amber-600" />
                    <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">{group[0].phone}</span>
                    <span className="ml-auto text-[10px] text-amber-600 dark:text-amber-500 font-medium">{group.length} records</span>
                  </div>
                  <div className="divide-y divide-amber-100 dark:divide-amber-900/50">
                    {group.map(r => (
                      <div key={r.id} className="flex items-center gap-3 px-3 py-2.5">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                          style={{ background: avatarBg(r.name) }}
                        >
                          {r.name[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{toTitleCase(r.name)}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold border',
                              STATUS_CFG[r.status].bg, STATUS_CFG[r.status].text, STATUS_CFG[r.status].border)}>
                              {r.status}
                            </span>
                            {r.current_agency && (
                              <span className="text-[10px] text-muted-foreground truncate">{r.current_agency}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => keepOne(r.id, group)}
                            disabled={deletingId !== null}
                            title="Keep this, delete the rest"
                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-40"
                          >
                            Keep
                          </button>
                          <button
                            onClick={() => deleteOne(r.id)}
                            disabled={deletingId !== null}
                            title="Delete this record"
                            className="p-1.5 rounded-lg hover:bg-red-100 text-muted-foreground hover:text-red-600 transition-colors disabled:opacity-40"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
        <div className="flex justify-end pt-1">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
            Done
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ── Recruit Modal ──────────────────────────────────────────────────────────────

function RecruitModal({ open, onClose, recruit, userId, onSaved }: {
  open: boolean
  onClose: () => void
  recruit: RecruitLead | null
  userId: string
  onSaved: () => void
}) {
  const supabase = createClient()
  const [mode, setMode] = useState<'view' | 'edit'>('view')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [dupeWarning, setDupeWarning] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '', phone: '', email: '', current_agency: '',
    status: 'New' as RecruitStatus, notes: '', follow_up_date: '',
  })

  useEffect(() => {
    if (!open) return
    setConfirmDelete(false)
    setDupeWarning(null)
    setMode(recruit ? 'view' : 'edit')
    if (recruit) setForm({
      name: recruit.name,
      phone: recruit.phone || '',
      email: recruit.email || '',
      current_agency: recruit.current_agency || '',
      status: recruit.status,
      notes: recruit.notes || '',
      follow_up_date: recruit.follow_up_date || '',
    })
    else setForm({ name: '', phone: '', email: '', current_agency: '', status: 'New', notes: '', follow_up_date: '' })
  }, [open, recruit])

  const set = (k: string) => (e: React.ChangeEvent<any>) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSave = async (force = false) => {
    if (!form.name.trim()) return
    if (!force && form.phone) {
      let q = supabase.from('recruitment_leads').select('id, name').eq('user_id', userId).eq('phone', form.phone.trim())
      if (recruit) q = q.neq('id', recruit.id)
      const { data: dupes } = await q.limit(1)
      if (dupes && dupes.length > 0) { setDupeWarning(dupes[0].name); return }
    }
    setDupeWarning(null)
    setSaving(true)
    const payload = {
      user_id: userId,
      name: form.name.trim(),
      phone: form.phone || null,
      email: form.email || null,
      current_agency: form.current_agency || null,
      status: form.status,
      notes: form.notes || null,
      follow_up_date: form.follow_up_date || null,
      updated_at: new Date().toISOString(),
    }
    if (recruit) {
      await supabase.from('recruitment_leads').update(payload).eq('id', recruit.id)
      setSaving(false)
      setMode('view')
    } else {
      await supabase.from('recruitment_leads').insert({ ...payload, created_at: new Date().toISOString() })
      setSaving(false)
      onClose()
    }
    onSaved()
  }

  const handleDelete = async () => {
    if (!recruit) return
    setDeleting(true)
    await supabase.from('recruitment_leads').delete().eq('id', recruit.id)
    setDeleting(false)
    onSaved()
    onClose()
  }

  // ── View mode ───────────────────────────────────────────
  if (mode === 'view' && recruit) {
    const displayName = toTitleCase(recruit.name)
    const initial = displayName.charAt(0).toUpperCase()
    const cfg = STATUS_CFG[recruit.status]
    const waNum = recruit.phone?.replace(/\D/g, '')

    const fields = [
      { label: 'Mobile',    value: recruit.phone,                                                         icon: <Phone size={14} /> },
      { label: 'WhatsApp',  value: recruit.phone,                                                         icon: <MessageCircle size={14} /> },
      { label: 'Email',     value: recruit.email,                                                         icon: <Mail size={14} /> },
      { label: 'Agency',    value: recruit.current_agency,                                                icon: <Building2 size={14} /> },
      { label: 'Follow-up', value: recruit.follow_up_date ? formatDate(recruit.follow_up_date) : null,    icon: <Calendar size={14} /> },
    ].filter(f => f.value)

    return (
      <Modal open={open} onClose={onClose} title={displayName} size="md">
        <div className="-mx-6 -my-5">
          <div className="px-6 pt-6 pb-5 text-center border-b border-border bg-card/50">
            <div
              className="rounded-full flex items-center justify-center text-2xl font-bold text-white mx-auto mb-3 ring-4 ring-background shadow-sm"
              style={{ background: avatarBg(recruit.name), width: 72, height: 72 }}
            >
              {initial}
            </div>
            <div className="text-xl font-bold text-foreground tracking-tight">{displayName}</div>
            {recruit.current_agency && (
              <div className="text-sm text-muted-foreground mt-0.5">{recruit.current_agency}</div>
            )}
            <div className="flex items-center justify-center mt-2">
              <span className={cn('inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border', cfg.bg, cfg.text, cfg.border)}>
                {cfg.icon} {recruit.status}
              </span>
            </div>
            <div className="flex justify-center gap-5 mt-5">
              {recruit.phone && (
                <a href={`tel:${recruit.phone}`} className="flex flex-col items-center gap-1.5 group">
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
              {recruit.email && (
                <a href={`mailto:${recruit.email}`} className="flex flex-col items-center gap-1.5 group">
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
            {fields.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {fields.map(f => (
                  <div key={f.label} className="flex items-center gap-2.5 px-3 py-2.5 bg-muted/40 rounded-xl border border-border">
                    <div className="text-muted-foreground flex-shrink-0">{f.icon}</div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider leading-none mb-0.5">{f.label}</div>
                      <div className="text-sm font-medium text-foreground truncate">{f.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {recruit.notes && (
              <div>
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Notes</div>
                <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap bg-muted/40 border border-border rounded-2xl px-4 py-3">{recruit.notes}</div>
              </div>
            )}
            <div className="pt-1 border-t border-border">
              {!confirmDelete ? (
                <button onClick={() => setConfirmDelete(true)} className="w-full text-sm text-destructive/60 hover:text-destructive py-2.5 transition-colors">
                  Delete
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

  // ── Edit / Add form ─────────────────────────────────────
  return (
    <Modal open={open} onClose={onClose} title={recruit ? 'Edit Recruit' : 'Add Recruit'} size="md">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Input label="Full Name *" value={form.name} onChange={set('name')} placeholder="John Tan" />
          </div>
          <Input label="Mobile Number" type="tel" value={form.phone} onChange={set('phone')} placeholder="9123 4567" />
          <Input label="Email" type="email" value={form.email} onChange={set('email')} placeholder="john@email.com" />
          <div className="col-span-2">
            <Input label="Current Agency" value={form.current_agency} onChange={set('current_agency')} placeholder="e.g. ERA, OrangeTee, SRI" />
          </div>
          <Select label="Status" value={form.status} onChange={set('status')}>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
          <Input label="Follow-up Date" type="date" value={form.follow_up_date} onChange={set('follow_up_date')} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Notes</label>
          <textarea value={form.notes} onChange={set('notes')} rows={3} placeholder="Mutual connections, background, interest level..."
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none transition-colors" />
        </div>
        {dupeWarning && (
          <div className="rounded-lg bg-amber-50 border border-amber-300 px-3 py-2.5 text-sm text-amber-800 space-y-2">
            <p><span className="font-semibold">Duplicate detected:</span> A recruit with this mobile number already exists — <span className="font-semibold">{dupeWarning}</span>.</p>
            <div className="flex gap-2">
              <button onClick={() => setDupeWarning(null)} className="flex-1 py-1.5 rounded-lg border border-amber-300 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors">Cancel</button>
              <button onClick={() => handleSave(true)} className="flex-1 py-1.5 rounded-lg bg-amber-600 text-xs font-semibold text-white hover:bg-amber-700 transition-colors">Save Anyway</button>
            </div>
          </div>
        )}
        <div className="flex items-center justify-between pt-2">
          {recruit ? (
            <Button variant="destructive" size="sm" onClick={handleDelete} loading={deleting}>Delete</Button>
          ) : <div />}
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => recruit ? setMode('view') : onClose()}>Cancel</Button>
            <Button onClick={() => handleSave()} loading={saving}>{recruit ? 'Save Changes' : 'Add Recruit'}</Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

// ── Main page component ────────────────────────────────────────────────────────

type SortDir = 'asc' | 'desc'

export default function RecruitmentClient({
  initialRecruits,
  userId,
}: {
  initialRecruits: RecruitLead[]
  userId: string
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const supabase = createClient()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<RecruitLead | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortKey, setSortKey] = useState('created_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [seeding, setSeeding] = useState(false)

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkEditOpen, setBulkEditOpen] = useState(false)
  const [bulkSaving, setBulkSaving] = useState(false)
  const [dupesOpen, setDupesOpen] = useState(false)

  const handleSaved = () => startTransition(() => router.refresh())

  const openAdd = () => { setEditing(null); setModalOpen(true) }
  const openEdit = (r: RecruitLead) => { setEditing(r); setModalOpen(true) }

  const handleSeed = async () => {
    if (!confirm(`Import ${STARTER_LIST.length} recruits from your starter list?`)) return
    setSeeding(true)
    const now = new Date().toISOString()
    await supabase.from('recruitment_leads').insert(
      STARTER_LIST.map(name => ({ name, user_id: userId, status: 'New', created_at: now, updated_at: now }))
    )
    setSeeding(false)
    startTransition(() => router.refresh())
  }

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const q = search.toLowerCase()
  const filtered = [...initialRecruits]
    .filter(r => {
      const matchSearch = !search || [r.name, r.email, r.phone, r.current_agency, r.notes]
        .some(v => v?.toLowerCase().includes(q))
      return matchSearch && (!statusFilter || r.status === statusFilter)
    })
    .sort((a, b) => {
      const av = (a as any)[sortKey] ?? ''
      const bv = (b as any)[sortKey] ?? ''
      const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv))
      return sortDir === 'asc' ? cmp : -cmp
    })

  // Selection helpers
  const filteredIds = filtered.map(r => r.id)
  const allSelected = filteredIds.length > 0 && filteredIds.every(id => selectedIds.has(id))
  const someSelected = filteredIds.some(id => selectedIds.has(id)) && !allSelected
  const selectedCount = selectedIds.size

  const toggleAll = () => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (allSelected) filteredIds.forEach(id => next.delete(id))
      else filteredIds.forEach(id => next.add(id))
      return next
    })
  }

  const toggleRow = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleBulkEdit = async (fields: { status?: string; follow_up_date?: string }) => {
    setBulkSaving(true)
    const ids = Array.from(selectedIds)
    await supabase.from('recruitment_leads').update({ ...fields, updated_at: new Date().toISOString() }).in('id', ids)
    setBulkSaving(false)
    setBulkEditOpen(false)
    setSelectedIds(new Set())
    startTransition(() => router.refresh())
  }

  const handleBulkDelete = async () => {
    const count = selectedIds.size
    if (!confirm(`Delete ${count} recruit${count !== 1 ? 's' : ''}? This cannot be undone.`)) return
    await supabase.from('recruitment_leads').delete().in('id', Array.from(selectedIds))
    setSelectedIds(new Set())
    startTransition(() => router.refresh())
  }

  // Pipeline counts
  const counts = STATUSES.reduce((acc, s) => {
    acc[s] = initialRecruits.filter(r => r.status === s).length
    return acc
  }, {} as Record<RecruitStatus, number>)

  const thCls = 'text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3 cursor-pointer hover:text-foreground transition-colors select-none whitespace-nowrap'
  const checkThCls = 'px-4 py-3 w-10'
  const checkTdCls = 'px-4 py-3.5 w-10'

  function SortIcon({ col }: { col: string }) {
    if (sortKey !== col) return <ChevronUp size={12} className="opacity-20" />
    return sortDir === 'asc' ? <ChevronUp size={12} className="text-primary" /> : <ChevronDown size={12} className="text-primary" />
  }

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Recruitment</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{initialRecruits.length} recruits tracked</p>
        </div>
        <div className="flex items-center gap-2">
          {initialRecruits.length === 0 && (
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-primary/30 bg-primary/5 text-sm font-medium text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
            >
              <Users size={14} /> {seeding ? 'Importing…' : 'Import Starter List'}
            </button>
          )}
          <button
            onClick={() => setDupesOpen(true)}
            title="Find Duplicates"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-card text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Copy size={14} /> <span className="hidden sm:inline">Find Duplicates</span>
          </button>
          <Button onClick={openAdd}>
            <UserPlus size={15} /> <span className="hidden sm:inline">Add Recruit</span><span className="sm:hidden">Add</span>
          </Button>
        </div>
      </div>

      {/* Pipeline summary */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-6">
        {STATUSES.map(s => {
          const cfg = STATUS_CFG[s]
          const count = counts[s]
          return (
            <motion.button
              key={s}
              whileHover={{ y: -2, boxShadow: '0 6px 18px rgba(0,0,0,0.08)' }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
              onClick={() => setStatusFilter(f => f === s ? '' : s)}
              className={cn(
                'flex flex-col items-start p-3 rounded-xl border transition-all text-left',
                statusFilter === s
                  ? `${cfg.bg} ${cfg.border} ring-2 ring-offset-1 ring-primary/30`
                  : 'bg-card border-border hover:border-primary/20'
              )}
            >
              <div className={cn('w-2 h-2 rounded-full mb-2', cfg.pipelineBg)} />
              <span className="text-lg font-bold text-foreground tabular-nums">{count}</span>
              <span className="text-[11px] text-muted-foreground font-medium leading-tight">{s}</span>
            </motion.button>
          )
        })}
      </div>

      {/* Search + filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, phone, agency…"
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X size={13} />
            </button>
          )}
        </div>
        {statusFilter && (
          <button
            onClick={() => setStatusFilter('')}
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-primary bg-primary/5 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
          >
            <X size={12} /> {statusFilter}
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ background: 'hsl(var(--muted))' }}>
              <tr>
                <th className={checkThCls}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={el => { if (el) el.indeterminate = someSelected }}
                    onChange={toggleAll}
                    className="w-3.5 h-3.5 rounded accent-primary cursor-pointer"
                  />
                </th>
                <th onClick={() => handleSort('name')} className={thCls}>
                  <span className="flex items-center gap-1">Name <SortIcon col="name" /></span>
                </th>
                <th onClick={() => handleSort('status')} className={thCls}>
                  <span className="flex items-center gap-1">Status <SortIcon col="status" /></span>
                </th>
                <th className={thCls}>Phone</th>
                <th onClick={() => handleSort('current_agency')} className={cn(thCls, 'hidden sm:table-cell')}>
                  <span className="flex items-center gap-1">Agency <SortIcon col="current_agency" /></span>
                </th>
                <th onClick={() => handleSort('follow_up_date')} className={cn(thCls, 'hidden md:table-cell')}>
                  <span className="flex items-center gap-1">Follow-up <SortIcon col="follow_up_date" /></span>
                </th>
                <th className={cn(thCls, 'hidden lg:table-cell')}>Notes</th>
                <th className="px-4 py-3 w-24" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((r, i) => {
                const cfg = STATUS_CFG[r.status]
                return (
                  <motion.tr
                    key={r.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02, duration: 0.2 }}
                    className={cn('transition-colors cursor-pointer', selectedIds.has(r.id) ? 'bg-primary/5' : 'hover:bg-muted/30')}
                    onClick={() => toggleRow(r.id)}
                  >
                    <td className={checkTdCls} onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(r.id)}
                        onChange={() => toggleRow(r.id)}
                        className="w-3.5 h-3.5 rounded accent-primary cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3.5" onClick={e => { e.stopPropagation(); openEdit(r) }}>
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                          style={{ background: avatarBg(r.name) }}
                        >
                          {r.name[0].toUpperCase()}
                        </div>
                        <span className="text-sm font-semibold text-foreground">{toTitleCase(r.name)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5" onClick={e => { e.stopPropagation(); openEdit(r) }}>
                      <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border', cfg.bg, cfg.text, cfg.border)}>
                        {cfg.icon} {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-muted-foreground" onClick={e => { e.stopPropagation(); openEdit(r) }}>{r.phone || '—'}</td>
                    <td className="px-4 py-3.5 text-sm text-muted-foreground hidden sm:table-cell" onClick={e => { e.stopPropagation(); openEdit(r) }}>{r.current_agency || '—'}</td>
                    <td className="px-4 py-3.5 text-sm text-muted-foreground hidden md:table-cell whitespace-nowrap" onClick={e => { e.stopPropagation(); openEdit(r) }}>
                      {r.follow_up_date ? formatDate(r.follow_up_date) : '—'}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-muted-foreground hidden lg:table-cell max-w-48" onClick={e => { e.stopPropagation(); openEdit(r) }}>
                      <span className="line-clamp-1">{r.notes || '—'}</span>
                    </td>
                    <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        {r.phone && (
                          <a
                            href={`https://wa.me/65${r.phone.replace(/\D/g, '')}`}
                            target="_blank" rel="noopener noreferrer"
                            title="WhatsApp"
                            className="p-1.5 rounded-lg hover:bg-green-50 text-muted-foreground hover:text-green-600 transition-colors"
                          >
                            <MessageCircle size={13} />
                          </a>
                        )}
                        <button
                          onClick={() => openEdit(r)}
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={async () => {
                            if (!confirm(`Delete ${r.name}?`)) return
                            await supabase.from('recruitment_leads').delete().eq('id', r.id)
                            handleSaved()
                          }}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="text-center py-16 text-muted-foreground text-sm">
              {search || statusFilter ? 'No recruits match your filters.' : 'No recruits yet. Import your starter list or add individually.'}
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-border bg-muted/30">
          <p className="text-xs text-muted-foreground">{filtered.length} of {initialRecruits.length} recruits</p>
        </div>
      </div>

      {/* Bulk action toolbar */}
      <AnimatePresence>
        {selectedCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-5 py-3 bg-foreground text-background rounded-2xl shadow-2xl border border-foreground/10"
          >
            <span className="text-sm font-semibold tabular-nums whitespace-nowrap">
              {selectedCount} selected
            </span>
            <div className="w-px h-4 bg-background/20" />
            <button
              onClick={() => setBulkEditOpen(true)}
              className="flex items-center gap-1.5 text-sm font-medium hover:opacity-70 transition-opacity"
            >
              <Pencil size={13} /> Edit
            </button>
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1.5 text-sm font-medium text-red-400 hover:text-red-300 transition-colors"
            >
              <Trash2 size={13} /> Delete
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="ml-1 text-background/50 hover:text-background transition-colors"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk edit modal */}
      <AnimatePresence>
        {bulkEditOpen && (
          <BulkEditModal
            count={selectedCount}
            onClose={() => setBulkEditOpen(false)}
            onSave={handleBulkEdit}
            saving={bulkSaving}
          />
        )}
      </AnimatePresence>

      {dupesOpen && (
        <FindDupesModal
          recruits={initialRecruits}
          onClose={() => setDupesOpen(false)}
          onDeleted={handleSaved}
        />
      )}

      <RecruitModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        recruit={editing}
        userId={userId}
        onSaved={handleSaved}
      />
    </div>
  )
}
