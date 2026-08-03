'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { KanbanBoard } from '@/components/leads/KanbanBoard'
import { LeadModal } from '@/components/leads/LeadModal'
import { WonConversionModal } from '@/components/leads/WonConversionModal'
import { Button } from '@/components/ui/Button'
import { Plus, Phone, MessageCircle, Calendar, Bell, MoreHorizontal } from 'lucide-react'
import type { Lead, LeadStatus } from '@/types'
import { useReminders } from '@/lib/useReminders'
import { formatCurrency, formatDate } from '@/utils/format'
import { cn } from '@/utils/cn'
import { logActivity } from '@/lib/activity'

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

  useReminders(initialLeads)

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

  return (
    <div className="p-4 sm:p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Leads</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{initialLeads.length} in pipeline</p>
        </div>
        <Button onClick={() => openAdd()}>
          <Plus size={15} /> Add Lead
        </Button>
      </div>

      {/* Mobile: status-tab list */}
      <div className="flex-1 overflow-hidden md:hidden">
        <MobileLeadView
          leads={initialLeads}
          userId={userId}
          onEdit={openEdit}
          onAddLead={openAdd}
        />
      </div>

      {/* Desktop: kanban board */}
      <div className="flex-1 overflow-x-auto hidden md:block">
        <KanbanBoard
          initialLeads={initialLeads}
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
