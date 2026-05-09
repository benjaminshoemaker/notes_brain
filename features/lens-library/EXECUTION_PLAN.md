# Execution Plan: Lens Library

## Overview

| Metric | Value |
|--------|-------|
| Feature | Lens Library |
| Target Project | Notes Brain |
| Total Phases | 4 |
| Total Steps | 8 |
| Total Tasks | 15 |

## Integration Points

| Existing Component | Integration Type | Notes |
|--------------------|------------------|-------|
| `supabase/migrations/` | extends | Add nullable source metadata columns, Morning Briefing backfill, and default trigger update |
| `packages/shared/src/types.ts` | extends | Add lens template/source metadata types |
| `packages/shared/src/supabase.ts` | extends | Add source metadata columns to the manual Database type |
| `apps/mobile/lib/lensLibrary.ts` | creates | Bundled curated template catalog and install helpers |
| `apps/mobile/hooks/useLenses.ts` | modifies | Allow source metadata on create while keeping updates user-editable only |
| `apps/mobile/hooks/useLensLibrary.ts` | creates | Derive library install state and install mutation helpers |
| `apps/mobile/app/(app)/summary.tsx` | modifies | Route create entry points to the choice screen |
| `apps/mobile/app/(app)/lens-manage.tsx` | modifies | Route empty state to the choice screen if CTA is added |
| `apps/mobile/app/(app)/lens-create.tsx` | creates | Choice screen for `Create your own` and `Browse Lens Library` |
| `apps/mobile/app/(app)/lens-library.tsx` | creates | Curated template browse list |
| `apps/mobile/app/(app)/lens-library-preview.tsx` | creates | Template preview and install flow |
| `apps/mobile/lib/testIds.ts` | extends | Add selectors for agent-runnable smoke tests |

## Phase Dependency Graph

```text
+---------------------+
| Phase 1:            |
| Metadata Foundation |
+----------+----------+
           |
           v
+---------------------+
| Phase 2:            |
| Template Catalog    |
+----------+----------+
           |
           v
+---------------------+
| Phase 3:            |
| Mobile Library UX   |
+----------+----------+
           |
           v
+---------------------+
| Phase 4:            |
| Flow Verification   |
+---------------------+
```

---

## Phase 1: Metadata Foundation

**Goal:** Add source metadata support to the database and shared types without changing existing lens execution behavior.
**Depends On:** None

### Pre-Phase Setup

- [x] (CODE) Supabase migration directory is present.
  - Verify: `test -d supabase/migrations`
- [x] (CODE) Shared package is available for type updates.
  - Verify: `test -f packages/shared/src/types.ts && test -f packages/shared/src/supabase.ts`
- [x] (CODE) Existing custom-lens migration exists for trigger/backfill reference.
  - Verify: `test -f supabase/migrations/00006_custom_lenses.sql`

### Step 1.1: Database Migration

**Depends On:** None

---

#### Task 1.1.A: Add lens library metadata migration

**Description:**
Create `00008_lens_library.sql` to add nullable source metadata columns to `lenses`, index source-template lookups, backfill existing default Morning Briefing rows, and replace `create_default_lens()` so new users receive template metadata. This preserves copy-on-install semantics and prevents duplicate Morning Briefing installs.

**Requirement:** FEATURE_TECHNICAL_SPEC.md > Data Model Changes; FEATURE_TECHNICAL_SPEC.md > Morning Briefing Backfill

**Acceptance Criteria:**
- [x] (CODE) Migration adds `source_template_id`, `source_template_version`, `installed_from_library_at`, and `template_snapshot` to `lenses`.
  - Verify: `grep -q "ADD COLUMN source_template_id" supabase/migrations/00008_lens_library.sql && grep -q "ADD COLUMN source_template_version" supabase/migrations/00008_lens_library.sql && grep -q "ADD COLUMN installed_from_library_at" supabase/migrations/00008_lens_library.sql && grep -q "ADD COLUMN template_snapshot" supabase/migrations/00008_lens_library.sql`
- [x] (CODE) Migration creates `idx_lenses_source_template` on `(user_id, source_template_id)` with a non-null source-template predicate.
  - Verify: `grep -q "idx_lenses_source_template" supabase/migrations/00008_lens_library.sql && grep -q "source_template_id IS NOT NULL" supabase/migrations/00008_lens_library.sql`
- [x] (CODE) Migration backfills only existing default Morning Briefing rows with `source_template_id = 'morning-briefing'`.
  - Verify: `grep -q "source_template_id = 'morning-briefing'" supabase/migrations/00008_lens_library.sql && grep -q "is_default = true" supabase/migrations/00008_lens_library.sql && grep -q "name = 'Morning Briefing'" supabase/migrations/00008_lens_library.sql`
- [x] (CODE) Migration replaces `create_default_lens()` and inserts new Morning Briefing rows with source metadata.
  - Verify: `grep -q "CREATE OR REPLACE FUNCTION create_default_lens" supabase/migrations/00008_lens_library.sql && grep -q "source_template_version" supabase/migrations/00008_lens_library.sql`
- [x] (CODE) Rollback SQL comments or statements cover dropping the index and metadata columns.
  - Verify: `grep -q "DROP INDEX IF EXISTS idx_lenses_source_template" supabase/migrations/00008_lens_library.sql && grep -q "DROP COLUMN IF EXISTS source_template_id" supabase/migrations/00008_lens_library.sql`

**Files to Create:**
- `supabase/migrations/00008_lens_library.sql` — Metadata migration, targeted backfill, updated default trigger, rollback notes

**Files to Modify:**
- None

**Existing Code to Reference:**
- `supabase/migrations/00006_custom_lenses.sql` — Existing `lenses` schema, RLS, and `create_default_lens()` trigger
- `supabase/migrations/00007_migrate_daily_summaries.sql` — Migration documentation style

**Dependencies:** None

**Spec Reference:** FEATURE_TECHNICAL_SPEC.md > Data Model Changes; FEATURE_TECHNICAL_SPEC.md > Morning Briefing Backfill

**Browser Verification:**
- Criteria IDs: None
- Notes: N/A

---

#### Task 1.1.B: Add migration metadata regression test

**Description:**
Add a root `node --test` contract test that prevents schema/type drift for the Lens Library metadata migration. The test should assert the migration contains all metadata columns, the Morning Briefing backfill, the default trigger update, and the source-template index.

**Requirement:** FEATURE_TECHNICAL_SPEC.md > Testing Plan

**Acceptance Criteria:**
- [x] (TEST) Root test file exists for Lens Library migration contracts.
  - Verify: `test -f tests/task-lens-library-metadata.test.js`
- [x] (TEST) Test asserts all four metadata columns exist in `00008_lens_library.sql`.
  - Verify: `grep -q "source_template_id" tests/task-lens-library-metadata.test.js && grep -q "template_snapshot" tests/task-lens-library-metadata.test.js`
- [x] (TEST) Test asserts the migration backfills default Morning Briefing with `morning-briefing`.
  - Verify: `grep -q "morning-briefing" tests/task-lens-library-metadata.test.js && grep -q "is_default" tests/task-lens-library-metadata.test.js`
- [x] (TEST) Test asserts the migration updates `create_default_lens()`.
  - Verify: `grep -q "create_default_lens" tests/task-lens-library-metadata.test.js`
- [x] (TEST) Root tests pass.
  - Verify: `npm run test:root`

**Files to Create:**
- `tests/task-lens-library-metadata.test.js` — Static migration/schema contract tests

**Files to Modify:**
- None

**Existing Code to Reference:**
- `tests/task-deploy-readiness.test.js` — Root static test style
- `tests/local-lens-interval.test.js` — Node test import/assert patterns

**Dependencies:** Task 1.1.A

**Spec Reference:** FEATURE_TECHNICAL_SPEC.md > Testing Plan

**Browser Verification:**
- Criteria IDs: None
- Notes: N/A

---

### Step 1.2: Shared Types

**Depends On:** Step 1.1

---

#### Task 1.2.A: Extend shared lens and template types

**Description:**
Update shared TypeScript types to represent installed source metadata and bundled lens templates. This gives mobile screens and hooks one typed contract for template catalog data, template snapshots, and installed user lenses.

**Requirement:** FEATURE_TECHNICAL_SPEC.md > Update Shared Types

**Acceptance Criteria:**
- [x] (CODE) `Lens` includes `source_template_id`, `source_template_version`, `installed_from_library_at`, and `template_snapshot`.
  - Verify: `grep -q "source_template_id" packages/shared/src/types.ts && grep -q "installed_from_library_at" packages/shared/src/types.ts && grep -q "template_snapshot" packages/shared/src/types.ts`
- [x] (CODE) `LensTemplate`, `LensTemplateSnapshot`, and `LensTemplateAuthorType` are exported from `packages/shared/src/types.ts`.
  - Verify: `grep -q "export interface LensTemplate" packages/shared/src/types.ts && grep -q "export interface LensTemplateSnapshot" packages/shared/src/types.ts && grep -q "export type LensTemplateAuthorType" packages/shared/src/types.ts`
- [x] (CODE) `packages/shared/src/index.ts` exports the new template types.
  - Verify: `grep -q "LensTemplate" packages/shared/src/index.ts && grep -q "LensTemplateSnapshot" packages/shared/src/index.ts`
- [x] (TYPE) Shared package typecheck passes.
  - Verify: `npm run typecheck -w @notesbrain/shared`

**Files to Create:**
- None

**Files to Modify:**
- `packages/shared/src/types.ts` — Add source metadata and template types
- `packages/shared/src/index.ts` — Export new types

**Existing Code to Reference:**
- `packages/shared/src/types.ts` — Existing `Lens`, `LensResult`, and union type style
- `packages/shared/src/index.ts` — Existing export pattern

**Dependencies:** Task 1.1.A

**Spec Reference:** FEATURE_TECHNICAL_SPEC.md > Update Shared Types

**Browser Verification:**
- Criteria IDs: None
- Notes: N/A

---

#### Task 1.2.B: Update shared Supabase database type

**Description:**
Update the manual `Database` type for the `lenses` table so row, insert, and update shapes match the new migration. Keep normal app updates scoped to user-editable fields in hooks even if the database type permits metadata for insert/admin use.

**Requirement:** FEATURE_TECHNICAL_SPEC.md > Update Shared Types

**Acceptance Criteria:**
- [x] (CODE) `lenses.Row` includes all four source metadata columns.
  - Verify: `grep -A35 "lenses:" packages/shared/src/supabase.ts | grep -q "source_template_id" && grep -A35 "lenses:" packages/shared/src/supabase.ts | grep -q "template_snapshot"`
- [x] (CODE) `lenses.Insert` includes optional source metadata columns.
  - Verify: `grep -A70 "Insert:" packages/shared/src/supabase.ts | grep -q "source_template_version" && grep -A70 "Insert:" packages/shared/src/supabase.ts | grep -q "installed_from_library_at"`
- [x] (CODE) `lenses.Update` includes source metadata only if needed for future migration/admin changes.
  - Verify: `grep -A95 "Update:" packages/shared/src/supabase.ts | grep -q "source_template_id"`
- [x] (TEST) Root metadata test asserts shared type/schema alignment.
  - Verify: `npm run test:root`
- [x] (TYPE) Shared package typecheck passes.
  - Verify: `npm run typecheck -w @notesbrain/shared`

**Files to Create:**
- None

**Files to Modify:**
- `packages/shared/src/supabase.ts` — Add metadata columns to `lenses.Row`, `Insert`, and `Update`
- `tests/task-lens-library-metadata.test.js` — Extend static assertions for shared type alignment

**Existing Code to Reference:**
- `packages/shared/src/supabase.ts` — Existing manual table type pattern
- `tests/task-lens-library-metadata.test.js` — Contract test from Task 1.1.B

**Dependencies:** Task 1.2.A

**Spec Reference:** FEATURE_TECHNICAL_SPEC.md > Update Shared Types; FEATURE_TECHNICAL_SPEC.md > Testing Plan

**Browser Verification:**
- Criteria IDs: None
- Notes: N/A

---

### Phase 1 Checkpoint

**Automated Checks:**
- [x] (TEST) Metadata migration contract tests pass.
  - Verify: `npm run test:root`
- [x] (TYPE) Shared package typecheck passes.
  - Verify: `npm run typecheck -w @notesbrain/shared`
- [x] (CODE) Migration and shared type files contain the same metadata field names.
  - Verify: `for f in source_template_id source_template_version installed_from_library_at template_snapshot; do grep -q "$f" supabase/migrations/00008_lens_library.sql && grep -q "$f" packages/shared/src/types.ts && grep -q "$f" packages/shared/src/supabase.ts || exit 1; done`

**Regression Verification:**
- [x] (CODE) Existing custom lens migration remains present and unchanged in filename.
  - Verify: `test -f supabase/migrations/00006_custom_lenses.sql`
- [x] (CODE) Existing lens execution function still selects installed lens prompt/schedule/filter fields.
  - Verify: `grep -q "prompt, schedule_type, schedule_time, schedule_day, lookback_hours, categories" supabase/functions/execute-lens/index.ts`

---

## Phase 2: Template Catalog and Lens Hooks

**Goal:** Add the bundled template catalog and hook-level install-state logic that creates normal editable user lenses.
**Depends On:** Phase 1

### Pre-Phase Setup

- [ ] (CODE) Mobile app source directories exist.
  - Verify: `test -d apps/mobile/lib && test -d apps/mobile/hooks`
- [ ] (CODE) Existing lens CRUD hook exists.
  - Verify: `test -f apps/mobile/hooks/useLenses.ts`
- [ ] (CODE) Existing mobile test setup exists.
  - Verify: `test -f apps/mobile/test/setup.ts`

### Step 2.1: Curated Catalog

**Depends On:** Phase 1

---

#### Task 2.1.A: Add curated lens template catalog

**Description:**
Create `apps/mobile/lib/lensLibrary.ts` with the curated v1 seed templates and helper functions. The catalog should be bundled, typed, offline-readable, and install-ready without adding a server template table.

**Requirement:** FEATURE_SPEC.md > Initial Library Seeds; FEATURE_TECHNICAL_SPEC.md > Curated Template Storage

**Acceptance Criteria:**
- [ ] (CODE) `lensLibrary.ts` exports a typed curated template array.
  - Verify: `grep -q "LensTemplate" apps/mobile/lib/lensLibrary.ts && grep -q "export const" apps/mobile/lib/lensLibrary.ts`
- [ ] (CODE) Catalog includes all ten initial seed lens names from the feature spec.
  - Verify: `for name in "Morning Briefing" "Tomorrow Planner" "Weekly Project Pulse" "Health Pattern Check" "Relationship Reminders" "Errands & Admin Sweep" "Idea Incubator" "Decision Log" "Friction Finder" "Gratitude & Wins"; do grep -q "$name" apps/mobile/lib/lensLibrary.ts || exit 1; done`
- [ ] (CODE) `morning-briefing` template uses `version: 1` and stable `template_id`.
  - Verify: `grep -q "morning-briefing" apps/mobile/lib/lensLibrary.ts && grep -q "version: 1" apps/mobile/lib/lensLibrary.ts`
- [ ] (CODE) Helper exports exist for template lookup, install input creation, and snapshot creation.
  - Verify: `grep -q "getLensTemplateById" apps/mobile/lib/lensLibrary.ts && grep -q "createLensInputFromTemplate" apps/mobile/lib/lensLibrary.ts && grep -q "createTemplateSnapshot" apps/mobile/lib/lensLibrary.ts`
- [ ] (TYPE) Mobile package typecheck passes with the catalog.
  - Verify: `npm run typecheck -w @notesbrain/mobile`

**Files to Create:**
- `apps/mobile/lib/lensLibrary.ts` — Curated template data and helper functions

**Files to Modify:**
- None

**Existing Code to Reference:**
- `apps/mobile/lib/theme.ts` — Nearby lib export style
- `packages/shared/src/types.ts` — `LensTemplate` and `LensTemplateSnapshot` contracts

**Dependencies:** Task 1.2.A

**Spec Reference:** FEATURE_SPEC.md > Initial Library Seeds; FEATURE_TECHNICAL_SPEC.md > Curated Template Storage

**Browser Verification:**
- Criteria IDs: None
- Notes: N/A

---

#### Task 2.1.B: Add catalog contract tests

**Description:**
Add mobile tests that validate the bundled catalog shape, template IDs, prompt length constraints, and install helper output. These tests prevent seed content changes from breaking database constraints or copy-on-install metadata.

**Requirement:** FEATURE_TECHNICAL_SPEC.md > Testing Plan

**Acceptance Criteria:**
- [ ] (TEST) Mobile catalog test file exists.
  - Verify: `test -f apps/mobile/test/smoke/lens-library-catalog.test.ts`
- [ ] (TEST) Test asserts every template prompt is between 20 and 2000 characters.
  - Verify: `grep -q "2000" apps/mobile/test/smoke/lens-library-catalog.test.ts && grep -q "20" apps/mobile/test/smoke/lens-library-catalog.test.ts`
- [ ] (TEST) Test asserts template IDs are unique.
  - Verify: `grep -q "template_id" apps/mobile/test/smoke/lens-library-catalog.test.ts && grep -q "Set" apps/mobile/test/smoke/lens-library-catalog.test.ts`
- [ ] (TEST) Test asserts `createLensInputFromTemplate` includes source metadata and copied prompt/schedule/filter fields.
  - Verify: `grep -q "createLensInputFromTemplate" apps/mobile/test/smoke/lens-library-catalog.test.ts && grep -q "source_template_id" apps/mobile/test/smoke/lens-library-catalog.test.ts`
- [ ] (TEST) Mobile tests pass.
  - Verify: `npm run test -w @notesbrain/mobile`

**Files to Create:**
- `apps/mobile/test/smoke/lens-library-catalog.test.ts` — Catalog helper contract tests

**Files to Modify:**
- None

**Existing Code to Reference:**
- `apps/mobile/test/smoke/auth-redirect.test.ts` — Mobile Vitest style
- `apps/mobile/test/setup.ts` — Existing mocks and React Native test environment

**Dependencies:** Task 2.1.A

**Spec Reference:** FEATURE_TECHNICAL_SPEC.md > Testing Plan

**Browser Verification:**
- Criteria IDs: None
- Notes: N/A

---

### Step 2.2: Lens Hooks

**Depends On:** Step 2.1

---

#### Task 2.2.A: Extend useLenses create payload for source metadata

**Description:**
Update `useLenses` so library installs can create normal user-owned lens rows with source metadata. Keep update behavior scoped to user-editable fields so editing an installed lens does not clear or rewrite provenance.

**Requirement:** FEATURE_TECHNICAL_SPEC.md > Extend `useLenses`; FEATURE_TECHNICAL_SPEC.md > Editing Installed Lenses

**Acceptance Criteria:**
- [ ] (CODE) `CreateLensInput` is exported from `useLenses.ts`.
  - Verify: `grep -q "export type CreateLensInput" apps/mobile/hooks/useLenses.ts`
- [ ] (CODE) `CreateLensInput` includes all source metadata fields.
  - Verify: `grep -q "source_template_id" apps/mobile/hooks/useLenses.ts && grep -q "source_template_version" apps/mobile/hooks/useLenses.ts && grep -q "template_snapshot" apps/mobile/hooks/useLenses.ts`
- [ ] (CODE) `createLens` insert payload writes source metadata fields.
  - Verify: `grep -A25 ".insert" apps/mobile/hooks/useLenses.ts | grep -q "source_template_id" && grep -A25 ".insert" apps/mobile/hooks/useLenses.ts | grep -q "template_snapshot"`
- [ ] (CODE) `UpdateLensInput` remains restricted to user-editable fields and `is_active`, not template metadata.
  - Verify: `grep -A12 "type UpdateLensInput" apps/mobile/hooks/useLenses.ts | grep -q "is_active" && ! grep -A12 "type UpdateLensInput" apps/mobile/hooks/useLenses.ts | grep -q "source_template_id"`
- [ ] (TYPE) Mobile package typecheck passes.
  - Verify: `npm run typecheck -w @notesbrain/mobile`

**Files to Create:**
- None

**Files to Modify:**
- `apps/mobile/hooks/useLenses.ts` — Extend create payload and preserve update restrictions

**Existing Code to Reference:**
- `apps/mobile/hooks/useLenses.ts` — Existing CRUD, auth, and invalidation pattern

**Dependencies:** Task 1.2.B; Task 2.1.A

**Spec Reference:** FEATURE_TECHNICAL_SPEC.md > Extend `useLenses`; FEATURE_TECHNICAL_SPEC.md > Editing Installed Lenses

**Browser Verification:**
- Criteria IDs: None
- Notes: N/A

---

#### Task 2.2.B: Add useLensLibrary install-state hook

**Description:**
Create `useLensLibrary` to combine bundled templates with installed user lenses, derive install/update state, and expose an install mutation that uses the existing `useLenses().create` path. This keeps library-specific state out of screens and avoids a separate persistence path.

**Requirement:** FEATURE_TECHNICAL_SPEC.md > Add `useLensLibrary`; FLOW_VERIFICATION_PLAN.md > Assertions

**Acceptance Criteria:**
- [ ] (CODE) `apps/mobile/hooks/useLensLibrary.ts` exports `useLensLibrary`.
  - Verify: `test -f apps/mobile/hooks/useLensLibrary.ts && grep -q "export function useLensLibrary" apps/mobile/hooks/useLensLibrary.ts`
- [ ] (CODE) Hook derives `Installed` from matching `source_template_id` and current `source_template_version`.
  - Verify: `grep -q "source_template_id" apps/mobile/hooks/useLensLibrary.ts && grep -q "source_template_version" apps/mobile/hooks/useLensLibrary.ts && grep -q "Installed" apps/mobile/hooks/useLensLibrary.ts`
- [ ] (CODE) Hook exposes install behavior that calls the existing `create` mutation with `createLensInputFromTemplate`.
  - Verify: `grep -q "createLensInputFromTemplate" apps/mobile/hooks/useLensLibrary.ts && grep -q "create.mutateAsync" apps/mobile/hooks/useLensLibrary.ts`
- [ ] (TEST) Mobile tests cover installed-state derivation including Morning Briefing metadata.
  - Verify: `grep -q "morning-briefing" apps/mobile/test/smoke/lens-library-catalog.test.ts && npm run test -w @notesbrain/mobile`
- [ ] (TYPE) Mobile package typecheck passes.
  - Verify: `npm run typecheck -w @notesbrain/mobile`

**Files to Create:**
- `apps/mobile/hooks/useLensLibrary.ts` — Derived library state and install mutation wrapper

**Files to Modify:**
- `apps/mobile/test/smoke/lens-library-catalog.test.ts` — Add installed-state coverage

**Existing Code to Reference:**
- `apps/mobile/hooks/useLenses.ts` — React Query mutation and invalidation style
- `apps/mobile/hooks/useLensResults.ts` — Hook structure and query-key conventions

**Dependencies:** Task 2.2.A

**Spec Reference:** FEATURE_TECHNICAL_SPEC.md > Add `useLensLibrary`; FLOW_VERIFICATION_PLAN.md > Assertions

**Browser Verification:**
- Criteria IDs: None
- Notes: N/A

---

### Phase 2 Checkpoint

**Automated Checks:**
- [ ] (TEST) Mobile catalog and hook tests pass.
  - Verify: `npm run test -w @notesbrain/mobile`
- [ ] (TYPE) Mobile package typecheck passes.
  - Verify: `npm run typecheck -w @notesbrain/mobile`
- [ ] (TEST) Root metadata tests still pass.
  - Verify: `npm run test:root`

**Regression Verification:**
- [ ] (CODE) Existing `useLenses` fetch/update/delete/toggle functions still exist.
  - Verify: `grep -q "function fetchLenses" apps/mobile/hooks/useLenses.ts && grep -q "function updateLens" apps/mobile/hooks/useLenses.ts && grep -q "function deleteLens" apps/mobile/hooks/useLenses.ts && grep -q "function toggleLensActive" apps/mobile/hooks/useLenses.ts`
- [ ] (CODE) `execute-lens` still reads installed lens fields only.
  - Verify: `grep -q "lens.prompt" supabase/functions/execute-lens/index.ts && ! grep -q "lensLibrary" supabase/functions/execute-lens/index.ts`

---

## Phase 3: Mobile Library UX

**Goal:** Add the user-facing Lens Library screens and route existing creation entry points through the choice flow.
**Depends On:** Phase 2

### Pre-Phase Setup

- [ ] (CODE) Expo Router app group exists.
  - Verify: `test -d 'apps/mobile/app/(app)'`
- [ ] (CODE) Warm Ink theme tokens are available.
  - Verify: `test -f apps/mobile/lib/theme.ts`
- [ ] (CODE) Test ID registry exists.
  - Verify: `test -f apps/mobile/lib/testIds.ts`

### Step 3.1: Creation Choice Entry Point

**Depends On:** Phase 2

---

#### Task 3.1.A: Add lens creation choice screen

**Description:**
Create the `lens-create` route with two clear paths: `Create your own` and `Browse Lens Library`. The screen should use existing Warm Ink tokens and Ionicons, then route to the existing lens form or new library list.

**Requirement:** FEATURE_SPEC.md > Entry Point; FEATURE_TECHNICAL_SPEC.md > `lens-create.tsx`

**Acceptance Criteria:**
- [ ] (CODE) `apps/mobile/app/(app)/lens-create.tsx` exists and renders `Create your own`.
  - Verify: `test -f 'apps/mobile/app/(app)/lens-create.tsx' && grep -q "Create your own" 'apps/mobile/app/(app)/lens-create.tsx'`
- [ ] (CODE) Screen renders `Browse Lens Library`.
  - Verify: `grep -q "Browse Lens Library" 'apps/mobile/app/(app)/lens-create.tsx'`
- [ ] (CODE) `Create your own` routes to `/(app)/lens-form`.
  - Verify: `grep -q "/(app)/lens-form" 'apps/mobile/app/(app)/lens-create.tsx'`
- [ ] (CODE) `Browse Lens Library` routes to `/(app)/lens-library`.
  - Verify: `grep -q "/(app)/lens-library" 'apps/mobile/app/(app)/lens-create.tsx'`
- [ ] (CODE) Screen imports Warm Ink tokens and Ionicons.
  - Verify: `grep -q "from \"../../lib/theme\"" 'apps/mobile/app/(app)/lens-create.tsx' && grep -q "@expo/vector-icons" 'apps/mobile/app/(app)/lens-create.tsx'`

**Files to Create:**
- `apps/mobile/app/(app)/lens-create.tsx` — Creation choice screen

**Files to Modify:**
- None

**Existing Code to Reference:**
- `apps/mobile/app/(app)/lens-manage.tsx` — Stack screen options and Warm Ink card/action styling
- `apps/mobile/app/(app)/summary.tsx` — Router usage pattern

**Dependencies:** Task 2.2.B

**Spec Reference:** FEATURE_SPEC.md > Entry Point; FEATURE_TECHNICAL_SPEC.md > `lens-create.tsx`

**Browser Verification:**
- Criteria IDs: None
- Notes: Mobile UI route verified by tests and Phase 4 emulator flow

---

#### Task 3.1.B: Route existing create entry points to lens-create

**Description:**
Update Summary tab create entry points so tapping `+` and the empty-state CTA opens the choice screen instead of the blank form. Update lens management empty state only if a CTA is added there.

**Requirement:** FEATURE_SPEC.md > Acceptance Criteria Draft; FEATURE_TECHNICAL_SPEC.md > Routes

**Acceptance Criteria:**
- [ ] (CODE) `summary.tsx` defines or uses a `/(app)/lens-create` route constant.
  - Verify: `grep -q "/(app)/lens-create" 'apps/mobile/app/(app)/summary.tsx'`
- [ ] (CODE) Summary header `+` action pushes the lens-create route.
  - Verify: `grep -n "accessibilityLabel=\"Create lens\"" 'apps/mobile/app/(app)/summary.tsx' && grep -A8 "accessibilityLabel=\"Create lens\"" 'apps/mobile/app/(app)/summary.tsx' | grep -q "lens-create"`
- [ ] (CODE) Summary empty-state CTA pushes the lens-create route.
  - Verify: `grep -A12 "Create Lens" 'apps/mobile/app/(app)/summary.tsx' | grep -q "lens-create"`
- [ ] (TEST) Mobile smoke test covers Summary create routing to lens-create.
  - Verify: `grep -q "lens-create" apps/mobile/test/smoke/summary-screen.test.tsx && npm run test -w @notesbrain/mobile`
- [ ] (TYPE) Mobile typecheck passes.
  - Verify: `npm run typecheck -w @notesbrain/mobile`

**Files to Create:**
- `apps/mobile/test/smoke/summary-screen.test.tsx` — Summary route smoke test if no current equivalent exists

**Files to Modify:**
- `apps/mobile/app/(app)/summary.tsx` — Route create entry points to choice screen
- `apps/mobile/app/(app)/lens-manage.tsx` — Optional empty-state CTA route if introduced

**Existing Code to Reference:**
- `apps/mobile/app/(app)/summary.tsx` — Existing header and empty-state actions
- `apps/mobile/test/smoke/notes-screen.test.tsx` — Screen smoke test style

**Dependencies:** Task 3.1.A

**Spec Reference:** FEATURE_SPEC.md > Acceptance Criteria Draft; FEATURE_TECHNICAL_SPEC.md > Routes

**Browser Verification:**
- Criteria IDs: None
- Notes: Mobile UI route verified by tests and Phase 4 emulator flow

---

### Step 3.2: Browse and Preview Screens

**Depends On:** Step 3.1

---

#### Task 3.2.A: Add Lens Library browse screen

**Description:**
Create the `lens-library` route that lists curated templates with name, outcome-focused description, cadence, category, and install state. Installed templates remain viewable and route to the same preview screen.

**Requirement:** FEATURE_SPEC.md > Browse Lens Library; FEATURE_TECHNICAL_SPEC.md > `lens-library.tsx`

**Acceptance Criteria:**
- [ ] (CODE) `apps/mobile/app/(app)/lens-library.tsx` exists and imports `useLensLibrary`.
  - Verify: `test -f 'apps/mobile/app/(app)/lens-library.tsx' && grep -q "useLensLibrary" 'apps/mobile/app/(app)/lens-library.tsx'`
- [ ] (CODE) Browse screen renders a list using curated template data.
  - Verify: `grep -q "FlatList" 'apps/mobile/app/(app)/lens-library.tsx' && grep -q "template" 'apps/mobile/app/(app)/lens-library.tsx'`
- [ ] (CODE) Cards render install state text including `Installed`.
  - Verify: `grep -q "Installed" 'apps/mobile/app/(app)/lens-library.tsx'`
- [ ] (CODE) Pressing a template routes to `/(app)/lens-library-preview` with `templateId`.
  - Verify: `grep -q "/(app)/lens-library-preview" 'apps/mobile/app/(app)/lens-library.tsx' && grep -q "templateId" 'apps/mobile/app/(app)/lens-library.tsx'`
- [ ] (TEST) Mobile smoke test verifies seeded templates render.
  - Verify: `grep -q "Weekly Project Pulse" apps/mobile/test/smoke/lens-library-screen.test.tsx && npm run test -w @notesbrain/mobile`

**Files to Create:**
- `apps/mobile/app/(app)/lens-library.tsx` — Curated template list
- `apps/mobile/test/smoke/lens-library-screen.test.tsx` — Browse screen smoke test

**Files to Modify:**
- `apps/mobile/lib/testIds.ts` — Add library screen/list/card test IDs

**Existing Code to Reference:**
- `apps/mobile/app/(app)/lens-manage.tsx` — FlatList card/action patterns
- `apps/mobile/lib/theme.ts` — Warm Ink tokens
- `apps/mobile/lib/testIds.ts` — Test ID grouping

**Dependencies:** Task 3.1.A; Task 2.2.B

**Spec Reference:** FEATURE_SPEC.md > Browse Lens Library; FEATURE_TECHNICAL_SPEC.md > `lens-library.tsx`

**Browser Verification:**
- Criteria IDs: None
- Notes: Mobile UI route verified by tests and Phase 4 emulator flow

---

#### Task 3.2.B: Add Lens Library preview and install screen

**Description:**
Create the `lens-library-preview` route that shows template details, reads the template's install state from `useLensLibrary`, and installs a copied user-owned lens when the template is not already installed. The install action must write source metadata, show confirmation, and route to lens management so the created editable lens is visible. Already-installed templates, including backfilled Morning Briefing, must visually indicate `Installed` by default instead of presenting a misleading uninstalled state.

**Requirement:** FEATURE_SPEC.md > Preview; FEATURE_SPEC.md > Installed Lens Behavior; FEATURE_TECHNICAL_SPEC.md > `lens-library-preview.tsx`

**Acceptance Criteria:**
- [ ] (CODE) `apps/mobile/app/(app)/lens-library-preview.tsx` exists and reads `templateId` route param.
  - Verify: `test -f 'apps/mobile/app/(app)/lens-library-preview.tsx' && grep -q "templateId" 'apps/mobile/app/(app)/lens-library-preview.tsx'`
- [ ] (CODE) Preview renders template name, description, cadence, categories, lookback, and prompt/details text.
  - Verify: `grep -q "lookback" 'apps/mobile/app/(app)/lens-library-preview.tsx' && grep -q "prompt" 'apps/mobile/app/(app)/lens-library-preview.tsx' && grep -q "categories" 'apps/mobile/app/(app)/lens-library-preview.tsx'`
- [ ] (CODE) Primary action text includes `Add to My Lenses`.
  - Verify: `grep -q "Add to My Lenses" 'apps/mobile/app/(app)/lens-library-preview.tsx'`
- [ ] (CODE) Preview consumes library install state and renders `Installed` for already-installed templates.
  - Verify: `grep -q "installState" 'apps/mobile/app/(app)/lens-library-preview.tsx' && grep -q "Installed" 'apps/mobile/app/(app)/lens-library-preview.tsx'`
- [ ] (CODE) Already-installed templates do not show a misleading uninstalled primary action; either disable install or intentionally label an extra-copy action as `Add Another Copy`.
  - Verify: `grep -q "Add Another Copy\\|disabled" 'apps/mobile/app/(app)/lens-library-preview.tsx'`
- [ ] (CODE) Install action calls library install mutation and routes to `/(app)/lens-manage` on success.
  - Verify: `grep -q "install" 'apps/mobile/app/(app)/lens-library-preview.tsx' && grep -q "/(app)/lens-manage" 'apps/mobile/app/(app)/lens-library-preview.tsx'`
- [ ] (TEST) Mobile smoke test verifies install payload includes copied fields and source metadata.
  - Verify: `grep -q "source_template_id" apps/mobile/test/smoke/lens-library-preview.test.tsx && npm run test -w @notesbrain/mobile`
- [ ] (TEST) Mobile smoke test verifies Morning Briefing preview renders as already installed when source metadata is present.
  - Verify: `grep -q "morning-briefing" apps/mobile/test/smoke/lens-library-preview.test.tsx && grep -q "Installed" apps/mobile/test/smoke/lens-library-preview.test.tsx && npm run test -w @notesbrain/mobile`
- [ ] (TYPE) Mobile typecheck passes.
  - Verify: `npm run typecheck -w @notesbrain/mobile`

**Files to Create:**
- `apps/mobile/app/(app)/lens-library-preview.tsx` — Template preview and install route
- `apps/mobile/test/smoke/lens-library-preview.test.tsx` — Preview/install and installed-state smoke test

**Files to Modify:**
- `apps/mobile/lib/testIds.ts` — Add preview and install button test IDs

**Existing Code to Reference:**
- `apps/mobile/app/(app)/lens-form.tsx` — Existing lens field labels and validation copy
- `apps/mobile/hooks/useLenses.ts` — Mutation error handling style
- `apps/mobile/app/(app)/lens-manage.tsx` — Post-install destination and card layout patterns

**Dependencies:** Task 3.2.A

**Spec Reference:** FEATURE_SPEC.md > Preview; FEATURE_SPEC.md > Installed Lens Behavior; FEATURE_TECHNICAL_SPEC.md > `lens-library-preview.tsx`

**Browser Verification:**
- Criteria IDs: None
- Notes: Mobile UI route verified by tests and Phase 4 emulator flow

---

### Phase 3 Checkpoint

**Automated Checks:**
- [ ] (TEST) Mobile smoke tests pass.
  - Verify: `npm run test -w @notesbrain/mobile`
- [ ] (TYPE) Mobile typecheck passes.
  - Verify: `npm run typecheck -w @notesbrain/mobile`
- [ ] (LINT) Mobile lint passes.
  - Verify: `npm run lint -w @notesbrain/mobile`

**Regression Verification:**
- [ ] (CODE) Existing blank lens form route still exists for `Create your own`.
  - Verify: `test -f 'apps/mobile/app/(app)/lens-form.tsx' && grep -q "/(app)/lens-form" 'apps/mobile/app/(app)/lens-create.tsx'`
- [ ] (CODE) Existing lens management edit path still routes to `lens-form`.
  - Verify: `grep -q "/(app)/lens-form" 'apps/mobile/app/(app)/lens-manage.tsx'`
- [ ] (CODE) Normal lens execution path remains unchanged by library screens.
  - Verify: `! grep -R "lensLibrary" supabase/functions/execute-lens supabase/functions/dispatch-lenses`

**Browser Verification:**
- [ ] (TEST) Mobile route smoke tests cover the choice, browse, and preview surfaces.
  - Verify: `npm run test -w @notesbrain/mobile`

---

## Phase 4: Flow Verification and Release Readiness

**Goal:** Prove the full Lens Library flow with automated checks and an agent-runnable mobile smoke path.
**Depends On:** Phase 3

### Pre-Phase Setup

- [ ] (CODE) Mobile dev server MCP command is available.
  - Verify: `npm run dev:mobile:mcp -- --help >/tmp/notesbrain-expo-help.txt 2>&1 || test -s /tmp/notesbrain-expo-help.txt`
- [ ] (CODE) Mobile emulator instructions are present in root AGENTS.md.
  - Verify: `grep -q "AI Agent Mobile Emulation" AGENTS.md`
- [ ] (CODE) Flow verification plan exists and is applicable.
  - Verify: `grep -q "Status: Applicable" features/lens-library/FLOW_VERIFICATION_PLAN.md`

### Step 4.1: Automated Flow Coverage

**Depends On:** Phase 3

---

#### Task 4.1.A: Add flow verification assertions to tests

**Description:**
Extend tests so the flow verification plan is covered by machine checks: creation routes through the choice screen, browse shows curated templates, preview constructs a copied install payload, and Morning Briefing install state is recognized from source metadata.

**Requirement:** FLOW_VERIFICATION_PLAN.md > Assertions; FEATURE_TECHNICAL_SPEC.md > Testing Plan

**Acceptance Criteria:**
- [ ] (TEST) Tests assert `+` and Summary empty-state CTA route to `/(app)/lens-create`.
  - Verify: `grep -q "/(app)/lens-create" apps/mobile/test/smoke/summary-screen.test.tsx && npm run test -w @notesbrain/mobile`
- [ ] (TEST) Tests assert Browse Lens Library renders curated templates.
  - Verify: `grep -q "Browse Lens Library" apps/mobile/test/smoke/lens-library-screen.test.tsx && npm run test -w @notesbrain/mobile`
- [ ] (TEST) Tests assert preview install creates payload with copied prompt/schedule/filter fields.
  - Verify: `grep -q "schedule_type" apps/mobile/test/smoke/lens-library-preview.test.tsx && grep -q "lookback_hours" apps/mobile/test/smoke/lens-library-preview.test.tsx && npm run test -w @notesbrain/mobile`
- [ ] (TEST) Tests assert Morning Briefing is treated as installed when a user lens has `source_template_id = 'morning-briefing'`.
  - Verify: `grep -q "morning-briefing" apps/mobile/test/smoke/lens-library-catalog.test.ts && npm run test -w @notesbrain/mobile`
- [ ] (TEST) Root tests assert migration/source metadata alignment.
  - Verify: `npm run test:root`

**Files to Create:**
- None

**Files to Modify:**
- `apps/mobile/test/smoke/summary-screen.test.tsx` — Route assertions
- `apps/mobile/test/smoke/lens-library-screen.test.tsx` — Browse assertions
- `apps/mobile/test/smoke/lens-library-preview.test.tsx` — Install payload assertions
- `apps/mobile/test/smoke/lens-library-catalog.test.ts` — Morning Briefing install-state assertions
- `tests/task-lens-library-metadata.test.js` — Schema/source metadata assertions

**Existing Code to Reference:**
- `features/lens-library/FLOW_VERIFICATION_PLAN.md` — Flow assertions to cover
- `apps/mobile/test/smoke/notes-screen.test.tsx` — Smoke-test structure

**Dependencies:** Task 3.2.B

**Spec Reference:** FLOW_VERIFICATION_PLAN.md > Assertions; FEATURE_TECHNICAL_SPEC.md > Testing Plan

**Browser Verification:**
- Criteria IDs: None
- Notes: Automated mobile smoke tests cover route/payload behavior before emulator verification

---

#### Task 4.1.B: Document and run agent mobile smoke path

**Description:**
Add a concise verification note for the agent-runnable mobile flow, then run the flow when emulator/MCP access is available. Keep evidence from the choice screen, library list, preview, installed lens management view, and editable lens form.

**Requirement:** FLOW_VERIFICATION_PLAN.md > Driver; FLOW_VERIFICATION_PLAN.md > Evidence; FLOW_VERIFICATION_PLAN.md > Teardown / Rerun

**Acceptance Criteria:**
- [ ] (CODE) Feature verification note exists with driver, assertions, evidence, and teardown commands.
  - Verify: `test -f features/lens-library/VERIFICATION_NOTES.md && grep -q "npm run dev:mobile:mcp" features/lens-library/VERIFICATION_NOTES.md && grep -q "Teardown" features/lens-library/VERIFICATION_NOTES.md`
- [ ] (CODE) Verification note includes the exact user flow from Summary `+` through edit form.
  - Verify: `grep -q "Browse Lens Library" features/lens-library/VERIFICATION_NOTES.md && grep -q "Add to My Lenses" features/lens-library/VERIFICATION_NOTES.md && grep -q "lens-form" features/lens-library/VERIFICATION_NOTES.md`
- [ ] (CODE) Verification note records expected evidence artifacts or paths for screenshots/SQL output.
  - Verify: `grep -q "screenshots" features/lens-library/VERIFICATION_NOTES.md && grep -q "source_template_id" features/lens-library/VERIFICATION_NOTES.md`
- [ ] (BROWSER:DOM) Emulator flow shows `Create your own` and `Browse Lens Library` after tapping Summary `+`.
  - Verify: platform=`ios|android`, route=`Summary tab`, selector=`text=Browse Lens Library`, expect=`visible`
- [ ] (BROWSER:DOM) Emulator flow shows installed lens editable in the existing lens form after `Add to My Lenses`.
  - Verify: platform=`ios|android`, route=`Manage Lenses -> Edit installed lens`, selector=`lens-form-screen`, expect=`visible`

**Files to Create:**
- `features/lens-library/VERIFICATION_NOTES.md` — Agent-runnable flow notes and evidence log

**Files to Modify:**
- None

**Existing Code to Reference:**
- `features/lens-library/FLOW_VERIFICATION_PLAN.md` — Required flow driver/assertions/evidence
- `AGENTS.md` — Mobile emulator setup and smoke expectations

**Dependencies:** Task 4.1.A

**Spec Reference:** FLOW_VERIFICATION_PLAN.md > Driver; FLOW_VERIFICATION_PLAN.md > Evidence; FLOW_VERIFICATION_PLAN.md > Teardown / Rerun

**Browser Verification:**
- Criteria IDs: BROWSER:DOM criteria above
- Notes: Use Expo MCP selectors/testIDs where possible; if Expo automation cannot see a booted Android emulator but `adb devices` does, use the root AGENTS.md adb fallback.

---

### Step 4.2: Final Regression Pass

**Depends On:** Step 4.1

---

#### Task 4.2.A: Run final regression and update plan evidence

**Description:**
Run the feature-level verification commands, update completed checkboxes only with direct evidence, and leave unrelated dirty worktree changes untouched. This closes the feature plan with the same evidence-backed convention used for custom lenses.

**Requirement:** FEATURE_TECHNICAL_SPEC.md > Commands; FLOW_VERIFICATION_PLAN.md > Evidence

**Acceptance Criteria:**
- [ ] (TEST) Root tests pass.
  - Verify: `npm run test:root`
- [ ] (TEST) Mobile tests pass.
  - Verify: `npm run test -w @notesbrain/mobile`
- [ ] (TYPE) Shared and mobile typechecks pass.
  - Verify: `npm run typecheck -w @notesbrain/shared && npm run typecheck -w @notesbrain/mobile`
- [ ] (LINT) Mobile lint passes.
  - Verify: `npm run lint -w @notesbrain/mobile`
- [ ] (CODE) `EXECUTION_PLAN.md` completed checkboxes are updated only for criteria with captured command/browser evidence.
  - Verify: `grep -n "\\[x\\]" features/lens-library/EXECUTION_PLAN.md`

**Files to Create:**
- None

**Files to Modify:**
- `features/lens-library/EXECUTION_PLAN.md` — Evidence-backed checkbox updates only
- `features/lens-library/VERIFICATION_NOTES.md` — Final command/browser evidence notes

**Existing Code to Reference:**
- `features/custom-lenses/EXECUTION_PLAN.md` — Evidence-backed closeout style
- `features/lens-library/FLOW_VERIFICATION_PLAN.md` — Required flow evidence

**Dependencies:** Task 4.1.B

**Spec Reference:** FEATURE_TECHNICAL_SPEC.md > Commands; FLOW_VERIFICATION_PLAN.md > Evidence

**Browser Verification:**
- Criteria IDs: None
- Notes: Relies on Task 4.1.B for emulator/browser evidence

---

### Phase 4 Checkpoint

**Automated Checks:**
- [ ] (TEST) Root tests pass.
  - Verify: `npm run test:root`
- [ ] (TEST) Mobile tests pass.
  - Verify: `npm run test -w @notesbrain/mobile`
- [ ] (TYPE) Shared and mobile typechecks pass.
  - Verify: `npm run typecheck -w @notesbrain/shared && npm run typecheck -w @notesbrain/mobile`
- [ ] (LINT) Mobile lint passes.
  - Verify: `npm run lint -w @notesbrain/mobile`

**Regression Verification:**
- [ ] (CODE) Existing custom lens execution path is not coupled to bundled templates.
  - Verify: `! grep -R "lensLibrary" supabase/functions/execute-lens supabase/functions/dispatch-lenses`
- [ ] (CODE) Existing lens edit, pause/resume, run now, and delete controls remain present.
  - Verify: `grep -q "Run Now" 'apps/mobile/app/(app)/lens-manage.tsx' && grep -q "Delete" 'apps/mobile/app/(app)/lens-manage.tsx' && grep -q "Pause" 'apps/mobile/app/(app)/lens-manage.tsx'`
- [ ] (CODE) Library install does not bypass existing max-10-lenses constraint.
  - Verify: `grep -q "Maximum of 10 lenses per user" supabase/migrations/00006_custom_lenses.sql && grep -q "create.mutateAsync" apps/mobile/hooks/useLensLibrary.ts`

**Browser Verification:**
- [ ] (CODE) Agent mobile flow evidence is captured for choice screen, library list, preview, installed lens management view, and edit form.
  - Verify: `grep -q "choice screen" features/lens-library/VERIFICATION_NOTES.md && grep -q "installed lens" features/lens-library/VERIFICATION_NOTES.md`
