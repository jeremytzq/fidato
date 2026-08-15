import { createHmac } from 'crypto'
import { describe, it, expect } from 'vitest'
import { verifyMetaSignature, parseLeadFields } from './metaWebhook'

describe('verifyMetaSignature', () => {
  const secret = 'app-secret'
  const body = JSON.stringify({ entry: [{ id: '1' }] })
  const validSig = 'sha256=' + createHmac('sha256', secret).update(body).digest('hex')

  it('accepts a correctly signed payload', () => {
    expect(verifyMetaSignature(body, validSig, secret)).toBe(true)
  })

  it('rejects a tampered payload', () => {
    expect(verifyMetaSignature(body + 'x', validSig, secret)).toBe(false)
  })

  it('rejects a forged signature', () => {
    const forged = 'sha256=' + createHmac('sha256', 'wrong-secret').update(body).digest('hex')
    expect(verifyMetaSignature(body, forged, secret)).toBe(false)
  })

  it('rejects when the signature header is missing', () => {
    expect(verifyMetaSignature(body, null, secret)).toBe(false)
  })

  it('rejects when the app secret is not configured', () => {
    expect(verifyMetaSignature(body, validSig, undefined)).toBe(false)
  })

  it('rejects a malformed signature without throwing', () => {
    expect(verifyMetaSignature(body, 'sha256=not-hex', secret)).toBe(false)
  })
})

describe('parseLeadFields', () => {
  it('prefers full_name over first/last name', () => {
    const result = parseLeadFields([
      { name: 'full_name', values: ['Jane Tan'] },
      { name: 'first_name', values: ['Jane'] },
      { name: 'last_name', values: ['Tan'] },
    ])
    expect(result.name).toBe('Jane Tan')
  })

  it('falls back to first + last name when full_name is absent', () => {
    const result = parseLeadFields([
      { name: 'first_name', values: ['Jane'] },
      { name: 'last_name', values: ['Tan'] },
    ])
    expect(result.name).toBe('Jane Tan')
  })

  it('falls back to Unknown when no name fields are present', () => {
    const result = parseLeadFields([{ name: 'email', values: ['jane@example.com'] }])
    expect(result.name).toBe('Unknown')
  })

  it('extracts phone and email, preferring phone_number over phone', () => {
    const result = parseLeadFields([
      { name: 'full_name', values: ['Jane Tan'] },
      { name: 'phone_number', values: ['91234567'] },
      { name: 'phone', values: ['00000000'] },
      { name: 'email', values: ['jane@example.com'] },
    ])
    expect(result.phone).toBe('91234567')
    expect(result.email).toBe('jane@example.com')
  })

  it('bundles non-standard fields into notes and tags them as a Meta Ad', () => {
    const result = parseLeadFields([
      { name: 'full_name', values: ['Jane Tan'] },
      { name: 'property_interest', values: ['3-bedroom condo'] },
    ])
    expect(result.notes).toBe('[Meta Ad] property_interest: 3-bedroom condo')
  })

  it('returns a bare Meta Ad tag when there are no extra fields', () => {
    const result = parseLeadFields([{ name: 'full_name', values: ['Jane Tan'] }])
    expect(result.notes).toBe('[Meta Ad]')
  })
})
