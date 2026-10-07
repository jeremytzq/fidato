-- Fidato CRM — consolidate schema with the current app (types + Content Hub + Meta).
-- Safe to re-run: uses IF NOT EXISTS / DROP CONSTRAINT IF EXISTS patterns.
-- Run after supabase-schema.sql (or on an existing project that already applied earlier migrations).

-- ── Lead / client enrichment columns ──────────────────────────────────────────
alter table leads add column if not exists display_name text;
alter table leads add column if not exists whatsapp_number text;
alter table leads add column if not exists grade text;
alter table leads add column if not exists client_type text;
alter table leads add column if not exists project_interested text;
alter table leads add column if not exists birthday date;
alter table leads add column if not exists property_address text;
alter table leads add column if not exists correspondence_address text;
alter table leads add column if not exists reminder_at timestamptz;
alter table leads add column if not exists meta_leadgen_id text;

alter table clients add column if not exists display_name text;
alter table clients add column if not exists whatsapp_number text;
alter table clients add column if not exists budget numeric;
alter table clients add column if not exists project_interested text;
alter table clients add column if not exists birthday date;
alter table clients add column if not exists property_address text;
alter table clients add column if not exists correspondence_address text;
alter table clients add column if not exists client_type text;

-- Relax enum checks that the UI outgrew (multi-select property types, expanded sources/expenses)
alter table leads drop constraint if exists leads_property_type_check;
alter table leads drop constraint if exists leads_source_check;
alter table leads drop constraint if exists leads_grade_check;
alter table clients drop constraint if exists clients_property_type_check;
alter table expenses drop constraint if exists expenses_category_check;

do $$ begin
  alter table leads add constraint leads_grade_check check (grade is null or grade in ('A', 'B', 'C'));
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table leads add constraint leads_client_type_check check (client_type is null or client_type in ('Hot', 'Warm', 'Cold'));
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table clients add constraint clients_client_type_check check (client_type is null or client_type in ('Hot', 'Warm', 'Cold'));
exception when duplicate_object then null;
end $$;

create unique index if not exists leads_user_meta_leadgen_id_idx
  on leads (user_id, meta_leadgen_id)
  where meta_leadgen_id is not null;

create index if not exists idx_leads_grade on leads(user_id, grade);

-- ── Activity log ──────────────────────────────────────────────────────────────
create table if not exists activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  action text not null,
  created_at timestamptz default now() not null
);

alter table activity_log enable row level security;

do $$ begin
  create policy "Users manage own activity_log" on activity_log
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

create index if not exists idx_activity_log_lead_id on activity_log(lead_id, created_at desc);

-- ── Recruitment ───────────────────────────────────────────────────────────────
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

alter table recruitment_leads enable row level security;

do $$ begin
  create policy "Users can manage own recruitment leads" on recruitment_leads
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

-- ── Cadence follow-ups ────────────────────────────────────────────────────────
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

alter table cadence_follow_ups enable row level security;

do $$ begin
  create policy "Users can manage their own cadence follow-ups" on cadence_follow_ups
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

create index if not exists cadence_follow_ups_lead_id_idx on cadence_follow_ups(lead_id);
create index if not exists cadence_follow_ups_user_scheduled_idx on cadence_follow_ups(user_id, scheduled_date, status);

-- ── Automation settings ───────────────────────────────────────────────────────
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

alter table automation_settings enable row level security;

do $$ begin
  create policy "Users can manage their own automation settings" on automation_settings
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

-- ── Agent profiles ────────────────────────────────────────────────────────────
create table if not exists profiles (
  user_id uuid references auth.users(id) on delete cascade primary key,
  display_name text not null default '',
  agency_name text not null default '',
  cea_reg_no text,
  whatsapp_number text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table profiles enable row level security;

do $$ begin
  create policy "Users can manage their own profile" on profiles
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

-- ── Content Hub ───────────────────────────────────────────────────────────────
create table if not exists message_templates (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text not null,
  category text not null default 'General',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table message_templates enable row level security;

do $$ begin
  create policy "Users manage own message_templates" on message_templates
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

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

alter table share_links enable row level security;

do $$ begin
  create policy "Users manage own share_links" on share_links
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

-- Public share page reads links by token (anon key)
do $$ begin
  create policy "Public can read share_links by token" on share_links
    for select using (true);
exception when duplicate_object then null;
end $$;

create table if not exists share_link_views (
  id uuid default gen_random_uuid() primary key,
  share_link_id uuid not null references share_links(id) on delete cascade,
  viewed_at timestamptz default now() not null,
  user_agent text,
  ip_address text
);

alter table share_link_views enable row level security;

-- Owners can see their view analytics; inserts go through the RPC below
do $$ begin
  create policy "Users can view own share_link_views" on share_link_views
    for select using (
      exists (
        select 1 from share_links sl
        where sl.id = share_link_views.share_link_id and sl.user_id = auth.uid()
      )
    );
exception when duplicate_object then null;
end $$;

-- Profiles readable when the agent has published a share link
do $$ begin
  create policy "Public can view profiles that have an active share link" on profiles
    for select using (
      exists (select 1 from share_links sl where sl.user_id = profiles.user_id)
    );
exception when duplicate_object then null;
end $$;

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

-- Storage bucket for share media (no-op if already created in dashboard)
insert into storage.buckets (id, name, public)
values ('share-media', 'share-media', true)
on conflict (id) do nothing;

-- ── Meta Lead Ads connections ─────────────────────────────────────────────────
create table if not exists meta_connections (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  page_id text not null unique,
  page_name text,
  page_access_token text not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table meta_connections enable row level security;

do $$ begin
  create policy "Users can manage own meta_connections" on meta_connections
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

create index if not exists meta_connections_user_id_idx on meta_connections(user_id);
