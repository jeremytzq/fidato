-- Migration: add grade, reminder_at, and activity_log table
-- Run this in your Supabase SQL Editor

-- Add grade and reminder columns to leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS grade text CHECK (grade IN ('A', 'B', 'C'));
ALTER TABLE leads ADD COLUMN IF NOT EXISTS reminder_at timestamptz;

-- Activity log table
CREATE TABLE IF NOT EXISTS activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  action text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own activity_log" ON activity_log
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_activity_log_lead_id ON activity_log(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_grade ON leads(user_id, grade);
