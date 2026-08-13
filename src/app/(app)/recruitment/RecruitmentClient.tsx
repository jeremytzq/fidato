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
  Plus, Phone, MessageCircle, Mail, Pencil, Trash2,
  Search, X, Building2, Calendar, ChevronDown, ChevronUp,
  Users, UserPlus, Star, Clock, CheckCircle2, XCircle,
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

// ── Modal ──────────────────────────────────────────────────────────────────────

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
      { label: 'Mobile',   value: recruit.phone,                                     icon: <Phone size={14} /> },
      { label: 'WhatsApp', value: recruit.phone,                                     icon: <MessageCircle size={14} /> },
      { label: 'Email',    value: recruit.email,                                     icon: <Mail size={14} /> },
      { label: 'Agency',   value: recruit.current_agency,                            icon: <Building2 size={14} /> },
      { label: 'Follow-up',value: recruit.follow_up_date ? formatDate(recruit.follow_up_date) : null, icon: <Calendar size={14} /> },
    ].filter(f => f.value)

    return (
      <Modal open={open} onClose={onClose} title={displayName} size="md">
        <div className="-mx-6 -my-5">
          {/* Profile header */}
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

            {/* Action buttons */}
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

  // Pipeline counts
  const counts = STATUSES.reduce((acc, s) => {
    acc[s] = initialRecruits.filter(r => r.status === s).length
    return acc
  }, {} as Record<RecruitStatus, number>)

  const thCls = 'text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3 cursor-pointer hover:text-foreground transition-colors select-none whitespace-nowrap'

  function SortIcon({ col }: { col: string }) {
    if (sortKey !== col) return <ChevronUp size={12} className="opacity-20" />
    return sortDir === 'asc' ? <ChevronUp size={12} className="text-primary" /> : <ChevronDown size={12} className="text-primary" />
  }

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Recruitment</h1>
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
          <Button onClick={openAdd}>
            <UserPlus size={15} /> Add Recruit
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
                    whileHover={{ backgroundColor: 'hsl(220 14% 94%)' }}
                    className="transition-colors cursor-pointer"
                    onClick={() => openEdit(r)}
                  >
                    <td className="px-4 py-3.5">
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
                    <td className="px-4 py-3.5">
                      <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border', cfg.bg, cfg.text, cfg.border)}>
                        {cfg.icon} {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-muted-foreground">{r.phone || '—'}</td>
                    <td className="px-4 py-3.5 text-sm text-muted-foreground hidden sm:table-cell">{r.current_agency || '—'}</td>
                    <td className="px-4 py-3.5 text-sm text-muted-foreground hidden md:table-cell whitespace-nowrap">
                      {r.follow_up_date ? formatDate(r.follow_up_date) : '—'}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-muted-foreground hidden lg:table-cell max-w-48">
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
