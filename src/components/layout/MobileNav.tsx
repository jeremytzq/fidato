'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { LayoutDashboard, Users, UserCheck, FileText, TrendingUp, LogOut, X, BookOpen } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { cn } from '@/utils/cn'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/leads', label: 'Leads', icon: Users },
  { href: '/clients', label: 'Clients', icon: UserCheck },
  { href: '/transactions', label: 'Deals', icon: FileText },
  { href: '/pnl', label: 'P&L', icon: TrendingUp },
]

export default function MobileNav({ user }: { user: User }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [sheetOpen, setSheetOpen] = useState(false)

  const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
  const avatarUrl = user.user_metadata?.avatar_url

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      {/* Bottom nav */}
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
                active ? 'text-white' : 'text-white/50 hover:text-white/80'
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

        {/* Avatar / profile button */}
        <button
          onClick={() => setSheetOpen(true)}
          className="flex-none flex flex-col items-center justify-center gap-1 py-2 px-3 text-[10px] font-medium text-white/50 hover:text-white/80 transition-colors"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName} className="w-6 h-6 rounded-full object-cover opacity-70" />
          ) : (
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold opacity-70"
              style={{ background: 'hsl(var(--sidebar-accent))' }}>
              {displayName[0].toUpperCase()}
            </div>
          )}
          <span>Me</span>
        </button>
      </nav>

      {/* Sign-out sheet */}
      {sheetOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={() => setSheetOpen(false)}
          />
          <div
            className="md:hidden fixed bottom-0 inset-x-0 z-50 rounded-t-2xl p-5 pb-10"
            style={{ background: 'hsl(var(--sidebar))', borderTop: '1px solid hsl(var(--sidebar-border))' }}
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={displayName} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                    style={{ background: 'hsl(var(--sidebar-accent))' }}>
                    {displayName[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-white text-sm font-semibold">{displayName}</p>
                  <p className="text-xs" style={{ color: 'hsl(var(--sidebar-foreground))' }}>{user.email}</p>
                </div>
              </div>
              <button onClick={() => setSheetOpen(false)} className="p-1.5 rounded-lg text-white/50 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            <Link
              href="/content-hub"
              onClick={() => setSheetOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors mb-2"
              style={{ background: 'hsl(var(--sidebar-accent) / 0.15)', color: 'hsl(var(--sidebar-foreground))' }}
            >
              <BookOpen size={16} />
              Content Hub
            </Link>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors"
              style={{ background: 'hsl(var(--sidebar-accent) / 0.15)', color: 'hsl(var(--sidebar-foreground))' }}
            >
              <LogOut size={16} />
              Sign out
            </button>
          </div>
        </>
      )}
    </>
  )
}
