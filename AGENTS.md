# AGENTS.md

Workflow guidelines for AI agents executing tasks from EXECUTION_PLAN.md.

## Project Context

**Tech Stack:** TypeScript, React (web), Expo/React Native (mobile), Supabase (backend), PostgreSQL, React Query

**Dev Server (Web):** `npm run dev` → `http://localhost:5173` (wait 3s for startup)

**Dev Server (Mobile):** `npx expo start` → Expo Go or emulator

**Test Runner:** Vitest (web), Jest (mobile)

---

## Workflow

```
HUMAN (Orchestrator)
├── Completes pre-phase setup (env vars, Supabase project, Firebase)
├── Assigns tasks from EXECUTION_PLAN.md
├── Reviews and approves at phase checkpoints

AGENT (Executor)
├── Executes one task at a time
├── Works in git branch (one branch per phase)
├── Follows TDD: tests first, then implementation
├── Runs verification against acceptance criteria
└── Reports completion or blockers
```

---

## Task Execution

1. **Load context** — Read AGENTS.md, PRODUCT_SPEC.md, TECHNICAL_SPEC.md, and your task
2. **Create branch** — If first task in phase: `git checkout -b phase-{N}`
3. **Verify dependencies** — Confirm prior tasks are complete
4. **Write tests first** — One test per acceptance criterion
5. **Implement** — Minimum code to pass tests
6. **Verify** — Run tests, typecheck, lint; check each criterion manually if needed
7. **Update progress** — Check off completed criteria: `- [ ]` → `- [x]`
8. **Commit** — Format: `task(1.1.A): brief description`

---

## Context Management

**Start fresh for each task.** Do not carry conversation history between tasks.

Before starting any task, load:
1. AGENTS.md (this file)
2. PRODUCT_SPEC.md and TECHNICAL_SPEC.md
3. Your task definition from EXECUTION_PLAN.md

**Preserve context while debugging.** If tests fail within a task, continue in same conversation until resolved.

---

## Testing Policy

- Tests must exist for every acceptance criterion
- All tests must pass before reporting complete
- Never skip or disable tests to make them pass
- Use AAA pattern: Arrange, Act, Assert
- Test names: `should {expected behavior} when {condition}`

---

## When to Stop and Ask

Stop and ask the human if:
- A dependency is missing (file, function, service doesn't exist)
- You need environment variables or secrets
- Acceptance criteria are ambiguous
- A test fails and you cannot determine why
- You need to modify files outside your task scope

**Blocker format:**
```
BLOCKED: Task {id}
Issue: {what's wrong}
Tried: {what you attempted}
Need: {what would unblock}
```

---

## Completion Report

When done:
- What was built (1-2 sentences)
- Files created/modified
- Test status
- Commit hash

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
