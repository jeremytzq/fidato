'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import {
  LayoutDashboard,
  Users,
  UserCheck,
  FileText,
  TrendingUp,
  Database,
  LogOut,
  Building2,
} from 'lucide-react'
import { cn } from '@/utils/cn'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/leads', label: 'Leads', icon: Users },
  { href: '/clients', label: 'Clients', icon: UserCheck },
  { href: '/transactions', label: 'Transactions', icon: FileText },
  { href: '/pnl', label: 'Profit & Loss', icon: TrendingUp },
  { href: '/database', label: 'Database', icon: Database },
]

export default function Sidebar({ user }: { user: User }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const avatarUrl = user.user_metadata?.avatar_url
  const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
  const email = user.email || ''

  return (
    <aside
      className="w-60 flex-shrink-0 flex flex-col h-full"
      style={{
        background: 'hsl(var(--sidebar))',
        borderRight: '1px solid hsl(var(--sidebar-border))',
      }}
    >
      {/* Logo */}
      <div className="px-5 py-6 flex items-center gap-2.5">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'hsl(var(--sidebar-accent))' }}
        >
          <Building2 size={16} className="text-white" />
        </div>
        <span className="text-white font-semibold text-lg tracking-tight">Fidato</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileHover={{ x: 2 }}
                transition={{ duration: 0.15 }}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer',
                  active
                    ? 'text-white'
                    : 'hover:text-white'
                )}
                style={{
                  background: active ? 'hsl(var(--sidebar-accent) / 0.2)' : undefined,
                  color: active ? 'white' : 'hsl(var(--sidebar-foreground))',
                }}
              >
                <Icon
                  size={16}
                  style={{ color: active ? 'hsl(var(--sidebar-accent))' : undefined }}
                />
                {item.label}
                {active && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="ml-auto w-1.5 h-1.5 rounded-full"
                    style={{ background: 'hsl(var(--sidebar-accent))' }}
                  />
                )}
              </motion.div>
            </Link>
          )
        })}
      </nav>

      {/* User footer */}
      <div className="px-3 py-4 border-t" style={{ borderColor: 'hsl(var(--sidebar-border))' }}>
        <div className="flex items-center gap-3 px-2 py-2 mb-1">
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName} className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
              style={{ background: 'hsl(var(--sidebar-accent))' }}
            >
              {displayName[0].toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">{displayName}</p>
            <p className="text-xs truncate" style={{ color: 'hsl(var(--sidebar-foreground))' }}>
              {email}
            </p>
          </div>
        </div>
        <motion.button
          whileHover={{ x: 2 }}
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
          style={{ color: 'hsl(var(--sidebar-foreground))' }}
        >
          <LogOut size={14} />
          Sign out
        </motion.button>
      </div>
    </aside>
  )
}
