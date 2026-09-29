# AGENTS.md

Project-wide guidance for AI agents working in Notes Brain.

## Project context

- Stack: TypeScript, React, Expo/React Native, Supabase, PostgreSQL, and React Query.
- Web: `npm run dev` (`http://localhost:5173`).
- Mobile: `npx expo start`.
- Shared types and utilities live in `packages/shared` as `@notesbrain/shared`.
- Edge functions live in `supabase/functions/`.

Archived plans and feature documents are useful historical context, not a
mandatory workflow or authorization boundary. Follow the user's current request
and the nearest project-specific instructions.

## Working rules

- Make the smallest change that satisfies the request and preserve unrelated work.
- Follow existing code patterns; do not duplicate files as a workaround.
- Default to test-driven development for behavior changes.
- Read complete error output and report unavailable access explicitly.
- Track bugs in `BUGS.md`, imminent small work in `NEXT_STEPS.md`, and longer-term
  ideas in `DEFERRED.md`. Update those files directly.
- Use existing Supabase client patterns. Service-role credentials belong only in
  server or edge contexts.

## Design system

- Mobile design tokens in `apps/mobile/lib/theme.ts` are the source of truth.
- Do not hardcode mobile colors, radii, or shadows.
- Preserve WCAG AA accessibility constraints.

## Verification

Run repository-native tests and checks proportionate to the change. For mobile
smoke testing, verify sign-in, text-note creation, voice-note save, and the
Notes, Summary, and Settings tabs.

Treat instruction, automation, hook, CI, and security configuration as
high-impact files. Required guarantees should be enforced by runnable tests or
checks, not by an agent-specific harness.
