'use client'

import { useState, useEffect } from 'react'
import { DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors, useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus } from 'lucide-react'
import type { Lead, LeadStatus, AutomationSettings } from '@/types'
import { toTitleCase } from '@/utils/format'
import { createClient } from '@/lib/supabase/client'
import { logActivity } from '@/lib/activity'
import { getAutomationSettings } from '@/lib/automations'
import { cn } from '@/utils/cn'
import { LeadCardContent, LEAD_STATUSES, Pill, type CardDensity } from './LeadCardContent'

export type { CardDensity }

// Registers the column body as a drop target so empty columns accept drops
function DroppableColumnBody({ colId, density = 'comfortable', children }: {
  colId: LeadStatus
  density?: CardDensity
  children: React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id: colId })
  return (
    <div
      ref={setNodeRef}
      className={cn(
        density === 'compact' ? 'space-y-1.5' : 'space-y-2.5',
        'min-h-24 rounded-lg p-0.5 transition-colors',
        isOver && 'bg-primary/5 ring-1 ring-primary/30'
      )}
    >
      {children}
    </div>
  )
}

function LeadCard({ lead, userId, onEdit, onHoverChange, density = 'comfortable' }: {
  lead: Lead
  userId: string
  onEdit: (l: Lead) => void
  onHoverChange?: (id: string | null) => void
  density?: CardDensity
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: lead.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="cursor-grab active:cursor-grabbing"
      onMouseEnter={() => onHoverChange?.(lead.id)}
      onMouseLeave={() => onHoverChange?.(null)}
    >
      <LeadCardContent lead={lead} userId={userId} onEdit={onEdit} density={density} />
    </div>
  )
}

export function KanbanBoard({ initialLeads, userId, onEdit, onAddLead, onWon, onHoverLead, density = 'comfortable' }: {
  initialLeads: Lead[]
  userId: string
  onEdit: (l: Lead) => void
  onAddLead: (status: LeadStatus) => void
  onWon?: (lead: Lead) => void
  onHoverLead?: (id: string | null) => void
  density?: CardDensity
}) {
  const [leads, setLeads] = useState(initialLeads)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [automation, setAutomation] = useState<AutomationSettings | null>(null)
  const supabase = createClient()

  // Sync with parent when server refreshes data after a save
  useEffect(() => {
    setLeads(initialLeads)
  }, [initialLeads])

  useEffect(() => {
    getAutomationSettings(userId).then(setAutomation)
  }, [userId])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const handleDragStart = ({ active }: any) => setActiveId(active.id)

  const handleDragEnd = async ({ active, over }: any) => {
    setActiveId(null)
    if (!over) return

    const activeLead = leads.find(l => l.id === active.id)
    const activeStatus = activeLead?.status
    // over.id is either a column ID (DroppableColumnBody) or a lead ID (another card)
    const newStatus = (LEAD_STATUSES.find(c => c.id === over.id)?.id) ||
      (leads.find(l => l.id === over.id)?.status)

    if (!newStatus || activeStatus === newStatus) return

    // Won: don't save yet — let the parent show the conversion modal
    if (newStatus === 'Won' && activeLead) {
      onWon?.(activeLead)
      return
    }

    setLeads(prev => prev.map(l => l.id === active.id ? { ...l, status: newStatus } : l))
    await supabase.from('leads').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', active.id)

    if (automation?.auto_create_activity) {
      logActivity(userId, active.id, `Stage changed to ${newStatus}`)
    }
    if (
      automation?.stage_notification &&
      automation.notify_stages.includes(newStatus) &&
      typeof Notification !== 'undefined' &&
      Notification.permission === 'granted'
    ) {
      new Notification(`${activeLead?.name ? toTitleCase(activeLead.name) : 'Lead'} moved to ${newStatus}`, {
        body: `Stage changed to ${newStatus}`,
        icon: '/favicon.ico',
        tag: `stage-${active.id}-${newStatus}`,
      })
    }
  }

  const activeLead = activeId ? leads.find(l => l.id === activeId) : null

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-5 h-full overflow-x-auto pb-4">
        {LEAD_STATUSES.map(col => {
          const colLeads = leads.filter(l => l.status === col.id)
          return (
            <div key={col.id} className="flex-shrink-0 w-[250px] flex flex-col h-full min-h-0">
              {/* Column header — stays pinned while cards scroll below */}
              <div className="flex items-center justify-between mb-2 flex-shrink-0 h-7">
                <div className="flex items-center gap-2">
                  <Pill hue={col.hue} className="text-[12px] px-2">{col.label}</Pill>
                  <span className="text-xs text-muted-foreground numeric">{colLeads.length}</span>
                </div>
                <button
                  onClick={() => onAddLead(col.id)}
                  title={`Add ${col.label} lead`}
                  className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                >
                  <Plus size={14} />
                </button>
              </div>

              {/* Scrollable column body */}
              <div className="flex-1 overflow-y-auto min-h-0 pb-2">
                <SortableContext items={colLeads.map(l => l.id)} strategy={verticalListSortingStrategy}>
                  <DroppableColumnBody colId={col.id} density={density}>
                    {colLeads.map(lead => (
                      <LeadCard key={lead.id} lead={lead} userId={userId} onEdit={onEdit} onHoverChange={onHoverLead} density={density} />
                    ))}
                  </DroppableColumnBody>
                </SortableContext>
              </div>
            </div>
          )
        })}
      </div>

      <DragOverlay>
        {activeLead && (
          <div className="w-[250px] rotate-1 shadow-xl rounded-md cursor-grabbing">
            <LeadCardContent lead={activeLead} userId={userId} onEdit={() => {}} density={density} actionsAlwaysVisible />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
