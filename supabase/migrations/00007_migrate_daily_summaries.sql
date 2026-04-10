-- =====================================================
-- Migrate Daily Summaries to Morning Briefing Lenses
-- =====================================================
--
-- Creates default Morning Briefing lenses for existing users,
-- migrates historical daily summaries into lens_results, and
-- documents the pg_cron job swap required for custom lenses.
--
-- The daily_summaries table is preserved for rollback safety.
--

-- =====================================================
-- Create Morning Briefing lens for existing users
-- =====================================================
INSERT INTO lenses (user_id, name, prompt, schedule_type, schedule_time, lookback_hours, is_default)
SELECT
  id,
  'Morning Briefing',
  'Give me my top 3 action items, one thing I''m avoiding, and one small win.',
  'daily',
  '08:00',
  48,
  true
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM lenses l WHERE l.user_id = u.id AND l.is_default = true
);

-- next_run_at is auto-computed by the compute_next_run_at() trigger on INSERT.

-- =====================================================
-- Migrate daily_summaries history into lens_results
-- =====================================================
INSERT INTO lens_results (lens_id, user_id, content, notes_analyzed, generated_at, sent_at)
SELECT
  l.id,
  ds.user_id,
  '## Today''s Top 3' || E'\n' ||
    '1. ' || (ds.content->'top_actions'->>0) || E'\n' ||
    '2. ' || (ds.content->'top_actions'->>1) || E'\n' ||
    '3. ' || (ds.content->'top_actions'->>2) || E'\n\n' ||
  '## Maybe Avoiding...' || E'\n' ||
    (ds.content->>'avoiding') || E'\n\n' ||
  '## Small Win' || E'\n' ||
    (ds.content->>'small_win'),
  0,
  ds.generated_at,
  ds.sent_at
FROM daily_summaries ds
JOIN lenses l ON l.user_id = ds.user_id AND l.is_default = true;

-- =====================================================
-- pg_cron Configuration for Lens Dispatch + Cleanup
-- =====================================================
--
-- Prerequisites:
-- 1. Enable pg_cron extension in Supabase Dashboard > Database > Extensions
-- 2. Enable pg_net extension in Supabase Dashboard > Database > Extensions
-- 3. Store the cron secret in Supabase Vault as `cron_secret`
--
-- This migration documents the cron job swap required for custom lenses.
-- The actual cron jobs must be created via SQL Editor in Supabase Dashboard
-- because pg_cron jobs require superuser privileges.
--
-- =====================================================

-- Verify extensions are enabled (will fail if not)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- =====================================================
-- MANUAL SETUP REQUIRED
-- =====================================================
--
-- Run this SQL in the Supabase SQL Editor (Dashboard > SQL Editor):
--
-- Replace <project-ref> with your Supabase project reference (e.g., "abcdefghijk")
--
-- 1. Remove old cron job:
-- SELECT cron.unschedule('generate-daily-summaries');
--
-- 2. Add new dispatcher job:
-- SELECT cron.schedule(
--   'dispatch-lenses',
--   '*/5 * * * *',  -- Every 5 minutes
--   $$
--   SELECT net.http_post(
--     url := 'https://<project-ref>.supabase.co/functions/v1/dispatch-lenses',
--     headers := jsonb_build_object(
--       'X-Cron-Secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret'),
--       'Content-Type', 'application/json'
--     ),
--     body := '{}'::jsonb
--   );
--   $$
-- );
--
-- 3. Add cleanup job:
-- SELECT cron.schedule(
--   'cleanup-old-lens-results',
--   '0 3 * * *',  -- Daily at 3:00 AM UTC
--   $$
--   DELETE FROM lens_results WHERE generated_at < NOW() - INTERVAL '90 days';
--   $$
-- );
--
-- To verify the jobs were created:
-- SELECT * FROM cron.job;
--
-- To inspect recent runs:
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;
--
-- To remove the new jobs:
-- SELECT cron.unschedule('dispatch-lenses');
-- SELECT cron.unschedule('cleanup-old-lens-results');
--
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'cron') THEN
    RAISE NOTICE 'pg_cron extension is enabled. Please run the cron swap and cleanup schedule commands in SQL Editor.';
  ELSE
    RAISE WARNING 'pg_cron extension is not enabled. Please enable it in Supabase Dashboard > Database > Extensions.';
  END IF;
END $$;
