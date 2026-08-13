'use client'

import { useState, useEffect } from 'react'
import { DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors, useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { motion, AnimatePresence } from 'framer-motion'
import { Phone, MessageCircle, Plus, MoreHorizontal, Calendar, Bell } from 'lucide-react'
import type { Lead, LeadStatus } from '@/types'
import { formatCurrency, formatDate, toTitleCase } from '@/utils/format'
import { createClient } from '@/lib/supabase/client'
import { logActivity } from '@/lib/activity'
import { cn } from '@/utils/cn'

const COLUMNS: { id: LeadStatus; label: string; color: string; bg: string; badge: string }[] = [
  { id: 'New',         label: 'New',         color: 'hsl(235,75%,60%)',  bg: 'hsla(235,75%,60%,0.07)',  badge: 'hsla(235,75%,60%,0.15)' },
  { id: 'Contacted',  label: 'Contacted',   color: 'hsl(280,65%,60%)',  bg: 'hsla(280,65%,60%,0.07)',  badge: 'hsla(280,65%,60%,0.15)' },
  { id: 'Qualified',  label: 'Qualified',   color: 'hsl(38,92%,50%)',   bg: 'hsla(38,92%,50%,0.07)',   badge: 'hsla(38,92%,50%,0.18)'  },
  { id: 'Negotiating',label: 'Negotiating', color: 'hsl(25,95%,53%)',   bg: 'hsla(25,95%,53%,0.07)',   badge: 'hsla(25,95%,53%,0.16)'  },
  { id: 'Won',        label: 'Won',         color: 'hsl(142,71%,45%)',  bg: 'hsla(142,71%,45%,0.07)',  badge: 'hsla(142,71%,45%,0.15)' },
  { id: 'Lost',       label: 'Lost',        color: 'hsl(0,84%,60%)',    bg: 'hsla(0,84%,60%,0.07)',    badge: 'hsla(0,84%,60%,0.15)'   },
]

const GRADE_STYLES = {
  A: 'bg-red-50 text-red-600 border border-red-200',
  B: 'bg-amber-50 text-amber-600 border border-amber-200',
  C: 'bg-blue-50 text-blue-600 border border-blue-200',
}

// Registers the column body as a drop target so empty columns accept drops
function DroppableColumnBody({ colId, leads, children }: {
  colId: LeadStatus
  leads: Lead[]
  children: React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id: colId })
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'space-y-3 min-h-24 rounded-xl p-2 transition-colors',
        isOver && 'ring-2 ring-primary/30 bg-primary/5'
      )}
      style={{ background: leads.length === 0 && !isOver ? 'hsl(var(--muted) / 0.4)' : undefined }}
    >
      {children}
    </div>
  )
}

function LeadCard({ lead, userId, onEdit }: { lead: Lead; userId: string; onEdit: (l: Lead) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: lead.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const handleCall = () => logActivity(userId, lead.id, 'Called')
  const handleWhatsApp = () => logActivity(userId, lead.id, 'Sent WhatsApp message')

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <motion.div
        layout
        whileHover={{ y: -3, boxShadow: '0 8px 24px rgba(0,0,0,0.11)' }}
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
        className="bg-card border border-border rounded-xl p-4 cursor-grab active:cursor-grabbing space-y-3"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary flex-shrink-0">
              {lead.name[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{toTitleCase(lead.name)}</p>
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
              onPointerDown={e => e.stopPropagation()}
              onClick={() => onEdit(lead)}
              className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground"
            >
              <MoreHorizontal size={14} />
            </button>
          </div>
        </div>

        {lead.budget && (
          <p className="text-sm font-semibold text-foreground">{formatCurrency(lead.budget)}</p>
        )}

        {lead.follow_up_date && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar size={11} />
            Follow up: {formatDate(lead.follow_up_date)}
          </div>
        )}

        {lead.reminder_at && (
          <div className="flex items-center gap-1.5 text-xs text-amber-600">
            <Bell size={11} />
            Reminder: {formatDate(lead.reminder_at)}
          </div>
        )}

        {lead.source && (
          <p className="text-xs text-muted-foreground">Source: {lead.source}</p>
        )}

        <div className="flex gap-2 pt-1" onPointerDown={e => e.stopPropagation()}>
          {lead.phone && (
            <a
              href={`tel:${lead.phone}`}
              onClick={handleCall}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
            >
              <Phone size={14} /> Call
            </a>
          )}
          {lead.phone && (
            <a
              href={`https://wa.me/65${lead.phone.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleWhatsApp}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
            >
              <MessageCircle size={14} /> WhatsApp
            </a>
          )}
        </div>
      </motion.div>
    </div>
  )
}

export function KanbanBoard({ initialLeads, userId, onEdit, onAddLead, onWon }: {
  initialLeads: Lead[]
  userId: string
  onEdit: (l: Lead) => void
  onAddLead: (status: LeadStatus) => void
  onWon?: (lead: Lead) => void
}) {
  const [leads, setLeads] = useState(initialLeads)
  const [activeId, setActiveId] = useState<string | null>(null)
  const supabase = createClient()

  // Sync with parent when server refreshes data after a save
  useEffect(() => {
    setLeads(initialLeads)
  }, [initialLeads])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const handleDragStart = ({ active }: any) => setActiveId(active.id)

  const handleDragEnd = async ({ active, over }: any) => {
    setActiveId(null)
    if (!over) return

    const activeLead = leads.find(l => l.id === active.id)
    const activeStatus = activeLead?.status
    // over.id is either a column ID (DroppableColumnBody) or a lead ID (another card)
    const newStatus = (COLUMNS.find(c => c.id === over.id)?.id) ||
      (leads.find(l => l.id === over.id)?.status)

    if (!newStatus || activeStatus === newStatus) return

    // Won: don't save yet — let the parent show the conversion modal
    if (newStatus === 'Won' && activeLead) {
      onWon?.(activeLead)
      return
    }

    setLeads(prev => prev.map(l => l.id === active.id ? { ...l, status: newStatus } : l))
    await supabase.from('leads').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', active.id)
  }

  const activeLead = activeId ? leads.find(l => l.id === activeId) : null

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 h-full overflow-x-auto pb-4">
        {COLUMNS.map(col => {
          const colLeads = leads.filter(l => l.status === col.id)
          return (
            <div key={col.id} className="flex-shrink-0 w-64 flex flex-col h-full min-h-0">
              {/* Column header — stays pinned while cards scroll below */}
              <div
                className="flex items-center justify-between mb-3 flex-shrink-0 px-3 py-2.5 rounded-xl"
                style={{ background: col.bg, borderTop: `3px solid ${col.color}` }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{col.label}</span>
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: col.badge, color: col.color }}
                  >
                    {colLeads.length}
                  </span>
                </div>
                <button
                  onClick={() => onAddLead(col.id)}
                  className="p-1 rounded-lg transition-colors hover:bg-white/40"
                  style={{ color: col.color }}
                >
                  <Plus size={14} />
                </button>
              </div>

              {/* Scrollable column body */}
              <div className="flex-1 overflow-y-auto min-h-0 pb-2">
                <SortableContext items={colLeads.map(l => l.id)} strategy={verticalListSortingStrategy}>
                  <DroppableColumnBody colId={col.id} leads={colLeads}>
                    <AnimatePresence>
                      {colLeads.map(lead => (
                        <LeadCard key={lead.id} lead={lead} userId={userId} onEdit={onEdit} />
                      ))}
                    </AnimatePresence>
                    {colLeads.length === 0 && (
                      <div className="text-center py-6 text-xs text-muted-foreground">Drop here</div>
                    )}
                  </DroppableColumnBody>
                </SortableContext>
              </div>
            </div>
          )
        })}
      </div>

      <DragOverlay>
        {activeLead && (
          <div className="bg-card border border-primary rounded-xl p-4 shadow-xl w-64 opacity-90">
            <p className="text-sm font-semibold text-foreground">{toTitleCase(activeLead.name)}</p>
            {activeLead.phone && <p className="text-xs text-muted-foreground mt-1">{activeLead.phone}</p>}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
