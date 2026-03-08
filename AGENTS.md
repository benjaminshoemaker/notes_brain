# AGENTS.md

Project-wide workflow guidance for AI agents working in this project.

## Instruction Hierarchy

- This file is the durable, project-wide baseline.
- Initial greenfield execution guidance lives in `plans/greenfield/AGENTS.md`.
- Feature execution guidance lives in `features/<name>/AGENTS.md`.
- When working in a scoped directory, read this file first, then the local `AGENTS.md` or `CLAUDE.md` in that directory.

## Project Context

**Tech Stack:** TypeScript, React (web), Expo/React Native (mobile), Supabase (backend), PostgreSQL, React Query

**Dev Server (Web):** `npm run dev` → `http://localhost:5173` (wait 3s for startup)

**Dev Server (Mobile):** `npx expo start` → Expo Go or emulator

**Test Runner:** Vitest (web), Jest (mobile)

---

## Git Conventions

| Item | Format | Example |
|------|--------|---------|
| Phase branch | `phase-{N}` | `phase-1` |
| Commit | `task({id}): {description}` | `task(1.2.A): Add shared types` |

Create one branch per phase. Commit after each task. PR at phase checkpoint.

---

## Guardrails

- Make the smallest change that satisfies acceptance criteria
- Do not duplicate files to work around issues — fix the original
- Do not guess — if you can't access something, say so
- Read error output fully before attempting fixes
- Follow existing code patterns in the codebase

---

## Project-Specific Notes

**Supabase:** All database operations go through supabase-js client. Use service role key only in Edge Functions.

**Shared Package:** Types and utilities live in `packages/shared`. Import as `@notesbrain/shared`.

**Edge Functions:** Located in `supabase/functions/`. Deploy with `supabase functions deploy`.

**Environment Variables:**
- Web: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- Mobile: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- Edge Functions: secrets set via Supabase dashboard

---

## Follow-Up Items

Track discovered issues in TODOS.md. Do not scope-creep by fixing them without approval.
