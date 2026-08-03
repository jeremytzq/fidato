'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, UserCheck, FileText, TrendingUp } from 'lucide-react'
import { cn } from '@/utils/cn'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/leads', label: 'Leads', icon: Users },
  { href: '/clients', label: 'Clients', icon: UserCheck },
  { href: '/transactions', label: 'Deals', icon: FileText },
  { href: '/pnl', label: 'P&L', icon: TrendingUp },
]

export default function MobileNav() {
  const pathname = usePathname()

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-50 flex items-stretch border-t border-border"
      style={{ background: 'hsl(var(--sidebar))', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {navItems.map((item) => {
        const Icon = item.icon
        const active = pathname === item.href || pathname.startsWith(item.href + '/')
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium transition-colors',
              active
                ? 'text-white'
                : 'text-white/50 hover:text-white/80'
            )}
          >
            <Icon
              size={20}
              className={active ? 'opacity-100' : 'opacity-50'}
              style={active ? { color: 'hsl(var(--sidebar-accent))' } : undefined}
            />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
