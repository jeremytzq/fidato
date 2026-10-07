export function toInternationalDigits(phone: string | null | undefined): string | null {
  if (!phone) return null
  let digits = phone.replace(/\D/g, '')
  if (digits.startsWith('00')) digits = digits.slice(2)
  if (!digits) return null
  if (digits.length === 8) digits = `65${digits}`
  return digits
}

export function telHref(phone: string | null | undefined): string | null {
  const digits = toInternationalDigits(phone)
  return digits ? `tel:+${digits}` : null
}

export function whatsAppHref(phone: string | null | undefined, message?: string | null): string | null {
  const digits = toInternationalDigits(phone)
  if (!digits) return null
  const base = `https://wa.me/${digits}`
  if (!message) return base
  return `${base}?text=${encodeURIComponent(message)}`
}
