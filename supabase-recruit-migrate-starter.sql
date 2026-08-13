-- Migrate recruitment starter list from leads → recruitment_leads
-- Run this in Supabase SQL Editor AFTER running supabase-recruitment-migration.sql

-- Step 1: Copy matching leads into recruitment_leads
INSERT INTO recruitment_leads (user_id, name, phone, email, status, notes, follow_up_date, created_at, updated_at)
SELECT
  user_id,
  name,
  phone,
  email,
  CASE status
    WHEN 'Contacted' THEN 'Contacted'
    ELSE 'New'
  END AS status,
  notes,
  follow_up_date,
  now(),
  now()
FROM leads
WHERE lower(name) IN (
  'ivan cheong', 'wendy lim', 'kenneth yee', 'clarrence fong', 'clarisse tan',
  'tan cheong', 'alvin ng', 'nigel ng', 'samuel', 'cheong jin wei',
  'glenn kuan', 'maverick ang', 'meibin tok', 'rui wen', 'toh lip an',
  'jarhead james', 'eric goh', 'lionel', 'vyon koh', 'kanch dass',
  'choo jin eu', 'daryl yeo', 'rachael aang', 'siddiq alihaq', 'pon yong leng'
);

-- Step 2: Remove them from leads
DELETE FROM leads
WHERE lower(name) IN (
  'ivan cheong', 'wendy lim', 'kenneth yee', 'clarrence fong', 'clarisse tan',
  'tan cheong', 'alvin ng', 'nigel ng', 'samuel', 'cheong jin wei',
  'glenn kuan', 'maverick ang', 'meibin tok', 'rui wen', 'toh lip an',
  'jarhead james', 'eric goh', 'lionel', 'vyon koh', 'kanch dass',
  'choo jin eu', 'daryl yeo', 'rachael aang', 'siddiq alihaq', 'pon yong leng'
);
