-- Run this in your Supabase SQL editor
-- Lets the Meta webhook dedupe leads on retried deliveries (same leadgen_id).

alter table leads add column if not exists meta_leadgen_id text;

create unique index if not exists leads_user_meta_leadgen_id_idx
  on leads (user_id, meta_leadgen_id)
  where meta_leadgen_id is not null;
