# Execution Plan: Custom Lenses

## Overview

| Metric | Value |
|--------|-------|
| Feature | Custom Lenses |
| Target Project | Echo (NotesBrain) |
| Total Phases | 4 |
| Total Steps | 11 |
| Total Tasks | 18 |

## Integration Points

| Existing Component | Integration Type | Notes |
|--------------------|------------------|-------|
| `supabase/migrations/` | extends | New migration files 00006, 00007 |
| `packages/shared/src/types.ts` | extends | Add Lens, LensResult types |
| `packages/shared/src/supabase.ts` | extends | Add table types to Database |
| `supabase/functions/_shared/openai.ts` | extends | Add callOpenAIMarkdown |
| `supabase/functions/send-push/index.ts` | modifies | Generalize sent_at update |
| `apps/mobile/app/(app)/summary.tsx` | modifies | Rewrite as feed |
| `apps/mobile/app/(app)/_layout.tsx` | modifies | Register screens, update notification handler |
| `apps/mobile/services/notifications.ts` | modifies | Extend NotificationData |
| `apps/mobile/lib/testIds.ts` | extends | Add lens test IDs |
| `apps/mobile/hooks/useDailySummary.ts` | deprecates | Replaced by useLensResults |
| `apps/mobile/components/SummaryCard.tsx` | deprecates | Replaced by LensResultCard |
| `supabase/functions/generate-summary/` | deprecates | Replaced by dispatch-lenses + execute-lens |

## Phase Dependency Graph

```
+---------------------+
| Phase 1:            |
| Data Layer          |
+----------+----------+
           |
           v
+---------------------+
| Phase 2:            |
| Backend Engine      |
+----------+----------+
           |
           v
+---------------------+
| Phase 3:            |
| Mobile Client       |
+----------+----------+
           |
           v
+---------------------+
| Phase 4:            |
| Integration & Polish|
+---------------------+
```

---

## Phase 1: Data Layer

**Goal:** Establish database schema, triggers, and shared TypeScript types for lenses.
**Depends On:** None

### Pre-Phase Setup

- [ ] Supabase project is running and accessible
  - Verify: `npx supabase status`
- [ ] pg_cron and pg_net extensions are enabled
  - Verify: `grep -q "pg_cron" supabase/migrations/00001_initial_schema.sql`

### Step 1.1: Database Schema

**Depends On:** None

---

#### Task 1.1.A: Create lenses and lens_results migration

**Description:**
Create migration `00006_custom_lenses.sql` with the `lenses` and `lens_results` tables, the `compute_next_run_at()` trigger for automatic scheduling, the `create_default_lens()` trigger for new-user Morning Briefing, the partial unique index for default lens idempotency, and the `check_lens_limit()` trigger for the 10-lens cap.

**Acceptance Criteria:**
- [ ] (CODE) Migration file creates `lenses` table with all columns from tech spec (id, user_id, name, prompt, schedule_type, schedule_time, schedule_day, lookback_hours, categories, is_active, is_default, next_run_at, last_run_at, consecutive_failures, last_error, last_error_at, created_at, updated_at)
  - Verify: `grep -q "CREATE TABLE lenses" supabase/migrations/00006_custom_lenses.sql`
- [ ] (CODE) Migration file creates `lens_results` table with all columns (id, lens_id, user_id, content, notes_analyzed, generated_at, sent_at)
  - Verify: `grep -q "CREATE TABLE lens_results" supabase/migrations/00006_custom_lenses.sql`
- [ ] (CODE) `compute_next_run_at()` trigger function exists for BEFORE INSERT OR UPDATE on lenses
  - Verify: `grep -q "compute_next_run_at" supabase/migrations/00006_custom_lenses.sql`
- [ ] (CODE) `create_default_lens()` trigger function exists for AFTER INSERT on users
  - Verify: `grep -q "create_default_lens" supabase/migrations/00006_custom_lenses.sql`
- [ ] (CODE) Partial unique index `idx_lenses_one_default_per_user` prevents duplicate default lenses
  - Verify: `grep -q "idx_lenses_one_default_per_user" supabase/migrations/00006_custom_lenses.sql`
- [ ] (CODE) RLS policies exist for both tables following `auth.uid() = user_id` pattern
  - Verify: `grep -q "lenses_policy" supabase/migrations/00006_custom_lenses.sql && grep -q "lens_results_policy" supabase/migrations/00006_custom_lenses.sql`

**Files to Create:**
- `supabase/migrations/00006_custom_lenses.sql` — Migration with tables, triggers, indexes, RLS

**Files to Modify:**
- None

**Existing Code to Reference:**
- `supabase/migrations/00001_initial_schema.sql` — Table, index, RLS, and trigger patterns

**Dependencies:** None

**Spec Reference:** FEATURE_TECHNICAL_SPEC.md > 2.1 New Migration

**Browser Verification:**
- Criteria IDs: None
- Notes: N/A

---

### Step 1.2: Shared Types

**Depends On:** Step 1.1

---

#### Task 1.2.A: Add Lens and LensResult TypeScript types

**Description:**
Add `Lens`, `LensResult`, `LensResultWithLens`, and `LensScheduleType` types to the shared package. Add `lenses` and `lens_results` table definitions to the `Database` type. Export new types from the package index.

**Acceptance Criteria:**
- [ ] (CODE) `Lens` interface exported from `packages/shared/src/types.ts` with all fields
  - Verify: `grep -q "export interface Lens" packages/shared/src/types.ts`
- [ ] (CODE) `LensResult` interface exported with all fields
  - Verify: `grep -q "export interface LensResult" packages/shared/src/types.ts`
- [ ] (CODE) `LensResultWithLens` interface exported with lens metadata join
  - Verify: `grep -q "export interface LensResultWithLens" packages/shared/src/types.ts`
- [ ] (CODE) `lenses` and `lens_results` tables added to `Database` type in `supabase.ts`
  - Verify: `grep -q "lenses:" packages/shared/src/supabase.ts && grep -q "lens_results:" packages/shared/src/supabase.ts`
- [ ] (TYPE) Shared package compiles without errors
  - Verify: `cd packages/shared && npx tsc --noEmit`

**Files to Create:**
- None

**Files to Modify:**
- `packages/shared/src/types.ts` — Add Lens, LensResult, LensResultWithLens, LensScheduleType
- `packages/shared/src/supabase.ts` — Add lenses and lens_results table types to Database
- `packages/shared/src/index.ts` — Export new types

**Existing Code to Reference:**
- `packages/shared/src/types.ts` — Follow DailySummary, Note interface patterns
- `packages/shared/src/supabase.ts` — Follow daily_summaries Row/Insert/Update pattern

**Dependencies:** Task 1.1.A (schema defines columns)

**Spec Reference:** FEATURE_TECHNICAL_SPEC.md > 2.3, 2.4

**Browser Verification:**
- Criteria IDs: None
- Notes: N/A

---

### Phase 1 Checkpoint

**Automated Checks:**
- [ ] Migration SQL is syntactically valid
- [ ] Shared package compiles: `cd packages/shared && npx tsc --noEmit`
- [ ] All existing tests pass: `cd apps/web && npx vitest run`

**Regression Verification:**
- [ ] Existing types in `packages/shared` still compile
- [ ] No breaking changes to exported interfaces

---

## Phase 2: Backend Engine

**Goal:** Implement Edge Functions for lens execution and update the push notification system.
**Depends On:** Phase 1

### Pre-Phase Setup

- [ ] Supabase secrets are set: `OPENAI_API_KEY`, `CRON_SECRET`
  - Verify: `npx supabase secrets list 2>/dev/null | grep -q "OPENAI_API_KEY"`
- [ ] Edge Functions can be deployed
  - Verify: `npx supabase functions list`

### Step 2.1: OpenAI Extension

**Depends On:** None

---

#### Task 2.1.A: Add callOpenAIMarkdown to shared OpenAI module

**Description:**
Add a new `callOpenAIMarkdown()` function to the shared OpenAI module that takes a system prompt and user prompt, calls the Chat Completions API, and returns raw text (no JSON parsing). This is the generic LLM call used by all lens executions.

**Acceptance Criteria:**
- [ ] (CODE) `callOpenAIMarkdown` function exported from `_shared/openai.ts`
  - Verify: `grep -q "export async function callOpenAIMarkdown" supabase/functions/_shared/openai.ts`
- [ ] (CODE) Function accepts `systemPrompt` and `userPrompt` parameters (not hardcoded)
  - Verify: `grep -q "systemPrompt" supabase/functions/_shared/openai.ts`
- [ ] (CODE) Function returns `Promise<string>` (raw text, no JSON parsing)
  - Verify: `grep -q "Promise<string>" supabase/functions/_shared/openai.ts`
- [ ] (CODE) Existing `callOpenAISummary` and `callOpenAIChatJson` functions unchanged
  - Verify: `grep -q "export async function callOpenAISummary" supabase/functions/_shared/openai.ts`

**Files to Create:**
- None

**Files to Modify:**
- `supabase/functions/_shared/openai.ts` — Add callOpenAIMarkdown function and OpenAIMarkdownRequest type

**Existing Code to Reference:**
- `supabase/functions/_shared/openai.ts` — Follow callOpenAISummary pattern for HTTP call structure

**Dependencies:** None

**Spec Reference:** FEATURE_TECHNICAL_SPEC.md > 3.3

**Browser Verification:**
- Criteria IDs: None
- Notes: N/A

---

### Step 2.2: Edge Functions

**Depends On:** Step 2.1

---

#### Task 2.2.A: Create execute-lens worker Edge Function

**Description:**
Create the `execute-lens` Edge Function that processes a single lens: fetches matching notes, calls OpenAI with the user's prompt, stores the result, updates scheduling fields, and triggers push notification. Supports both cron-secret auth (from dispatcher) and user JWT auth (for Run Now).

**Acceptance Criteria:**
- [ ] (CODE) Edge Function exists at `supabase/functions/execute-lens/index.ts`
  - Verify: `test -f supabase/functions/execute-lens/index.ts`
- [ ] (CODE) Validates `X-Cron-Secret` header OR user JWT from Authorization header
  - Verify: `grep -q "X-Cron-Secret" supabase/functions/execute-lens/index.ts`
- [ ] (CODE) Queries notes with category filter, lookback window, and LIMIT 100
  - Verify: `grep -q "LIMIT" supabase/functions/execute-lens/index.ts || grep -q "limit" supabase/functions/execute-lens/index.ts`
- [ ] (CODE) Calls `callOpenAIMarkdown` with user-defined prompt + formatted notes
  - Verify: `grep -q "callOpenAIMarkdown" supabase/functions/execute-lens/index.ts`
- [ ] (CODE) Updates `consecutive_failures` on error, resets on success
  - Verify: `grep -q "consecutive_failures" supabase/functions/execute-lens/index.ts`
- [ ] (CODE) Has GET health endpoint returning function status
  - Verify: `grep -q "GET" supabase/functions/execute-lens/index.ts`

**Files to Create:**
- `supabase/functions/execute-lens/index.ts` — Worker Edge Function

**Files to Modify:**
- None

**Existing Code to Reference:**
- `supabase/functions/generate-summary/index.ts` — Follow structure: Deno.serve, getRuntimeConfig, logger, health endpoint
- `supabase/functions/_shared/retry.ts` — Use retryWithBackoff for OpenAI calls
- `supabase/functions/_shared/logger.ts` — Use createFunctionLogger
- `supabase/functions/_shared/supabase.ts` — Use createServiceRoleClient

**Dependencies:** Task 2.1.A (callOpenAIMarkdown), Task 1.1.A (lenses + lens_results tables)

**Spec Reference:** FEATURE_TECHNICAL_SPEC.md > 3.2

**Browser Verification:**
- Criteria IDs: None
- Notes: N/A

---

#### Task 2.2.B: Create dispatch-lenses dispatcher Edge Function

**Description:**
Create the lightweight `dispatch-lenses` Edge Function that pg_cron calls every 5 minutes. It queries for due lenses (`next_run_at <= NOW()`) and fans out by calling `execute-lens` for each one. Validates the cron secret and forwards it to workers.

**Acceptance Criteria:**
- [ ] (CODE) Edge Function exists at `supabase/functions/dispatch-lenses/index.ts`
  - Verify: `test -f supabase/functions/dispatch-lenses/index.ts`
- [ ] (CODE) Validates `X-Cron-Secret` header from `Deno.env.get("CRON_SECRET")`
  - Verify: `grep -q "CRON_SECRET" supabase/functions/dispatch-lenses/index.ts`
- [ ] (CODE) Queries `lenses WHERE is_active = true AND next_run_at <= NOW()`
  - Verify: `grep -q "next_run_at" supabase/functions/dispatch-lenses/index.ts`
- [ ] (CODE) Forwards `X-Cron-Secret` header to execute-lens calls
  - Verify: `grep -q "X-Cron-Secret" supabase/functions/dispatch-lenses/index.ts`
- [ ] (CODE) Returns JSON with dispatched count
  - Verify: `grep -q "dispatched" supabase/functions/dispatch-lenses/index.ts`

**Files to Create:**
- `supabase/functions/dispatch-lenses/index.ts` — Dispatcher Edge Function

**Files to Modify:**
- None

**Existing Code to Reference:**
- `supabase/functions/generate-summary/index.ts` — Follow Deno.serve pattern, health endpoint, env config

**Dependencies:** Task 2.2.A (execute-lens must exist for fan-out calls)

**Spec Reference:** FEATURE_TECHNICAL_SPEC.md > 3.1

**Browser Verification:**
- Criteria IDs: None
- Notes: N/A

---

### Step 2.3: Push Notification Update

**Depends On:** Step 2.2

---

#### Task 2.3.A: Generalize send-push for lens results

**Description:**
Modify the `send-push` Edge Function to accept a generic `result_id` and `result_table` parameter instead of the hardcoded `summary_id`. This allows the same push infrastructure to serve both legacy daily summaries and new lens results.

**Acceptance Criteria:**
- [ ] (CODE) Request body accepts `result_id` and `result_table` fields
  - Verify: `grep -q "result_id" supabase/functions/send-push/index.ts`
- [ ] (CODE) `sent_at` update uses `result_table` parameter (defaults to `"daily_summaries"` for backward compat)
  - Verify: `grep -q "result_table" supabase/functions/send-push/index.ts`
- [ ] (CODE) Whitelist validation: `result_table` must be `"daily_summaries"` or `"lens_results"`
  - Verify: `grep -q "lens_results" supabase/functions/send-push/index.ts`

**Files to Create:**
- None

**Files to Modify:**
- `supabase/functions/send-push/index.ts` — Generalize request body and sent_at update

**Existing Code to Reference:**
- `supabase/functions/send-push/index.ts` — Current implementation to modify

**Dependencies:** Task 1.1.A (lens_results table)

**Spec Reference:** FEATURE_TECHNICAL_SPEC.md > 3.4

**Browser Verification:**
- Criteria IDs: None
- Notes: N/A

---

### Step 2.4: Migration + Cron

**Depends On:** Step 2.2

---

#### Task 2.4.A: Create daily summary migration script

**Description:**
Create migration `00007_migrate_daily_summaries.sql` that creates Morning Briefing lenses for existing users (idempotent via `WHERE NOT EXISTS`), migrates `daily_summaries` content to `lens_results` (converting JSON to markdown), and documents the cron job swap.

**Acceptance Criteria:**
- [ ] (CODE) Migration creates Morning Briefing lens for existing users with `WHERE NOT EXISTS` guard
  - Verify: `grep -q "WHERE NOT EXISTS" supabase/migrations/00007_migrate_daily_summaries.sql`
- [ ] (CODE) Migration converts `daily_summaries.content` JSON to markdown in `lens_results`
  - Verify: `grep -q "lens_results" supabase/migrations/00007_migrate_daily_summaries.sql`
- [ ] (CODE) Migration includes cron job swap documentation (unschedule old, schedule new)
  - Verify: `grep -q "dispatch-lenses" supabase/migrations/00007_migrate_daily_summaries.sql`

**Files to Create:**
- `supabase/migrations/00007_migrate_daily_summaries.sql` — Migration + cron swap docs

**Files to Modify:**
- None

**Existing Code to Reference:**
- `supabase/migrations/00005_cron_schedule.sql` — Cron documentation pattern

**Dependencies:** Task 2.2.B (dispatch-lenses function must exist before cron swap)

**Spec Reference:** FEATURE_TECHNICAL_SPEC.md > 2.2, 3.5

**Browser Verification:**
- Criteria IDs: None
- Notes: N/A

---

### Phase 2 Checkpoint

**Automated Checks:**
- [ ] All Edge Functions deploy: `npx supabase functions deploy execute-lens && npx supabase functions deploy dispatch-lenses`
- [ ] execute-lens health endpoint responds: `curl -sf https://<project-ref>.supabase.co/functions/v1/execute-lens`
- [ ] dispatch-lenses health endpoint responds: `curl -sf https://<project-ref>.supabase.co/functions/v1/dispatch-lenses`
- [ ] send-push still works with legacy `summary_id` param (backward compat)
- [ ] Shared package compiles: `cd packages/shared && npx tsc --noEmit`

**Regression Verification:**
- [ ] Existing daily summary generation still works until cron swap
- [ ] send-push backward compatibility (old param format still accepted)

---

## Phase 3: Mobile Client

**Goal:** Build the React Native hooks and UI screens for lens management and results viewing.
**Depends On:** Phase 2

### Pre-Phase Setup

- [ ] Mobile dev server starts: `cd apps/mobile && npx expo start`
  - Verify: `test -f apps/mobile/package.json`
- [ ] Supabase client is configured
  - Verify: `grep -q "EXPO_PUBLIC_SUPABASE_URL" apps/mobile/lib/supabaseClient.ts`

### Step 3.1: React Query Hooks

**Depends On:** None

---

#### Task 3.1.A: Create useLenses CRUD hook

**Description:**
Create React Query hook for lens CRUD operations: fetch user's lenses, create, update, delete, and toggle active status. Follow existing mutation patterns from `useCreateNote`.

**Acceptance Criteria:**
- [ ] (CODE) Hook exports `useLenses` function from `apps/mobile/hooks/useLenses.ts`
  - Verify: `grep -q "export function useLenses" apps/mobile/hooks/useLenses.ts`
- [ ] (CODE) Query key follows convention: `["lenses", userId]`
  - Verify: `grep -q '"lenses"' apps/mobile/hooks/useLenses.ts`
- [ ] (CODE) Provides create, update, delete, and toggleActive mutations
  - Verify: `grep -q "toggleActive\|toggle" apps/mobile/hooks/useLenses.ts`
- [ ] (TYPE) File compiles without type errors
  - Verify: `cd apps/mobile && npx tsc --noEmit --pretty 2>&1 | grep -v "node_modules" | head -20`

**Files to Create:**
- `apps/mobile/hooks/useLenses.ts` — CRUD hook for lenses

**Files to Modify:**
- None

**Existing Code to Reference:**
- `apps/mobile/hooks/useCreateNote.ts` — Mutation pattern with onSuccess invalidation
- `apps/mobile/hooks/useUserSettings.ts` — Query + mutation combined hook pattern
- `apps/mobile/hooks/useDailySummary.ts` — Query key and staleTime conventions

**Dependencies:** Task 1.2.A (Lens types)

**Spec Reference:** FEATURE_TECHNICAL_SPEC.md > 5.1

**Browser Verification:**
- Criteria IDs: None
- Notes: N/A

---

#### Task 3.1.B: Create useLensResults feed hook

**Description:**
Create React Query hook that fetches the most recent 50 lens results with lens metadata (name, schedule) via Supabase join. Returns data for the results feed.

**Acceptance Criteria:**
- [ ] (CODE) Hook exports `useLensResults` from `apps/mobile/hooks/useLensResults.ts`
  - Verify: `grep -q "export function useLensResults" apps/mobile/hooks/useLensResults.ts`
- [ ] (CODE) Supabase query joins `lens_results` with `lenses` for name/schedule metadata
  - Verify: `grep -q "lenses" apps/mobile/hooks/useLensResults.ts`
- [ ] (CODE) Results ordered by `generated_at DESC` with limit 50
  - Verify: `grep -q "generated_at" apps/mobile/hooks/useLensResults.ts`
- [ ] (TYPE) File compiles without type errors
  - Verify: `cd apps/mobile && npx tsc --noEmit --pretty 2>&1 | grep -v "node_modules" | head -20`

**Files to Create:**
- `apps/mobile/hooks/useLensResults.ts` — Feed query hook

**Files to Modify:**
- None

**Existing Code to Reference:**
- `apps/mobile/hooks/useDailySummary.ts` — Query pattern to follow

**Dependencies:** Task 1.2.A (LensResult, LensResultWithLens types)

**Spec Reference:** FEATURE_TECHNICAL_SPEC.md > 5.2

**Browser Verification:**
- Criteria IDs: None
- Notes: N/A

---

#### Task 3.1.C: Create useRunLensNow mutation hook

**Description:**
Create a mutation hook that triggers immediate lens execution by calling the `execute-lens` Edge Function with the user's JWT. Invalidates lens results on success.

**Acceptance Criteria:**
- [ ] (CODE) Hook exports `useRunLensNow` from `apps/mobile/hooks/useRunLensNow.ts`
  - Verify: `grep -q "export function useRunLensNow" apps/mobile/hooks/useRunLensNow.ts`
- [ ] (CODE) Calls execute-lens Edge Function with user JWT auth
  - Verify: `grep -q "execute-lens" apps/mobile/hooks/useRunLensNow.ts`
- [ ] (CODE) Invalidates `["lens-results"]` and `["lenses"]` queries on success
  - Verify: `grep -q "invalidateQueries" apps/mobile/hooks/useRunLensNow.ts`

**Files to Create:**
- `apps/mobile/hooks/useRunLensNow.ts` — Manual execution mutation

**Files to Modify:**
- None

**Existing Code to Reference:**
- `apps/mobile/hooks/useCreateNote.ts` — Mutation with query invalidation pattern

**Dependencies:** Task 2.2.A (execute-lens Edge Function)

**Spec Reference:** FEATURE_TECHNICAL_SPEC.md > 5.3

**Browser Verification:**
- Criteria IDs: None
- Notes: N/A

---

### Step 3.2: Components

**Depends On:** Step 3.1

---

#### Task 3.2.A: Create LensResultCard component

**Description:**
Create the card component for displaying a single lens result in the feed. Shows lens name with deterministic color dot, timestamp, schedule badge, and markdown-rendered content. Install `react-native-markdown-display` and configure it to strip HTML/images/links.

**Acceptance Criteria:**
- [ ] (CODE) Component exported from `apps/mobile/components/LensResultCard.tsx`
  - Verify: `grep -q "export function LensResultCard" apps/mobile/components/LensResultCard.tsx`
- [ ] (CODE) `react-native-markdown-display` added to mobile dependencies
  - Verify: `grep -q "react-native-markdown-display" apps/mobile/package.json`
- [ ] (CODE) Markdown rules disable HTML, images, and links (sanitization)
  - Verify: `grep -q "html_block\|image\|html_inline" apps/mobile/components/LensResultCard.tsx`
- [ ] (CODE) Uses deterministic color from lens name hash (not hardcoded per-lens)
  - Verify: `grep -q "getLensColor\|hash\|charCodeAt" apps/mobile/components/LensResultCard.tsx`
- [ ] (CODE) Imports colors/radii/spacing from `lib/theme.ts` (no hardcoded values except lens palette)
  - Verify: `grep -q "from.*theme" apps/mobile/components/LensResultCard.tsx`
- [ ] (CODE) Includes testID props for testing
  - Verify: `grep -q "testID" apps/mobile/components/LensResultCard.tsx`

**Files to Create:**
- `apps/mobile/components/LensResultCard.tsx` — Lens result card with markdown rendering

**Files to Modify:**
- `apps/mobile/package.json` — Add react-native-markdown-display dependency

**Existing Code to Reference:**
- `apps/mobile/components/SummaryCard.tsx` — Card structure, theme usage, testID pattern
- `apps/mobile/lib/theme.ts` — Colors, radii, spacing tokens

**Dependencies:** Task 3.1.B (LensResultWithLens type used as prop)

**Spec Reference:** FEATURE_TECHNICAL_SPEC.md > 4.1, 4.2

**Browser Verification:**
- Criteria IDs: None
- Notes: N/A

---

### Step 3.3: Screens

**Depends On:** Step 3.2

---

#### Task 3.3.A: Rewrite summary.tsx as lens results feed

**Description:**
Replace the single-summary display with a chronological feed of all lens results grouped by date. Add header buttons for "+" (create lens) and gear (manage lenses). Preserve pull-to-refresh and empty state patterns.

**Acceptance Criteria:**
- [ ] (CODE) `summary.tsx` uses `useLensResults` instead of `useDailySummary`
  - Verify: `grep -q "useLensResults" apps/mobile/app/\(app\)/summary.tsx`
- [ ] (CODE) Results rendered via `LensResultCard` components
  - Verify: `grep -q "LensResultCard" apps/mobile/app/\(app\)/summary.tsx`
- [ ] (CODE) Empty state shown when no lenses exist with prompt to create
  - Verify: `grep -q "emptyState\|empty\|No.*lens\|Create" apps/mobile/app/\(app\)/summary.tsx`
- [ ] (CODE) Pull-to-refresh invalidates lens-results query
  - Verify: `grep -q "RefreshControl" apps/mobile/app/\(app\)/summary.tsx`
- [ ] (CODE) Header has "+" button linking to lens-form screen
  - Verify: `grep -q "lens-form" apps/mobile/app/\(app\)/summary.tsx`

**Files to Create:**
- None

**Files to Modify:**
- `apps/mobile/app/(app)/summary.tsx` — Rewrite as lens results feed

**Existing Code to Reference:**
- `apps/mobile/app/(app)/summary.tsx` — Current screen structure to evolve
- `apps/mobile/app/(app)/notes.tsx` — List/feed pattern reference

**Dependencies:** Task 3.2.A (LensResultCard component)

**Spec Reference:** FEATURE_TECHNICAL_SPEC.md > 4.3

**Browser Verification:**
- Criteria IDs: None
- Notes: Test via mobile emulator

---

#### Task 3.3.B: Create lens-form screen

**Description:**
Create the lens creation/editing form screen with fields for name, prompt (with character counter), schedule type picker, time picker, day picker (for weekly), category multi-select, and lookback window selector. Supports both create and edit modes via `lensId` search param.

**Acceptance Criteria:**
- [ ] (CODE) Screen exists at `apps/mobile/app/(app)/lens-form.tsx`
  - Verify: `test -f apps/mobile/app/\(app\)/lens-form.tsx`
- [ ] (CODE) Form includes name, prompt, schedule, categories, and lookback fields
  - Verify: `grep -q "prompt" apps/mobile/app/\(app\)/lens-form.tsx && grep -q "schedule" apps/mobile/app/\(app\)/lens-form.tsx`
- [ ] (CODE) Prompt field has character counter enforcing 20-2000 range
  - Verify: `grep -q "2000\|charCount\|character" apps/mobile/app/\(app\)/lens-form.tsx`
- [ ] (CODE) Uses `useLenses` create/update mutations
  - Verify: `grep -q "useLenses" apps/mobile/app/\(app\)/lens-form.tsx`
- [ ] (CODE) Navigates back on successful save
  - Verify: `grep -q "router" apps/mobile/app/\(app\)/lens-form.tsx`

**Files to Create:**
- `apps/mobile/app/(app)/lens-form.tsx` — Create/edit lens form screen

**Files to Modify:**
- None

**Existing Code to Reference:**
- `apps/mobile/app/(app)/settings.tsx` — Form layout patterns, theme usage

**Dependencies:** Task 3.1.A (useLenses hook)

**Spec Reference:** FEATURE_TECHNICAL_SPEC.md > 4.4

**Browser Verification:**
- Criteria IDs: None
- Notes: Test via mobile emulator

---

#### Task 3.3.C: Create lens-manage screen

**Description:**
Create the lens management list screen showing all user lenses with name, schedule, last run time, and active/paused status. Supports edit (navigate to form), pause/resume toggle, Run Now, and delete with confirmation. Shows error state for lenses with 3+ consecutive failures.

**Acceptance Criteria:**
- [ ] (CODE) Screen exists at `apps/mobile/app/(app)/lens-manage.tsx`
  - Verify: `test -f apps/mobile/app/\(app\)/lens-manage.tsx`
- [ ] (CODE) Lists all user lenses via `useLenses` hook
  - Verify: `grep -q "useLenses" apps/mobile/app/\(app\)/lens-manage.tsx`
- [ ] (CODE) Supports pause/resume toggle action
  - Verify: `grep -q "pause\|resume\|toggleActive\|is_active" apps/mobile/app/\(app\)/lens-manage.tsx`
- [ ] (CODE) Delete action shows confirmation alert
  - Verify: `grep -q "Alert\|confirm\|delete" apps/mobile/app/\(app\)/lens-manage.tsx`
- [ ] (CODE) Shows error state when `consecutive_failures >= 3`
  - Verify: `grep -q "consecutive_failures\|failed\|error" apps/mobile/app/\(app\)/lens-manage.tsx`
- [ ] (CODE) Run Now button calls `useRunLensNow`
  - Verify: `grep -q "useRunLensNow\|runNow\|Run Now" apps/mobile/app/\(app\)/lens-manage.tsx`

**Files to Create:**
- `apps/mobile/app/(app)/lens-manage.tsx` — Lens management screen

**Files to Modify:**
- None

**Existing Code to Reference:**
- `apps/mobile/app/(app)/notes.tsx` — List screen patterns
- `apps/mobile/app/(app)/settings.tsx` — Action button patterns

**Dependencies:** Task 3.1.A (useLenses), Task 3.1.C (useRunLensNow)

**Spec Reference:** FEATURE_TECHNICAL_SPEC.md > 4.5

**Browser Verification:**
- Criteria IDs: None
- Notes: Test via mobile emulator

---

### Step 3.4: Navigation + Notifications

**Depends On:** Step 3.3

---

#### Task 3.4.A: Update app layout and notification handling

**Description:**
Register `lens-form` and `lens-manage` as hidden screens in the tab layout. Update the notification tap handler to support `lens_result` notification type. Extend `NotificationData` type. Update `testIds` with lens-related IDs.

**Acceptance Criteria:**
- [ ] (CODE) `lens-form` and `lens-manage` registered in `_layout.tsx` with `href: null`
  - Verify: `grep -q "lens-form" apps/mobile/app/\(app\)/_layout.tsx && grep -q "lens-manage" apps/mobile/app/\(app\)/_layout.tsx`
- [ ] (CODE) Notification handler supports `lens_result` type
  - Verify: `grep -q "lens_result" apps/mobile/app/\(app\)/_layout.tsx`
- [ ] (CODE) `NotificationData` type includes `lens_result_id` field
  - Verify: `grep -q "lens_result_id" apps/mobile/services/notifications.ts`
- [ ] (CODE) `testIds` includes lens-related IDs
  - Verify: `grep -q "lens" apps/mobile/lib/testIds.ts`

**Files to Create:**
- None

**Files to Modify:**
- `apps/mobile/app/(app)/_layout.tsx` — Register screens, update notification handler
- `apps/mobile/services/notifications.ts` — Extend NotificationData type
- `apps/mobile/lib/testIds.ts` — Add lens test IDs

**Existing Code to Reference:**
- `apps/mobile/app/(app)/_layout.tsx` — Existing screen registration and notification handling pattern

**Dependencies:** Task 3.3.B and 3.3.C (screens must exist)

**Spec Reference:** FEATURE_TECHNICAL_SPEC.md > 4.6, 4.7

**Browser Verification:**
- Criteria IDs: None
- Notes: N/A

---

### Phase 3 Checkpoint

**Automated Checks:**
- [ ] Mobile app compiles: `cd apps/mobile && npx tsc --noEmit`
- [ ] Shared package compiles: `cd packages/shared && npx tsc --noEmit`
- [ ] Mobile smoke tests pass: `cd apps/mobile && npx jest`
- [ ] Web tests still pass: `cd apps/web && npx vitest run`

**Regression Verification:**
- [ ] Existing Capture, Notes, and Settings tabs still work
- [ ] Push notification infrastructure still functional
- [ ] No console errors on any tab

---

## Phase 4: Integration and Polish

**Goal:** End-to-end verification, cleanup of deprecated code, and result retention.
**Depends On:** Phase 3

### Pre-Phase Setup

- [ ] All prior phases complete
  - Verify: `grep -c "\[x\]" features/custom-lenses/EXECUTION_PLAN.md`

### Step 4.1: End-to-End Verification

**Depends On:** None

---

#### Task 4.1.A: Timezone-aware next_run_at recomputation on timezone change

**Description:**
Hook into the existing `useUserSettings.updateTimezone` mutation to recompute `next_run_at` for all active lenses when a user changes their timezone. This ensures lenses fire at the correct time after a timezone change.

**Acceptance Criteria:**
- [ ] (CODE) Timezone change triggers lens `next_run_at` recomputation
  - Verify: `grep -q "lenses\|next_run_at" apps/mobile/hooks/useUserSettings.ts`
- [ ] (CODE) Recomputation uses UPDATE that triggers `compute_next_run_at` DB trigger
  - Verify: `grep -q "lenses" apps/mobile/hooks/useUserSettings.ts`

**Files to Create:**
- None

**Files to Modify:**
- `apps/mobile/hooks/useUserSettings.ts` — Add lens recomputation on timezone change

**Existing Code to Reference:**
- `apps/mobile/hooks/useUserSettings.ts` — Current timezone update flow

**Dependencies:** Task 3.1.A (useLenses)

**Spec Reference:** FEATURE_TECHNICAL_SPEC.md > 9 Edge Cases (timezone change)

**Browser Verification:**
- Criteria IDs: None
- Notes: N/A

---

### Step 4.2: Cleanup

**Depends On:** Step 4.1

---

#### Task 4.2.A: Deprecate old daily summary code

**Description:**
Mark `useDailySummary.ts`, `SummaryCard.tsx`, and `generate-summary/index.ts` as deprecated with comments directing to the new lens system. Remove imports of deprecated modules from active code.

**Acceptance Criteria:**
- [ ] (CODE) `useDailySummary.ts` has deprecation comment at top
  - Verify: `grep -q "@deprecated\|DEPRECATED" apps/mobile/hooks/useDailySummary.ts`
- [ ] (CODE) `SummaryCard.tsx` has deprecation comment at top
  - Verify: `grep -q "@deprecated\|DEPRECATED" apps/mobile/components/SummaryCard.tsx`
- [ ] (CODE) No active code imports `useDailySummary` or `SummaryCard` (excluding deprecated files themselves)
  - Verify: `grep -rl "useDailySummary\|SummaryCard" apps/mobile/app/ apps/mobile/components/ 2>/dev/null | grep -v "SummaryCard.tsx" | grep -v "useDailySummary.ts" | wc -l | tr -d ' '`

**Files to Create:**
- None

**Files to Modify:**
- `apps/mobile/hooks/useDailySummary.ts` — Add deprecation notice
- `apps/mobile/components/SummaryCard.tsx` — Add deprecation notice

**Existing Code to Reference:**
- None

**Dependencies:** Task 3.3.A (summary.tsx no longer imports deprecated modules)

**Spec Reference:** FEATURE_TECHNICAL_SPEC.md > 7 Phase 6: Cleanup

**Browser Verification:**
- Criteria IDs: None
- Notes: N/A

---

#### Task 4.2.B: Add result retention cleanup job

**Description:**
Add documentation and SQL for the `cleanup-old-lens-results` cron job that deletes lens results older than 90 days, running daily at 3 AM UTC.

**Acceptance Criteria:**
- [ ] (CODE) Cleanup job SQL documented in migration file
  - Verify: `grep -q "cleanup-old-lens-results" supabase/migrations/00007_migrate_daily_summaries.sql`
- [ ] (CODE) Cleanup deletes results older than 90 days
  - Verify: `grep -q "90 days" supabase/migrations/00007_migrate_daily_summaries.sql`

**Files to Create:**
- None

**Files to Modify:**
- `supabase/migrations/00007_migrate_daily_summaries.sql` — Add cleanup job documentation

**Existing Code to Reference:**
- `supabase/migrations/00005_cron_schedule.sql` — Cron documentation pattern

**Dependencies:** Task 2.4.A (migration file exists)

**Spec Reference:** FEATURE_TECHNICAL_SPEC.md > 3.6

**Browser Verification:**
- Criteria IDs: None
- Notes: N/A

---

### Phase 4 Checkpoint

**Automated Checks:**
- [ ] Mobile app compiles: `cd apps/mobile && npx tsc --noEmit`
- [ ] Shared package compiles: `cd packages/shared && npx tsc --noEmit`
- [ ] Mobile smoke tests pass: `cd apps/mobile && npx jest`
- [ ] Web tests still pass: `cd apps/web && npx vitest run`
- [ ] No active code imports deprecated modules

**Regression Verification:**
- [ ] All existing app functionality (Capture, Notes, Settings) works
- [ ] Push notifications still delivered
- [ ] Daily summary data preserved and visible in lens results feed

**Browser Verification (if applicable):**
- [ ] Summary tab shows lens results feed
- [ ] Lens creation form accessible from "+" button
- [ ] Lens management accessible from gear icon
- [ ] Pull-to-refresh works on Summary tab
