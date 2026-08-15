export type LeadStatus = 'New' | 'Contacted' | 'Qualified' | 'Negotiating' | 'Won' | 'Lost'
export type RecruitStatus = 'New' | 'Contacted' | 'Interested' | 'Scheduled' | 'Joined' | 'Not Interested'
export type LeadGrade = 'A' | 'B' | 'C'
export type ClientType = 'Hot' | 'Warm' | 'Cold'
export type LeadSource = 'Cold Call' | 'Doorknock' | 'Flyers / Mailers' | 'Google PPC' | 'Meta Ads' | 'Referral' | 'Roadshow' | 'Walk-in' | 'Website' | 'Other'
export type PropertyType = 'Commercial' | 'Condo' | 'EC' | 'HDB' | 'Industrial' | 'Landed' | 'Other'
export type TransactionType = 'Lease' | 'Purchase' | 'Rental' | 'Sale'
export type TransactionStatus = 'Active' | 'Completed' | 'Pending' | 'Cancelled'
export type ExpenseCategory = 'Branding' | 'Cobroke Comms' | 'Content Creation' | 'Gifts' | 'Listing Portals' | 'Marketing' | 'Referral Fees' | 'Software' | 'Staging' | 'Transport' | 'Other'
export type IncomeCategory = 'Commission' | 'Consultation' | 'Referral Fee' | 'Other'

export interface Lead {
  id: string
  user_id: string
  name: string
  display_name: string | null
  email: string | null
  phone: string | null
  whatsapp_number: string | null
  status: LeadStatus
  grade: LeadGrade | null
  client_type: ClientType | null
  source: LeadSource | null
  property_type: string | null
  budget: number | null
  project_interested: string | null
  birthday: string | null
  property_address: string | null
  correspondence_address: string | null
  notes: string | null
  follow_up_date: string | null
  reminder_at: string | null
  meta_leadgen_id: string | null
  created_at: string
  updated_at: string
}

export interface RecruitLead {
  id: string
  user_id: string
  name: string
  phone: string | null
  email: string | null
  current_agency: string | null
  status: RecruitStatus
  notes: string | null
  follow_up_date: string | null
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
  display_name: string | null
  email: string | null
  phone: string | null
  whatsapp_number: string | null
  property_type: string | null
  budget: number | null
  project_interested: string | null
  birthday: string | null
  property_address: string | null
  correspondence_address: string | null
  client_type: ClientType | null
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

export interface Profile {
  user_id: string
  display_name: string
  agency_name: string
  cea_reg_no: string | null
  whatsapp_number: string | null
  created_at: string
  updated_at: string
}

export type CadenceChannel = 'call' | 'voicemail' | 'whatsapp'
export type CadenceStatus = 'pending' | 'done' | 'skipped'

export interface AutomationSettings {
  id: string
  user_id: string
  auto_set_deal_value: boolean
  default_deal_value: number | null
  auto_set_due_date: boolean
  due_date_days_offset: number
  auto_reminder: boolean
  reminder_days_offset: number
  auto_create_activity: boolean
  stage_notification: boolean
  notify_stages: LeadStatus[]
  created_at: string
  updated_at: string
}

export interface CadenceFollowUp {
  id: string
  user_id: string
  lead_id: string
  attempt_number: number
  scheduled_date: string
  channel: CadenceChannel
  status: CadenceStatus
  notes: string | null
  completed_at: string | null
  created_at: string
}
