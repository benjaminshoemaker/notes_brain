# Execution Plan: Community Lenses

## Overview

| Metric | Value |
|--------|-------|
| Feature | Community Lenses |
| Target Project | notes_brain |
| Total Phases | 5 |
| Total Steps | 8 |
| Total Tasks | 13 |

## Integration Points

| Existing Component | Integration Type | Notes |
|--------------------|------------------|-------|
| `supabase/migrations/00008_lens_library.sql` | extends | Adds community template tables, RPCs, report rows, version snapshots, and guarded community provenance writes. |
| `packages/shared/src/types.ts` | modifies | Adds community template, report, status, install, and version contracts. |
| `packages/shared/src/supabase.ts` | modifies | Mirrors the new migration and RPC signatures in the manually maintained Supabase type file. |
| `apps/mobile/lib/lensLibrary.ts` | extends | Reuses curated template snapshot and install-state helpers for server-backed community templates. |
| `apps/mobile/hooks/useLensLibrary.ts` | modifies | Keeps curated template behavior while separating community data and install paths. |
| `apps/mobile/hooks/useCommunityLenses.ts` | creates | Owns public browse, authored status, publish, unpublish, install, and report RPC access. |
| `apps/mobile/app/(app)/lens-library.tsx` | modifies | Adds Curated and Community library modes, search, category filtering, and community cards. |
| `apps/mobile/app/(app)/lens-library-preview.tsx` | modifies | Supports community preview, install, reporting, and unavailable-template states. |
| `apps/mobile/app/(app)/lens-manage.tsx` | modifies | Adds eligible-lens publish controls, public status, unpublish, and installed-copy blocking. |
| `apps/mobile/app/(app)/community-lens-publish.tsx` | creates | Adds publish review with display-name validation and prompt-public privacy warning. |
| `tests/e2e/backend` and `tests/e2e/mobile` | extends | Adds deterministic backend RPC/RLS coverage and mobile publish-browse-install flow evidence. |

## Phase Dependency Graph

```text
Phase 1: Schema and Shared Contracts
    -> Phase 2: Mobile Data Layer
        -> Phase 3: Publish Management
            -> Phase 4: Community Browse, Install, and Report
                -> Phase 5: Flow Verification and Hardening
```

---

## Phase 1: Schema and Shared Contracts

**Goal:** Create the database security boundary and shared TypeScript contracts needed before mobile work depends on community templates.
**Depends On:** None

### Pre-Phase Setup

- [x] Confirm repository dependencies are installed.
  - Verify: `(cd ../.. && test -d node_modules && npm --version)`
- [x] Confirm execution skills are available from the project checkout.
  - Verify: `(cd ../.. && { test -f .claude/skills/fresh-start/SKILL.md || test -f ~/.claude/skills/fresh-start/SKILL.md || test -f ~/.codex/skills/fresh-start/SKILL.md; })`

### Step 1.1: Community Schema
**Depends On:** None

---

#### Task 1.1.A: Add Community Template Tables, View, and Policies

**Description:**
Create `supabase/migrations/00010_community_lenses.sql` with community template enums, tables, the public browse view, constraints, indexes, grants, and RLS policies. This establishes the public/private data boundary before any client code can browse community templates.

**Requirement:** AC-1, AC-2, AC-7, AC-9, AC-12, AC-16, AC-17, AC-18, AC-20, AC-21

**Acceptance Criteria:**
- [x] (CODE) Migration defines `lens_template_status`, `lens_template_report_reason`, `lens_templates`, `lens_template_versions`, `lens_template_installs`, and `lens_template_reports`.
  - Verify: `(cd ../.. && rg "CREATE TYPE lens_template_status|CREATE TABLE lens_templates|CREATE TABLE lens_template_versions|CREATE TABLE lens_template_installs|CREATE TABLE lens_template_reports" supabase/migrations/00010_community_lenses.sql)`
- [x] (CODE) `community_lens_templates_public` exposes public browse fields and excludes `author_user_id`, `source_lens_id`, reports, installs, and operator-only status values.
  - Verify: `(cd ../.. && node --test tests/task-community-lenses-schema.test.js)`
- [x] (CODE) Display-name, prompt, description, schedule, lookback, status, report-note, and one-active-report constraints are present.
  - Verify: `(cd ../.. && node --test tests/task-community-lenses-schema.test.js)`
- [x] (CODE) RLS is enabled for all new tables and authenticated users can only read public view rows plus their own authored/install/report rows.
  - Verify: `(cd ../.. && node --test tests/task-community-lenses-schema.test.js)`
- [x] (TEST) Existing lens-library migration/static checks still pass with the new migration present.
  - Verify: `(cd ../.. && npm run test:root)`

**Files to Create:**
- `supabase/migrations/00010_community_lenses.sql` - community template schema, view, policies, and grants.
- `tests/task-community-lenses-schema.test.js` - static migration coverage for tables, view privacy, constraints, RLS, and grants.

**Files to Modify:**
- None

**Existing Code to Reference:**
- `supabase/migrations/00008_lens_library.sql` - existing lens provenance columns and style.
- `supabase/migrations/00006_custom_lenses.sql` - lens constraints, RLS style, and schedule field conventions.
- `tests/task-lens-library-metadata.test.js` - root static migration test pattern.

**Dependencies:**
- None

**Spec Reference:** FEATURE_TECHNICAL_SPEC.md Data Model; FEATURE_SPEC.md Data Ownership Model

**Browser Verification:**
- Criteria IDs: None
- Notes: Database-only foundation task.

---

#### Task 1.1.B: Add Publish, Unpublish, Install, Report, and Versioning RPCs

**Description:**
Implement SECURITY DEFINER RPCs and triggers in the community migration. The server must own publish validation, copy-on-install, install counting, report de-duplication, template version snapshots, delist blocking, and protection against direct community provenance spoofing.

**Requirement:** AC-1, AC-2, AC-4, AC-5, AC-6, AC-10, AC-11, AC-12, AC-13, AC-14, AC-15, AC-16, AC-17, AC-18, AC-19, AC-20, AC-21

**Acceptance Criteria:**
- [ ] (CODE) Migration defines `publish_lens_template`, `unpublish_lens_template`, `install_lens_template`, and `report_lens_template` as SECURITY DEFINER functions.
  - Verify: `(cd ../.. && rg "CREATE OR REPLACE FUNCTION (publish_lens_template|unpublish_lens_template|install_lens_template|report_lens_template)|SECURITY DEFINER" supabase/migrations/00010_community_lenses.sql)`
- [ ] (CODE) Publish rejects installed copies, invalid display names, hidden/delisted templates, missing descriptions, non-owned source lenses, and more than 10 newly public templates per user in a trailing 24-hour window.
  - Verify: `(cd ../.. && node --test tests/task-community-lenses-rpcs.test.js)`
- [ ] (CODE) Install copies into `lenses` inside a transaction-local community install guard, records `source_template_id`, `source_template_version`, `installed_from_library_at`, `template_snapshot`, increments `install_count`, rejects author self-installs, and rejects duplicate current installs.
  - Verify: `(cd ../.. && node --test tests/task-community-lenses-rpcs.test.js)`
- [ ] (CODE) Trigger blocks direct `lenses.source_template_id` writes for UUID community template ids outside `install_lens_template` while preserving curated text template ids.
  - Verify: `(cd ../.. && node --test tests/task-community-lenses-rpcs.test.js)`
- [ ] (CODE) Source lens edits create `lens_template_versions` snapshots for versioned fields and skip hidden/delisted templates.
  - Verify: `(cd ../.. && node --test tests/task-community-lenses-rpcs.test.js)`
- [ ] (CODE) `report_lens_template` enforces one active report per reporter/template and returns the existing active report without overwriting reason or note.
  - Verify: `(cd ../.. && node --test tests/task-community-lenses-rpcs.test.js)`

**Files to Create:**
- `tests/task-community-lenses-rpcs.test.js` - static RPC and trigger coverage.

**Files to Modify:**
- `supabase/migrations/00010_community_lenses.sql` - RPCs, triggers, guards, snapshots, and comments.

**Existing Code to Reference:**
- `supabase/migrations/00006_custom_lenses.sql` - trigger/function style for lenses.
- `tests/task-lens-scheduling-authority.test.js` - static checks for migration-owned schedule behavior.

**Dependencies:**
- Task 1.1.A

**Spec Reference:** FEATURE_TECHNICAL_SPEC.md RLS And RPC Design; FEATURE_SPEC.md Preview And Install, Edit Published Lens, Report And Delist

**Browser Verification:**
- Criteria IDs: None
- Notes: Database-only foundation task.

### Step 1.2: Shared Contracts
**Depends On:** Step 1.1

---

#### Task 1.2.A: Add Shared Community Lens Types

**Description:**
Add shared TypeScript types for community template current state, public browse rows, versions, installs, reports, statuses, reasons, and RPC inputs/outputs. Extend the existing lens template snapshot contract so community installs preserve prompt, schedule, lookback, categories, author display, and installed version metadata.

**Requirement:** AC-7, AC-9, AC-10, AC-11, AC-18, AC-20, AC-21

**Acceptance Criteria:**
- [ ] (CODE) Shared exports include community template status, report reason, public template, authored template, version, install, report, and RPC contract types.
  - Verify: `(cd ../.. && rg "CommunityLensTemplate|CommunityLensTemplatePublic|LensTemplateStatus|LensTemplateReportReason|PublishLensTemplate|ReportLensTemplate" packages/shared/src/types.ts packages/shared/src/index.ts)`
- [ ] (CODE) `LensTemplateSnapshot` can represent community installs with prompt, schedule, lookback, category, author display name, and version fields without breaking curated templates.
  - Verify: `(cd ../.. && node --test tests/task-community-lenses-types.test.js)`
- [ ] (CODE) `packages/shared/src/supabase.ts` includes new tables, view, enums, and RPC signatures aligned with the migration.
  - Verify: `(cd ../.. && node --test tests/task-community-lenses-types.test.js)`
- [ ] (TYPE) Shared package typecheck passes.
  - Verify: `(cd ../.. && npm run typecheck -w @notesbrain/shared)`
- [ ] (TEST) Root tests pass after shared contract changes.
  - Verify: `(cd ../.. && npm run test:root)`

**Files to Create:**
- `tests/task-community-lenses-types.test.js` - shared type/export/static contract coverage.

**Files to Modify:**
- `packages/shared/src/types.ts` - community domain types and snapshot extension.
- `packages/shared/src/supabase.ts` - manually maintained Supabase types for new tables/view/RPCs.
- `packages/shared/src/index.ts` - community type exports.

**Existing Code to Reference:**
- `packages/shared/src/types.ts` - existing `Lens`, `LensTemplate`, and `LensTemplateSnapshot` contracts.
- `packages/shared/src/supabase.ts` - existing table/RPC type style.
- `tests/task-lens-library-metadata.test.js` - shared lens-library contract checks.

**Dependencies:**
- Task 1.1.B

**Spec Reference:** FEATURE_TECHNICAL_SPEC.md Shared Type Changes

**Browser Verification:**
- Criteria IDs: None
- Notes: Type and static contract task.

### Phase 1 Checkpoint

**Automated Checks:**
- [ ] Community migration static checks pass.
  - Verify: `(cd ../.. && node --test tests/task-community-lenses-schema.test.js tests/task-community-lenses-rpcs.test.js)`
- [ ] Shared contract checks pass.
  - Verify: `(cd ../.. && node --test tests/task-community-lenses-types.test.js)`
- [ ] Existing root tests pass.
  - Verify: `(cd ../.. && npm run test:root)`
- [ ] Type checking passes for shared contracts.
  - Verify: `(cd ../.. && npm run typecheck -w @notesbrain/shared)`

**Regression Verification:**
- [ ] Curated lens-library metadata tests still pass.
  - Verify: `(cd ../.. && node --test tests/task-lens-library-metadata.test.js)`
- [ ] Existing lens scheduling authority checks still pass.
  - Verify: `(cd ../.. && node --test tests/task-lens-scheduling-authority.test.js)`

---

## Phase 2: Mobile Data Layer

**Goal:** Normalize curated and community templates into reusable mobile data primitives before changing screens.
**Depends On:** Phase 1

### Pre-Phase Setup

- [ ] Read the Warm Ink design tokens before touching mobile UI files.
  - Verify: `(cd ../.. && test -f apps/mobile/lib/theme.ts && rg "colors|radii|shadows" apps/mobile/lib/theme.ts)`
- [ ] Confirm mobile tests run in the workspace.
  - Verify: `(cd ../.. && npm run test -w @notesbrain/mobile)`

### Step 2.1: Template Helpers and Hooks
**Depends On:** Phase 1

---

#### Task 2.1.A: Refactor Lens Library Helpers for Community Templates

**Description:**
Extend `apps/mobile/lib/lensLibrary.ts` so curated and community templates share UI-facing conversion, install-state, and snapshot behavior. Keep bundled curated templates working while adding a `communityTemplateToLensTemplate` conversion path for Supabase public view rows.

**Requirement:** AC-7, AC-9, AC-10, AC-11, AC-20, AC-21

**Acceptance Criteria:**
- [ ] (CODE) `communityTemplateToLensTemplate` converts public community rows into the existing UI-facing template shape without exposing internal ids.
  - Verify: `(cd ../.. && rg "communityTemplateToLensTemplate" apps/mobile/lib/lensLibrary.ts apps/mobile/test/smoke/lens-library-community-helpers.test.ts)`
- [ ] (TEST) Helper tests cover community snapshot fields, install state from `source_template_id`, installed-version matching, and curated template regressions.
  - Verify: `(cd ../.. && npm run test -w @notesbrain/mobile -- apps/mobile/test/smoke/lens-library-community-helpers.test.ts apps/mobile/test/smoke/lens-library-catalog.test.ts)`
- [ ] (CODE) Community snapshots include prompt, schedule fields, lookback, categories, category, author display name, template id, and version.
  - Verify: `(cd ../.. && npm run test -w @notesbrain/mobile -- apps/mobile/test/smoke/lens-library-community-helpers.test.ts)`
- [ ] (TYPE) Mobile typecheck passes after helper changes.
  - Verify: `(cd ../.. && npm run typecheck -w @notesbrain/mobile)`

**Files to Create:**
- `apps/mobile/test/smoke/lens-library-community-helpers.test.ts` - community helper and regression coverage.

**Files to Modify:**
- `apps/mobile/lib/lensLibrary.ts` - conversion, snapshot, and install-state helpers.

**Existing Code to Reference:**
- `apps/mobile/lib/lensLibrary.ts` - curated template helpers.
- `apps/mobile/test/smoke/lens-library-catalog.test.ts` - existing helper test style.

**Dependencies:**
- Task 1.2.A

**Spec Reference:** FEATURE_TECHNICAL_SPEC.md Mobile Implementation Plan; FEATURE_SPEC.md Preview And Install

**Browser Verification:**
- Criteria IDs: None
- Notes: Mobile helper task.

---

#### Task 2.1.B: Add `useCommunityLenses` and Preserve Curated Hook Behavior

**Description:**
Create a dedicated React Query hook for community templates and mutations while leaving `useLensLibrary` responsible for curated library behavior. The hook should fetch public templates from the public view, fetch authored template status from `lens_templates`, expose search/filter/sort state, and call publish/unpublish/install/report RPCs with query invalidation.

**Requirement:** AC-1, AC-5, AC-7, AC-8, AC-9, AC-10, AC-14, AC-16, AC-18

**Acceptance Criteria:**
- [ ] (CODE) `useCommunityLenses` queries `community_lens_templates_public` with most-installed sorting and an explicit 100-row limit.
  - Verify: `(cd ../.. && rg "community_lens_templates_public|install_count|limit\\(100\\)" apps/mobile/hooks/useCommunityLenses.ts)`
- [ ] (CODE) Hook exposes publish, unpublish, install, and report mutations through Supabase RPC calls, not direct table writes.
  - Verify: `(cd ../.. && rg "rpc\\('(publish_lens_template|unpublish_lens_template|install_lens_template|report_lens_template)'" apps/mobile/hooks/useCommunityLenses.ts)`
- [ ] (TEST) Hook tests cover search, category filtering, install-state derivation, mutation invalidation, duplicate report result handling, and unavailable template errors.
  - Verify: `(cd ../.. && npm run test -w @notesbrain/mobile -- apps/mobile/test/smoke/use-community-lenses.test.ts)`
- [ ] (TEST) Existing curated hook and screen smoke tests still pass.
  - Verify: `(cd ../.. && npm run test -w @notesbrain/mobile -- apps/mobile/test/smoke/lens-library-screen.test.tsx apps/mobile/test/smoke/lens-library-preview.test.tsx)`
- [ ] (TYPE) Mobile typecheck passes after hook changes.
  - Verify: `(cd ../.. && npm run typecheck -w @notesbrain/mobile)`

**Files to Create:**
- `apps/mobile/hooks/useCommunityLenses.ts` - community query and mutation hook.
- `apps/mobile/test/smoke/use-community-lenses.test.ts` - hook behavior tests.

**Files to Modify:**
- `apps/mobile/hooks/useLensLibrary.ts` - keep curated concerns isolated and share helper contracts where needed.

**Existing Code to Reference:**
- `apps/mobile/hooks/useLensLibrary.ts` - React Query and installed-lens join pattern.
- `apps/mobile/hooks/useLenses.ts` - mutation invalidation and Supabase error handling pattern.
- `apps/mobile/test/smoke/realtime-notes.test.ts` - hook test mocking pattern.

**Dependencies:**
- Task 2.1.A

**Spec Reference:** FEATURE_TECHNICAL_SPEC.md Mobile Implementation Plan; FEATURE_SPEC.md Browse Community Lenses

**Browser Verification:**
- Criteria IDs: None
- Notes: Hook task.

### Phase 2 Checkpoint

**Automated Checks:**
- [ ] Community helper and hook tests pass.
  - Verify: `(cd ../.. && npm run test -w @notesbrain/mobile -- apps/mobile/test/smoke/lens-library-community-helpers.test.ts apps/mobile/test/smoke/use-community-lenses.test.ts)`
- [ ] Curated library smoke tests still pass.
  - Verify: `(cd ../.. && npm run test -w @notesbrain/mobile -- apps/mobile/test/smoke/lens-library-screen.test.tsx apps/mobile/test/smoke/lens-library-preview.test.tsx apps/mobile/test/smoke/lens-library-catalog.test.ts)`
- [ ] Mobile typecheck passes.
  - Verify: `(cd ../.. && npm run typecheck -w @notesbrain/mobile)`

**Regression Verification:**
- [ ] Existing curated install input creation remains unchanged for bundled templates.
  - Verify: `(cd ../.. && npm run test -w @notesbrain/mobile -- apps/mobile/test/smoke/lens-library-catalog.test.ts)`

---

## Phase 3: Publish Management

**Goal:** Let authors publish and unpublish eligible personal lenses from lens management with validation, privacy warning, status visibility, and installed-copy blocking.
**Depends On:** Phase 2

### Pre-Phase Setup

- [ ] Confirm mobile routes can import theme tokens and test ids.
  - Verify: `(cd ../.. && rg "export const testIds|colors|radii|shadows" apps/mobile/lib/testIds.ts apps/mobile/lib/theme.ts)`
- [ ] Confirm lens management smoke test baseline exists.
  - Verify: `(cd ../.. && test -f apps/mobile/test/smoke/lens-create-screen.test.tsx && test -f apps/mobile/app/'(app)'/lens-manage.tsx)`

### Step 3.1: Author Controls and Review
**Depends On:** Phase 2

---

#### Task 3.1.A: Add Publish Review Route and Validation

**Description:**
Add `community-lens-publish.tsx` as the required review screen before making a lens public. The screen shows the lens fields that become public, validates author display name and description, displays the prompt-public privacy warning, and calls `publish_lens_template` only after confirmation.

**Requirement:** AC-1, AC-2, AC-3, AC-5, AC-6, AC-18, AC-20, AC-21, AC-22, AC-23

**Acceptance Criteria:**
- [ ] (CODE) New route renders lens name, description input, prompt, cadence, lookback, category filters, author display name, and prompt-public warning text.
  - Verify: `(cd ../.. && rg "community-lens-publish|author display|prompt|notes, generated results|publish_lens_template" apps/mobile/app/'(app)'/community-lens-publish.tsx)`
- [ ] (TEST) Publish review tests cover valid publish, blank/short/email/reserved display-name rejection, missing description rejection, and mutation error messaging.
  - Verify: `(cd ../.. && npm run test -w @notesbrain/mobile -- apps/mobile/test/smoke/community-lens-publish-screen.test.tsx)`
- [ ] (TEST) Accessibility tests cover labels for display name, description, confirmation, cancel, and visible privacy warning text.
  - Verify: `(cd ../.. && npm run test -w @notesbrain/mobile -- apps/mobile/test/smoke/community-lens-publish-screen.test.tsx)`
- [ ] (CODE) Test IDs exist for publish review controls and confirmation state.
  - Verify: `(cd ../.. && rg "communityLensPublish" apps/mobile/lib/testIds.ts)`
- [ ] (TYPE) Mobile typecheck passes after route changes.
  - Verify: `(cd ../.. && npm run typecheck -w @notesbrain/mobile)`

**Files to Create:**
- `apps/mobile/app/(app)/community-lens-publish.tsx` - publish review route.
- `apps/mobile/test/smoke/community-lens-publish-screen.test.tsx` - validation, mutation, and accessibility tests.

**Files to Modify:**
- `apps/mobile/lib/testIds.ts` - publish review selectors.
- `apps/mobile/app/(app)/_layout.tsx` - route registration if required by current Expo Router layout.

**Existing Code to Reference:**
- `apps/mobile/app/(app)/lens-create.tsx` and `apps/mobile/app/(app)/lens-form.tsx` - existing lens field display and validation patterns.
- `apps/mobile/lib/theme.ts` - Warm Ink tokens.
- `apps/mobile/test/smoke/lens-create-screen.test.tsx` - screen smoke test style.

**Dependencies:**
- Task 2.1.B

**Spec Reference:** FEATURE_SPEC.md Publish From Lens Management; FEATURE_SPEC.md Required Author Display Name; FEATURE_TECHNICAL_SPEC.md Mobile Implementation Plan

**Browser Verification:**
- Criteria IDs: None
- Notes: React Native smoke tests cover objective screen behavior; mobile E2E verifies the full route in Phase 5.

---

#### Task 3.1.B: Add Publish, Status, and Unpublish Controls to Lens Management

**Description:**
Update lens management so only user-owned lenses with `source_template_id IS NULL` can start publishing. Installed curated/community copies must show provenance but no publish control, authored public lenses must show current public/unpublished/hidden/delisted status, and authors can unpublish public templates without deleting source lenses or installed copies.

**Requirement:** AC-1, AC-2, AC-4, AC-5, AC-13, AC-14, AC-15, AC-17, AC-18, AC-19, AC-22

**Acceptance Criteria:**
- [ ] (CODE) Eligible personal lenses navigate to publish review; installed copies with any `source_template_id` do not render a publish control.
  - Verify: `(cd ../.. && npm run test -w @notesbrain/mobile -- apps/mobile/test/smoke/lens-manage-community.test.tsx)`
- [ ] (CODE) Public and unpublished authored lenses show text-visible status, while hidden/delisted templates render as not public and expose no republish control.
  - Verify: `(cd ../.. && npm run test -w @notesbrain/mobile -- apps/mobile/test/smoke/lens-manage-community.test.tsx)`
- [ ] (CODE) Unpublish calls `unpublish_lens_template` and leaves existing delete/edit/pause/run controls intact.
  - Verify: `(cd ../.. && rg "unpublish_lens_template|source_template_id|community" apps/mobile/app/'(app)'/lens-manage.tsx)`
- [ ] (TEST) Lens management tests cover publish eligibility, installed-copy blocking, public status display, hidden/delisted blocking, unpublish confirmation, and existing action regressions.
  - Verify: `(cd ../.. && npm run test -w @notesbrain/mobile -- apps/mobile/test/smoke/lens-manage-community.test.tsx apps/mobile/test/smoke/lens-create-screen.test.tsx)`
- [ ] (TEST) Accessibility checks cover publish/unpublish labels, status text, disabled state, and minimum touch-target style for main controls.
  - Verify: `(cd ../.. && npm run test -w @notesbrain/mobile -- apps/mobile/test/smoke/lens-manage-community.test.tsx)`

**Files to Create:**
- `apps/mobile/test/smoke/lens-manage-community.test.tsx` - lens-management community behavior and accessibility tests.

**Files to Modify:**
- `apps/mobile/app/(app)/lens-manage.tsx` - publish controls, status display, unpublish action, installed-copy blocking.
- `apps/mobile/lib/testIds.ts` - management selectors for publish, status, unpublish.

**Existing Code to Reference:**
- `apps/mobile/app/(app)/lens-manage.tsx` - existing lens action row and Alert patterns.
- `apps/mobile/hooks/useLenses.ts` - current lens CRUD hooks.
- `apps/mobile/lib/theme.ts` - tokens for status and control styling.

**Dependencies:**
- Task 3.1.A

**Spec Reference:** FEATURE_SPEC.md Publish From Lens Management; FEATURE_SPEC.md Unpublish; FEATURE_SPEC.md Report And Delist

**Browser Verification:**
- Criteria IDs: None
- Notes: React Native smoke tests cover objective screen behavior; mobile E2E verifies the full flow in Phase 5.

### Phase 3 Checkpoint

**Automated Checks:**
- [ ] Publish review screen tests pass.
  - Verify: `(cd ../.. && npm run test -w @notesbrain/mobile -- apps/mobile/test/smoke/community-lens-publish-screen.test.tsx)`
- [ ] Lens management community tests pass.
  - Verify: `(cd ../.. && npm run test -w @notesbrain/mobile -- apps/mobile/test/smoke/lens-manage-community.test.tsx)`
- [ ] Mobile typecheck passes.
  - Verify: `(cd ../.. && npm run typecheck -w @notesbrain/mobile)`

**Regression Verification:**
- [ ] Existing lens create/manage behavior remains covered by current smoke tests.
  - Verify: `(cd ../.. && npm run test -w @notesbrain/mobile -- apps/mobile/test/smoke/lens-create-screen.test.tsx)`

---

## Phase 4: Community Browse, Install, and Report

**Goal:** Add the Community Lens Library browsing, preview, install, report, and unavailable-template behaviors for signed-in mobile users.
**Depends On:** Phase 3

### Pre-Phase Setup

- [ ] Confirm current Lens Library screen and preview tests exist.
  - Verify: `(cd ../.. && test -f apps/mobile/test/smoke/lens-library-screen.test.tsx && test -f apps/mobile/test/smoke/lens-library-preview.test.tsx)`
- [ ] Confirm community hook from Phase 2 is available.
  - Verify: `(cd ../.. && test -f apps/mobile/hooks/useCommunityLenses.ts)`

### Step 4.1: Browse and Preview
**Depends On:** Phase 3

---

#### Task 4.1.A: Add Community Tab, Search, Filter, Sort, and Install State

**Description:**
Update the Lens Library screen to include a Curated/Community segmented control. The Community mode lists public templates with author display, category, cadence, install count, installed state, search, category filtering, and default most-installed ordering without leaderboard language.

**Requirement:** AC-7, AC-8, AC-9, AC-16, AC-18, AC-20, AC-21, AC-22

**Acceptance Criteria:**
- [ ] (CODE) Lens Library screen renders Curated and Community modes and fetches community data through `useCommunityLenses`.
  - Verify: `(cd ../.. && rg "Community|Curated|useCommunityLenses" apps/mobile/app/'(app)'/lens-library.tsx)`
- [ ] (TEST) Community list tests cover public template metadata, author display name, install count, installed state, search by text, category filter, empty state, and error state.
  - Verify: `(cd ../.. && npm run test -w @notesbrain/mobile -- apps/mobile/test/smoke/lens-library-community-screen.test.tsx)`
- [ ] (TEST) Tests assert MVP copy avoids leaderboard/trending/top-creator wording.
  - Verify: `(cd ../.. && npm run test -w @notesbrain/mobile -- apps/mobile/test/smoke/lens-library-community-screen.test.tsx)`
- [ ] (TEST) Accessibility tests cover segmented control labels, search label, category filter selected state, and card navigation labels.
  - Verify: `(cd ../.. && npm run test -w @notesbrain/mobile -- apps/mobile/test/smoke/lens-library-community-screen.test.tsx)`
- [ ] (TEST) Existing curated Lens Library screen smoke test still passes.
  - Verify: `(cd ../.. && npm run test -w @notesbrain/mobile -- apps/mobile/test/smoke/lens-library-screen.test.tsx)`

**Files to Create:**
- `apps/mobile/test/smoke/lens-library-community-screen.test.tsx` - Community tab list, search/filter, copy, and accessibility coverage.

**Files to Modify:**
- `apps/mobile/app/(app)/lens-library.tsx` - Community mode UI, search/filter, cards, and navigation.
- `apps/mobile/lib/testIds.ts` - Community list selectors.

**Existing Code to Reference:**
- `apps/mobile/app/(app)/lens-library.tsx` - existing curated list UI and card patterns.
- `apps/mobile/lib/theme.ts` - Warm Ink styling tokens.
- `apps/mobile/test/smoke/lens-library-screen.test.tsx` - screen test style.

**Dependencies:**
- Task 3.1.B

**Spec Reference:** FEATURE_SPEC.md Browse Community Lenses; FEATURE_TECHNICAL_SPEC.md Mobile Implementation Plan

**Browser Verification:**
- Criteria IDs: None
- Notes: React Native smoke tests cover objective screen behavior; mobile E2E verifies the full flow in Phase 5.

---

#### Task 4.1.B: Add Community Preview, Install, Report, and Unavailable States

**Description:**
Update the preview screen so community templates show all public template details, install through `install_lens_template`, show confirmation and installed state, support reports, and handle hidden/delisted or stale-template errors without exposing internal ids.

**Requirement:** AC-9, AC-10, AC-11, AC-12, AC-15, AC-16, AC-17, AC-18, AC-20, AC-21, AC-22, AC-23

**Acceptance Criteria:**
- [ ] (CODE) Preview supports a community source parameter and loads community templates from public data, not raw `lens_templates`.
  - Verify: `(cd ../.. && rg "source|community|community_lens_templates_public|install_lens_template" apps/mobile/app/'(app)'/lens-library-preview.tsx)`
- [ ] (TEST) Preview tests cover public metadata, prompt display, schedule/lookback/category display, install confirmation, duplicate installed state, and hidden/delisted unavailable state.
  - Verify: `(cd ../.. && npm run test -w @notesbrain/mobile -- apps/mobile/test/smoke/lens-library-community-preview.test.tsx)`
- [ ] (TEST) Report tests cover reason picker values, optional note limit, confirmation, duplicate active report response, and author-hidden reporter identity copy.
  - Verify: `(cd ../.. && npm run test -w @notesbrain/mobile -- apps/mobile/test/smoke/lens-library-community-preview.test.tsx)`
- [ ] (TEST) Accessibility tests cover install, report, reason, note, confirmation, and unavailable-state labels.
  - Verify: `(cd ../.. && npm run test -w @notesbrain/mobile -- apps/mobile/test/smoke/lens-library-community-preview.test.tsx)`
- [ ] (TEST) Existing curated preview smoke test still passes.
  - Verify: `(cd ../.. && npm run test -w @notesbrain/mobile -- apps/mobile/test/smoke/lens-library-preview.test.tsx)`

**Files to Create:**
- `apps/mobile/test/smoke/lens-library-community-preview.test.tsx` - community preview, install, report, unavailable, and accessibility coverage.

**Files to Modify:**
- `apps/mobile/app/(app)/lens-library-preview.tsx` - community preview branch, install RPC, report UI, error states.
- `apps/mobile/lib/testIds.ts` - preview install/report selectors.

**Existing Code to Reference:**
- `apps/mobile/app/(app)/lens-library-preview.tsx` - curated preview and install UI.
- `apps/mobile/hooks/useCommunityLenses.ts` - community mutation hook.
- `apps/mobile/test/smoke/lens-library-preview.test.tsx` - existing preview coverage.

**Dependencies:**
- Task 4.1.A

**Spec Reference:** FEATURE_SPEC.md Preview And Install; FEATURE_SPEC.md Report And Delist; FEATURE_TECHNICAL_SPEC.md Mobile Implementation Plan

**Browser Verification:**
- Criteria IDs: None
- Notes: React Native smoke tests cover objective screen behavior; mobile E2E verifies the full flow in Phase 5.

### Phase 4 Checkpoint

**Automated Checks:**
- [ ] Community browse and preview screen tests pass.
  - Verify: `(cd ../.. && npm run test -w @notesbrain/mobile -- apps/mobile/test/smoke/lens-library-community-screen.test.tsx apps/mobile/test/smoke/lens-library-community-preview.test.tsx)`
- [ ] Curated Lens Library regression tests pass.
  - Verify: `(cd ../.. && npm run test -w @notesbrain/mobile -- apps/mobile/test/smoke/lens-library-screen.test.tsx apps/mobile/test/smoke/lens-library-preview.test.tsx apps/mobile/test/smoke/lens-library-catalog.test.ts)`
- [ ] Mobile typecheck and lint pass.
  - Verify: `(cd ../.. && npm run typecheck -w @notesbrain/mobile && npm run lint -w @notesbrain/mobile)`

**Regression Verification:**
- [ ] Community UI does not expose `author_user_id`, `source_lens_id`, report rows, installer identities, notes, generated results, or run history.
  - Verify: `(cd ../.. && npm run test -w @notesbrain/mobile -- apps/mobile/test/smoke/lens-library-community-screen.test.tsx apps/mobile/test/smoke/lens-library-community-preview.test.tsx)`

---

## Phase 5: Flow Verification and Hardening

**Goal:** Prove the server security model and mobile author-to-installer flow with rerunnable fixtures, evidence artifacts, and full regression gates.
**Depends On:** Phase 4

### Pre-Phase Setup

- [ ] Export E2E Supabase environment variables for backend and mobile flow tests.
  - Verify: `(cd ../.. && test -n "$E2E_SUPABASE_URL" && test -n "$E2E_SUPABASE_ANON_KEY" && { test -n "$E2E_SUPABASE_SECRET_KEY" || test -n "$E2E_SUPABASE_SERVICE_ROLE_KEY"; })`
- [ ] Confirm local Supabase has the community migration available.
  - Verify: `(cd ../.. && test -f supabase/migrations/00010_community_lenses.sql)`
- [ ] Confirm mobile E2E runner exists.
  - Verify: `(cd ../.. && test -f scripts/e2e/run-mobile-detox.mjs && test -f tests/e2e/mobile/detox.config.cjs)`

### Step 5.1: Backend E2E
**Depends On:** Phase 4

---

#### Task 5.1.A: Add Backend Community Lens E2E Coverage

**Description:**
Add a backend E2E test that runs against Supabase with author and installer users. It should verify publish, public-view privacy, install copy semantics, versioning, unpublish/delist blocking, report de-duplication, and direct provenance spoof rejection through actual database behavior.

**Requirement:** AC-1 through AC-23

**Acceptance Criteria:**
- [ ] (TEST) Backend E2E publishes an author-owned lens, rejects installed-copy publishing, validates display-name/description rules, and enforces the 10 newly public templates per trailing 24-hour publish limit.
  - Verify: `(cd ../.. && node --test tests/e2e/backend/community-lenses.e2e.test.mjs)`
- [ ] (TEST) Backend E2E verifies a different signed-in user can read the template through `community_lens_templates_public` without internal ids.
  - Verify: `(cd ../.. && node --test tests/e2e/backend/community-lenses.e2e.test.mjs)`
- [ ] (TEST) Backend E2E verifies install creates a copied installer-owned `lenses` row with provenance and snapshot metadata, increments `install_count`, rejects author self-installs, rejects duplicate current installs, and does not expose author notes/results/run history.
  - Verify: `(cd ../.. && node --test tests/e2e/backend/community-lenses.e2e.test.mjs)`
- [ ] (TEST) Backend E2E verifies source edits create new versions and existing installed copies remain unchanged.
  - Verify: `(cd ../.. && node --test tests/e2e/backend/community-lenses.e2e.test.mjs)`
- [ ] (TEST) Backend E2E verifies hidden/delisted templates disappear from public browse, cannot be installed, cannot be republished by the author path, and direct `lenses` provenance spoofing is rejected.
  - Verify: `(cd ../.. && node --test tests/e2e/backend/community-lenses.e2e.test.mjs)`
- [ ] (TEST) Backend E2E verifies reports store required fields and duplicate active reports return the existing report without changing reason or note.
  - Verify: `(cd ../.. && node --test tests/e2e/backend/community-lenses.e2e.test.mjs)`

**Files to Create:**
- `tests/e2e/backend/community-lenses.e2e.test.mjs` - backend RPC/RLS/security E2E.

**Files to Modify:**
- `tests/e2e/utils/e2eData.mjs` - shared user/lens cleanup helpers if needed.
- `tests/e2e/README.md` - community-lenses E2E notes if new env or local Supabase steps are required.

**Existing Code to Reference:**
- `tests/e2e/backend/notes-and-settings.e2e.test.mjs` - authenticated Supabase E2E pattern.
- `tests/e2e/utils/e2eSupabase.mjs` - admin/anon client helpers.
- `tests/e2e/utils/e2eData.mjs` - cleanup and seeded user helpers.

**Dependencies:**
- Task 4.1.B

**Spec Reference:** FLOW_VERIFICATION_PLAN.md Assertions; FEATURE_TECHNICAL_SPEC.md Verification Plan

**Browser Verification:**
- Criteria IDs: None
- Notes: Backend E2E task.

### Step 5.2: Mobile Flow Harness and Evidence
**Depends On:** Step 5.1

---

#### Task 5.2.A: Add Seed Script and Mobile Flow Spec

**Description:**
Add a rerunnable seed script and mobile E2E flow for the author-to-installer journey. The flow must seed two users, prove installed-copy publishing is blocked, publish an eligible lens, sign in as installer, browse Community, preview, install a copied lens, and preserve the installed copy after unpublish or delist.

**Requirement:** AC-1 through AC-23

**Acceptance Criteria:**
- [ ] (CODE) Seed script cleans reports, installs, templates, lens results, lenses, and users scoped to the run/test users, then seeds an author-owned lens and an installed-copy lens.
  - Verify: `(cd ../.. && rg "seed-community-lenses-flow|lens_template_reports|lens_template_installs|lens_templates|lens_results|lenses" scripts/e2e/seed-community-lenses-flow.mjs)`
- [ ] (TEST) Mobile E2E author path verifies installed-copy publish blocking, publish review fields, prompt-public warning, valid display-name/description entry, confirm publish, and Public status in lens management.
  - Verify: `(cd ../.. && npm run test:e2e:mobile -- tests/e2e/mobile/specs/community-lenses.e2e.js)`
- [ ] (TEST) Mobile E2E installer path verifies Community tab, search/filter, preview metadata, prompt/schedule/lookback/category/install count, Add to My Lenses, and copied lens in Manage Lenses.
  - Verify: `(cd ../.. && npm run test:e2e:mobile -- tests/e2e/mobile/specs/community-lenses.e2e.js)`
- [ ] (TEST) Mobile E2E post-install path verifies unpublish/delist removes the template from Community and the installer-owned copied lens remains present.
  - Verify: `(cd ../.. && npm run test:e2e:mobile -- tests/e2e/mobile/specs/community-lenses.e2e.js)`
- [ ] (CODE) Mobile E2E uses stable `testID` selectors from `apps/mobile/lib/testIds.ts`, not brittle visible-text-only selectors.
  - Verify: `(cd ../.. && rg "communityLens|by.id|testIds" tests/e2e/mobile/specs/community-lenses.e2e.js tests/e2e/mobile/support/mobileFlows.cjs apps/mobile/lib/testIds.ts)`

**Files to Create:**
- `scripts/e2e/seed-community-lenses-flow.mjs` - deterministic author/installer seed and cleanup.
- `tests/e2e/mobile/specs/community-lenses.e2e.js` - mobile publish/browse/install/stability flow.

**Files to Modify:**
- `tests/e2e/mobile/support/e2eData.cjs` - seed data helpers if needed.
- `tests/e2e/mobile/support/mobileFlows.cjs` - reusable sign-in/navigation helpers if needed.
- `tests/e2e/mobile/README.md` - community-lenses flow run notes.

**Existing Code to Reference:**
- `scripts/e2e/seed-editable-notes-flow.mjs` - rerunnable seed script style.
- `tests/e2e/mobile/specs/auth-and-tabs.e2e.js` - Detox flow style.
- `tests/e2e/mobile/support/mobileFlows.cjs` - existing mobile helper methods.

**Dependencies:**
- Task 5.1.A

**Spec Reference:** FLOW_VERIFICATION_PLAN.md Harness Shape, Setup And State, Driver, Teardown And Rerun

**Browser Verification:**
- Criteria IDs: None
- Notes: Mobile E2E uses Detox/Expo dev-client rather than browser MCP.

---

#### Task 5.2.B: Capture Flow Evidence Artifacts

**Description:**
Persist evidence for the feature claim under `artifacts/community-lenses/end-to-end/`. Evidence should include mobile snapshots/screenshots, backend E2E output, and JSON snapshots of the public template, versions, installs, report, and installer copied lens.

**Requirement:** AC-7, AC-9, AC-10, AC-11, AC-12, AC-15, AC-17, AC-18, AC-20, AC-21

**Acceptance Criteria:**
- [ ] (CODE) Artifact directory creation and retention are wired into the mobile flow or seed/evidence script.
  - Verify: `(cd ../.. && rg "artifacts/community-lenses/end-to-end" scripts/e2e tests/e2e/mobile/specs/community-lenses.e2e.js)`
- [ ] (TEST) Evidence run writes backend output and JSON snapshots for `lens_templates`, `lens_template_versions`, `lens_template_installs`, `lens_template_reports`, and installer copied `lenses` row.
  - Verify: `(cd ../.. && node --test tests/e2e/backend/community-lenses.e2e.test.mjs && find artifacts/community-lenses/end-to-end -type f | rg "backend|lens_templates|lens_template_versions|lens_template_installs|lens_template_reports|installer_lens")`
- [ ] (TEST) Mobile evidence includes snapshots or screenshots for publish review, Community listing, community preview, installed copy, and post-unpublish/delist Community state.
  - Verify: `(cd ../.. && npm run test:e2e:mobile -- tests/e2e/mobile/specs/community-lenses.e2e.js && find artifacts/community-lenses/end-to-end -type f | rg "publish-review|community-listing|community-preview|installed-copy|post-unpublish")`
- [ ] (CODE) Failed runs preserve artifacts rather than broad-truncating the artifact directory.
  - Verify: `(cd ../.. && rg "runId|failed|artifacts/community-lenses/end-to-end" scripts/e2e/seed-community-lenses-flow.mjs tests/e2e/mobile/specs/community-lenses.e2e.js)`

**Files to Create:**
- `artifacts/community-lenses/end-to-end/.gitkeep` - artifact directory placeholder if the repo tracks empty artifact dirs.

**Files to Modify:**
- `scripts/e2e/seed-community-lenses-flow.mjs` - JSON snapshot support if colocated there.
- `tests/e2e/backend/community-lenses.e2e.test.mjs` - backend output/snapshot writes.
- `tests/e2e/mobile/specs/community-lenses.e2e.js` - mobile snapshot/screenshot writes.

**Existing Code to Reference:**
- `tests/e2e/mobile/editable-notes-flow.md` - prior flow evidence conventions.
- `scripts/e2e/seed-editable-notes-flow.mjs` - run-id and cleanup conventions.

**Dependencies:**
- Task 5.2.A

**Spec Reference:** FLOW_VERIFICATION_PLAN.md Evidence

**Browser Verification:**
- Criteria IDs: None
- Notes: Mobile and backend artifact verification.

### Step 5.3: Final Regression
**Depends On:** Step 5.2

---

#### Task 5.3.A: Run Final Regression Gates and Record Feature Closeout

**Description:**
Run the full verification suite that is practical for this branch and record the exact commands and artifact paths in the execution plan. This task closes the implementation only after root tests, mobile tests, E2E coverage, typecheck, lint, and build are either passing or have a documented external-environment blocker.

**Requirement:** AC-1 through AC-23

**Acceptance Criteria:**
- [ ] (TEST) Root and mobile tests pass.
  - Verify: `(cd ../.. && npm run test)`
- [ ] (TYPE) Typecheck passes across workspaces.
  - Verify: `(cd ../.. && npm run typecheck)`
- [ ] (LINT) Lint passes across workspaces.
  - Verify: `(cd ../.. && npm run lint)`
- [ ] (BUILD) Build passes across workspaces.
  - Verify: `(cd ../.. && npm run build)`
- [ ] (TEST) Backend community E2E passes.
  - Verify: `(cd ../.. && node --test tests/e2e/backend/community-lenses.e2e.test.mjs)`
- [ ] (TEST) Mobile community E2E passes or records an objective emulator/device blocker with the last command output and preserved artifacts.
  - Verify: `(cd ../.. && npm run test:e2e:mobile -- tests/e2e/mobile/specs/community-lenses.e2e.js)`

**Files to Create:**
- None

**Files to Modify:**
- `features/community-lenses/EXECUTION_PLAN.md` - mark completed checkboxes as each task passes.
- `features/community-lenses/FLOW_VERIFICATION_PLAN.md` - append implementation evidence paths only if the project convention allows evidence notes in the plan.
- `TODOS.md` - only for discovered out-of-scope follow-up items approved for tracking.

**Existing Code to Reference:**
- `tests/e2e/README.md` - E2E env requirements.
- `AGENTS.md` - project verification and follow-up item rules.

**Dependencies:**
- Task 5.2.B

**Spec Reference:** FEATURE_SPEC.md Acceptance Criteria; FEATURE_TECHNICAL_SPEC.md Verification Plan; FLOW_VERIFICATION_PLAN.md Evidence

**Browser Verification:**
- Criteria IDs: None
- Notes: Final verification uses repository test, E2E, and artifact commands.

### Phase 5 Checkpoint

**Automated Checks:**
- [ ] Full test suite passes.
  - Verify: `(cd ../.. && npm run test)`
- [ ] Full typecheck passes.
  - Verify: `(cd ../.. && npm run typecheck)`
- [ ] Full lint passes.
  - Verify: `(cd ../.. && npm run lint)`
- [ ] Full build passes.
  - Verify: `(cd ../.. && npm run build)`
- [ ] Community backend E2E passes.
  - Verify: `(cd ../.. && node --test tests/e2e/backend/community-lenses.e2e.test.mjs)`
- [ ] Community mobile E2E passes.
  - Verify: `(cd ../.. && npm run test:e2e:mobile -- tests/e2e/mobile/specs/community-lenses.e2e.js)`

**Regression Verification:**
- [ ] Existing curated Lens Library install flow remains functional.
  - Verify: `(cd ../.. && npm run test -w @notesbrain/mobile -- apps/mobile/test/smoke/lens-library-screen.test.tsx apps/mobile/test/smoke/lens-library-preview.test.tsx apps/mobile/test/smoke/lens-library-catalog.test.ts)`
- [ ] Existing custom lens create/manage flow remains functional.
  - Verify: `(cd ../.. && npm run test -w @notesbrain/mobile -- apps/mobile/test/smoke/lens-create-screen.test.tsx)`
- [ ] Existing backend E2E tests still pass.
  - Verify: `(cd ../.. && npm run test:e2e:backend)`
