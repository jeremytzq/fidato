'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/Badge'
import { Download, Search, ChevronUp, ChevronDown } from 'lucide-react'
import type { Lead, Client, Transaction } from '@/types'
import { formatCurrency, formatDate } from '@/utils/format'

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

export default function DatabaseClient({ leads, clients, transactions }: {
  leads: Lead[]; clients: Client[]; transactions: Transaction[]
}) {
  const [tab, setTab] = useState<Tab>('leads')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortKey, setSortKey] = useState('created_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

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
        <button
          onClick={exportData}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Download size={14} /> Export CSV
        </button>
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
    </div>
  )
}
