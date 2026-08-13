'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Modal } from '@/components/ui/Modal'
import { Input, Select } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { createClient } from '@/lib/supabase/client'
import { Plus, TrendingUp, TrendingDown, DollarSign, Percent } from 'lucide-react'
import type { Income, Expense, IncomeCategory, ExpenseCategory } from '@/types'
import { formatCurrency, formatPercent } from '@/utils/format'
import { NumberInput } from '@/components/ui/NumberInput'

const INCOME_CATS: IncomeCategory[] = ['Commission', 'Consultation', 'Referral Fee', 'Other']
const EXPENSE_CATS: ExpenseCategory[] = ['Branding', 'Cobroke Comms', 'Content Creation', 'Gifts', 'Listing Portals', 'Marketing', 'Referral Fees', 'Software', 'Staging', 'Transport', 'Other']

const INCOME_COLORS: Record<string, string> = {
  'Commission':   'hsl(142, 71%, 45%)',
  'Consultation': 'hsl(235, 75%, 60%)',
  'Referral Fee': 'hsl(38, 92%, 50%)',
  'Other':        'hsl(280, 65%, 60%)',
}

const EXPENSE_COLORS: Record<string, string> = {
  'Branding':         'hsl(235, 75%, 60%)',
  'Cobroke Comms':    'hsl(280, 65%, 60%)',
  'Content Creation': 'hsl(38, 92%, 50%)',
  'Gifts':            'hsl(336, 80%, 58%)',
  'Listing Portals':  'hsl(25, 95%, 53%)',
  'Marketing':        'hsl(197, 71%, 48%)',
  'Referral Fees':    'hsl(162, 63%, 41%)',
  'Software':         'hsl(261, 68%, 60%)',
  'Staging':          'hsl(316, 72%, 55%)',
  'Transport':        'hsl(0, 84%, 60%)',
  'Other':            'hsl(220, 14%, 60%)',
}

const CHART_TOOLTIP = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2.5 shadow-lg text-xs">
      <p className="font-semibold mb-1.5">{label}</p>
      {payload.map((e: any) => (
        <div key={e.name} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: e.color }} />
          <span className="text-muted-foreground capitalize">{e.name}:</span>
          <span className="font-medium">{formatCurrency(e.value)}</span>
        </div>
      ))}
    </div>
  )
}

export default function PnLClient({ initialIncomes, initialExpenses, userId }: {
  initialIncomes: Income[]; initialExpenses: Expense[]; userId: string
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const supabase = createClient()
  const [addModal, setAddModal] = useState<'income' | 'expense' | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [incomeForm, setIncomeForm] = useState({ category: 'Commission' as IncomeCategory, amount: '', description: '', date: '' })
  const [expenseForm, setExpenseForm] = useState({ category: 'Marketing' as ExpenseCategory, amount: '', description: '', date: '' })

  const handleSaved = () => startTransition(() => router.refresh())

  const totalIncome = initialIncomes.reduce((s, r) => s + r.amount, 0)
  const totalExpenses = initialExpenses.reduce((s, r) => s + r.amount, 0)
  const netProfit = totalIncome - totalExpenses
  const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0

  // Income by category
  const incomeByCategory = INCOME_CATS.map(cat => ({
    cat,
    amount: initialIncomes.filter(r => r.category === cat).reduce((s, r) => s + r.amount, 0),
  })).filter(r => r.amount > 0).sort((a, b) => b.amount - a.amount)

  // Expenses by category
  const expenseByCategory = EXPENSE_CATS.map(cat => ({
    cat,
    amount: initialExpenses.filter(r => r.category === cat).reduce((s, r) => s + r.amount, 0),
  })).filter(r => r.amount > 0).sort((a, b) => b.amount - a.amount)

  // Monthly chart (12 months)
  const months: { month: string; income: number; expenses: number }[] = []
  const now = new Date()
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const label = d.toLocaleDateString('en-SG', { month: 'short' })
    const ms = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    months.push({
      month: label,
      income: initialIncomes.filter(r => r.date.startsWith(ms)).reduce((s, r) => s + r.amount, 0),
      expenses: initialExpenses.filter(r => r.date.startsWith(ms)).reduce((s, r) => s + r.amount, 0),
    })
  }

  const saveIncome = async () => {
    if (!incomeForm.amount || !incomeForm.date) return
    setSaving(true)
    setSaveError(null)
    const { error } = await supabase.from('income').insert({ user_id: userId, category: incomeForm.category, amount: parseFloat(incomeForm.amount), description: incomeForm.description || null, date: incomeForm.date, created_at: new Date().toISOString() })
    setSaving(false)
    if (error) { setSaveError(error.message); return }
    setAddModal(null)
    setIncomeForm({ category: 'Commission', amount: '', description: '', date: '' })
    handleSaved()
  }

  const saveExpense = async () => {
    if (!expenseForm.amount || !expenseForm.date) return
    setSaving(true)
    setSaveError(null)
    const { error } = await supabase.from('expenses').insert({ user_id: userId, category: expenseForm.category, amount: parseFloat(expenseForm.amount), description: expenseForm.description || null, date: expenseForm.date, created_at: new Date().toISOString() })
    setSaving(false)
    if (error) { setSaveError(error.message); return }
    setAddModal(null)
    setExpenseForm({ category: 'Marketing', amount: '', description: '', date: '' })
    handleSaved()
  }

  const statCards = [
    { title: 'Total Income', value: formatCurrency(totalIncome), icon: TrendingUp, color: 'hsl(142, 71%, 45%)' },
    { title: 'Total Expenses', value: formatCurrency(totalExpenses), icon: TrendingDown, color: 'hsl(0, 84%, 60%)' },
    { title: 'Net Profit', value: formatCurrency(netProfit), icon: DollarSign, color: netProfit >= 0 ? 'hsl(142, 71%, 45%)' : 'hsl(0, 84%, 60%)' },
    { title: 'Profit Margin', value: formatPercent(profitMargin), icon: Percent, color: 'hsl(235, 75%, 60%)' },
  ]

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between mb-6 gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Profit & Loss</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Track your income and expenses</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
          <Button variant="secondary" size="sm" onClick={() => setAddModal('expense')}><Plus size={14} /> Expense</Button>
          <Button size="sm" onClick={() => setAddModal('income')}><Plus size={14} /> Income</Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {statCards.map((s) => {
          const Icon = s.icon
          return (
            <motion.div
              key={s.title}
              whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(0,0,0,0.09)' }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              className="bg-card border border-border rounded-xl p-3 sm:p-5"
            >
              <div className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center mb-2 sm:mb-3">
                <div className="absolute inset-0 rounded-lg sm:rounded-xl" style={{ background: s.color, opacity: 0.12 }} />
                <div className="relative" style={{ color: s.color }}><Icon size={15} /></div>
              </div>
              <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1 sm:mb-0 leading-tight">{s.title}</p>
              <p className="text-lg sm:text-2xl font-bold tracking-tight mt-1" style={{ color: s.color }}>{s.value}</p>
            </motion.div>
          )
        })}
      </div>

      {/* Monthly trend chart */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Monthly P&L Trend</CardTitle>
          <span className="text-xs text-muted-foreground">Last 12 months</span>
        </CardHeader>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={months} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="ig" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="eg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} tickFormatter={v => `$${v >= 1000 ? `${v/1000}k` : v}`} />
              <Tooltip content={<CHART_TOOLTIP />} />
              <Area type="monotone" dataKey="income" stroke="hsl(142, 71%, 45%)" strokeWidth={2} fill="url(#ig)" name="Income" />
              <Area type="monotone" dataKey="expenses" stroke="hsl(0, 84%, 60%)" strokeWidth={2} fill="url(#eg)" name="Expenses" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Income breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Income Breakdown</CardTitle>
            <span className="text-sm font-semibold text-foreground">{formatCurrency(totalIncome)}</span>
          </CardHeader>
          <div className="space-y-3">
            {incomeByCategory.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No income recorded yet</p>}
            {incomeByCategory.map(({ cat, amount }, i) => {
              const pct = totalIncome > 0 ? (amount / totalIncome) * 100 : 0
              const barColor = INCOME_COLORS[cat] ?? 'hsl(142, 71%, 45%)'
              return (
                <div key={cat}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: barColor }} />
                      <span className="text-foreground font-medium">{cat}</span>
                    </div>
                    <span className="text-muted-foreground">{formatCurrency(amount)} <span className="text-xs">({formatPercent(pct)})</span></span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.7, delay: i * 0.08, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{ background: barColor }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        {/* Expense breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Expense Breakdown</CardTitle>
            <span className="text-sm font-semibold text-foreground">{formatCurrency(totalExpenses)}</span>
          </CardHeader>
          <div className="space-y-3">
            {expenseByCategory.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No expenses recorded yet</p>}
            {expenseByCategory.map(({ cat, amount }, i) => {
              const pct = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0
              const barColor = EXPENSE_COLORS[cat] ?? 'hsl(0, 84%, 60%)'
              return (
                <div key={cat}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: barColor }} />
                      <span className="text-foreground font-medium">{cat}</span>
                    </div>
                    <span className="text-muted-foreground">{formatCurrency(amount)} <span className="text-xs">({formatPercent(pct)})</span></span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.7, delay: i * 0.06, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{ background: barColor }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      {/* Add Income modal */}
      <Modal open={addModal === 'income'} onClose={() => { setAddModal(null); setSaveError(null) }} title="Add Income">
        <div className="space-y-4">
          <Select label="Category" value={incomeForm.category} onChange={e => setIncomeForm(f => ({ ...f, category: e.target.value as IncomeCategory }))}>
            {INCOME_CATS.map(c => <option key={c} value={c}>{c}</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <NumberInput label="Amount (SGD) *" value={incomeForm.amount} onChange={raw => setIncomeForm(f => ({ ...f, amount: raw }))} placeholder="5,000" />
            <Input label="Date *" type="date" value={incomeForm.date} onChange={e => setIncomeForm(f => ({ ...f, date: e.target.value }))} />
          </div>
          <Input label="Description" value={incomeForm.description} onChange={e => setIncomeForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description" />
          {saveError && <p className="text-xs text-red-500 bg-red-500/10 rounded-lg px-3 py-2">{saveError}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setAddModal(null)}>Cancel</Button>
            <Button onClick={saveIncome} loading={saving}>Add Income</Button>
          </div>
        </div>
      </Modal>

      {/* Add Expense modal */}
      <Modal open={addModal === 'expense'} onClose={() => { setAddModal(null); setSaveError(null) }} title="Add Expense">
        <div className="space-y-4">
          <Select label="Category" value={expenseForm.category} onChange={e => setExpenseForm(f => ({ ...f, category: e.target.value as ExpenseCategory }))}>
            {EXPENSE_CATS.map(c => <option key={c} value={c}>{c}</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <NumberInput label="Amount (SGD) *" value={expenseForm.amount} onChange={raw => setExpenseForm(f => ({ ...f, amount: raw }))} placeholder="500" />
            <Input label="Date *" type="date" value={expenseForm.date} onChange={e => setExpenseForm(f => ({ ...f, date: e.target.value }))} />
          </div>
          <Input label="Description" value={expenseForm.description} onChange={e => setExpenseForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description" />
          {saveError && <p className="text-xs text-red-500 bg-red-500/10 rounded-lg px-3 py-2">{saveError}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setAddModal(null)}>Cancel</Button>
            <Button onClick={saveExpense} loading={saving}>Add Expense</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
