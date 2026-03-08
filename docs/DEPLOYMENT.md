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

Values can come from shell env or local env files (`.env.local`, `.env.verification`, `.env.production`).

## 2. What `deploy:staging` Does

1. Verifies `supabase` CLI is available.
2. Runs `supabase db push`.
3. Deploys Edge Functions:
   - `classify-note`
   - `transcribe-voice`
   - `generate-summary`
   - `send-push`
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
