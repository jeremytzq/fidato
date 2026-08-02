import { cn } from '@/utils/cn'

type BadgeVariant = 'new' | 'contacted' | 'qualified' | 'negotiating' | 'won' | 'lost' | 'active' | 'completed' | 'pending' | 'cancelled' | 'default'

const variantStyles: Record<BadgeVariant, string> = {
  new: 'bg-blue-50 text-blue-700 border-blue-200',
  contacted: 'bg-purple-50 text-purple-700 border-purple-200',
  qualified: 'bg-amber-50 text-amber-700 border-amber-200',
  negotiating: 'bg-orange-50 text-orange-700 border-orange-200',
  won: 'bg-green-50 text-green-700 border-green-200',
  lost: 'bg-red-50 text-red-700 border-red-200',
  active: 'bg-blue-50 text-blue-700 border-blue-200',
  completed: 'bg-green-50 text-green-700 border-green-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
  default: 'bg-muted text-muted-foreground border-border',
}

export function Badge({ label, variant = 'default' }: { label: string; variant?: BadgeVariant }) {
  const v = (label.toLowerCase() as BadgeVariant) in variantStyles
    ? (label.toLowerCase() as BadgeVariant)
    : variant

  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border', variantStyles[v])}>
      {label}
    </span>
  )
}
