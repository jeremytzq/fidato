-- Run this in your Supabase SQL editor
-- Creates the automation settings table (one row per user)

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

create policy "Users can manage their own automation settings"
  on automation_settings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
