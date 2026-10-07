/**
 * Normalize a Singapore phone number for WhatsApp deep links.
 * Handles numbers stored as `91234567`, `6591234567`, `+65 9123 4567`, etc.
 */
export function toWhatsAppDigits(phone: string | null | undefined, defaultCountry = '65'): string | null {
  if (!phone) return null
  let digits = phone.replace(/\D/g, '')
  if (!digits) return null

  // Strip leading 0 from local SG numbers (e.g. 091234567 → 91234567)
  if (digits.startsWith('0') && digits.length === 9) {
    digits = digits.slice(1)
  }

  if (digits.startsWith(defaultCountry)) return digits
  return `${defaultCountry}${digits}`
}

export function whatsAppUrl(phone: string | null | undefined, text?: string): string | null {
  const digits = toWhatsAppDigits(phone)
  if (!digits) return null
  const base = `https://wa.me/${digits}`
  if (!text) return base
  return `${base}?text=${encodeURIComponent(text)}`
}
