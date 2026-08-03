export type LeadStatus = 'New' | 'Contacted' | 'Qualified' | 'Negotiating' | 'Won' | 'Lost'
export type LeadGrade = 'A' | 'B' | 'C'
export type ClientType = 'Hot' | 'Warm' | 'Cold'
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
  whatsapp_number: string | null
  status: LeadStatus
  grade: LeadGrade | null
  client_type: ClientType | null
  source: LeadSource | null
  property_type: PropertyType | null
  budget: number | null
  project_interested: string | null
  birthday: string | null
  property_address: string | null
  correspondence_address: string | null
  notes: string | null
  follow_up_date: string | null
  reminder_at: string | null
  created_at: string
  updated_at: string
}

export interface ActivityLog {
  id: string
  user_id: string
  lead_id: string
  action: string
  created_at: string
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

export interface MessageTemplate {
  id: string
  user_id: string
  title: string
  body: string
  category: string
  created_at: string
  updated_at: string
}

export interface ShareLink {
  id: string
  user_id: string
  token: string
  title: string | null
  message: string | null
  media_url: string | null
  view_count: number
  created_at: string
}

export interface ShareLinkView {
  id: string
  share_link_id: string
  viewed_at: string
  user_agent: string | null
  ip_address: string | null
}
