-- Run this in your Supabase SQL editor.
-- Fixes: Failed to save: new row for relation "leads" violates check constraint "leads_property_type_check"
--
-- The lead form is a multi-select (and offers "EC"), so property_type is stored as a
-- comma-separated string such as 'Condo,EC'. The original schema only allowed a single
-- value from HDB / Condo / Landed / Commercial / Industrial / Other, so any lead with
-- EC, or with more than one type ticked, was rejected. Valid options are enforced in
-- the UI, so the database constraint is dropped rather than widened.

alter table leads   drop constraint if exists leads_property_type_check;
alter table clients drop constraint if exists clients_property_type_check;

-- The lead source list has grown past the original schema (Doorknock, Flyers / Mailers,
-- Google PPC, Meta Ads, Roadshow) and would fail the same way. No-op if already removed.
alter table leads drop constraint if exists leads_source_check;
