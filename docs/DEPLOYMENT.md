# Deployment Guide

This project now includes automated deployment helpers for staging:

- `npm run deploy:staging`
- `npm run deploy:staging:dry`
- `npm run healthcheck:edge`

## 1. Required Environment Variables

The deploy helper validates these keys before running:

- `SUPABASE_URL`
- `SERVICE_ROLE_KEY` or `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `FCM_PROJECT_ID`
- `FCM_SERVICE_ACCOUNT_KEY`
- `CRON_SECRET`

Values can come from shell env or local env files (`.env.local`, `.env.verification`, `.env.production`).

## 2. What `deploy:staging` Does

1. Verifies `supabase` CLI is available.
2. Runs `supabase db push`.
3. Deploys Edge Functions:
   - `classify-note`
   - `transcribe-voice`
   - `generate-summary`
   - `send-push`
   - `execute-lens`
   - `dispatch-lenses`
4. Runs edge health checks (`npm run healthcheck:edge`).

## 3. Dry Run

Use:

```bash
npm run deploy:staging:dry
```

This prints each command without executing.

## 4. Health Endpoints

Each function supports `GET /functions/v1/{name}` for readiness:

- `classify-note`
- `transcribe-voice`
- `generate-summary`
- `send-push`
- `execute-lens`
- `dispatch-lenses`

Response shape:

```json
{
  "status": "ok",
  "function": "classify-note",
  "ready": true,
  "missing_env": []
}
```

If `ready` is `false` or `missing_env` is non-empty, deployment is incomplete.

## 5. Local Scheduled Lens Development

Local Supabase does not install the Dashboard `pg_cron` job that calls
`dispatch-lenses`, so scheduled lens notifications need a local dispatcher
process during development.

Run this next to the mobile dev server:

```bash
npm run dev:scheduled-lenses
```

That command:

1. Starts local Edge Functions with a merged env from `.env.local` and
   `supabase/.env.functions.local`.
2. Uses `CRON_SECRET=notesbrain-local-cron` when no local secret is set.
3. Polls `dispatch-lenses` every minute.

Split-terminal equivalents are also available:

```bash
npm run dev:functions
npm run dev:lens-dispatcher
```

Keep the dispatcher running for scheduled lens notifications to fire locally.

For dogfooding, you can locally accelerate daily lenses after their first
scheduled run:

```bash
npm run dev:scheduled-lenses:dogfood
```

This keeps production schedule definitions unchanged, but the local dispatcher
also checks daily lenses every minute and executes any lens whose latest
4-hour slot has not run yet. A lens scheduled for `20:00` can therefore run
locally at `20:00`, `00:00`, `04:00`, and so on. The first run still waits for
the configured scheduled time.

To use a different local cadence:

```bash
npm run dev:scheduled-lenses -- --local-interval-hours=2
```
