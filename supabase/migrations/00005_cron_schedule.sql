-- =====================================================
-- pg_cron Configuration for Daily Summary Generation
-- =====================================================
--
-- Prerequisites:
-- 1. Enable pg_cron extension in Supabase Dashboard > Database > Extensions
-- 2. Enable pg_net extension in Supabase Dashboard > Database > Extensions
-- 3. Add Edge Function secrets: OPENAI_API_KEY, FCM_PROJECT_ID, FCM_SERVICE_ACCOUNT_KEY
--
-- This migration documents the cron job setup.
-- The actual cron job must be created via SQL Editor in Supabase Dashboard
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
-- Replace <service-role-key> with your service role key from Project Settings > API
--
-- SELECT cron.schedule(
--   'generate-daily-summaries',
--   '*/5 * * * *',  -- Every 5 minutes
--   $$
--   SELECT net.http_post(
--     url := 'https://<project-ref>.supabase.co/functions/v1/generate-summary',
--     headers := jsonb_build_object(
--       'Authorization', 'Bearer <service-role-key>',
--       'Content-Type', 'application/json'
--     ),
--     body := '{"trigger": "cron"}'::jsonb
--   );
--   $$
-- );
--
-- To verify the job was created:
-- SELECT * FROM cron.job;
--
-- To remove the job:
-- SELECT cron.unschedule('generate-daily-summaries');
--
-- =====================================================

-- Create a helper view to check cron jobs (requires pg_cron to be enabled)
-- This will fail gracefully if pg_cron is not enabled
DO $$
BEGIN
  -- Check if cron schema exists
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'cron') THEN
    RAISE NOTICE 'pg_cron extension is enabled. Please run the cron.schedule() command in SQL Editor.';
  ELSE
    RAISE WARNING 'pg_cron extension is not enabled. Please enable it in Supabase Dashboard > Database > Extensions.';
  END IF;
END $$;
