import { describe, it, expect, beforeEach } from 'vitest'
import { createOAuthState, verifyOAuthState } from './metaState'

describe('metaState', () => {
  beforeEach(() => {
    process.env.META_APP_SECRET = 'test-secret'
  })

  it('round-trips a user id through create/verify', () => {
    const state = createOAuthState('user-123')
    expect(verifyOAuthState(state)).toBe('user-123')
  })

  it('rejects a state signed with a different secret', () => {
    const state = createOAuthState('user-123')
    process.env.META_APP_SECRET = 'different-secret'
    expect(verifyOAuthState(state)).toBeNull()
  })

  it('rejects a state with a tampered user id (attacker can\'t retarget another account)', () => {
    const state = createOAuthState('attacker-id')
    const [, sig] = state.split('.')
    const forged = `${Buffer.from('victim-id').toString('base64url')}.${sig}`
    expect(verifyOAuthState(forged)).toBeNull()
  })

  it('rejects malformed state strings', () => {
    expect(verifyOAuthState('not-a-valid-state')).toBeNull()
    expect(verifyOAuthState('')).toBeNull()
    expect(verifyOAuthState('.')).toBeNull()
  })
})
