-- Fidato CRM — full Supabase schema (greenfield)
-- For existing projects that already ran older migrations, use
-- supabase_consolidate_migration.sql instead (idempotent).

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ── LEADS ─────────────────────────────────────────────────────────────────────
create table if not exists leads (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  display_name text,
  email text,
  phone text,
  whatsapp_number text,
  status text not null default 'New' check (status in ('New','Contacted','Qualified','Negotiating','Won','Lost')),
  grade text check (grade is null or grade in ('A','B','C')),
  client_type text check (client_type is null or client_type in ('Hot','Warm','Cold')),
  source text,
  property_type text,
  budget numeric,
  project_interested text,
  birthday date,
  property_address text,
  correspondence_address text,
  notes text,
  follow_up_date date,
  reminder_at timestamptz,
  meta_leadgen_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists leads_user_meta_leadgen_id_idx
  on leads (user_id, meta_leadgen_id)
  where meta_leadgen_id is not null;

-- ── CLIENTS ───────────────────────────────────────────────────────────────────
create table if not exists clients (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  display_name text,
  email text,
  phone text,
  whatsapp_number text,
  property_type text,
  budget numeric,
  project_interested text,
  birthday date,
  property_address text,
  correspondence_address text,
  client_type text check (client_type is null or client_type in ('Hot','Warm','Cold')),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── TRANSACTIONS ──────────────────────────────────────────────────────────────
create table if not exists transactions (
  id uuid default gen_random_uuid() primary key,
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

-- ── INCOME / EXPENSES ─────────────────────────────────────────────────────────
create table if not exists income (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_id uuid references transactions(id) on delete set null,
  category text not null check (category in ('Commission','Referral Fee','Consultation','Other')),
  amount numeric not null,
  description text,
  date date not null,
  created_at timestamptz default now()
);

-- Categories match src/types ExpenseCategory (validated in the UI)
create table if not exists expenses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  amount numeric not null,
  description text,
  date date not null,
  created_at timestamptz default now()
);

-- ── ACTIVITY / RECRUITMENT / CADENCE / AUTOMATIONS / PROFILES ─────────────────
create table if not exists activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  action text not null,
  created_at timestamptz default now() not null
);

create table if not exists recruitment_leads (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  current_agency text,
  status text not null default 'New'
    check (status in ('New', 'Contacted', 'Interested', 'Scheduled', 'Joined', 'Not Interested')),
  notes text,
  follow_up_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists cadence_follow_ups (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  lead_id uuid references leads(id) on delete cascade not null,
  attempt_number int not null,
  scheduled_date date not null,
  channel text not null check (channel in ('call', 'voicemail', 'whatsapp')),
  status text not null default 'pending' check (status in ('pending', 'done', 'skipped')),
  notes text,
  completed_at timestamptz,
  created_at timestamptz default now() not null
);

create table if not exists automation_settings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null unique,
  auto_set_deal_value boolean default false not null,
  default_deal_value numeric,
  auto_set_due_date boolean default false not null,
  due_date_days_offset int default 7 not null,
  auto_reminder boolean default false not null,
  reminder_days_offset int default 1 not null,
  auto_create_activity boolean default true not null,
  stage_notification boolean default false not null,
  notify_stages text[] default '{}' not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table if not exists profiles (
  user_id uuid references auth.users(id) on delete cascade primary key,
  display_name text not null default '',
  agency_name text not null default '',
  cea_reg_no text,
  whatsapp_number text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- ── CONTENT HUB ───────────────────────────────────────────────────────────────
create table if not exists message_templates (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text not null,
  category text not null default 'General',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table if not exists share_links (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  title text,
  message text,
  media_url text,
  view_count int not null default 0,
  created_at timestamptz default now() not null
);

create table if not exists share_link_views (
  id uuid default gen_random_uuid() primary key,
  share_link_id uuid not null references share_links(id) on delete cascade,
  viewed_at timestamptz default now() not null,
  user_agent text,
  ip_address text
);

create or replace function log_share_link_view(
  p_token text,
  p_user_agent text default null,
  p_ip text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link_id uuid;
begin
  select id into v_link_id from share_links where token = p_token;
  if v_link_id is null then
    return;
  end if;

  insert into share_link_views (share_link_id, user_agent, ip_address)
  values (v_link_id, p_user_agent, p_ip);

  update share_links set view_count = view_count + 1 where id = v_link_id;
end;
$$;

grant execute on function log_share_link_view(text, text, text) to anon, authenticated;

insert into storage.buckets (id, name, public)
values ('share-media', 'share-media', true)
on conflict (id) do nothing;

-- ── META LEAD ADS ─────────────────────────────────────────────────────────────
create table if not exists meta_connections (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  page_id text not null unique,
  page_name text,
  page_access_token text not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- ── RLS ───────────────────────────────────────────────────────────────────────
alter table leads enable row level security;
alter table clients enable row level security;
alter table transactions enable row level security;
alter table income enable row level security;
alter table expenses enable row level security;
alter table activity_log enable row level security;
alter table recruitment_leads enable row level security;
alter table cadence_follow_ups enable row level security;
alter table automation_settings enable row level security;
alter table profiles enable row level security;
alter table message_templates enable row level security;
alter table share_links enable row level security;
alter table share_link_views enable row level security;
alter table meta_connections enable row level security;

create policy "leads_own" on leads using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "clients_own" on clients using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "transactions_own" on transactions using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "income_own" on income using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "expenses_own" on expenses using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own activity_log" on activity_log for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage own recruitment leads" on recruitment_leads for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage their own cadence follow-ups" on cadence_follow_ups for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage their own automation settings" on automation_settings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage their own profile" on profiles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Public can view profiles that have an active share link" on profiles for select using (
  exists (select 1 from share_links sl where sl.user_id = profiles.user_id)
);
create policy "Users manage own message_templates" on message_templates for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own share_links" on share_links for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Public can read share_links by token" on share_links for select using (true);
create policy "Users can view own share_link_views" on share_link_views for select using (
  exists (select 1 from share_links sl where sl.id = share_link_views.share_link_id and sl.user_id = auth.uid())
);
create policy "Users can manage own meta_connections" on meta_connections for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── INDEXES ───────────────────────────────────────────────────────────────────
create index if not exists leads_user_status on leads(user_id, status);
create index if not exists leads_user_created on leads(user_id, created_at desc);
create index if not exists idx_leads_grade on leads(user_id, grade);
create index if not exists clients_user_created on clients(user_id, created_at desc);
create index if not exists transactions_user_created on transactions(user_id, created_at desc);
create index if not exists income_user_date on income(user_id, date desc);
create index if not exists expenses_user_date on expenses(user_id, date desc);
create index if not exists idx_activity_log_lead_id on activity_log(lead_id, created_at desc);
create index if not exists cadence_follow_ups_lead_id_idx on cadence_follow_ups(lead_id);
create index if not exists cadence_follow_ups_user_scheduled_idx on cadence_follow_ups(user_id, scheduled_date, status);
create index if not exists meta_connections_user_id_idx on meta_connections(user_id);
