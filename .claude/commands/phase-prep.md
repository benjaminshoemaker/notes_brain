---
description: Check prerequisites before starting a phase
argument-hint: [phase-number]
allowed-tools: Bash, Read, Glob, Grep, AskUserQuestion
---

I want to execute Phase $1 from EXECUTION_PLAN.md. Before starting, read EXECUTION_PLAN.md and check:

## Context Detection

Determine working context:

1. If current working directory matches pattern `*/features/*`:
   - PROJECT_ROOT = parent of parent of CWD (e.g., `/project/features/foo` → `/project`)
   - MODE = "feature"

2. Otherwise:
   - PROJECT_ROOT = current working directory
   - MODE = "greenfield"

## Directory Guard (Wrong Directory Check)

Before starting, confirm the required files exist:
- `EXECUTION_PLAN.md` exists in the current working directory
- `PROJECT_ROOT/AGENTS.md` exists

- If either does not exist, **STOP** and tell the user:
  - They are likely in the toolkit repo (or the wrong folder)
  - They should `cd` into their project/feature directory (the one containing `EXECUTION_PLAN.md`) and re-run `/phase-prep $1`

## Pre-Flight Checks

1. **Pre-Phase Setup** — Check the "Pre-Phase Setup" section for Phase $1:
   - List any unmet prerequisites I need to complete
   - Identify environment variables or secrets needed
   - Note any external services that must be configured

2. **Dependencies** — Verify prior phases are complete:
   - Check that all tasks from previous phases have checked boxes
   - Flag any incomplete dependencies

3. **Git Status** — Check repository state:
   - Run `git status` to verify clean working tree (or understand current state)
   - Note the current branch

4. **Tool Availability** — Check optional tools by attempting a harmless call:

   | Tool | Check | If Unavailable |
   |------|-------|----------------|
   | Playwright MCP | Attempt a harmless Playwright MCP call (e.g., list pages) | Manual browser verification |
   | code-simplifier | Check agent type available | Skip code simplification |
   | Trigger.dev MCP | `mcp__trigger__list_projects` | Skip Trigger.dev features |

   Only check tools relevant to this project's tech stack.

5. **Permissions** — Review the tasks in Phase $1:
   - Identify any tools or permissions needed for autonomous execution
   - Check if any tasks require browser verification

## Report

```
PHASE $1 PREREQUISITES
======================

Documents:
- EXECUTION_PLAN.md: ✓ | ✗
- AGENTS.md (at PROJECT_ROOT): ✓ | ✗
- Prior phases: Complete | N/A

Git: {branch}, {clean | dirty}

Pre-Phase Setup:
- {items or "None required"}

Environment:
- {env vars or "None required"}

Tools:
- Playwright MCP: ✓ | ✗
- code-simplifier: ✓ | ✗
- Trigger.dev MCP: ✓ | ✗ | N/A

Status: READY | BLOCKED | READY WITH NOTES
{Details if not READY}
```
