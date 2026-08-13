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
      whileHover={{ y: -3, boxShadow: '0 10px 32px rgba(0,0,0,0.10)' }}
      className="bg-card rounded-xl border border-border p-4 sm:p-5 cursor-default transition-shadow relative overflow-hidden group"
    >
      {/* Colored top accent stripe */}
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: iconColor }} />

      {/* Icon + label row */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest leading-none mt-1">
          {title}
        </p>
        {/* Icon with proper opacity background */}
        <motion.div
          whileHover={{ scale: 1.15, rotate: 8 }}
          transition={{ type: 'spring', stiffness: 350, damping: 20 }}
          className="relative flex-shrink-0" style={{ width: 36, height: 36 }}
        >
          <div className="absolute inset-0 rounded-xl" style={{ background: iconColor, opacity: 0.12 }} />
          <div className="relative w-full h-full flex items-center justify-center" style={{ color: iconColor }}>
            <Icon size={17} />
          </div>
        </motion.div>
      </div>

      {/* Value */}
      <p className="text-xl sm:text-2xl font-bold text-foreground tracking-tight leading-none numeric">{value}</p>

      {subtitle && (
        <p className="text-xs text-muted-foreground mt-1.5">{subtitle}</p>
      )}

      {trend && (
        <div className={cn('flex items-center gap-1 mt-2.5 text-xs font-medium', positive ? 'text-green-600' : 'text-red-500')}>
          {positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          <span>{positive ? '+' : ''}{trend.value}% {trend.label}</span>
        </div>
      )}
    </motion.div>
  )
}
