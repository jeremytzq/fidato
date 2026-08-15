import { describe, it, expect, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { scheduleCadence, getStepConfig, fillTemplate, CADENCE_STEPS } from './cadence'

function fakeSupabase(insert: (rows: unknown[]) => void) {
  return {
    from: () => ({
      insert: (rows: unknown[]) => {
        insert(rows)
        return Promise.resolve({ data: rows, error: null })
      },
    }),
  } as unknown as SupabaseClient
}

describe('scheduleCadence', () => {
  it('inserts one row per cadence step, offset from the start date', async () => {
    let inserted: any[] = []
    const supabase = fakeSupabase(rows => { inserted = rows })

    const start = new Date('2026-01-01T00:00:00.000Z')
    await scheduleCadence(supabase, 'user-1', 'lead-1', start)

    expect(inserted).toHaveLength(CADENCE_STEPS.length)
    expect(inserted[0]).toMatchObject({
      user_id: 'user-1',
      lead_id: 'lead-1',
      attempt_number: 1,
      scheduled_date: '2026-01-01',
      channel: 'call',
      status: 'pending',
    })
    // second call step is offset by 2 days per CADENCE_STEPS
    expect(inserted[1].scheduled_date).toBe('2026-01-03')
  })

  it('defaults to scheduling from now when no start date is given', async () => {
    let inserted: any[] = []
    const supabase = fakeSupabase(rows => { inserted = rows })
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-15T00:00:00.000Z'))

    await scheduleCadence(supabase, 'user-1', 'lead-1')

    expect(inserted[0].scheduled_date).toBe('2026-06-15')
    vi.useRealTimers()
  })
})

describe('getStepConfig', () => {
  it('finds the config for a given attempt number', () => {
    expect(getStepConfig(1)?.channel).toBe('call')
    expect(getStepConfig(4)?.channel).toBe('whatsapp')
  })

  it('returns undefined for an unknown attempt', () => {
    expect(getStepConfig(999)).toBeUndefined()
  })
})

describe('fillTemplate', () => {
  it('replaces the client_name placeholder', () => {
    expect(fillTemplate('Hi {{client_name}}!', 'Jane')).toBe('Hi Jane!')
  })

  it('replaces multiple occurrences', () => {
    expect(fillTemplate('{{client_name}} and {{client_name}}', 'Jane')).toBe('Jane and Jane')
  })
})
