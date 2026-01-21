---
description: Run code-verification on a specific task
argument-hint: [task-id]
allowed-tools: Read, Edit, Bash, Grep, Glob, AskUserQuestion
---

Verify Task $1 from EXECUTION_PLAN.md using the code verification workflow.

## Context Detection

Determine working context:

1. If current working directory matches pattern `*/features/*`:
   - PROJECT_ROOT = parent of parent of CWD (e.g., `/project/features/foo` → `/project`)
   - MODE = "feature"

2. Otherwise:
   - PROJECT_ROOT = current working directory
   - MODE = "greenfield"

## Directory Guard (Wrong Directory Check)

Before starting, confirm `EXECUTION_PLAN.md` exists in the current working directory.

- If it does not exist, **STOP** and tell the user to `cd` into their project/feature directory (the one containing `EXECUTION_PLAN.md`) and re-run `/verify-task $1`.

## Task Context

1. Read Task $1 definition from EXECUTION_PLAN.md
2. Extract all acceptance criteria

## Verification Workflow

Follow the code-verification workflow (inline, no sub-agents):

### Step 1: Parse Criteria

For each acceptance criterion, create a verification item:

| Field | Value |
|-------|-------|
| ID | `V-001`, `V-002`, etc. |
| Criterion | The acceptance criterion text |
| Type | `CODE`, `TEST`, `LINT`, `TYPE`, `BUILD`, or `BROWSER` |
| Files | Which files to examine |

### Step 2: Pre-flight Check

Confirm each criterion is testable:
- Clear pass/fail criteria
- Required files exist
- Test commands available

Flag untestable criteria immediately.

### Step 3: TDD Compliance Check

Verify that Test-Driven Development was followed:

1. **Test existence check** — For each acceptance criterion:
   - Locate the corresponding test(s)
   - Record test file and test name
   - If no test exists → FAIL with "Missing test for criterion"

2. **Test-first check** (if git history available):
   ```bash
   # Check if test file was committed before/with implementation
   git log --oneline --follow -- "path/to/test/file"
   git log --oneline --follow -- "path/to/impl/file"
   ```
   - Tests committed before or same commit as implementation → PASS
   - Tests committed after implementation → WARNING (note in report)
   - Unable to determine → SKIP (note in report)

3. **Test effectiveness check** — For each test:
   - Test should fail if implementation is broken/removed
   - Test name should describe expected behavior
   - Test should have meaningful assertions (not just "no errors")

**TDD Compliance Report:**
```
TDD COMPLIANCE: Task $1
-----------------------
Tests Found: X/Y criteria covered
Test-First: PASS | WARNING | UNABLE TO VERIFY
Issues:
- [Criterion] Missing test
- [Criterion] Test added after implementation
- [Criterion] Test has no meaningful assertions
```

If tests are missing for any criterion, stop and write tests before proceeding.

### Step 4: Verify Each Criterion

For each criterion:

1. **Check** if the criterion is met
2. **Record** the result:
   ```
   VERIFICATION: [V-001]
   ---------------------
   Status: PASS | FAIL | BLOCKED
   Location: [file:line or "N/A"]
   Finding: [What was found]
   Expected: [What was expected]
   Suggested Fix: [If FAIL]
   ```
3. **If FAIL**: Attempt fix, then re-verify (up to 5 attempts)
4. **Track attempts** to avoid repeating failed fixes

### Step 5: Exit Conditions

Stop verification loop when:
- PASS: Criterion met
- 5 attempts exhausted: Mark failed
- Same failure 3+ times: Flag for human review

### Step 6: Report

```
TASK VERIFICATION: $1
=====================

TDD Compliance:
- Tests Found: X/Y criteria covered
- Test-First: PASS | WARNING | UNABLE TO VERIFY

Criteria Verification:
- Total: N
- Passed: X
- Failed: Y
- Skipped: Z

Details:
[V-001] PASS — Criterion summary
[V-002] FAIL — Criterion summary
  - Attempts: 3
  - Blocker: Description

TDD Issues (if any):
- [Criterion] {issue description}
```

## On Success

- Check off completed criteria in EXECUTION_PLAN.md: `- [ ]` → `- [x]`
- Update `.claude/phase-state.json` task entry:
  ```json
  {
    "tasks": {
      "$1": {
        "status": "COMPLETE",
        "completed_at": "{ISO timestamp}",
        "verification": {
          "passed": true,
          "criteria_met": "X/X",
          "tdd_compliant": true
        }
      }
    }
  }
  ```
- Report: Task $1 verified, all criteria met

## On Failure

- Report which criteria failed
- Provide fix recommendations
- Do not check off incomplete criteria
- Update `.claude/phase-state.json` task entry:
  ```json
  {
    "tasks": {
      "$1": {
        "status": "IN_PROGRESS",
        "verification": {
          "passed": false,
          "criteria_met": "X/Y",
          "last_attempt": "{ISO timestamp}",
          "attempts": N,
          "failing_criteria": ["V-001", "V-003"]
        }
      }
    }
  }
  ```
