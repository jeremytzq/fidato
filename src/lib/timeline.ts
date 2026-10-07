import { toInternationalDigits } from '@/lib/phone'

export type TimelineKind = 'activity' | 'cadence' | 'created'

export interface TimelineActivity {
  id: string
  action: string
  created_at: string
}

export interface TimelineFollowUp {
  id: string
  attempt_number: number
  channel: string
  status: string
  notes: string | null
  completed_at: string | null
  scheduled_date: string
}

export interface TimelineEvent {
  id: string
  at: string
  label: string
  kind: TimelineKind
}

export interface LeadPhoneMatch {
  id: string
  phone: string | null
  whatsapp_number?: string | null
  status: string
  updated_at: string
  created_at: string
}

function channelLabel(channel: string): string {
  if (channel === 'whatsapp') return 'WhatsApp'
  if (channel === 'voicemail') return 'Voicemail'
  return 'Call'
}

function cadenceLabel(step: TimelineFollowUp): string {
  const outcome = step.notes?.trim() || (step.status === 'skipped' ? 'Skipped' : 'Done')
  return `${channelLabel(step.channel)} #${step.attempt_number}: ${outcome}`
}

export function buildTimeline(input: {
  createdAt?: string | null
  activities: TimelineActivity[]
  followUps?: TimelineFollowUp[]
}): TimelineEvent[] {
  const events: TimelineEvent[] = input.activities.map(activity => ({
    id: `activity:${activity.id}`,
    at: activity.created_at,
    label: activity.action,
    kind: 'activity',
  }))

  for (const step of input.followUps ?? []) {
    if (step.status !== 'done' && step.status !== 'skipped') continue
    const covered = input.activities.some(activity => activity.action.includes(`Follow-up #${step.attempt_number}`))
    if (covered) continue
    events.push({
      id: `cadence:${step.id}`,
      at: step.completed_at || `${step.scheduled_date}T00:00:00.000Z`,
      label: cadenceLabel(step),
      kind: 'cadence',
    })
  }

  if (input.createdAt) {
    events.push({
      id: 'created',
      at: input.createdAt,
      label: 'Lead added',
      kind: 'created',
    })
  }

  return events.sort((a, b) => b.at.localeCompare(a.at))
}

export function matchLeadForClient<T extends LeadPhoneMatch>(
  clientPhone: string | null | undefined,
  leads: T[],
): T | null {
  const target = toInternationalDigits(clientPhone)
  if (!target) return null
  const matches = leads.filter(lead => {
    const phones = [lead.phone, lead.whatsapp_number].map(toInternationalDigits)
    return phones.includes(target)
  })
  if (matches.length === 0) return null
  matches.sort((a, b) => {
    const wonDelta = (a.status === 'Won' ? 0 : 1) - (b.status === 'Won' ? 0 : 1)
    if (wonDelta !== 0) return wonDelta
    return b.updated_at.localeCompare(a.updated_at)
  })
  return matches[0]
}
