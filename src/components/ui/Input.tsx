import { cn } from '@/utils/cn'
import { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function Input({ label, error, className, ...props }: InputProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="text-sm font-medium text-foreground">{label}</label>
      )}
      <input
        className={cn(
          'w-full h-9 rounded-lg border border-border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground',
          'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary',
          'transition-colors',
          error && 'border-destructive focus:ring-destructive/30',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

export function Select({ label, error, className, children, ...props }: InputProps & { children?: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="text-sm font-medium text-foreground">{label}</label>
      )}
      <select
        className={cn(
          'w-full h-9 rounded-lg border border-border bg-card px-3 text-sm text-foreground',
          'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary',
          'transition-colors cursor-pointer',
          className
        )}
        {...(props as any)}
      >
        {children}
      </select>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
