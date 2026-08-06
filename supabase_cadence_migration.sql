-- Run this in your Supabase SQL editor
-- Creates the cold lead follow-up cadence table

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

create policy "Users can manage their own cadence follow-ups"
  on cadence_follow_ups for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index cadence_follow_ups_lead_id_idx on cadence_follow_ups(lead_id);
create index cadence_follow_ups_user_scheduled_idx on cadence_follow_ups(user_id, scheduled_date, status);
