-- Run this in your Supabase SQL editor
-- Agent-facing profile info shown on public share pages (src/app/share/[token]).

create table if not exists profiles (
  user_id uuid references auth.users(id) on delete cascade primary key,
  display_name text not null default 'Jeremy Tan',
  agency_name text not null default 'PropNex Realty',
  cea_reg_no text,
  whatsapp_number text default '6590039987',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table profiles enable row level security;

create policy "Users can manage their own profile"
  on profiles for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- The public share page (anon key) needs to read the agent's contact info for
-- any account that has published at least one share link — scoped this way
-- instead of a blanket public-read policy on the whole table.
create policy "Public can view profiles that have an active share link"
  on profiles for select
  using (
    exists (
      select 1 from share_links sl where sl.user_id = profiles.user_id
    )
  );
