'use client'

import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Users, UserCheck, DollarSign, FileText, Target } from 'lucide-react'
import { cn } from '@/utils/cn'

const iconMap = { Users, UserCheck, DollarSign, TrendingUp, TrendingDown, FileText, Target }
export type IconName = keyof typeof iconMap

interface StatCardProps {
  title: string
  value: string
  subtitle?: string
  trend?: { value: number; label: string }
  iconName: IconName
  iconColor?: string
  index?: number
}

export function StatCard({ title, value, subtitle, trend, iconName, iconColor = 'hsl(235, 75%, 60%)', index = 0 }: StatCardProps) {
  const positive = trend ? trend.value >= 0 : true
  const Icon = iconMap[iconName]

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.07, ease: 'easeOut' }}
      whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}
      className="bg-card rounded-xl border border-border p-5 cursor-default transition-shadow"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">{title}</p>
          <p className="text-2xl font-bold text-foreground tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          {trend && (
            <div className={cn('flex items-center gap-1 mt-2 text-xs font-medium', positive ? 'text-green-600' : 'text-red-500')}>
              {positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              <span>{positive ? '+' : ''}{trend.value}% {trend.label}</span>
            </div>
          )}
        </div>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ml-4"
          style={{ background: `${iconColor}18` }}
        >
          <Icon size={18} style={{ color: iconColor }} />
        </div>
      </div>
    </motion.div>
  )
}
