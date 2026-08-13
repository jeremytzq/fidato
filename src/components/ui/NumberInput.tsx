'use client'

import { InputHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

interface NumberInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'type'> {
  label?: string
  value: string
  onChange: (raw: string) => void
}

function formatWithCommas(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, '')
  if (!digits) return ''
  return Number(digits).toLocaleString('en-SG')
}

export function NumberInput({ label, value, onChange, className, placeholder, ...props }: NumberInputProps) {
  return (
    <div className="space-y-1.5">
      {label && <label className="text-sm font-medium text-foreground">{label}</label>}
      <input
        {...props}
        type="text"
        inputMode="numeric"
        value={formatWithCommas(value)}
        placeholder={placeholder}
        onChange={e => {
          const raw = e.target.value.replace(/[^0-9]/g, '')
          onChange(raw)
        }}
        className={cn(
          'w-full h-10 rounded-lg border border-border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors',
          className
        )}
      />
    </div>
  )
}
