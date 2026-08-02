'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { KanbanBoard } from '@/components/leads/KanbanBoard'
import { LeadModal } from '@/components/leads/LeadModal'
import { Button } from '@/components/ui/Button'
import { Plus } from 'lucide-react'
import type { Lead, LeadStatus } from '@/types'

export default function LeadsClient({ initialLeads, userId }: { initialLeads: Lead[]; userId: string }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [defaultStatus, setDefaultStatus] = useState<LeadStatus>('New')

  const openAdd = (status: LeadStatus = 'New') => {
    setEditingLead(null)
    setDefaultStatus(status)
    setModalOpen(true)
  }

  const openEdit = (lead: Lead) => {
    setEditingLead(lead)
    setModalOpen(true)
  }

  const handleSaved = () => {
    startTransition(() => router.refresh())
  }

  return (
    <div className="p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Leads</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{initialLeads.length} total leads in your pipeline</p>
        </div>
        <Button onClick={() => openAdd()}>
          <Plus size={15} />
          Add Lead
        </Button>
      </div>

      <div className="flex-1 overflow-x-auto">
        <KanbanBoard
          initialLeads={initialLeads}
          onEdit={openEdit}
          onAddLead={openAdd}
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
    </div>
  )
}
