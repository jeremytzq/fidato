import { describe, expect, it } from 'vitest'
import { toWhatsAppDigits, whatsAppUrl } from './whatsapp'

describe('toWhatsAppDigits', () => {
  it('adds SG country code to local 8-digit numbers', () => {
    expect(toWhatsAppDigits('91234567')).toBe('6591234567')
  })

  it('does not double-prefix numbers that already start with 65', () => {
    expect(toWhatsAppDigits('6591234567')).toBe('6591234567')
    expect(toWhatsAppDigits('+65 9123 4567')).toBe('6591234567')
  })

  it('strips a leading 0 from local numbers', () => {
    expect(toWhatsAppDigits('091234567')).toBe('6591234567')
  })

  it('returns null for empty input', () => {
    expect(toWhatsAppDigits(null)).toBeNull()
    expect(toWhatsAppDigits('')).toBeNull()
    expect(toWhatsAppDigits('abc')).toBeNull()
  })
})

describe('whatsAppUrl', () => {
  it('builds a wa.me link without doubling the country code', () => {
    expect(whatsAppUrl('6591234567')).toBe('https://wa.me/6591234567')
    expect(whatsAppUrl('91234567')).toBe('https://wa.me/6591234567')
  })

  it('encodes optional prefilled text', () => {
    expect(whatsAppUrl('91234567', 'Hi there')).toBe(
      'https://wa.me/6591234567?text=Hi%20there'
    )
  })
})
