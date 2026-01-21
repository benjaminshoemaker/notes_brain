# TODOS

Follow-up items and improvements discovered during development.

---

## Toolkit Improvements

### 1. Add git-init skill

**Priority:** High
**Context:** `/phase-prep` found project directory was not a git repository. Agent should be able to initialize git automatically or via a dedicated skill.

**Requirements:**
- Create a skill that checks if current directory is a git repo
- If not, prompts user for confirmation then runs `git init`
- Creates initial `.gitignore` if one doesn't exist (using project-appropriate defaults)
- Makes initial commit with message like "Initial commit"
- Optionally connects to a remote (GitHub) via `gh repo create`

**Suggested Implementation:**
- Skill name: `git-init` or `github-init` (if including remote setup)
- Should be invocable as `/git-init`

---

### 2. Enhance phase-prep with detailed setup instructions

**Priority:** High
**Context:** `/phase-prep` currently lists Pre-Phase Setup items but doesn't provide step-by-step guidance. Users need detailed instructions with screenshots/links for external service setup.

**Requirements:**
- When `/phase-prep` detects incomplete Pre-Phase Setup items:
  1. Read each setup item in detail
  2. Research relevant documentation (Supabase docs, Firebase docs, etc.)
  3. Generate detailed step-by-step instructions for each item
  4. Include direct links to dashboards/consoles
  5. Specify exactly what values to copy and where to put them
  6. Provide verification steps to confirm each item is complete

**Example Output:**
Instead of just listing "Create Supabase project", provide:
```
Step 1: Create Supabase Project
1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Fill in:
   - Name: notesbrain (or your preference)
   - Database Password: [generate strong password, save it]
   - Region: [choose closest to your users]
4. Click "Create new project"
5. Wait 2-3 minutes for provisioning
6. Go to Settings > API
7. Copy "Project URL" → this is your SUPABASE_URL
8. Copy "anon public" key → this is your SUPABASE_ANON_KEY
```

**Suggested Implementation:**
- Add a flag or automatic behavior to `/phase-prep`
- Could use WebFetch/WebSearch to pull latest docs if needed
- Store common setup patterns in a knowledge base

---

## Project-Specific Items

(None yet - add items discovered during task execution here)
