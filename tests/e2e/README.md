# E2E Test Harness (Phase 1)

This directory contains the phase-1 E2E foundation:

- Backend integration E2E (Supabase auth + RLS + core data flows)
- Web E2E (Playwright)
- Shared E2E test-user seeding and cleanup utilities

## Scope

Current scope intentionally focuses on stable high-value coverage:

- Auth (email/password + magic-link request)
- Text capture and notes viewing behavior
- Web search and category filter behavior
- Settings timezone persistence
- Daily summary data retrieval (backend integration test)

Mobile device E2E (Detox) is deferred to phase 2.

## Required Environment Variables

Set these before running any E2E command:

- `E2E_SUPABASE_URL`
- `E2E_SUPABASE_ANON_KEY`
- `E2E_SUPABASE_SECRET_KEY` or `E2E_SUPABASE_SERVICE_ROLE_KEY`

Optional:

- `E2E_TEST_EMAIL` (default: `notesbrain-e2e@example.com`)
- `E2E_TEST_PASSWORD` (default: `NotesBrain-E2E-Password-123!`)
- `E2E_TEST_TIMEZONE` (default: `America/Los_Angeles`)

The Playwright web server receives:

- `VITE_SUPABASE_URL` from `E2E_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` from `E2E_SUPABASE_ANON_KEY`

## Run

```bash
npm run test:e2e:backend
npm run test:e2e:web
```

Or run both:

```bash
npm run test:e2e
```

## Local Supabase Tip

If you use a local Supabase stack, export values from `supabase status` before running E2E.
For recent CLI output, map:

- `API_URL` -> `E2E_SUPABASE_URL`
- `ANON_KEY` -> `E2E_SUPABASE_ANON_KEY`
- `SECRET_KEY` -> `E2E_SUPABASE_SECRET_KEY`
