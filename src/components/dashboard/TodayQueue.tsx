'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Phone, MessageCircle, ChevronDown } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { telHref, whatsAppHref, type TodayQueueItem } from '@/lib/todayQueue'
import { OUTCOME_LABEL, completeCadenceStep, touchLead, type FollowUpOutcome } from '@/lib/followUpActions'
import { logActivity } from '@/lib/activity'
import { cn } from '@/utils/cn'

const OUTCOMES: FollowUpOutcome[] = ['connected', 'no_answer', 'voicemail', 'replied']

interface TodayQueueProps {
  items: TodayQueueItem[]
  userId: string
  readOnly?: boolean
}

export function TodayQueue({ items: initialItems, userId, readOnly = false }: TodayQueueProps) {
  const [items, setItems] = useState(initialItems)
  const [openId, setOpenId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const finish = async (item: TodayQueueItem, outcome: FollowUpOutcome) => {
    setBusyId(item.id)
    setErrors(prev => {
      const next = { ...prev }
      delete next[item.id]
      return next
    })
    try {
      if (!readOnly) {
        if (item.cadenceId && item.attemptNumber && item.channel) {
          await completeCadenceStep({
            userId,
            leadId: item.leadId,
            cadenceId: item.cadenceId,
            attemptNumber: item.attemptNumber,
            channel: item.channel,
            outcome,
          })
        } else {
          await touchLead({
            userId,
            leadId: item.leadId,
            outcome,
            currentStatus: item.leadStatus,
          })
        }
      }
      setItems(prev => prev.filter(row => row.id !== item.id))
      setOpenId(current => (current === item.id ? null : current))
    } catch (err) {
      setErrors(prev => ({ ...prev, [item.id]: err instanceof Error ? err.message : 'Could not save that outcome' }))
    } finally {
      setBusyId(null)
    }
  }

  const logReachOut = (item: TodayQueueItem, action: string) => {
    if (readOnly) return
    void logActivity(userId, item.leadId, action)
  }

  return (
    <Card className="p-3 sm:p-4">
      <CardHeader className="mb-1">
        <CardTitle className="text-base">Today</CardTitle>
        <span className="text-sm font-medium tabular-nums text-foreground">
          {items.length} to reach
        </span>
      </CardHeader>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">
          Nothing due. Overdue follow-ups, new Meta leads, stalled deals, and birthdays will show up here.
        </p>
      ) : (
        <div className="max-h-[28rem] overflow-y-auto -mx-1">
          {items.map(item => {
            const busy = busyId === item.id
            const open = openId === item.id
            const call = telHref(item.phone)
            const whatsApp = whatsAppHref(item.phone, item.script)
            return (
              <article key={item.id} className="border-b border-border last:border-b-0">
                <div className="flex items-center gap-1.5 px-1 py-1.5">
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setOpenId(open ? null : item.id)}
                    className="flex items-center gap-1.5 min-w-0 flex-1 text-left"
                  >
                    <ChevronDown size={14} className={cn('flex-shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
                    <span className="text-sm font-medium text-foreground truncate">{item.leadName}</span>
                    <span className={cn('text-xs truncate', item.overdue ? 'text-red-600' : 'text-muted-foreground')}>
                      {item.detail}
                    </span>
                  </button>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {call ? (
                      <a
                        href={call}
                        onClick={() => logReachOut(item, 'Called')}
                        title="Call"
                        className="inline-flex items-center justify-center h-7 w-7 rounded-md text-foreground hover:bg-muted"
                      >
                        <Phone size={14} />
                      </a>
                    ) : null}
                    {whatsApp ? (
                      <a
                        href={whatsApp}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => logReachOut(item, 'Sent WhatsApp message')}
                        title="WhatsApp"
                        className="inline-flex items-center justify-center h-7 w-7 rounded-md text-green-700 hover:bg-green-50"
                      >
                        <MessageCircle size={14} />
                      </a>
                    ) : null}
                    {!call && !whatsApp && (
                      <span className="text-[11px] text-muted-foreground">No phone</span>
                    )}
                    <Link
                      href={`/leads?lead=${item.leadId}`}
                      className="inline-flex items-center h-7 px-2 rounded-md text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      Open
                    </Link>
                  </div>
                </div>

                {open && (
                  <div className="pl-7 pr-1 pb-2">
                    {item.title && (
                      <p className="text-[11px] text-muted-foreground mb-1">{item.title}</p>
                    )}
                    {item.script && (
                      <p className="text-xs text-foreground leading-snug">{item.script}</p>
                    )}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {OUTCOMES.map(outcome => (
                        <button
                          key={outcome}
                          type="button"
                          disabled={busy}
                          onClick={() => finish(item, outcome)}
                          className="h-7 px-2 rounded-md border border-border text-[11px] text-foreground hover:bg-muted disabled:opacity-50"
                        >
                          {OUTCOME_LABEL[outcome]}
                        </button>
                      ))}
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => finish(item, 'skipped')}
                        className="h-7 px-2 rounded-md text-[11px] text-muted-foreground hover:bg-muted disabled:opacity-50"
                      >
                        Skip
                      </button>
                    </div>
                    {errors[item.id] && (
                      <p className="text-xs text-red-600 mt-1.5">{errors[item.id]}</p>
                    )}
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}
    </Card>
  )
}
