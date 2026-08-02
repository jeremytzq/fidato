'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Modal } from '@/components/ui/Modal'
import { Input, Select } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { createClient } from '@/lib/supabase/client'
import { Plus, TrendingUp, TrendingDown, DollarSign, Percent } from 'lucide-react'
import type { Income, Expense, IncomeCategory, ExpenseCategory } from '@/types'
import { formatCurrency, formatPercent } from '@/utils/format'

const INCOME_CATS: IncomeCategory[] = ['Commission', 'Referral Fee', 'Consultation', 'Other']
const EXPENSE_CATS: ExpenseCategory[] = ['Office Rent', 'Advertising', 'Staging', 'Insurance', 'Photography', 'Licensing', 'Travel', 'Other']

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
  const [incomeForm, setIncomeForm] = useState({ category: 'Commission' as IncomeCategory, amount: '', description: '', date: '' })
  const [expenseForm, setExpenseForm] = useState({ category: 'Advertising' as ExpenseCategory, amount: '', description: '', date: '' })

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
    await supabase.from('income').insert({ user_id: userId, category: incomeForm.category, amount: parseFloat(incomeForm.amount), description: incomeForm.description || null, date: incomeForm.date, created_at: new Date().toISOString() })
    setSaving(false)
    setAddModal(null)
    setIncomeForm({ category: 'Commission', amount: '', description: '', date: '' })
    handleSaved()
  }

  const saveExpense = async () => {
    if (!expenseForm.amount || !expenseForm.date) return
    setSaving(true)
    await supabase.from('expenses').insert({ user_id: userId, category: expenseForm.category, amount: parseFloat(expenseForm.amount), description: expenseForm.description || null, date: expenseForm.date, created_at: new Date().toISOString() })
    setSaving(false)
    setAddModal(null)
    setExpenseForm({ category: 'Advertising', amount: '', description: '', date: '' })
    handleSaved()
  }

  const statCards = [
    { title: 'Total Income', value: formatCurrency(totalIncome), icon: TrendingUp, color: 'hsl(142, 71%, 45%)' },
    { title: 'Total Expenses', value: formatCurrency(totalExpenses), icon: TrendingDown, color: 'hsl(0, 84%, 60%)' },
    { title: 'Net Profit', value: formatCurrency(netProfit), icon: DollarSign, color: netProfit >= 0 ? 'hsl(142, 71%, 45%)' : 'hsl(0, 84%, 60%)' },
    { title: 'Profit Margin', value: formatPercent(profitMargin), icon: Percent, color: 'hsl(235, 75%, 60%)' },
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Profit & Loss</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Track your income and expenses</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setAddModal('expense')}><Plus size={15} /> Add Expense</Button>
          <Button onClick={() => setAddModal('income')}><Plus size={15} /> Add Income</Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((s, i) => {
          const Icon = s.icon
          return (
            <div key={s.title} className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${s.color}18` }}>
                  <Icon size={16} style={{ color: s.color }} />
                </div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{s.title}</p>
              </div>
              <p className="text-2xl font-bold tracking-tight" style={{ color: s.color }}>{s.value}</p>
            </div>
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
            {incomeByCategory.map(({ cat, amount }) => {
              const pct = totalIncome > 0 ? (amount / totalIncome) * 100 : 0
              return (
                <div key={cat}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-foreground font-medium">{cat}</span>
                    <span className="text-muted-foreground">{formatCurrency(amount)} <span className="text-xs">({formatPercent(pct)})</span></span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${pct}%` }} />
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
            {expenseByCategory.map(({ cat, amount }) => {
              const pct = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0
              return (
                <div key={cat}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-foreground font-medium">{cat}</span>
                    <span className="text-muted-foreground">{formatCurrency(amount)} <span className="text-xs">({formatPercent(pct)})</span></span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-red-500 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      {/* Add Income modal */}
      <Modal open={addModal === 'income'} onClose={() => setAddModal(null)} title="Add Income">
        <div className="space-y-4">
          <Select label="Category" value={incomeForm.category} onChange={e => setIncomeForm(f => ({ ...f, category: e.target.value as IncomeCategory }))}>
            {INCOME_CATS.map(c => <option key={c} value={c}>{c}</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Amount (SGD) *" type="number" value={incomeForm.amount} onChange={e => setIncomeForm(f => ({ ...f, amount: e.target.value }))} placeholder="5000" />
            <Input label="Date *" type="date" value={incomeForm.date} onChange={e => setIncomeForm(f => ({ ...f, date: e.target.value }))} />
          </div>
          <Input label="Description" value={incomeForm.description} onChange={e => setIncomeForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description" />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setAddModal(null)}>Cancel</Button>
            <Button onClick={saveIncome} loading={saving}>Add Income</Button>
          </div>
        </div>
      </Modal>

      {/* Add Expense modal */}
      <Modal open={addModal === 'expense'} onClose={() => setAddModal(null)} title="Add Expense">
        <div className="space-y-4">
          <Select label="Category" value={expenseForm.category} onChange={e => setExpenseForm(f => ({ ...f, category: e.target.value as ExpenseCategory }))}>
            {EXPENSE_CATS.map(c => <option key={c} value={c}>{c}</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Amount (SGD) *" type="number" value={expenseForm.amount} onChange={e => setExpenseForm(f => ({ ...f, amount: e.target.value }))} placeholder="500" />
            <Input label="Date *" type="date" value={expenseForm.date} onChange={e => setExpenseForm(f => ({ ...f, date: e.target.value }))} />
          </div>
          <Input label="Description" value={expenseForm.description} onChange={e => setExpenseForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description" />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setAddModal(null)}>Cancel</Button>
            <Button onClick={saveExpense} loading={saving}>Add Expense</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
