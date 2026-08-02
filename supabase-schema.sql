-- Fidato CRM — Supabase Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- LEADS
create table if not exists leads (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  status text not null default 'New' check (status in ('New','Contacted','Qualified','Negotiating','Won','Lost')),
  source text check (source in ('Referral','Website','Social Media','Cold Call','Walk-in','Other')),
  property_type text check (property_type in ('HDB','Condo','Landed','Commercial','Industrial','Other')),
  budget numeric,
  notes text,
  follow_up_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- CLIENTS
create table if not exists clients (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  property_type text check (property_type in ('HDB','Condo','Landed','Commercial','Industrial','Other')),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- TRANSACTIONS
create table if not exists transactions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  client_name text not null,
  property_address text not null,
  transaction_type text not null check (transaction_type in ('Sale','Purchase','Rental','Lease')),
  status text not null default 'Active' check (status in ('Active','Pending','Completed','Cancelled')),
  amount numeric not null default 0,
  commission_rate numeric not null default 2,
  commission_amount numeric not null default 0,
  closing_date date,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- INCOME
create table if not exists income (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_id uuid references transactions(id) on delete set null,
  category text not null check (category in ('Commission','Referral Fee','Consultation','Other')),
  amount numeric not null,
  description text,
  date date not null,
  created_at timestamptz default now()
);

-- EXPENSES
create table if not exists expenses (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('Office Rent','Advertising','Staging','Insurance','Photography','Licensing','Travel','Other')),
  amount numeric not null,
  description text,
  date date not null,
  created_at timestamptz default now()
);

-- ROW LEVEL SECURITY (multi-tenant isolation)
alter table leads enable row level security;
alter table clients enable row level security;
alter table transactions enable row level security;
alter table income enable row level security;
alter table expenses enable row level security;

-- Policies: each user sees only their own data
create policy "leads_own" on leads using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "clients_own" on clients using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "transactions_own" on transactions using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "income_own" on income using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "expenses_own" on expenses using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Indexes for common queries
create index if not exists leads_user_status on leads(user_id, status);
create index if not exists leads_user_created on leads(user_id, created_at desc);
create index if not exists clients_user_created on clients(user_id, created_at desc);
create index if not exists transactions_user_created on transactions(user_id, created_at desc);
create index if not exists income_user_date on income(user_id, date desc);
create index if not exists expenses_user_date on expenses(user_id, date desc);
