import { createHmac, timingSafeEqual } from 'crypto'

function signingKey(): string {
  const key = process.env.META_APP_SECRET
  if (!key) throw new Error('META_APP_SECRET is not configured')
  return key
}

function sign(payload: string): string {
  return createHmac('sha256', signingKey()).update(payload).digest('base64url')
}

/**
 * Builds a signed OAuth `state` param binding the redirect back to the user
 * who initiated it, so the callback can't be replayed against another user_id.
 */
export function createOAuthState(userId: string): string {
  const payload = Buffer.from(userId, 'utf8').toString('base64url')
  return `${payload}.${sign(payload)}`
}

/** Verifies a `state` param produced by createOAuthState. Returns the user_id, or null if invalid/tampered. */
export function verifyOAuthState(state: string): string | null {
  const [payload, sig] = state.split('.')
  if (!payload || !sig) return null

  const expected = sign(payload)
  const sigBuf = Buffer.from(sig)
  const expectedBuf = Buffer.from(expected)
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) return null

  try {
    return Buffer.from(payload, 'base64url').toString('utf8')
  } catch {
    return null
  }
}
