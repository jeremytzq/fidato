'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Phone, MessageCircle, Check } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { telHref, whatsAppHref, type TodayQueueItem } from '@/lib/todayQueue'
import { OUTCOME_LABEL, completeCadenceStep, touchLead, type FollowUpOutcome } from '@/lib/followUpActions'
import { logActivity } from '@/lib/activity'
import { cn } from '@/utils/cn'

const OUTCOMES: FollowUpOutcome[] = ['connected', 'no_answer', 'voicemail', 'replied']

const REASON_TONE: Record<TodayQueueItem['reason'], string> = {
  cadence: 'bg-blue-50 text-blue-700',
  fresh_meta: 'bg-violet-50 text-violet-700',
  stalled: 'bg-amber-50 text-amber-800',
  birthday: 'bg-rose-50 text-rose-700',
}

interface TodayQueueProps {
  items: TodayQueueItem[]
  userId: string
  readOnly?: boolean
}

export function TodayQueue({ items: initialItems, userId, readOnly = false }: TodayQueueProps) {
  const [items, setItems] = useState(initialItems)
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
    <Card className="p-4 sm:p-5">
      <CardHeader className="mb-3">
        <CardTitle className="text-base">Today</CardTitle>
        <span className="text-xs text-muted-foreground">{items.length} to do</span>
      </CardHeader>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">
          Nothing due. Overdue follow-ups, new Meta leads, stalled deals, and birthdays will show up here.
        </p>
      ) : (
        <div className="space-y-3">
          {items.map(item => {
            const busy = busyId === item.id
            const call = telHref(item.phone)
            const whatsApp = whatsAppHref(item.phone, item.script)
            return (
              <article
                key={item.id}
                className={cn(
                  'rounded-xl border border-border p-3 sm:p-4',
                  item.overdue && 'border-red-200 bg-red-50/40',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{item.leadName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.title}</p>
                  </div>
                  <span className={cn('text-[11px] font-medium rounded-full px-2 py-1 flex-shrink-0 text-right leading-snug max-w-[46%]', item.overdue ? 'bg-red-100 text-red-700' : REASON_TONE[item.reason])}>
                    {item.detail}
                  </span>
                </div>

                {item.script && (
                  <p className="text-xs text-foreground/80 leading-relaxed mt-2 whitespace-pre-wrap">
                    {item.script}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-2 mt-3">
                  {call ? (
                    <a
                      href={call}
                      onClick={() => logReachOut(item, 'Called')}
                      className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-medium"
                    >
                      <Phone size={13} />
                      Call
                    </a>
                  ) : null}
                  {whatsApp ? (
                    <a
                      href={whatsApp}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => logReachOut(item, 'Sent WhatsApp message')}
                      className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-green-600 text-white text-xs font-medium"
                    >
                      <MessageCircle size={13} />
                      WhatsApp
                    </a>
                  ) : null}
                  {!call && !whatsApp && (
                    <span className="text-xs text-muted-foreground">No phone number on this lead</span>
                  )}
                  <Link
                    href={`/leads?lead=${item.leadId}`}
                    className="inline-flex items-center h-9 px-3 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-muted"
                  >
                    Open
                  </Link>
                </div>

                <div className="grid grid-cols-2 gap-1.5 mt-2 sm:flex sm:flex-wrap">
                  {OUTCOMES.map(outcome => (
                    <button
                      key={outcome}
                      type="button"
                      disabled={busy}
                      onClick={() => finish(item, outcome)}
                      className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-border text-xs text-foreground hover:bg-muted disabled:opacity-50"
                    >
                      <Check size={12} />
                      {OUTCOME_LABEL[outcome]}
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => finish(item, 'skipped')}
                    className="h-8 px-2.5 rounded-lg text-xs text-muted-foreground hover:bg-muted disabled:opacity-50"
                  >
                    Skip
                  </button>
                </div>
                {errors[item.id] && (
                  <p className="text-xs text-red-600 mt-2">{errors[item.id]}</p>
                )}
              </article>
            )
          })}
        </div>
      )}
    </Card>
  )
}
