-- Recruitment Leads — run this in your Supabase SQL Editor

create table if not exists recruitment_leads (
  id uuid default uuid_generate_v4() primary key,
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

create policy "Users can manage own recruitment leads"
  on recruitment_leads for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
