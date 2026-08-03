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
      className="bg-card rounded-xl border border-border p-3 sm:p-5 cursor-default transition-shadow"
    >
      {/* Icon row */}
      <div
        className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center mb-2 sm:mb-3"
        style={{ background: `${iconColor}18` }}
      >
        <Icon size={15} className="sm:hidden" style={{ color: iconColor }} />
        <Icon size={18} className="hidden sm:block" style={{ color: iconColor }} />
      </div>
      {/* Title */}
      <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 sm:mb-3 leading-tight">
        {title}
      </p>
      {/* Value */}
      <p className="text-lg sm:text-2xl font-bold text-foreground tracking-tight leading-none">{value}</p>
      {subtitle && (
        <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">{subtitle}</p>
      )}
      {trend && (
        <div className={cn('flex items-center gap-1 mt-2 text-xs font-medium', positive ? 'text-green-600' : 'text-red-500')}>
          {positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          <span>{positive ? '+' : ''}{trend.value}% {trend.label}</span>
        </div>
      )}
    </motion.div>
  )
}
