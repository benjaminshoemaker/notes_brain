# AGENTS.md

Scoped execution guidance for this feature.

Base project rules live in `../../AGENTS.md`.

## Scope

- Run feature execution commands from this directory.
- This file applies only to work tracked by this directory's `EXECUTION_PLAN.md`.

## Required Context

Before starting a task, read:
1. `../../AGENTS.md`
2. `FEATURE_SPEC.md`
3. `FEATURE_TECHNICAL_SPEC.md`
4. `EXECUTION_PLAN.md`
5. `../../LEARNINGS.md` if it exists

## Task Loop

1. Start fresh for each new task.
2. Read the task definition and acceptance criteria from `EXECUTION_PLAN.md`.
3. Confirm dependencies and relevant existing-code patterns.
4. Add or update tests when behavior changes.
5. Implement the minimum change needed.
6. Verify using the metadata in `EXECUTION_PLAN.md` and `.claude/verification-config.json`.
7. Update completed checkboxes in `EXECUTION_PLAN.md`.
8. Commit after verification passes using `task({id}): {description}`.

## Regression Expectations

- When touching existing code, run the relevant regression checks, not just new tests.
- Reuse existing project patterns before introducing new ones.

## Feature-Specific Workflow Additions

- **Edge Function deployment:** After creating or modifying Edge Functions, deploy with `npx supabase functions deploy <function-name>` and verify the health endpoint responds.
- **Migration application:** After creating migration files, apply with `npx supabase db push` or via the Supabase Dashboard SQL Editor for cron-related setup that requires superuser privileges.
