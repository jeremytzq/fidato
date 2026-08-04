import { createClient } from '@/lib/supabase/server'
import { StatCard } from '@/components/dashboard/StatCard'
import { RecentLeads } from '@/components/dashboard/RecentActivity'
import { RevenueChart } from '@/components/dashboard/RevenueChart'
import { LeadSourceChart } from '@/components/dashboard/LeadSourceChart'
import { formatCurrency } from '@/utils/format'
import type { MonthlyPnL } from '@/types'

export const dynamic = 'force-dynamic'

async function getDashboardData(userId: string) {
  const supabase = createClient()

  const [leadsRes, clientsRes, txRes, incomeRes, expenseRes] = await Promise.all([
    supabase.from('leads').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('clients').select('id').eq('user_id', userId),
    supabase.from('transactions').select('*').eq('user_id', userId),
    supabase.from('income').select('amount, date, category').eq('user_id', userId),
    supabase.from('expenses').select('amount, date').eq('user_id', userId),
  ])

  const leads = leadsRes.data || []
  const clients = clientsRes.data || []
  const transactions = txRes.data || []
  const incomes = incomeRes.data || []
  const expenses = expenseRes.data || []

  const totalIncome = incomes.reduce((s, r) => s + r.amount, 0)
  const totalExpenses = expenses.reduce((s, r) => s + r.amount, 0)
  const wonLeads = leads.filter(l => l.status === 'Won').length
  const conversionRate = leads.length > 0 ? Math.round((wonLeads / leads.length) * 100) : 0
  const pendingDeals = transactions.filter(t => t.status === 'Active' || t.status === 'Pending').length

  // Monthly P&L for chart (last 12 months)
  const months: MonthlyPnL[] = []
  const now = new Date()
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const label = d.toLocaleDateString('en-SG', { month: 'short' })
    const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const inc = incomes.filter(r => r.date.startsWith(monthStr)).reduce((s, r) => s + r.amount, 0)
    const exp = expenses.filter(r => r.date.startsWith(monthStr)).reduce((s, r) => s + r.amount, 0)
    months.push({ month: label, income: inc, expenses: exp, profit: inc - exp })
  }

  // Lead source breakdown with conversion
  const sourceMap = leads.reduce((acc, lead) => {
    const src = lead.source || 'Other'
    if (!acc[src]) acc[src] = { total: 0, converted: 0 }
    acc[src].total += 1
    if (lead.status === 'Won') acc[src].converted += 1
    return acc
  }, {} as Record<string, { total: number; converted: number }>)
  const sourceCounts = Object.keys(sourceMap)
    .map(source => ({ source, total: sourceMap[source].total, converted: sourceMap[source].converted }))
    .sort((a, b) => b.total - a.total)

  return {
    leads: leads.slice(0, 6),
    stats: {
      totalLeads: leads.length,
      activeClients: clients.length,
      totalRevenue: totalIncome,
      pendingDeals,
      conversionRate,
      netProfit: totalIncome - totalExpenses,
    },
    chartData: months,
    sourceCounts,
  }
}

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { leads, stats, chartData, sourceCounts } = await getDashboardData(user.id)
  const firstName = user.user_metadata?.full_name?.split(' ')[0] || 'there'

  const statCards = [
    { title: 'Total Leads', value: String(stats.totalLeads), iconName: 'Users' as const, iconColor: 'hsl(235, 75%, 60%)', subtitle: 'All time' },
    { title: 'Active Clients', value: String(stats.activeClients), iconName: 'UserCheck' as const, iconColor: 'hsl(142, 71%, 45%)', subtitle: 'In your CRM' },
    { title: 'Total Revenue', value: formatCurrency(stats.totalRevenue), iconName: 'DollarSign' as const, iconColor: 'hsl(142, 71%, 45%)', subtitle: 'Gross income' },
    { title: 'Net Profit', value: formatCurrency(stats.netProfit), iconName: 'TrendingUp' as const, iconColor: 'hsl(235, 75%, 60%)', subtitle: 'After expenses' },
    { title: 'Pending Deals', value: String(stats.pendingDeals), iconName: 'FileText' as const, iconColor: 'hsl(38, 92%, 50%)', subtitle: 'Active & pending' },
    { title: 'Conversion Rate', value: `${stats.conversionRate}%`, iconName: 'Target' as const, iconColor: 'hsl(280, 65%, 60%)', subtitle: 'Leads → Won' },
  ]

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Good morning, {firstName} 👋</h1>
        <p className="text-muted-foreground mt-1 text-sm">Here&apos;s what&apos;s happening with your pipeline today.</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6">
        {statCards.map((s, i) => (
          <StatCard key={s.title} {...s} index={i} />
        ))}
      </div>

      {/* Charts + Recent leads */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 flex flex-col gap-4">
          <RevenueChart data={chartData} />
          <LeadSourceChart data={sourceCounts} />
        </div>
        <div className="lg:col-span-2">
          <RecentLeads leads={leads} />
        </div>
      </div>
    </div>
  )
}
