'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Phone, Voicemail, MessageCircle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/utils/cn'
import type { CadenceFollowUp } from '@/types'

type FollowUpWithLead = CadenceFollowUp & {
  leads: { name: string; phone: string | null; display_name: string | null } | null
}

const CHANNEL_ICON = {
  call: Phone,
  voicemail: Voicemail,
  whatsapp: MessageCircle,
}

const CHANNEL_COLOR = {
  call: 'text-blue-600 bg-blue-50',
  voicemail: 'text-purple-600 bg-purple-50',
  whatsapp: 'text-green-600 bg-green-50',
}

function formatDate(dateStr: string): string {
  const today = new Date().toISOString().split('T')[0]
  if (dateStr === today) return 'Today'
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })
}

interface TodayFollowUpsProps {
  initialData: FollowUpWithLead[]
}

export function TodayFollowUps({ initialData }: TodayFollowUpsProps) {
  const supabase = createClient()
  const [items, setItems] = useState<FollowUpWithLead[]>(initialData)
  const [marking, setMarking] = useState<string | null>(null)

  const markDone = async (id: string) => {
    setMarking(id)
    await supabase.from('cadence_follow_ups').update({
      status: 'done',
      completed_at: new Date().toISOString(),
    }).eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
    setMarking(null)
  }

  if (items.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Today&apos;s Follow-Ups</CardTitle>
        <span className="text-xs text-muted-foreground">{items.length} pending</span>
      </CardHeader>
      <div className="space-y-2">
        {items.map(item => {
          const Icon = CHANNEL_ICON[item.channel]
          const overdue = item.scheduled_date < new Date().toISOString().split('T')[0]
          const leadName = item.leads?.display_name || item.leads?.name || 'Unknown Lead'

          return (
            <div key={item.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
              <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0', CHANNEL_COLOR[item.channel])}>
                <Icon size={13} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{leadName}</p>
                <p className="text-xs text-muted-foreground">
                  Attempt {item.attempt_number} · {item.channel === 'call' ? 'Call' : item.channel === 'voicemail' ? 'Voicemail' : 'WhatsApp'}
                  {item.leads?.phone && item.channel !== 'whatsapp' && (
                    <span> · {item.leads.phone}</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={cn('text-xs', overdue ? 'text-red-500 font-medium' : 'text-muted-foreground')}>
                  {formatDate(item.scheduled_date)}
                </span>
                <button
                  type="button"
                  disabled={marking === item.id}
                  onClick={() => markDone(item.id)}
                  className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-green-100 text-muted-foreground hover:text-green-600 transition-colors disabled:opacity-50"
                  title="Mark done"
                >
                  <CheckCircle2 size={15} />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
