'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const SECTIONS = [
  { name: 'Dashboard', path: '/dashboard', icon: '🏠', desc: 'Overview & KPIs' },
  { name: 'Leads', path: '/leads', icon: '🧲', desc: 'Capture & qualify prospects' },
  { name: 'Clients', path: '/clients', icon: '👥', desc: 'Manage your client base' },
  { name: 'Transactions', path: '/transactions', icon: '🤝', desc: 'Deals & progress' },
  { name: 'Content Hub', path: '/content-hub', icon: '📣', desc: 'Marketing content' },
  { name: 'P&L', path: '/pnl', icon: '📊', desc: 'Profit & loss tracking' },
  { name: 'Database', path: '/database', icon: '🗄️', desc: 'Reference database' },
  { name: 'Recruitment', path: '/recruitment', icon: '🔍', desc: 'Build your team' },
  { name: 'Settings', path: '/settings', icon: '⚙️', desc: 'Account & preferences' },
]

export default function NotFound() {
  const router = useRouter()
  const [query, setQuery] = useState('')

  const q = query.trim().toLowerCase()
  const filtered = q
    ? SECTIONS.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.path.toLowerCase().includes(q) ||
          s.desc.toLowerCase().includes(q)
      )
    : SECTIONS

  const go = (path: string) => router.push(path)

  return (
    <div className="min-h-screen w-full bg-background text-foreground flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div
            className="mx-auto w-20 h-20 rounded-2xl flex items-center justify-center font-bold text-4xl"
            style={{ background: 'hsl(var(--primary)/0.1)', color: 'hsl(var(--primary))' }}
          >
            404
          </div>
          <h1 className="text-3xl font-bold">Page not found</h1>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto">
            The page you&apos;re looking for doesn&apos;t exist, may have moved, or
            the link is broken. Head back to the dashboard or find your way below.
          </p>
        </div>

        {/* Search bar */}
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">⌕</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && filtered.length === 1) go(filtered[0].path)
            }}
            placeholder="Search Leads, Clients, Transactions…"
            className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground outline-none transition-shadow focus:ring-2"
            style={{ ['--tw-ring-color' as string]: 'hsl(var(--primary)/0.4)' }}
          />
        </div>

        {/* Quick section grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {filtered.map((s) => (
            <button
              key={s.path}
              onClick={() => go(s.path)}
              className="group flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left transition-colors hover:border-primary/40"
            >
              <span className="text-xl" aria-hidden>{s.icon}</span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold">{s.name}</span>
                <span className="block text-[11px] text-muted-foreground truncate">{s.desc}</span>
              </span>
              <span className="text-muted-foreground transition-transform group-hover:translate-x-0.5">→</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full text-center text-sm text-muted-foreground py-6 border border-dashed border-border rounded-xl">
              No matching section for &quot;{query}&quot;. Try Leads, Clients, Transactions…
            </div>
          )}
        </div>

        {/* Back to dashboard CTA */}
        <div className="text-center pt-2">
          <button
            onClick={() => go('/dashboard')}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: 'hsl(var(--primary))' }}
          >
            ← Back to Dashboard
          </button>
          <p className="mt-4 text-[11px] text-muted-foreground">Powered by Fidato Labs</p>
        </div>
      </div>
    </div>
  )
}