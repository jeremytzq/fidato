import { createClient } from '@/lib/supabase/client'
import { logActivity } from '@/lib/activity'
import type { CadenceChannel } from '@/types'

export const OUTCOME_LABEL = {
  connected: 'Connected',
  voicemail: 'Voicemail',
  no_answer: 'No answer',
  replied: 'Replied',
  skipped: 'Skipped',
} as const

export type FollowUpOutcome = keyof typeof OUTCOME_LABEL

export async function completeCadenceStep(input: {
  userId: string
  leadId: string
  cadenceId: string
  attemptNumber: number
  channel: CadenceChannel
  outcome: FollowUpOutcome
}) {
  const supabase = createClient()
  const label = OUTCOME_LABEL[input.outcome]
  const skipped = input.outcome === 'skipped'
  const { error } = await supabase
    .from('cadence_follow_ups')
    .update({
      status: skipped ? 'skipped' : 'done',
      notes: label,
      completed_at: skipped ? null : new Date().toISOString(),
    })
    .eq('id', input.cadenceId)
    .eq('user_id', input.userId)

  if (error) throw new Error(error.message)
  await logActivity(
    input.userId,
    input.leadId,
    `Follow-up #${input.attemptNumber} (${input.channel}): ${label}`,
  )
}

export async function touchLead(input: {
  userId: string
  leadId: string
  outcome: FollowUpOutcome
  currentStatus: string
}) {
  const supabase = createClient()
  const label = OUTCOME_LABEL[input.outcome]
  const patch: { updated_at: string; status?: string } = {
    updated_at: new Date().toISOString(),
  }
  if (input.currentStatus === 'New' && (input.outcome === 'connected' || input.outcome === 'replied')) {
    patch.status = 'Contacted'
  }
  const { error } = await supabase
    .from('leads')
    .update(patch)
    .eq('id', input.leadId)
    .eq('user_id', input.userId)

  if (error) throw new Error(error.message)
  await logActivity(input.userId, input.leadId, `Follow-up: ${label}`)
}
