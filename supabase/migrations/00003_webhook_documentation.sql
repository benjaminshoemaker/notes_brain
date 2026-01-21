/*
  Database Webhooks Configuration (Phase 3)
  =======================================

  Supabase Database Webhooks are configured in the dashboard:
  Supabase Dashboard -> Database > Webhooks

  This migration is intentionally documentation-only so webhook configuration
  is versioned alongside schema changes without embedding secrets in SQL.

  Prerequisites:
  - Deploy Edge Functions:
    - /functions/v1/classify-note
    - /functions/v1/transcribe-voice

  Webhook 1: Text note classification
  ----------------------------------
  Trigger:
  - Table: public.notes
  - Events: INSERT
  - Filter: type = 'text' AND classification_status = 'pending'

  URL:
  - https://<project>.supabase.co/functions/v1/classify-note

  Webhook 2: Voice note transcription
  ----------------------------------
  Trigger:
  - Table: public.notes
  - Events: INSERT
  - Filter: type = 'voice'

  URL:
  - https://<project>.supabase.co/functions/v1/transcribe-voice

  Notes:
  - Supabase will send an INSERT payload including record.id; both functions
    accept the webhook payload format and derive note_id from record.id.
*/

