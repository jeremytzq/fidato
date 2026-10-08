import type { SupabaseClient } from '@supabase/supabase-js'
import type { CadenceChannel } from '@/types'

export interface CadenceStep {
  attempt: number
  dayOffset: number
  channel: CadenceChannel
  label: string
  callScript: string | null
  waTemplate: string | null
}

export const CADENCE_STEPS: CadenceStep[] = [
  {
    attempt: 1,
    dayOffset: 0,
    channel: 'call',
    label: 'Call 1',
    callScript: `Hi, is this {{client_name}}? It's {{agent_name}} from {{agency}}. You got in touch{{project_clause}}. Have you got a minute?`,
    waTemplate: null,
  },
  {
    attempt: 2,
    dayOffset: 2,
    channel: 'call',
    label: 'Call 2',
    callScript: `Hi {{client_name}}, it's {{agent_name}}. I called a couple of days ago{{project_clause}}. Is this still a good time?`,
    waTemplate: null,
  },
  {
    attempt: 3,
    dayOffset: 5,
    channel: 'voicemail',
    label: 'Voicemail',
    callScript: `Hi {{client_name}}, it's {{agent_name}} from {{agency}}. Sorry I missed you{{project_clause}}. I'll WhatsApp you so you can reply when you're free.`,
    waTemplate: null,
  },
  {
    attempt: 4,
    dayOffset: 9,
    channel: 'whatsapp',
    label: 'WhatsApp',
    callScript: null,
    waTemplate: `Hi {{client_name}}, {{agent_name}} from {{agency}}. I tried calling{{project_clause}} and didn't want to keep ringing. Reply whenever you're free.`,
  },
  {
    attempt: 5,
    dayOffset: 13,
    channel: 'call',
    label: 'Call 3',
    callScript: `Hi {{client_name}}, it's {{agent_name}} from {{agency}}. Did my last message reach you? If now is a bad time, just say so.`,
    waTemplate: null,
  },
  {
    attempt: 6,
    dayOffset: 17,
    channel: 'whatsapp',
    label: 'WhatsApp check-in',
    callScript: null,
    waTemplate: `Hi {{client_name}}, {{agent_name}} here. Happy to talk{{project_clause}} if it's still useful. If you've moved on, no need to reply.`,
  },
  {
    attempt: 7,
    dayOffset: 23,
    channel: 'call',
    label: 'Call 4',
    callScript: `Hi {{client_name}}, it's {{agent_name}} from {{agency}}. I'll stop after this. If you want to talk{{project_clause}} later, I'm around.`,
    waTemplate: null,
  },
  {
    attempt: 8,
    dayOffset: 29,
    channel: 'whatsapp',
    label: 'Last note',
    callScript: null,
    waTemplate: `Hi {{client_name}}, {{agent_name}} from {{agency}}. Last note from me. Message me if you want to pick this up later.`,
  },
]

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export async function scheduleCadence(
  supabase: SupabaseClient,
  userId: string,
  leadId: string,
  startDate: Date = new Date()
) {
  const rows = CADENCE_STEPS.map(step => ({
    user_id: userId,
    lead_id: leadId,
    attempt_number: step.attempt,
    scheduled_date: addDays(startDate, step.dayOffset).toISOString().split('T')[0],
    channel: step.channel,
    status: 'pending',
  }))
  return supabase.from('cadence_follow_ups').insert(rows)
}

export function getStepConfig(attempt: number): CadenceStep | undefined {
  return CADENCE_STEPS.find(s => s.attempt === attempt)
}

export interface TemplateContext {
  clientName: string
  agentName?: string
  agencyName?: string
  project?: string | null
}

export function fillTemplate(template: string, clientNameOrContext: string | TemplateContext): string {
  const ctx: TemplateContext = typeof clientNameOrContext === 'string'
    ? { clientName: clientNameOrContext }
    : clientNameOrContext
  const project = ctx.project?.trim() || ''
  return template
    .replace(/{{client_name}}/g, ctx.clientName)
    .replace(/{{agent_name}}/g, ctx.agentName?.trim() || 'your consultant')
    .replace(/{{agency}}/g, ctx.agencyName?.trim() || 'our agency')
    .replace(/{{project_clause}}/g, project ? ` about ${project}` : '')
    .replace(/{{project}}/g, project || 'the home you asked about')
}

export function scriptForStep(attempt: number, ctx: TemplateContext): string | null {
  const step = getStepConfig(attempt)
  const raw = step?.waTemplate || step?.callScript
  if (!raw) return null
  return fillTemplate(raw, ctx)
}
