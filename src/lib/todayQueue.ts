import { getStepConfig, scriptForStep, fillTemplate, type TemplateContext } from '@/lib/cadence'
import type { CadenceChannel } from '@/types'

export { telHref, toInternationalDigits, whatsAppHref } from '@/lib/phone'

export const STALE_NEGOTIATING_DAYS = 5
export const FRESH_META_MS = 48 * 60 * 60 * 1000

export type QueueReason = 'cadence' | 'fresh_meta' | 'stalled' | 'birthday'

export interface QueueLeadInput {
  id: string
  name: string
  display_name: string | null
  phone: string | null
  whatsapp_number: string | null
  status: string
  meta_leadgen_id: string | null
  project_interested: string | null
  updated_at: string
  created_at: string
  birthday: string | null
}

export interface QueueFollowUpInput {
  id: string
  lead_id: string
  attempt_number: number
  scheduled_date: string
  channel: CadenceChannel
  status: string
}

export interface AgentVoice {
  agentName: string
  agencyName: string
}

export interface TodayQueueItem {
  id: string
  reason: QueueReason
  rank: number
  sortKey: string
  leadId: string
  leadName: string
  leadStatus: string
  phone: string | null
  title: string
  detail: string
  script: string | null
  channel: CadenceChannel | null
  cadenceId: string | null
  attemptNumber: number | null
  overdue: boolean
}

export function compareQueueItems(a: TodayQueueItem, b: TodayQueueItem): number {
  if (a.rank !== b.rank) return a.rank - b.rank
  if (a.rank === 1) return b.sortKey.localeCompare(a.sortKey)
  return a.sortKey.localeCompare(b.sortKey)
}

function leadName(lead: QueueLeadInput): string {
  return lead.display_name?.trim() || lead.name
}

function leadPhone(lead: QueueLeadInput): string | null {
  return lead.whatsapp_number || lead.phone
}

function dateOnly(value: string): string {
  return value.slice(0, 10)
}

function daysBetween(earlier: string, later: string): number {
  const a = Date.parse(`${dateOnly(earlier)}T00:00:00Z`)
  const b = Date.parse(`${dateOnly(later)}T00:00:00Z`)
  if (Number.isNaN(a) || Number.isNaN(b)) return 0
  return Math.round((b - a) / 86400000)
}

function isBirthday(lead: QueueLeadInput, today: string): boolean {
  if (!lead.birthday) return false
  const parts = lead.birthday.split('-')
  if (parts.length < 3) return false
  const month = parts[1]
  const day = parts[2]
  return today.slice(5) === `${month}-${day}`
}

function voiceContext(lead: QueueLeadInput, voice: AgentVoice): TemplateContext {
  return {
    clientName: leadName(lead),
    agentName: voice.agentName,
    agencyName: voice.agencyName,
    project: lead.project_interested,
  }
}

function checkInScript(lead: QueueLeadInput, voice: AgentVoice): string {
  return fillTemplate(
    `Hi {{client_name}}, it's {{agent_name}} from {{agency}}. Checking in{{project_clause}}. Tell me if the timing has changed.`,
    voiceContext(lead, voice),
  )
}

function birthdayScript(lead: QueueLeadInput, voice: AgentVoice): string {
  return fillTemplate(
    `Hi {{client_name}}, it's {{agent_name}}. Happy birthday.`,
    voiceContext(lead, voice),
  )
}

export function buildTodayQueue(input: {
  today: string
  now: Date
  voice: AgentVoice
  leads: QueueLeadInput[]
  followUps: QueueFollowUpInput[]
  touchedLeadIds?: string[]
}): TodayQueueItem[] {
  const touched = new Set(input.touchedLeadIds ?? [])
  const leadsById = new Map(input.leads.map(lead => [lead.id, lead]))
  const byLead = new Map<string, TodayQueueItem>()

  const pending = input.followUps
    .filter(step => step.status === 'pending' && step.scheduled_date <= input.today)
    .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date) || a.attempt_number - b.attempt_number)

  for (const step of pending) {
    const lead = leadsById.get(step.lead_id)
    if (!lead || lead.status === 'Won' || lead.status === 'Lost') continue
    if (byLead.has(lead.id)) continue
    const config = getStepConfig(step.attempt_number)
    const overdue = step.scheduled_date < input.today
    const late = overdue ? daysBetween(step.scheduled_date, input.today) : 0
    const item: TodayQueueItem = {
      id: `cadence:${step.id}`,
      reason: 'cadence',
      rank: overdue ? 0 : 2,
      sortKey: `${step.scheduled_date}:${String(step.attempt_number).padStart(2, '0')}`,
      leadId: lead.id,
      leadName: leadName(lead),
      leadStatus: lead.status,
      phone: leadPhone(lead),
      title: config?.label ?? `Follow-up #${step.attempt_number}`,
      detail: overdue ? `Overdue ${late} day${late === 1 ? '' : 's'}` : 'Due today',
      script: scriptForStep(step.attempt_number, voiceContext(lead, input.voice)),
      channel: step.channel,
      cadenceId: step.id,
      attemptNumber: step.attempt_number,
      overdue,
    }
    if (isBirthday(lead, input.today)) item.detail = `${item.detail} · Birthday today`
    byLead.set(lead.id, item)
  }

  for (const lead of input.leads) {
    if (byLead.has(lead.id) || touched.has(lead.id) || lead.status === 'Lost') continue
    const created = Date.parse(lead.created_at)
    const freshMeta = lead.status === 'New'
      && !!lead.meta_leadgen_id
      && !Number.isNaN(created)
      && input.now.getTime() - created <= FRESH_META_MS
      && input.now.getTime() - created >= 0
    if (freshMeta) {
      byLead.set(lead.id, {
        id: `meta:${lead.id}`,
        reason: 'fresh_meta',
        rank: 1,
        sortKey: lead.created_at,
        leadId: lead.id,
        leadName: leadName(lead),
        leadStatus: lead.status,
        phone: leadPhone(lead),
        title: 'New Meta lead',
        detail: 'New enquiry',
        script: scriptForStep(1, voiceContext(lead, input.voice)),
        channel: 'call',
        cadenceId: null,
        attemptNumber: null,
        overdue: false,
      })
      continue
    }

    const quiet = daysBetween(lead.updated_at, input.today)
    if (lead.status === 'Negotiating' && quiet >= STALE_NEGOTIATING_DAYS) {
      byLead.set(lead.id, {
        id: `stalled:${lead.id}`,
        reason: 'stalled',
        rank: 3,
        sortKey: dateOnly(lead.updated_at),
        leadId: lead.id,
        leadName: leadName(lead),
        leadStatus: lead.status,
        phone: leadPhone(lead),
        title: 'Stalled negotiation',
        detail: `No update in ${quiet} days`,
        script: checkInScript(lead, input.voice),
        channel: 'whatsapp',
        cadenceId: null,
        attemptNumber: null,
        overdue: false,
      })
      continue
    }

    if (isBirthday(lead, input.today)) {
      byLead.set(lead.id, {
        id: `birthday:${lead.id}`,
        reason: 'birthday',
        rank: 4,
        sortKey: leadName(lead).toLowerCase(),
        leadId: lead.id,
        leadName: leadName(lead),
        leadStatus: lead.status,
        phone: leadPhone(lead),
        title: 'Birthday today',
        detail: 'Send a short note',
        script: birthdayScript(lead, input.voice),
        channel: 'whatsapp',
        cadenceId: null,
        attemptNumber: null,
        overdue: false,
      })
    }
  }

  return Array.from(byLead.values()).sort(compareQueueItems)
}
