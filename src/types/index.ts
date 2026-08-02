export type LeadStatus = 'New' | 'Contacted' | 'Qualified' | 'Negotiating' | 'Won' | 'Lost'
export type LeadSource = 'Referral' | 'Website' | 'Social Media' | 'Cold Call' | 'Walk-in' | 'Other'
export type PropertyType = 'HDB' | 'Condo' | 'Landed' | 'Commercial' | 'Industrial' | 'Other'
export type TransactionType = 'Sale' | 'Purchase' | 'Rental' | 'Lease'
export type TransactionStatus = 'Active' | 'Completed' | 'Pending' | 'Cancelled'
export type ExpenseCategory = 'Office Rent' | 'Advertising' | 'Staging' | 'Insurance' | 'Photography' | 'Licensing' | 'Travel' | 'Other'
export type IncomeCategory = 'Commission' | 'Referral Fee' | 'Consultation' | 'Other'

export interface Lead {
  id: string
  user_id: string
  name: string
  email: string | null
  phone: string | null
  status: LeadStatus
  source: LeadSource | null
  property_type: PropertyType | null
  budget: number | null
  notes: string | null
  follow_up_date: string | null
  created_at: string
  updated_at: string
}

export interface Client {
  id: string
  user_id: string
  name: string
  email: string | null
  phone: string | null
  property_type: PropertyType | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: string
  user_id: string
  client_id: string | null
  client_name: string
  property_address: string
  transaction_type: TransactionType
  status: TransactionStatus
  amount: number
  commission_rate: number
  commission_amount: number
  closing_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Income {
  id: string
  user_id: string
  transaction_id: string | null
  category: IncomeCategory
  amount: number
  description: string | null
  date: string
  created_at: string
}

export interface Expense {
  id: string
  user_id: string
  category: ExpenseCategory
  amount: number
  description: string | null
  date: string
  created_at: string
}

export interface DashboardStats {
  totalLeads: number
  activeClients: number
  totalRevenue: number
  pendingDeals: number
  leadsThisMonth: number
  revenueThisMonth: number
  conversionRate: number
  closedDeals: number
}

export interface MonthlyPnL {
  month: string
  income: number
  expenses: number
  profit: number
}

export interface KanbanColumn {
  id: LeadStatus
  title: string
  color: string
  leads: Lead[]
}
