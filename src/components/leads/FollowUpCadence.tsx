'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CADENCE_STEPS, getStepConfig, fillTemplate } from '@/lib/cadence'
import { Phone, Voicemail, MessageCircle, CheckCircle2, SkipForward, Clock, Copy, Check } from 'lucide-react'
import { cn } from '@/utils/cn'
import type { CadenceFollowUp, Lead } from '@/types'

const CHANNEL_ICON = {
  call: Phone,
  voicemail: Voicemail,
  whatsapp: MessageCircle,
}

const CHANNEL_LABEL = {
  call: 'Call',
  voicemail: 'Voicemail',
  whatsapp: 'WhatsApp',
}

const CHANNEL_COLOR = {
  call: 'text-blue-600',
  voicemail: 'text-purple-600',
  whatsapp: 'text-green-600',
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })
}

function isOverdue(dateStr: string): boolean {
  return dateStr < new Date().toISOString().split('T')[0]
}

interface FollowUpCadenceProps {
  lead: Lead
  userId: string
}

export function FollowUpCadence({ lead, userId }: FollowUpCadenceProps) {
  const supabase = createClient()
  const [followUps, setFollowUps] = useState<CadenceFollowUp[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)
  const [updating, setUpdating] = useState<string | null>(null)

  const fetchCadence = useCallback(async () => {
    const { data } = await supabase
      .from('cadence_follow_ups')
      .select('*')
      .eq('lead_id', lead.id)
      .order('attempt_number', { ascending: true })
    setFollowUps((data as CadenceFollowUp[]) || [])
    setLoading(false)
  }, [lead.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchCadence() }, [fetchCadence])

  const updateStatus = async (id: string, status: 'done' | 'skipped') => {
    setUpdating(id)
    await supabase.from('cadence_follow_ups').update({
      status,
      completed_at: status === 'done' ? new Date().toISOString() : null,
    }).eq('id', id)
    setFollowUps(prev => prev.map(f => f.id === id ? { ...f, status } : f))
    setUpdating(null)
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return null
  if (followUps.length === 0) return null

  const currentStep = followUps.find(f => f.status === 'pending')
  const doneCount = followUps.filter(f => f.status === 'done').length

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">Cold Lead Cadence</p>
        <span className="text-xs text-muted-foreground">{doneCount}/{followUps.length} complete</span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${(doneCount / followUps.length) * 100}%` }}
        />
      </div>

      <div className="space-y-1">
        {followUps.map(fu => {
          const config = getStepConfig(fu.attempt_number)
          if (!config) return null
          const Icon = CHANNEL_ICON[fu.channel]
          const isExpanded = expanded === fu.attempt_number
          const overdue = fu.status === 'pending' && isOverdue(fu.scheduled_date)
          const isCurrent = currentStep?.id === fu.id
          const template = config.waTemplate
            ? fillTemplate(config.waTemplate, lead.display_name || lead.name)
            : config.callScript
              ? fillTemplate(config.callScript, lead.display_name || lead.name)
              : null

          return (
            <div key={fu.id}>
              <button
                type="button"
                onClick={() => setExpanded(isExpanded ? null : fu.attempt_number)}
                className={cn(
                  'w-full flex items-center gap-2.5 py-1.5 px-2 rounded-lg text-left transition-colors',
                  fu.status === 'done' ? 'opacity-50' : '',
                  isCurrent ? 'bg-primary/5 border border-primary/20' : 'hover:bg-muted/50'
                )}
              >
                {/* Status icon */}
                {fu.status === 'done' ? (
                  <CheckCircle2 size={14} className="text-green-500 flex-shrink-0" />
                ) : fu.status === 'skipped' ? (
                  <SkipForward size={14} className="text-muted-foreground flex-shrink-0" />
                ) : (
                  <Clock size={14} className={cn('flex-shrink-0', overdue ? 'text-red-500' : isCurrent ? 'text-primary' : 'text-muted-foreground')} />
                )}

                {/* Channel icon */}
                <Icon size={12} className={cn('flex-shrink-0', CHANNEL_COLOR[fu.channel])} />

                {/* Label */}
                <span className={cn('text-xs flex-1 truncate', isCurrent ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
                  {config.label}
                </span>

                {/* Date */}
                <span className={cn('text-xs flex-shrink-0', overdue ? 'text-red-500 font-medium' : 'text-muted-foreground')}>
                  {overdue ? 'Overdue' : formatDate(fu.scheduled_date)}
                </span>
              </button>

              {/* Expanded panel */}
              {isExpanded && fu.status === 'pending' && template && (
                <div className="mx-2 mb-1 rounded-lg bg-muted/50 border border-border p-3 space-y-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    <Icon size={11} className={CHANNEL_COLOR[fu.channel]} />
                    {CHANNEL_LABEL[fu.channel]} {fu.channel === 'whatsapp' ? 'Template' : 'Script'}
                  </div>
                  <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{template}</p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleCopy(template)}
                      className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
                    >
                      {copied ? <Check size={11} /> : <Copy size={11} />}
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                    <div className="flex gap-1.5 ml-auto">
                      <button
                        type="button"
                        disabled={updating === fu.id}
                        onClick={() => updateStatus(fu.id, 'skipped')}
                        className="text-xs px-2.5 py-1 rounded-md border border-border text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
                      >
                        Skip
                      </button>
                      <button
                        type="button"
                        disabled={updating === fu.id}
                        onClick={() => updateStatus(fu.id, 'done')}
                        className="text-xs px-2.5 py-1 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                      >
                        Mark Done
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
