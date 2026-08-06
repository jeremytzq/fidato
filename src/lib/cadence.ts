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
    label: 'Call #1 — First Contact',
    callScript: `Hi, may I speak with {{client_name}}? My name is Jeremy, I'm a property consultant with PropNex. You'd recently enquired about a property, and I'm calling to help answer any questions you might have. Is now a good time to chat?`,
    waTemplate: null,
  },
  {
    attempt: 2,
    dayOffset: 2,
    channel: 'call',
    label: 'Call #2 — Follow-Up',
    callScript: `Hi {{client_name}}, Jeremy here from PropNex. I tried reaching you a couple of days ago about your property enquiry — just wanted to follow up and see if you had any questions. I'd love to share some options that might be a good fit for you. Is now a good time?`,
    waTemplate: null,
  },
  {
    attempt: 3,
    dayOffset: 5,
    channel: 'voicemail',
    label: 'Voicemail Drop',
    callScript: `Hi {{client_name}}, this is Jeremy from PropNex. I've tried reaching you a couple of times about your property enquiry. No rush at all — whenever you're ready, feel free to call me back or drop me a WhatsApp. I'll follow up with a message. Hope to connect soon!`,
    waTemplate: null,
  },
  {
    attempt: 4,
    dayOffset: 9,
    channel: 'whatsapp',
    label: 'WhatsApp #1 — Soft Reach Out',
    callScript: null,
    waTemplate: `Hi {{client_name}}, Jeremy here from PropNex 😊 I tried calling a couple of times — just didn't want to keep ringing if it's not convenient. If you're still looking at properties, I'd be happy to share some options or arrange a viewing whenever suits you. No pressure at all! 🏠`,
  },
  {
    attempt: 5,
    dayOffset: 13,
    channel: 'call',
    label: 'Call #3 — Mid Cadence',
    callScript: `Hi {{client_name}}, Jeremy from PropNex here. I sent you a WhatsApp a few days ago — just following up to see if you had a chance to look at it. Happy to share some current market updates or new launches if you're still exploring your options.`,
    waTemplate: null,
  },
  {
    attempt: 6,
    dayOffset: 17,
    channel: 'whatsapp',
    label: 'WhatsApp #2 — Value Add',
    callScript: null,
    waTemplate: `Hi {{client_name}} 👋 Jeremy from PropNex. Just sharing a quick update that might be useful for your property search — the market has been quite active lately, and there are some good options coming up. Happy to run you through them if you're interested! Feel free to reply anytime 😊`,
  },
  {
    attempt: 7,
    dayOffset: 23,
    channel: 'call',
    label: 'Call #4 — Late Cadence',
    callScript: `Hi {{client_name}}, Jeremy here from PropNex. I know we haven't managed to connect — just one last try before I give you some space. If things have changed or you're ready to explore your options, I'm just a call or message away. All the best!`,
    waTemplate: null,
  },
  {
    attempt: 8,
    dayOffset: 29,
    channel: 'whatsapp',
    label: 'WhatsApp #3 — Final',
    callScript: null,
    waTemplate: `Hi {{client_name}}, Jeremy from PropNex 🙂 This'll be my last message for now — just want you to know I'm here if you ever decide to explore the property market. Feel free to reach out anytime! Wishing you all the best 🏠✨`,
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

export function fillTemplate(template: string, name: string): string {
  return template.replace(/{{client_name}}/g, name)
}
