'use client'

import { useState, useTransition, useRef, useEffect, useCallback, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Badge } from '@/components/ui/Badge'
import { Download, Search, ChevronUp, ChevronDown, Sparkles, Trash2, AlertTriangle, X, Columns3 } from 'lucide-react'
import type { Lead, Client, Transaction } from '@/types'
import { formatCurrency, formatDate } from '@/utils/format'
import { createClient } from '@/lib/supabase/client'
import { clearGoogleSheets } from '@/lib/googleSheets'
import { cn } from '@/utils/cn'

type Tab = 'leads' | 'clients' | 'transactions'
type SortDir = 'asc' | 'desc'

interface ColDef<T> {
  key: string
  label: string
  defaultVisible: boolean
  sortable?: boolean
  render: (row: T) => ReactNode
}

const GRADE_STYLES: Record<string, string> = {
  A: 'bg-red-50 text-red-600 border border-red-200',
  B: 'bg-amber-50 text-amber-600 border border-amber-200',
  C: 'bg-blue-50 text-blue-600 border border-blue-200',
}

const CLIENT_TYPE_LABEL: Record<string, string> = { Hot: '🔥 Hot', Warm: '☀️ Warm', Cold: '🧊 Cold' }

const LEAD_COLS: ColDef<Lead>[] = [
  { key: 'name', label: 'Name', defaultVisible: true, render: l => <span className="font-medium text-foreground">{l.name}</span> },
  { key: 'display_name', label: 'Display Name', defaultVisible: false, render: l => l.display_name || '—' },
  { key: 'email', label: 'Email', defaultVisible: true, render: l => l.email || '—' },
  { key: 'phone', label: 'Phone', defaultVisible: true, render: l => l.phone || '—' },
  { key: 'grade', label: 'Grade', defaultVisible: false, render: l => l.grade ? <span className={cn('text-xs font-bold px-1.5 py-0.5 rounded-md', GRADE_STYLES[l.grade])}>{l.grade}</span> : '—' },
  { key: 'client_type', label: 'Client Type', defaultVisible: false, render: l => l.client_type ? CLIENT_TYPE_LABEL[l.client_type] : '—' },
  { key: 'property_type', label: 'Property Type', defaultVisible: true, render: l => l.property_type || '—' },
  { key: 'budget', label: 'Budget', defaultVisible: true, render: l => l.budget ? formatCurrency(l.budget) : '—' },
  { key: 'status', label: 'Status', defaultVisible: true, render: l => <Badge label={l.status} /> },
  { key: 'source', label: 'Source', defaultVisible: true, render: l => l.source || '—' },
  { key: 'project_interested', label: 'Project', defaultVisible: false, render: l => l.project_interested || '—' },
  { key: 'follow_up_date', label: 'Follow-up', defaultVisible: true, render: l => l.follow_up_date ? formatDate(l.follow_up_date) : '—' },
  { key: 'birthday', label: 'Birthday', defaultVisible: false, render: l => l.birthday || '—' },
  { key: 'property_address', label: 'Property Addr.', defaultVisible: false, render: l => <span className="max-w-40 truncate block">{l.property_address || '—'}</span> },
  { key: 'notes', label: 'Notes', defaultVisible: false, render: l => <span className="max-w-48 truncate block">{l.notes || '—'}</span> },
  { key: 'created_at', label: 'Created', defaultVisible: false, render: l => formatDate(l.created_at) },
]

const CLIENT_COLS: ColDef<Client>[] = [
  { key: 'name', label: 'Name', defaultVisible: true, render: c => <span className="font-medium text-foreground">{c.name}</span> },
  { key: 'display_name', label: 'Display Name', defaultVisible: false, render: c => c.display_name || '—' },
  { key: 'email', label: 'Email', defaultVisible: true, render: c => c.email || '—' },
  { key: 'phone', label: 'Phone', defaultVisible: true, render: c => c.phone || '—' },
  { key: 'client_type', label: 'Client Type', defaultVisible: false, render: c => c.client_type ? CLIENT_TYPE_LABEL[c.client_type] : '—' },
  { key: 'property_type', label: 'Property Type', defaultVisible: true, render: c => c.property_type || '—' },
  { key: 'budget', label: 'Budget', defaultVisible: false, render: c => c.budget ? formatCurrency(c.budget) : '—' },
  { key: 'project_interested', label: 'Project', defaultVisible: false, render: c => c.project_interested || '—' },
  { key: 'notes', label: 'Notes', defaultVisible: true, render: c => <span className="max-w-48 truncate block">{c.notes || '—'}</span> },
  { key: 'created_at', label: 'Created', defaultVisible: true, render: c => formatDate(c.created_at) },
]

const TX_COLS: ColDef<Transaction>[] = [
  { key: 'client_name', label: 'Client', defaultVisible: true, render: t => <span className="font-medium text-foreground">{t.client_name}</span> },
  { key: 'property_address', label: 'Property', defaultVisible: true, render: t => <span className="max-w-40 truncate block">{t.property_address}</span> },
  { key: 'transaction_type', label: 'Type', defaultVisible: true, render: t => t.transaction_type },
  { key: 'amount', label: 'Amount', defaultVisible: true, render: t => <span className="font-semibold">{formatCurrency(t.amount)}</span> },
  { key: 'commission_rate', label: 'Comm. Rate', defaultVisible: false, render: t => `${t.commission_rate}%` },
  { key: 'commission_amount', label: 'Commission', defaultVisible: true, render: t => <span className="font-semibold text-primary">{formatCurrency(t.commission_amount)}</span> },
  { key: 'status', label: 'Status', defaultVisible: true, render: t => <Badge label={t.status} /> },
  { key: 'closing_date', label: 'Closing Date', defaultVisible: true, render: t => t.closing_date ? formatDate(t.closing_date) : '—' },
  { key: 'notes', label: 'Notes', defaultVisible: false, render: t => <span className="max-w-40 truncate block">{t.notes || '—'}</span> },
]

function loadCols(key: string, defs: ColDef<any>[]): Set<string> {
  try {
    const stored = localStorage.getItem(key)
    if (stored) return new Set(JSON.parse(stored))
  } catch { /* ignore */ }
  return new Set(defs.filter(c => c.defaultVisible).map(c => c.key))
}

function saveCols(key: string, cols: Set<string>) {
  try { localStorage.setItem(key, JSON.stringify(Array.from(cols))) } catch { /* ignore */ }
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return active
    ? (dir === 'asc' ? <ChevronUp size={13} className="text-primary" /> : <ChevronDown size={13} className="text-primary" />)
    : <ChevronUp size={13} className="text-muted-foreground opacity-30" />
}

function ColPicker<T>({
  cols, visible, onToggle, onReset, storageKey,
}: {
  cols: ColDef<T>[]
  visible: Set<string>
  onToggle: (key: string) => void
  onReset: () => void
  storageKey: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const hiddenCount = cols.filter(c => !visible.has(c.key)).length

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'flex items-center gap-1.5 h-9 px-3 rounded-lg border text-sm font-medium transition-colors',
          open || hiddenCount > 0
            ? 'border-primary bg-primary/5 text-primary'
            : 'border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted'
        )}
      >
        <Columns3 size={14} />
        Columns
        {hiddenCount > 0 && (
          <span className="text-[10px] bg-primary text-primary-foreground rounded-full px-1.5 py-px font-semibold">
            {cols.length - hiddenCount}/{cols.length}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-full mt-1.5 z-30 bg-card border border-border rounded-xl shadow-lg w-52 py-1 overflow-hidden"
          >
            <div className="px-3 py-2 border-b border-border flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Show columns</span>
              <button
                onClick={() => { onReset(); saveCols(storageKey, new Set(cols.filter(c => c.defaultVisible).map(c => c.key))) }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Reset
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto py-1">
              {cols.map(col => (
                <label
                  key={col.key}
                  className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-muted/50 cursor-pointer group transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={visible.has(col.key)}
                    onChange={() => onToggle(col.key)}
                    className="w-3.5 h-3.5 rounded accent-primary cursor-pointer"
                  />
                  <span className="text-sm text-foreground">{col.label}</span>
                </label>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

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

  // Column visibility — lazy-initialised from localStorage
  const [leadCols, setLeadCols] = useState<Set<string>>(() => loadCols('db-lead-cols', LEAD_COLS))
  const [clientCols, setClientCols] = useState<Set<string>>(() => loadCols('db-client-cols', CLIENT_COLS))
  const [txCols, setTxCols] = useState<Set<string>>(() => loadCols('db-tx-cols', TX_COLS))

  const makeToggle = useCallback(
    (setter: React.Dispatch<React.SetStateAction<Set<string>>>, storageKey: string) =>
      (key: string) => {
        setter(prev => {
          const next = new Set(prev)
          if (next.has(key)) { if (next.size > 1) next.delete(key) }
          else next.add(key)
          saveCols(storageKey, next)
          return next
        })
      },
    []
  )

  const makeReset = useCallback(
    (setter: React.Dispatch<React.SetStateAction<Set<string>>>, defs: ColDef<any>[], storageKey: string) =>
      () => {
        const defaults = new Set(defs.filter(c => c.defaultVisible).map(c => c.key))
        setter(defaults)
        saveCols(storageKey, defaults)
      },
    []
  )

  const toggleLeadCol = makeToggle(setLeadCols, 'db-lead-cols')
  const toggleClientCol = makeToggle(setClientCols, 'db-client-cols')
  const toggleTxCol = makeToggle(setTxCols, 'db-tx-cols')
  const resetLeadCols = makeReset(setLeadCols, LEAD_COLS, 'db-lead-cols')
  const resetClientCols = makeReset(setClientCols, CLIENT_COLS, 'db-client-cols')
  const resetTxCols = makeReset(setTxCols, TX_COLS, 'db-tx-cols')

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const sortData = <T extends Record<string, any>>(data: T[]) =>
    [...data].sort((a, b) => {
      const av = a[sortKey] ?? '', bv = b[sortKey] ?? ''
      const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv))
      return sortDir === 'asc' ? cmp : -cmp
    })

  const q = search.toLowerCase()

  const filteredLeads = sortData(leads.filter(l => {
    const matchesSearch = !search || [
      l.name, l.display_name, l.email, l.phone,
      l.project_interested, l.notes, l.source, l.property_address,
    ].some(v => v?.toLowerCase().includes(q))
    return matchesSearch && (!statusFilter || l.status === statusFilter)
  }))

  const filteredClients = sortData(clients.filter(c => {
    return !search || [c.name, c.display_name, c.email, c.phone, c.notes, c.property_type].some(v => v?.toLowerCase().includes(q))
  }))

  const filteredTx = sortData(transactions.filter(tx => {
    const matchesSearch = !search || [
      tx.client_name, tx.property_address, tx.notes,
    ].some(v => v?.toLowerCase().includes(q))
    return matchesSearch && (!statusFilter || tx.status === statusFilter)
  }))

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
    await supabase.from('leads').insert(SEED_LEADS.map(l => ({ ...l, user_id: userId, created_at: now, updated_at: now })))
    await supabase.from('clients').insert(SEED_CLIENTS.map(c => ({ ...c, user_id: userId, created_at: now, updated_at: now })))
    setSeeding(false)
    startTransition(() => router.refresh())
  }

  const openResetModal = () => { setResetStep(1); setResetConfirmText(''); setResetError(null) }
  const closeResetModal = () => { setResetStep(0); setResetConfirmText(''); setResetError(null) }

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
      await clearGoogleSheets()
      closeResetModal()
      startTransition(() => router.refresh())
    } catch (e: unknown) {
      setResetError(e instanceof Error ? e.message : 'Reset failed')
    } finally {
      setResetting(false)
    }
  }

  const statuses = tab === 'transactions'
    ? ['Active', 'Pending', 'Completed', 'Cancelled']
    : ['New', 'Contacted', 'Qualified', 'Negotiating', 'Won', 'Lost']

  const thCls = 'text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3 cursor-pointer hover:text-foreground transition-colors select-none whitespace-nowrap'

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

      {/* Filters + column picker */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, email, phone, notes…"
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X size={13} />
            </button>
          )}
        </div>

        {tab !== 'clients' && (
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="h-9 px-3 rounded-lg border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
          >
            <option value="">All Status</option>
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        )}

        {/* Column picker */}
        {tab === 'leads' && (
          <ColPicker cols={LEAD_COLS} visible={leadCols} onToggle={toggleLeadCol} onReset={resetLeadCols} storageKey="db-lead-cols" />
        )}
        {tab === 'clients' && (
          <ColPicker cols={CLIENT_COLS} visible={clientCols} onToggle={toggleClientCol} onReset={resetClientCols} storageKey="db-client-cols" />
        )}
        {tab === 'transactions' && (
          <ColPicker cols={TX_COLS} visible={txCols} onToggle={toggleTxCol} onReset={resetTxCols} storageKey="db-tx-cols" />
        )}
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          {tab === 'leads' && (
            <table className="w-full">
              <thead style={{ background: 'hsl(var(--muted))' }}>
                <tr>
                  {LEAD_COLS.filter(c => leadCols.has(c.key)).map(col => (
                    <th key={col.key} onClick={() => handleSort(col.key)} className={thCls}>
                      <span className="flex items-center gap-1">{col.label}<SortIcon active={sortKey === col.key} dir={sortDir} /></span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredLeads.map((l, i) => (
                  <motion.tr key={l.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="hover:bg-muted/30 transition-colors">
                    {LEAD_COLS.filter(c => leadCols.has(c.key)).map(col => (
                      <td key={col.key} className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">{col.render(l)}</td>
                    ))}
                  </motion.tr>
                ))}
                {filteredLeads.length === 0 && (
                  <tr><td colSpan={leadCols.size || 1} className="px-4 py-10 text-center text-sm text-muted-foreground">No leads match your search</td></tr>
                )}
              </tbody>
            </table>
          )}

          {tab === 'clients' && (
            <table className="w-full">
              <thead style={{ background: 'hsl(var(--muted))' }}>
                <tr>
                  {CLIENT_COLS.filter(c => clientCols.has(c.key)).map(col => (
                    <th key={col.key} onClick={() => handleSort(col.key)} className={thCls}>
                      <span className="flex items-center gap-1">{col.label}<SortIcon active={sortKey === col.key} dir={sortDir} /></span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredClients.map((c, i) => (
                  <motion.tr key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="hover:bg-muted/30 transition-colors">
                    {CLIENT_COLS.filter(col => clientCols.has(col.key)).map(col => (
                      <td key={col.key} className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">{col.render(c)}</td>
                    ))}
                  </motion.tr>
                ))}
                {filteredClients.length === 0 && (
                  <tr><td colSpan={clientCols.size} className="px-4 py-10 text-center text-sm text-muted-foreground">No clients match your search</td></tr>
                )}
              </tbody>
            </table>
          )}

          {tab === 'transactions' && (
            <table className="w-full">
              <thead style={{ background: 'hsl(var(--muted))' }}>
                <tr>
                  {TX_COLS.filter(c => txCols.has(c.key)).map(col => (
                    <th key={col.key} onClick={() => handleSort(col.key)} className={thCls}>
                      <span className="flex items-center gap-1">{col.label}<SortIcon active={sortKey === col.key} dir={sortDir} /></span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredTx.map((tx, i) => (
                  <motion.tr key={tx.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="hover:bg-muted/30 transition-colors">
                    {TX_COLS.filter(c => txCols.has(c.key)).map(col => (
                      <td key={col.key} className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">{col.render(tx)}</td>
                    ))}
                  </motion.tr>
                ))}
                {filteredTx.length === 0 && (
                  <tr><td colSpan={txCols.size} className="px-4 py-10 text-center text-sm text-muted-foreground">No transactions match your search</td></tr>
                )}
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
                      This action cannot be undone. Your Google Sheet will also be cleared. Export a CSV backup first if you want to keep your data.
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button onClick={closeResetModal} className="flex-1 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">Cancel</button>
                      <button onClick={() => { setResetStep(2); setTimeout(() => confirmInputRef.current?.focus(), 50) }} className="flex-1 py-2 rounded-lg bg-red-600 text-sm font-semibold text-white hover:bg-red-700 transition-colors">Continue</button>
                    </div>
                  </>
                )}

                {resetStep === 2 && (
                  <>
                    <p className="text-sm text-foreground">
                      Type <span className="font-mono font-bold text-red-600 bg-red-50 dark:bg-red-950/30 px-1.5 py-0.5 rounded">RESET</span> to confirm.
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
                    {resetError && <p className="text-xs text-red-500">{resetError}</p>}
                    <div className="flex gap-2">
                      <button onClick={() => setResetStep(1)} disabled={resetting} className="flex-1 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50">Back</button>
                      <button onClick={handleReset} disabled={resetConfirmText !== 'RESET' || resetting} className="flex-1 py-2 rounded-lg bg-red-600 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
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
