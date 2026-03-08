# AGENTS.md

Scoped execution guidance for the initial greenfield build.

Base project rules live in `../../AGENTS.md`.

## Scope

- Run greenfield execution commands from this directory: `plans/greenfield/`
- This file applies only to the initial project build tracked by `EXECUTION_PLAN.md`.
- Feature work belongs in `../../features/<name>/`.

## Required Context

Before starting a task, read:
1. `../../AGENTS.md`
2. `PRODUCT_SPEC.md` if it exists
3. `TECHNICAL_SPEC.md` if it exists
4. `EXECUTION_PLAN.md`
5. `QUESTIONS.md` if it exists
6. `../../LEARNINGS.md` if it exists

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
