'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Badge } from '@/components/ui/Badge'
import { Download, Search, ChevronUp, ChevronDown, Sparkles, Trash2, AlertTriangle, X } from 'lucide-react'
import type { Lead, Client, Transaction } from '@/types'
import { formatCurrency, formatDate } from '@/utils/format'
import { createClient } from '@/lib/supabase/client'

type Tab = 'leads' | 'clients' | 'transactions'

function exportCSV(data: any[], filename: string) {
  if (!data.length) return
  const keys = Object.keys(data[0]).filter(k => !['user_id', 'client_id'].includes(k))
  const header = keys.join(',')
  const rows = data.map(r => keys.map(k => JSON.stringify(r[k] ?? '')).join(','))
  const csv = [header, ...rows].join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  a.download = filename
  a.click()
}

type SortDir = 'asc' | 'desc'

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return active
    ? (dir === 'asc' ? <ChevronUp size={13} className="text-primary" /> : <ChevronDown size={13} className="text-primary" />)
    : <ChevronUp size={13} className="text-muted-foreground opacity-30" />
}

const SEED_LEADS = [
  { name: 'Tan Wei Ming', email: 'tanwm@gmail.com', phone: '91234567', status: 'New', source: 'Referral', property_type: 'Condo', budget: 1500000, notes: 'Looking for 3BR in D9/D10. Ready to move within 6 months.', grade: 'A' },
  { name: 'Sarah Lim', email: 'sarahlim@yahoo.com.sg', phone: '87654321', status: 'Contacted', source: 'Social Media', property_type: 'HDB', budget: 580000, notes: 'First-timer. Interested in Tampines or Bedok area.', grade: 'B' },
  { name: 'Ahmad Razif', email: 'ahmad.razif@email.com', phone: '96543210', status: 'Qualified', source: 'Cold Call', property_type: 'Industrial', budget: 3200000, notes: 'Looking for 3-storey terrace factory. Has financing ready.', grade: 'A' },
  { name: 'Chen Mei Ling', email: null, phone: '82345678', status: 'Negotiating', source: 'Walk-in', property_type: 'Landed', budget: 4500000, notes: 'Semi-D in Bukit Timah. Seller countered at $4.65M. Client considering.', grade: 'B' },
  { name: 'Jessica Koh', email: 'jessicakoh88@gmail.com', phone: '98765432', status: 'Lost', source: 'Website', property_type: 'HDB', budget: 450000, notes: 'Went with another agent. Price expectation gap.', grade: 'C' },
  { name: 'Raj Kumar', email: 'rajkumar@corpmail.sg', phone: '81234567', status: 'Contacted', source: 'Referral', property_type: 'Industrial', budget: 2800000, notes: 'JTC flatted factory for food manufacturing. Needs loading bay.', grade: 'B' },
  { name: 'Michelle Teo', email: 'michelle.teo@email.com', phone: '97894561', status: 'Qualified', source: 'Social Media', property_type: 'Condo', budget: 1200000, notes: 'Upgrading from HDB. CCR preferred. Timeline: 3 months.', grade: 'A' },
  { name: 'David Ang', email: 'davidang@gmail.com', phone: '90012345', status: 'New', source: 'Referral', property_type: 'Condo', budget: 980000, notes: 'Investment purchase. Yield-focused. Prefers D15.', grade: 'B' },
]

const SEED_CLIENTS = [
  { name: 'Lim Boon Huat', email: 'limboong@hotmail.com', phone: '91122334', property_type: 'Landed', notes: 'Long-time client. Owns 2 landed properties. Referred Tan Wei Ming.' },
  { name: 'Wong Ah Kow', email: null, phone: '87761234', property_type: 'Condo', notes: 'Bought Parc Clematis unit in 2024. Happy client.' },
  { name: 'Patricia Chan', email: 'patriciachan@gmail.com', phone: '96600123', property_type: 'HDB', notes: 'Sold Bishan 5-room HDB. Looking to upsize next year.' },
]

export default function DatabaseClient({ leads, clients, transactions, userId }: {
  leads: Lead[]; clients: Client[]; transactions: Transaction[]; userId: string
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const supabase = createClient()
  const [tab, setTab] = useState<Tab>('leads')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortKey, setSortKey] = useState('created_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [seeding, setSeeding] = useState(false)
  const [resetStep, setResetStep] = useState<0 | 1 | 2>(0)
  const [resetConfirmText, setResetConfirmText] = useState('')
  const [resetting, setResetting] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)
  const confirmInputRef = useRef<HTMLInputElement>(null)

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const thProps = (key: string) => ({
    onClick: () => handleSort(key),
    className: 'text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3 cursor-pointer hover:text-foreground transition-colors select-none',
    children: (
      <span className="flex items-center gap-1">
        {key.replace(/_/g, ' ')}
        <SortIcon active={sortKey === key} dir={sortDir} />
      </span>
    ),
  })

  const sortData = <T extends Record<string, any>>(data: T[]) => {
    return [...data].sort((a, b) => {
      const av = a[sortKey] ?? '', bv = b[sortKey] ?? ''
      const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv))
      return sortDir === 'asc' ? cmp : -cmp
    })
  }

  const filteredLeads = sortData(leads.filter(l =>
    (l.name.toLowerCase().includes(search.toLowerCase()) || l.email?.includes(search) || l.phone?.includes(search)) &&
    (!statusFilter || l.status === statusFilter)
  ))

  const filteredClients = sortData(clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) || c.email?.includes(search) || c.phone?.includes(search)
  ))

  const filteredTx = sortData(transactions.filter(tx =>
    (tx.client_name.toLowerCase().includes(search.toLowerCase()) || tx.property_address.toLowerCase().includes(search.toLowerCase())) &&
    (!statusFilter || tx.status === statusFilter)
  ))

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'leads', label: 'Leads', count: leads.length },
    { id: 'clients', label: 'Clients', count: clients.length },
    { id: 'transactions', label: 'Transactions', count: transactions.length },
  ]

  const exportData = () => {
    if (tab === 'leads') exportCSV(filteredLeads, 'leads.csv')
    else if (tab === 'clients') exportCSV(filteredClients, 'clients.csv')
    else exportCSV(filteredTx, 'transactions.csv')
  }

  const handleSeedData = async () => {
    if (!confirm('Load sample data? This will add placeholder leads and clients to your account.')) return
    setSeeding(true)
    const now = new Date().toISOString()
    await supabase.from('leads').insert(
      SEED_LEADS.map(l => ({ ...l, user_id: userId, created_at: now, updated_at: now }))
    )
    await supabase.from('clients').insert(
      SEED_CLIENTS.map(c => ({ ...c, user_id: userId, created_at: now, updated_at: now }))
    )
    setSeeding(false)
    startTransition(() => router.refresh())
  }

  const openResetModal = () => {
    setResetStep(1)
    setResetConfirmText('')
    setResetError(null)
  }

  const closeResetModal = () => {
    setResetStep(0)
    setResetConfirmText('')
    setResetError(null)
  }

  const handleReset = async () => {
    if (resetConfirmText !== 'RESET') return
    setResetting(true)
    setResetError(null)
    try {
      const tables = ['activity_log', 'income', 'expenses', 'transactions', 'leads', 'clients']
      for (const table of tables) {
        const { error } = await supabase.from(table).delete().eq('user_id', userId)
        if (error && !error.message.includes('does not exist')) throw error
      }
      closeResetModal()
      startTransition(() => router.refresh())
    } catch (e: any) {
      setResetError(e.message)
    } finally {
      setResetting(false)
    }
  }

  const statuses = tab === 'transactions'
    ? ['Active', 'Pending', 'Completed', 'Cancelled']
    : ['New', 'Contacted', 'Qualified', 'Negotiating', 'Won', 'Lost']

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Database</h1>
          <p className="text-sm text-muted-foreground mt-0.5">All your data in one place</p>
        </div>
        <div className="flex gap-2">
          {leads.length === 0 && clients.length === 0 && (
            <button
              onClick={handleSeedData}
              disabled={seeding}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-primary/30 bg-primary/5 text-sm font-medium text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
            >
              <Sparkles size={14} /> {seeding ? 'Loading...' : 'Load Sample Data'}
            </button>
          )}
          <button
            onClick={exportData}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Download size={14} /> Export CSV
          </button>
          <button
            onClick={openResetModal}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-red-200 bg-red-50 text-sm font-medium text-red-600 hover:bg-red-100 hover:border-red-300 transition-colors dark:border-red-900 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50"
          >
            <Trash2 size={14} /> Reset
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 p-1 rounded-xl bg-muted w-fit">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setSearch(''); setStatusFilter('') }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {t.label} <span className="ml-1.5 text-xs opacity-60">({t.count})</span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
        </div>
        {tab !== 'clients' && (
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-9 px-3 rounded-lg border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer">
            <option value="">All Status</option>
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
      </div>

      {/* Tables */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          {tab === 'leads' && (
            <table className="w-full">
              <thead style={{ background: 'hsl(var(--muted))' }}>
                <tr>
                  <th {...thProps('name')} />
                  <th {...thProps('email')} />
                  <th {...thProps('phone')} />
                  <th {...thProps('property_type')} />
                  <th {...thProps('budget')} />
                  <th {...thProps('status')} />
                  <th {...thProps('source')} />
                  <th {...thProps('follow_up_date')} />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredLeads.map((l, i) => (
                  <motion.tr key={l.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-foreground">{l.name}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{l.email || '—'}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{l.phone || '—'}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{l.property_type || '—'}</td>
                    <td className="px-4 py-3 text-sm text-foreground">{l.budget ? formatCurrency(l.budget) : '—'}</td>
                    <td className="px-4 py-3"><Badge label={l.status} /></td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{l.source || '—'}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{l.follow_up_date ? formatDate(l.follow_up_date) : '—'}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === 'clients' && (
            <table className="w-full">
              <thead style={{ background: 'hsl(var(--muted))' }}>
                <tr>
                  <th {...thProps('name')} />
                  <th {...thProps('email')} />
                  <th {...thProps('phone')} />
                  <th {...thProps('property_type')} />
                  <th {...thProps('notes')} />
                  <th {...thProps('created_at')} />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredClients.map((c, i) => (
                  <motion.tr key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-foreground">{c.name}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{c.email || '—'}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{c.phone || '—'}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{c.property_type || '—'}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground max-w-48 truncate">{c.notes || '—'}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(c.created_at)}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === 'transactions' && (
            <table className="w-full">
              <thead style={{ background: 'hsl(var(--muted))' }}>
                <tr>
                  <th {...thProps('client_name')} />
                  <th {...thProps('property_address')} />
                  <th {...thProps('transaction_type')} />
                  <th {...thProps('amount')} />
                  <th {...thProps('commission_amount')} />
                  <th {...thProps('status')} />
                  <th {...thProps('closing_date')} />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredTx.map((tx, i) => (
                  <motion.tr key={tx.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-foreground">{tx.client_name}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground max-w-36 truncate">{tx.property_address}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{tx.transaction_type}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-foreground">{formatCurrency(tx.amount)}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-primary">{formatCurrency(tx.commission_amount)}</td>
                    <td className="px-4 py-3"><Badge label={tx.status} /></td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{tx.closing_date ? formatDate(tx.closing_date) : '—'}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="px-4 py-3 border-t border-border bg-muted/30">
          <p className="text-xs text-muted-foreground">
            {tab === 'leads' ? filteredLeads.length : tab === 'clients' ? filteredClients.length : filteredTx.length} of{' '}
            {tab === 'leads' ? leads.length : tab === 'clients' ? clients.length : transactions.length} records
          </p>
        </div>
      </div>

      {/* Reset confirmation modal */}
      <AnimatePresence>
        {resetStep > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) closeResetModal() }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-red-50 dark:bg-red-950/30">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
                    <AlertTriangle size={16} className="text-red-600 dark:text-red-400" />
                  </div>
                  <span className="font-semibold text-red-700 dark:text-red-400">Reset CRM Data</span>
                </div>
                <button onClick={closeResetModal} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded">
                  <X size={16} />
                </button>
              </div>

              <div className="px-5 py-5 space-y-4">
                {resetStep === 1 && (
                  <>
                    <p className="text-sm text-foreground font-medium">This will permanently delete all your CRM data:</p>
                    <ul className="space-y-1.5 text-sm text-muted-foreground">
                      {[
                        { label: 'Leads', count: leads.length },
                        { label: 'Clients', count: clients.length },
                        { label: 'Transactions', count: transactions.length },
                        { label: 'Activity log', count: null },
                        { label: 'Income & expense records', count: null },
                      ].map(item => (
                        <li key={item.label} className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                          {item.label}
                          {item.count !== null && (
                            <span className="ml-auto text-xs font-semibold text-red-500 tabular-nums">
                              {item.count} record{item.count !== 1 ? 's' : ''}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                    <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 px-3 py-2.5 text-xs text-amber-700 dark:text-amber-400">
                      This action cannot be undone. Export a CSV backup first if you want to keep your data.
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={closeResetModal}
                        className="flex-1 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          setResetStep(2)
                          setTimeout(() => confirmInputRef.current?.focus(), 50)
                        }}
                        className="flex-1 py-2 rounded-lg bg-red-600 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
                      >
                        Continue
                      </button>
                    </div>
                  </>
                )}

                {resetStep === 2 && (
                  <>
                    <p className="text-sm text-foreground">
                      Type <span className="font-mono font-bold text-red-600 bg-red-50 dark:bg-red-950/30 px-1.5 py-0.5 rounded">RESET</span> to confirm you want to delete all data.
                    </p>
                    <input
                      ref={confirmInputRef}
                      type="text"
                      value={resetConfirmText}
                      onChange={e => { setResetConfirmText(e.target.value); setResetError(null) }}
                      onKeyDown={e => { if (e.key === 'Enter' && resetConfirmText === 'RESET') handleReset() }}
                      placeholder="Type RESET"
                      className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-400"
                    />
                    {resetError && (
                      <p className="text-xs text-red-500">{resetError}</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => setResetStep(1)}
                        disabled={resetting}
                        className="flex-1 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
                      >
                        Back
                      </button>
                      <button
                        onClick={handleReset}
                        disabled={resetConfirmText !== 'RESET' || resetting}
                        className="flex-1 py-2 rounded-lg bg-red-600 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {resetting ? 'Deleting…' : 'Delete Everything'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
