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

## Design System — Warm Ink

The mobile app follows the **Warm Ink** design direction. All UI tokens are defined in `apps/mobile/lib/theme.ts`.

- **Design tokens:** `apps/mobile/lib/theme.ts` (single source of truth)
- **Personality:** Warmth & Approachability (Notion / Apple Notes)
- **Background:** `#FAF8F5` (warm cream) — used on ALL screens
- **Surface:** `#FFFFFF` (cards), `#F5F2EE` (raised surfaces / inactive pills)
- **Accent:** `#4F46E5` (indigo) — buttons, active states, links
- **Text:** `#1C1917` (primary), `#57534E` (secondary), `#A8A29E` (muted)
- **Depth strategy:** Subtle single shadows (no borders-only, no layered shadows)
- **Icon set:** Ionicons via `@expo/vector-icons` — never use emojis as icons
- **Radii:** `sm=6, md=8, lg=10, pill=20`
- **Category badges:** Tinted background + colored text (NOT solid color badges)
- **Key constraints:**
  - 4px spacing grid (xs=4, sm=8, md=12, lg=16, xl=24, xxl=32)
  - WCAG AA minimum accessibility
  - Import colors/radii/shadows from `theme.ts`, never hardcode

When building or modifying mobile UI, read `apps/mobile/lib/theme.ts` first.

---

## AI Agent Mobile Emulation

- Start the mobile dev server with MCP support from repo root: `npm run dev:mobile:mcp`
- iOS emulator flow:
  - `cd apps/mobile && npx expo run:ios`
  - Use Expo automation tools with `platform: "ios"` and `testID` selectors where possible.
- Android emulator flow:
  - On this machine, set Java before build:
    - `export JAVA_HOME='/Applications/Android Studio.app/Contents/jbr/Contents/Home'`
    - `export PATH="$JAVA_HOME/bin:$PATH"`
  - Run: `cd apps/mobile && npx expo run:android`
  - If Expo automation reports `No booted Android devices found` but `adb devices` shows an emulator, use `adb` for interaction/snapshots (`adb shell input ...`, `adb exec-out screencap -p`).
- Minimum smoke pass for both platforms: sign in, create text note, record/stop/save voice note, verify Notes/Summary/Settings tabs render.

---

## Follow-Up Items

Track discovered issues in TODOS.md. Do not scope-creep by fixing them without approval.
