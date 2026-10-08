import { describe, expect, it } from 'vitest'
import { buildTodayQueue, telHref, toInternationalDigits, whatsAppHref, type QueueFollowUpInput, type QueueLeadInput } from './todayQueue'

const today = '2026-10-07'
const now = new Date('2026-10-07T02:00:00.000Z')
const voice = { agentName: 'Aisha', agencyName: 'ERA' }

function lead(overrides: Partial<QueueLeadInput> & Pick<QueueLeadInput, 'id' | 'name'>): QueueLeadInput {
  return {
    display_name: null,
    phone: '91234567',
    whatsapp_number: null,
    status: 'New',
    meta_leadgen_id: null,
    project_interested: null,
    updated_at: '2026-10-07T01:00:00.000Z',
    created_at: '2026-10-01T01:00:00.000Z',
    birthday: null,
    ...overrides,
  }
}

function step(overrides: Partial<QueueFollowUpInput> & Pick<QueueFollowUpInput, 'id' | 'lead_id'>): QueueFollowUpInput {
  return {
    attempt_number: 1,
    scheduled_date: today,
    channel: 'call',
    status: 'pending',
    ...overrides,
  }
}

describe('phone links', () => {
  it('prefixes an 8-digit Singapore number and leaves a country code in place', () => {
    expect(toInternationalDigits('9123 4567')).toBe('6591234567')
    expect(toInternationalDigits('+65 9123 4567')).toBe('6591234567')
    expect(toInternationalDigits('6591234567')).toBe('6591234567')
    expect(telHref('91234567')).toBe('tel:+6591234567')
  })

  it('puts the script on the WhatsApp link', () => {
    expect(whatsAppHref('91234567', 'Hi Jane')).toBe('https://wa.me/6591234567?text=Hi%20Jane')
  })

  it('returns null when there is no number', () => {
    expect(telHref('   ')).toBeNull()
    expect(whatsAppHref(null, 'Hi')).toBeNull()
  })
})

describe('buildTodayQueue', () => {
  it('orders overdue cadence, fresh Meta leads, then steps due today', () => {
    const items = buildTodayQueue({
      today,
      now,
      voice,
      leads: [
        lead({ id: 'overdue', name: 'Overdue Lead' }),
        lead({
          id: 'meta',
          name: 'Meta Lead',
          meta_leadgen_id: 'lg-1',
          created_at: '2026-10-07T01:00:00.000Z',
          project_interested: 'Pinnacle',
        }),
        lead({ id: 'today', name: 'Due Today' }),
      ],
      followUps: [
        step({ id: 'c-today', lead_id: 'today', scheduled_date: today, attempt_number: 4, channel: 'whatsapp' }),
        step({ id: 'c-over', lead_id: 'overdue', scheduled_date: '2026-10-05', attempt_number: 1 }),
      ],
    })

    expect(items.map(item => item.leadId)).toEqual(['overdue', 'meta', 'today'])
    expect(items[0].overdue).toBe(true)
    expect(items[0].detail).toBe('Overdue 2 days')
    expect(items[0].script).toContain('Aisha')
    expect(items[0].script).toContain('ERA')
    expect(items[1].script).toContain('Pinnacle')
    expect(items[1].reason).toBe('fresh_meta')
    expect(items[2].channel).toBe('whatsapp')
  })

  it('keeps one row per lead and notes a birthday on the cadence step', () => {
    const items = buildTodayQueue({
      today,
      now,
      voice,
      leads: [lead({ id: 'l1', name: 'Jane', birthday: '1990-10-07', status: 'Negotiating', updated_at: '2026-09-01T00:00:00.000Z' })],
      followUps: [step({ id: 'c1', lead_id: 'l1' })],
    })

    expect(items).toHaveLength(1)
    expect(items[0].reason).toBe('cadence')
    expect(items[0].detail).toContain('Birthday today')
  })

  it('hides fresh, stalled, and birthday rows already touched today', () => {
    const items = buildTodayQueue({
      today,
      now,
      voice,
      touchedLeadIds: ['meta', 'stale', 'bday'],
      leads: [
        lead({ id: 'meta', name: 'Meta', meta_leadgen_id: 'lg', created_at: '2026-10-07T01:00:00.000Z' }),
        lead({ id: 'stale', name: 'Stale', status: 'Negotiating', updated_at: '2026-09-01T00:00:00.000Z' }),
        lead({ id: 'bday', name: 'Bday', birthday: '1980-10-07', status: 'Contacted' }),
      ],
      followUps: [],
    })

    expect(items).toEqual([])
  })

  it('surfaces a stalled negotiation and a birthday when nothing is due', () => {
    const items = buildTodayQueue({
      today,
      now,
      voice,
      leads: [
        lead({ id: 'stale', name: 'Wei', status: 'Negotiating', updated_at: '2026-09-20T00:00:00.000Z', project_interested: 'Parc Esta' }),
        lead({ id: 'recent', name: 'Recent', status: 'Negotiating', updated_at: '2026-10-06T00:00:00.000Z' }),
        lead({ id: 'bday', name: 'Nora', display_name: 'Nora Lim', birthday: '1975-10-07', status: 'Won' }),
        lead({ id: 'lost', name: 'Lost', birthday: '1975-10-07', status: 'Lost' }),
      ],
      followUps: [],
    })

    expect(items.map(item => item.reason)).toEqual(['stalled', 'birthday'])
    expect(items[0].detail).toBe('No update in 17 days')
    expect(items[0].script).toContain('Parc Esta')
    expect(items[1].leadName).toBe('Nora Lim')
    expect(items[1].script).toContain('Happy birthday')
  })

  it('lists every contact instead of stopping at twenty', () => {
    const leads = Array.from({ length: 21 }, (_, index) => lead({ id: `l${index}`, name: `Lead ${index}` }))
    const items = buildTodayQueue({
      today,
      now,
      voice,
      leads,
      followUps: leads.map((item, index) => step({
        id: `c${index}`,
        lead_id: item.id,
        scheduled_date: '2026-10-01',
      })),
    })
    expect(items).toHaveLength(21)
  })

  it('skips Won and Lost leads even when a cadence step is pending', () => {
    const items = buildTodayQueue({
      today,
      now,
      voice,
      leads: [lead({ id: 'won', name: 'Won', status: 'Won' })],
      followUps: [step({ id: 'c', lead_id: 'won', scheduled_date: '2026-10-01' })],
    })
    expect(items).toEqual([])
  })
})
