'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { KanbanBoard } from '@/components/leads/KanbanBoard'
import { LeadModal } from '@/components/leads/LeadModal'
import { WonConversionModal } from '@/components/leads/WonConversionModal'
import { Button } from '@/components/ui/Button'
import { Plus, Phone, MessageCircle, Calendar, Bell, MoreHorizontal, FileSpreadsheet, ExternalLink, Search, X } from 'lucide-react'
import type { Lead, LeadStatus, LeadGrade, ClientType, PropertyType } from '@/types'
import { formatCurrency, formatDate } from '@/utils/format'
import { cn } from '@/utils/cn'
import { logActivity } from '@/lib/activity'
import { pushLeadsToGoogleSheets, pullLeadsFromGoogleSheets } from '@/lib/googleSheets'
import { createClient } from '@/lib/supabase/client'

const STATUSES: { id: LeadStatus; label: string; color: string }[] = [
  { id: 'New',         label: 'New',         color: 'hsl(235, 75%, 60%)' },
  { id: 'Contacted',  label: 'Contacted',   color: 'hsl(280, 65%, 60%)' },
  { id: 'Qualified',  label: 'Qualified',   color: 'hsl(38, 92%, 50%)' },
  { id: 'Negotiating',label: 'Negotiating', color: 'hsl(25, 95%, 53%)' },
  { id: 'Won',        label: 'Won',         color: 'hsl(142, 71%, 45%)' },
  { id: 'Lost',       label: 'Lost',        color: 'hsl(0, 84%, 60%)' },
]

const GRADE_STYLES: Record<string, string> = {
  A: 'bg-red-50 text-red-600 border border-red-200',
  B: 'bg-amber-50 text-amber-600 border border-amber-200',
  C: 'bg-blue-50 text-blue-600 border border-blue-200',
}

const SELECT_CLS = 'h-8 rounded-lg border border-border bg-card px-2.5 pr-7 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors appearance-none cursor-pointer'

function MobileLeadCard({ lead, userId, onEdit }: { lead: Lead; userId: string; onEdit: (l: Lead) => void }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="bg-card border border-border rounded-xl p-4 space-y-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
            {lead.name[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{lead.name}</p>
            {lead.property_type && (
              <p className="text-xs text-muted-foreground">{lead.property_type}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {lead.grade && (
            <span className={cn('text-xs font-bold px-1.5 py-0.5 rounded-md', GRADE_STYLES[lead.grade])}>
              {lead.grade}
            </span>
          )}
          <button
            onClick={() => onEdit(lead)}
            className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground"
          >
            <MoreHorizontal size={15} />
          </button>
        </div>
      </div>

      {lead.budget && (
        <p className="text-sm font-semibold text-foreground">{formatCurrency(lead.budget)}</p>
      )}

      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {lead.follow_up_date && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar size={11} /> {formatDate(lead.follow_up_date)}
          </div>
        )}
        {lead.reminder_at && (
          <div className="flex items-center gap-1 text-xs text-amber-600">
            <Bell size={11} /> {formatDate(lead.reminder_at)}
          </div>
        )}
        {lead.source && (
          <span className="text-xs text-muted-foreground">{lead.source}</span>
        )}
      </div>

      {lead.phone && (
        <div className="flex gap-2">
          <a
            href={`tel:${lead.phone}`}
            onClick={() => logActivity(userId, lead.id, 'Called')}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
          >
            <Phone size={13} /> Call
          </a>
          <a
            href={`https://wa.me/65${lead.phone.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => logActivity(userId, lead.id, 'Sent WhatsApp message')}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
          >
            <MessageCircle size={13} /> WhatsApp
          </a>
        </div>
      )}
    </motion.div>
  )
}

function MobileLeadView({ leads, userId, onEdit, onAddLead }: {
  leads: Lead[]
  userId: string
  onEdit: (l: Lead) => void
  onAddLead: (status: LeadStatus) => void
}) {
  const [activeStatus, setActiveStatus] = useState<LeadStatus>('New')
  const filtered = leads.filter(l => l.status === activeStatus)

  return (
    <div className="flex flex-col h-full">
      {/* Status tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
        {STATUSES.map(s => {
          const count = leads.filter(l => l.status === s.id).length
          const active = activeStatus === s.id
          return (
            <button
              key={s.id}
              onClick={() => setActiveStatus(s.id)}
              className={cn(
                'flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border',
                active
                  ? 'text-white border-transparent'
                  : 'bg-card text-muted-foreground border-border hover:text-foreground'
              )}
              style={active ? { background: s.color, borderColor: s.color } : undefined}
            >
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: active ? 'rgba(255,255,255,0.6)' : s.color }} />
              {s.label}
              <span className={cn(
                'text-[10px] px-1 rounded-full',
                active ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
              )}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Lead list */}
      <div className="flex-1 overflow-y-auto mt-3 space-y-3 pb-2">
        <AnimatePresence mode="popLayout">
          {filtered.map(lead => (
            <MobileLeadCard key={lead.id} lead={lead} userId={userId} onEdit={onEdit} />
          ))}
        </AnimatePresence>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <p className="text-sm text-muted-foreground">No {activeStatus.toLowerCase()} leads</p>
            <Button variant="secondary" onClick={() => onAddLead(activeStatus)}>
              <Plus size={14} /> Add {activeStatus} Lead
            </Button>
          </div>
        )}
      </div>

      {/* Floating add button for current status */}
      {filtered.length > 0 && (
        <div className="pt-3">
          <Button className="w-full" variant="secondary" onClick={() => onAddLead(activeStatus)}>
            <Plus size={14} /> Add {activeStatus} Lead
          </Button>
        </div>
      )}
    </div>
  )
}

export default function LeadsClient({ initialLeads, userId }: { initialLeads: Lead[]; userId: string }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [defaultStatus, setDefaultStatus] = useState<LeadStatus>('New')
  const [wonLead, setWonLead] = useState<Lead | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [sheetUrl, setSheetUrl] = useState<string | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [syncResult, setSyncResult] = useState<{ updated: number; created: number } | null>(null)

  // Search & filter state
  const [search, setSearch] = useState('')
  const [filterGrade, setFilterGrade] = useState<LeadGrade | ''>('')
  const [filterClientType, setFilterClientType] = useState<ClientType | ''>('')
  const [filterPropertyType, setFilterPropertyType] = useState<PropertyType | ''>('')

  const hasFilters = !!(search || filterGrade || filterClientType || filterPropertyType)

  const filteredLeads = initialLeads.filter(l => {
    if (filterGrade && l.grade !== filterGrade) return false
    if (filterClientType && l.client_type !== filterClientType) return false
    if (filterPropertyType && l.property_type !== filterPropertyType) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        l.name.toLowerCase().includes(q) ||
        (l.display_name?.toLowerCase().includes(q) ?? false) ||
        (l.phone?.includes(q) ?? false) ||
        (l.email?.toLowerCase().includes(q) ?? false) ||
        (l.project_interested?.toLowerCase().includes(q) ?? false)
      )
    }
    return true
  })

  const clearFilters = () => {
    setSearch('')
    setFilterGrade('')
    setFilterClientType('')
    setFilterPropertyType('')
  }

  const openAdd = (status: LeadStatus = 'New') => {
    setEditingLead(null)
    setDefaultStatus(status)
    setModalOpen(true)
  }

  const openEdit = (lead: Lead) => {
    setEditingLead(lead)
    setModalOpen(true)
  }

  const handleSaved = () => startTransition(() => router.refresh())

  const handleSync = async () => {
    setSyncing(true)
    setSyncError(null)
    setSyncResult(null)
    try {
      let pullResult: { updated: number; created: number } = { updated: 0, created: 0 }
      try {
        pullResult = await pullLeadsFromGoogleSheets(userId)
      } catch (e: unknown) {
        if (!(e instanceof Error) || !e.message?.includes('No sheet found')) throw e
      }

      const supabase = createClient()
      const { data: freshLeads } = await supabase
        .from('leads')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      const url = await pushLeadsToGoogleSheets((freshLeads ?? initialLeads) as Lead[])

      setSheetUrl(url)
      setSyncResult(pullResult)
      startTransition(() => router.refresh())
    } catch (e: unknown) {
      setSyncError(e instanceof Error ? e.message : 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  // Key for kanban — remounts when filters change so internal state re-syncs
  const kanbanKey = `${search}|${filterGrade}|${filterClientType}|${filterPropertyType}`

  return (
    <div className="p-4 sm:p-6 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Leads</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {hasFilters
              ? `${filteredLeads.length} of ${initialLeads.length} shown`
              : `${initialLeads.length} in pipeline`}
          </p>
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
          <Button onClick={() => openAdd()}>
            <Plus size={15} /> Add Lead
          </Button>
        </div>
      </div>

      {/* Search + filter bar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, phone, email…"
            className="w-full h-8 rounded-lg border border-border bg-card pl-7 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X size={12} />
            </button>
          )}
        </div>

        {/* Grade */}
        <div className="relative">
          <select
            value={filterGrade}
            onChange={e => setFilterGrade(e.target.value as LeadGrade | '')}
            className={cn(SELECT_CLS, filterGrade ? 'border-primary text-primary' : '')}
          >
            <option value="">Grade</option>
            <option value="A">Grade A</option>
            <option value="B">Grade B</option>
            <option value="C">Grade C</option>
          </select>
        </div>

        {/* Client Type */}
        <div className="relative">
          <select
            value={filterClientType}
            onChange={e => setFilterClientType(e.target.value as ClientType | '')}
            className={cn(SELECT_CLS, filterClientType ? 'border-primary text-primary' : '')}
          >
            <option value="">Client Type</option>
            <option value="Hot">🔥 Hot</option>
            <option value="Warm">☀️ Warm</option>
            <option value="Cold">🧊 Cold</option>
          </select>
        </div>

        {/* Property Type */}
        <div className="relative">
          <select
            value={filterPropertyType}
            onChange={e => setFilterPropertyType(e.target.value as PropertyType | '')}
            className={cn(SELECT_CLS, filterPropertyType ? 'border-primary text-primary' : '')}
          >
            <option value="">Property</option>
            <option value="Commercial">Commercial</option>
            <option value="Condo">Condo</option>
            <option value="EC">EC</option>
            <option value="HDB">HDB</option>
            <option value="Industrial">Industrial</option>
            <option value="Landed">Landed</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {/* Clear */}
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 h-8 px-2.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-colors"
          >
            <X size={11} /> Clear
          </button>
        )}
      </div>

      {sheetUrl && (
        <div className="flex items-center justify-between gap-3 mb-3 px-3 py-2.5 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">
          <span className="font-medium">
            Synced
            {syncResult && (syncResult.updated > 0 || syncResult.created > 0) && (
              <span className="font-normal text-green-600 ml-1.5">
                — {[
                  syncResult.updated > 0 && `${syncResult.updated} updated`,
                  syncResult.created > 0 && `${syncResult.created} added`,
                ].filter(Boolean).join(', ')} from Sheets
              </span>
            )}
          </span>
          <a href={sheetUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 font-semibold hover:underline flex-shrink-0">
            Open <ExternalLink size={12} />
          </a>
        </div>
      )}
      {syncError && (
        <p className="mb-3 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
          {syncError}
        </p>
      )}

      {/* Mobile: status-tab list */}
      <div className="flex-1 overflow-hidden md:hidden">
        <MobileLeadView
          leads={filteredLeads}
          userId={userId}
          onEdit={openEdit}
          onAddLead={openAdd}
        />
      </div>

      {/* Desktop: kanban board */}
      <div className="flex-1 overflow-x-auto hidden md:block">
        <KanbanBoard
          key={kanbanKey}
          initialLeads={filteredLeads}
          userId={userId}
          onEdit={openEdit}
          onAddLead={openAdd}
          onWon={setWonLead}
        />
      </div>

      <LeadModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        lead={editingLead}
        defaultStatus={defaultStatus}
        userId={userId}
        onSaved={handleSaved}
      />

      {wonLead && (
        <WonConversionModal
          open={!!wonLead}
          onClose={() => setWonLead(null)}
          lead={wonLead}
          userId={userId}
          onConverted={handleSaved}
        />
      )}
    </div>
  )
}
