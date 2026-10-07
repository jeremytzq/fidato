import { describe, expect, it } from 'vitest'
import { buildTimeline, matchLeadForClient } from './timeline'

describe('buildTimeline', () => {
  it('orders newest events first and keeps lead added at the end', () => {
    const events = buildTimeline({
      createdAt: '2026-10-01T00:00:00.000Z',
      activities: [
        { id: 'a2', action: 'Sent WhatsApp message', created_at: '2026-10-03T00:00:00.000Z' },
        { id: 'a1', action: 'Called', created_at: '2026-10-02T00:00:00.000Z' },
      ],
    })
    expect(events.map(event => event.label)).toEqual([
      'Sent WhatsApp message',
      'Called',
      'Lead added',
    ])
  })

  it('includes a completed cadence step that was not written to the activity log', () => {
    const events = buildTimeline({
      createdAt: '2026-10-01T00:00:00.000Z',
      activities: [],
      followUps: [
        {
          id: 'c1',
          attempt_number: 1,
          channel: 'call',
          status: 'done',
          notes: 'Connected',
          completed_at: '2026-10-02T00:00:00.000Z',
          scheduled_date: '2026-10-02',
        },
        {
          id: 'c2',
          attempt_number: 2,
          channel: 'whatsapp',
          status: 'pending',
          notes: null,
          completed_at: null,
          scheduled_date: '2026-10-04',
        },
      ],
    })
    expect(events.map(event => event.label)).toEqual([
      'Call #1: Connected',
      'Lead added',
    ])
  })

  it('skips a cadence step already described by a follow-up activity', () => {
    const events = buildTimeline({
      activities: [
        { id: 'a1', action: 'Follow-up #1 (call): Connected', created_at: '2026-10-02T00:00:00.000Z' },
      ],
      followUps: [
        {
          id: 'c1',
          attempt_number: 1,
          channel: 'call',
          status: 'done',
          notes: 'Connected',
          completed_at: '2026-10-02T00:00:00.000Z',
          scheduled_date: '2026-10-02',
        },
      ],
    })
    expect(events).toHaveLength(1)
    expect(events[0].kind).toBe('activity')
  })
})

describe('matchLeadForClient', () => {
  const leads = [
    { id: 'old', phone: '91234567', status: 'Contacted', updated_at: '2026-09-01T00:00:00.000Z', created_at: '2026-08-01T00:00:00.000Z' },
    { id: 'won', phone: '+65 9123 4567', whatsapp_number: null, status: 'Won', updated_at: '2026-10-01T00:00:00.000Z', created_at: '2026-09-01T00:00:00.000Z' },
    { id: 'other', phone: '80000000', status: 'Won', updated_at: '2026-10-02T00:00:00.000Z', created_at: '2026-10-01T00:00:00.000Z' },
  ]

  it('matches a local number to the Won lead with the same digits', () => {
    expect(matchLeadForClient('6591234567', leads)?.id).toBe('won')
  })

  it('returns null when the client has no phone', () => {
    expect(matchLeadForClient(null, leads)).toBeNull()
  })
})
