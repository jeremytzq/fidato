'use client'

import { useState, useCallback } from 'react'
import { DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { motion, AnimatePresence } from 'framer-motion'
import { Phone, MessageCircle, Plus, MoreHorizontal, Calendar } from 'lucide-react'
import type { Lead, LeadStatus } from '@/types'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency, formatDate } from '@/utils/format'
import { createClient } from '@/lib/supabase/client'

const COLUMNS: { id: LeadStatus; label: string; color: string; bg: string }[] = [
  { id: 'New', label: 'New', color: 'hsl(235, 75%, 60%)', bg: 'hsl(235, 75%, 60%, 0.06)' },
  { id: 'Contacted', label: 'Contacted', color: 'hsl(280, 65%, 60%)', bg: 'hsl(280, 65%, 60%, 0.06)' },
  { id: 'Qualified', label: 'Qualified', color: 'hsl(38, 92%, 50%)', bg: 'hsl(38, 92%, 50%, 0.06)' },
  { id: 'Negotiating', label: 'Negotiating', color: 'hsl(25, 95%, 53%)', bg: 'hsl(25, 95%, 53%, 0.06)' },
  { id: 'Won', label: 'Won', color: 'hsl(142, 71%, 45%)', bg: 'hsl(142, 71%, 45%, 0.06)' },
  { id: 'Lost', label: 'Lost', color: 'hsl(0, 84%, 60%)', bg: 'hsl(0, 84%, 60%, 0.06)' },
]

function LeadCard({ lead, onEdit }: { lead: Lead; onEdit: (l: Lead) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: lead.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <motion.div
        layout
        whileHover={{ y: -1, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
        className="bg-card border border-border rounded-xl p-4 cursor-grab active:cursor-grabbing space-y-3"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary flex-shrink-0">
              {lead.name[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{lead.name}</p>
              {lead.property_type && (
                <p className="text-xs text-muted-foreground">{lead.property_type}</p>
              )}
            </div>
          </div>
          <button
            onPointerDown={e => e.stopPropagation()}
            onClick={() => onEdit(lead)}
            className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground"
          >
            <MoreHorizontal size={14} />
          </button>
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

        {lead.source && (
          <p className="text-xs text-muted-foreground">Source: {lead.source}</p>
        )}

        <div className="flex gap-2 pt-1" onPointerDown={e => e.stopPropagation()}>
          {lead.phone && (
            <a
              href={`tel:${lead.phone}`}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
            >
              <Phone size={11} /> Call
            </a>
          )}
          {lead.phone && (
            <a
              href={`https://wa.me/65${lead.phone.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
            >
              <MessageCircle size={11} /> WhatsApp
            </a>
          )}
        </div>
      </motion.div>
    </div>
  )
}

export function KanbanBoard({ initialLeads, onEdit, onAddLead }: { initialLeads: Lead[]; onEdit: (l: Lead) => void; onAddLead: (status: LeadStatus) => void }) {
  const [leads, setLeads] = useState(initialLeads)
  const [activeId, setActiveId] = useState<string | null>(null)
  const supabase = createClient()

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const getColumn = (id: string) => leads.find(l => l.id === id)?.status

  const handleDragStart = ({ active }: any) => setActiveId(active.id)

  const handleDragEnd = useCallback(async ({ active, over }: any) => {
    setActiveId(null)
    if (!over) return

    const activeStatus = getColumn(active.id)
    // over could be a column id or a card id
    const newStatus = (COLUMNS.find(c => c.id === over.id)?.id) ||
      (leads.find(l => l.id === over.id)?.status)

    if (!newStatus || activeStatus === newStatus) return

    setLeads(prev => prev.map(l => l.id === active.id ? { ...l, status: newStatus } : l))
    await supabase.from('leads').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', active.id)
  }, [leads, supabase])

  const activeLead = activeId ? leads.find(l => l.id === activeId) : null

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4 min-h-0">
        {COLUMNS.map(col => {
          const colLeads = leads.filter(l => l.status === col.id)
          return (
            <div key={col.id} className="flex-shrink-0 w-64">
              {/* Column header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: col.color }} />
                  <span className="text-sm font-semibold text-foreground">{col.label}</span>
                  <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{colLeads.length}</span>
                </div>
                <button
                  onClick={() => onAddLead(col.id)}
                  className="p-1 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                >
                  <Plus size={14} />
                </button>
              </div>

              {/* Column body */}
              <SortableContext items={colLeads.map(l => l.id)} strategy={verticalListSortingStrategy}>
                <div
                  id={col.id}
                  className="space-y-3 min-h-24 rounded-xl p-2 transition-colors"
                  style={{ background: colLeads.length === 0 ? 'hsl(var(--muted) / 0.4)' : 'transparent' }}
                >
                  <AnimatePresence>
                    {colLeads.map(lead => (
                      <LeadCard key={lead.id} lead={lead} onEdit={onEdit} />
                    ))}
                  </AnimatePresence>
                  {colLeads.length === 0 && (
                    <div className="text-center py-6 text-xs text-muted-foreground">Drop here</div>
                  )}
                </div>
              </SortableContext>
            </div>
          )
        })}
      </div>

      <DragOverlay>
        {activeLead && (
          <div className="bg-card border border-primary rounded-xl p-4 shadow-xl w-64 opacity-90">
            <p className="text-sm font-semibold text-foreground">{activeLead.name}</p>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
