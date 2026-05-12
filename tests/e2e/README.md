# E2E Test Harness (Phase 1)

This directory contains the phase-1 E2E foundation:

- Backend integration E2E (Supabase auth + RLS + core data flows)
- Web E2E (Playwright)
- Mobile Android E2E (Detox)
- Shared E2E test-user seeding and cleanup utilities

## Scope

Current scope intentionally focuses on stable high-value coverage:

- Auth (email/password + magic-link request)
- Password-reset deep-link allowlist (`echo://auth/callback`)
- Text capture and notes viewing behavior
- Web search and category filter behavior
- Settings timezone persistence
- Daily summary data retrieval (backend integration test)
- Mobile tab navigation + capture + summary rendering on Android emulator

## Required Environment Variables

Set these before running any E2E command:

- `E2E_SUPABASE_URL`
- `E2E_SUPABASE_ANON_KEY`
- `E2E_SUPABASE_SECRET_KEY` or `E2E_SUPABASE_SERVICE_ROLE_KEY`

Optional:

- `E2E_TEST_EMAIL` (default: `notesbrain-e2e@example.com`)
- `E2E_TEST_PASSWORD` (default: `NotesBrainE2EPassword123`)
- `E2E_TEST_TIMEZONE` (default: `America/Los_Angeles`)

The Playwright web server receives:

- `VITE_SUPABASE_URL` from `E2E_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` from `E2E_SUPABASE_ANON_KEY`

## Run

```bash
npm run test:e2e:backend
npm run test:e2e:web
npm run test:e2e:mobile
```

Or run both:

```bash
npm run test:e2e
```

To run full stack including mobile:

```bash
npm run test:e2e:full
```

## Community Lenses Flow

Run the deterministic community-lenses flow with seeded author and installer users:

```bash
node scripts/e2e/seed-community-lenses-flow.mjs --seed
node --test tests/e2e/backend/community-lenses.e2e.test.mjs
npm run test:e2e:mobile -- tests/e2e/mobile/specs/community-lenses.e2e.js
```

Artifacts are retained per run under:

- `artifacts/community-lenses/end-to-end/run-*/backend/`
- `artifacts/community-lenses/end-to-end/run-*/mobile/`

## Local Supabase Tip

Use the helper script to snapshot local Supabase keys once, then reuse them:

```bash
bash scripts/e2e/local-supabase-e2e-env.sh --write-file
```

This updates `E2E_SUPABASE_*` keys in root `.env.local` (without overwriting
other keys). E2E runners automatically load `.env.local` when those values are
not already exported.

If you want shell exports for the current terminal session:

```bash
eval "$(bash scripts/e2e/local-supabase-e2e-env.sh --print-exports)"
```

For Android emulator runs, the mobile runner automatically maps `localhost` / `127.0.0.1`
to `10.0.2.2` for `EXPO_PUBLIC_SUPABASE_URL`.
