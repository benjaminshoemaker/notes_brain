# Feature Technical Spec: Lens Library

**Feature:** Lens Library
**Date:** 2026-05-09
**Status:** Draft
**Upstream:** [FEATURE_SPEC.md](./FEATURE_SPEC.md)

---

## Existing Code Analysis

### Similar Functionality Audit

SIMILAR FUNCTIONALITY FOUND
---------------------------

- `apps/mobile/app/(app)/summary.tsx`: Current Summary tab entry point. It owns the header `+` action, empty state CTA, and result feed.
- `apps/mobile/app/(app)/lens-form.tsx`: Existing create/edit form for user-owned lenses. It already validates prompt length, schedule, categories, and lookback window.
- `apps/mobile/app/(app)/lens-manage.tsx`: Existing lens management list with edit, pause/resume, run now, and delete actions.
- `apps/mobile/hooks/useLenses.ts`: Existing React Query CRUD layer for the `lenses` table. This should be extended for template installs instead of creating a parallel persistence path.
- `packages/shared/src/types.ts` and `packages/shared/src/supabase.ts`: Shared lens types and generated-style database shape used by app code.
- `supabase/migrations/00006_custom_lenses.sql`: Current `lenses` schema, constraints, RLS, schedule recomputation trigger, default Morning Briefing creation, and max-10-lenses guard.
- `apps/mobile/lib/theme.ts`: Warm Ink UI tokens that all new mobile surfaces must use.
- `apps/mobile/lib/testIds.ts`: Central test ID registry for agent and smoke-test selectors.

Recommendation: **hybrid approach**. Add small new library-specific screens/data files, but extend existing `lenses`, `useLenses`, `lens-form`, and Summary navigation patterns. Do not create a second execution pipeline or a second kind of user lens.

### Existing Patterns

EXISTING PATTERNS
-----------------

- File organization: Expo Router screens live under `apps/mobile/app/(app)/`; reusable UI lives under `apps/mobile/components/`; data hooks live under `apps/mobile/hooks/`; app utilities live under `apps/mobile/lib/`; shared types live under `packages/shared/src/`; database changes live in numbered Supabase migrations.
- Naming convention: screen files are kebab-case route names; hooks are `useX`; shared interfaces are PascalCase; Supabase table fields are snake_case; test IDs are grouped in `testIds`.
- Error handling: mobile mutations catch Supabase errors and show `Alert.alert(...)`; queries expose initial loading/error states; mutations invalidate relevant React Query keys on success.
- Testing approach: root `node --test` files verify scripts/migrations/static contracts; mobile smoke tests use Vitest and `react-test-renderer` with mocks in `apps/mobile/test/setup.ts`; end-to-end mobile checks exist under `tests/e2e/mobile`.
- UI style: mobile UI imports `colors`, `spacing`, `radii`, and `shadows` from `apps/mobile/lib/theme.ts`; Ionicons are used for icons.

### Integration Points

INTEGRATION POINTS
------------------

| File | Risk | Coverage | Notes |
|------|------|----------|-------|
| `supabase/migrations/00008_lens_library.sql` | Medium | New migration test required | Adds source metadata to `lenses`; must preserve existing schedule triggers and max lens limit. |
| `packages/shared/src/types.ts` | Medium | Typecheck | Add template/source fields without breaking existing imports. |
| `packages/shared/src/supabase.ts` | Medium | Typecheck | Manual database type shape must match migration. |
| `apps/mobile/lib/lensLibrary.ts` | Low | Unit/static test | New curated seed data, no network dependency. |
| `apps/mobile/hooks/useLenses.ts` | Medium | Mobile hook behavior via smoke/static tests | Extend create payload to support source metadata; invalidate `lenses` and possibly `lens-results`. |
| `apps/mobile/hooks/useLensLibrary.ts` | Low | Unit/static test | New hook can derive installed/update states from seed templates plus `useLenses`. |
| `apps/mobile/app/(app)/summary.tsx` | Medium | Existing smoke/e2e plus new smoke | Header and empty-state CTAs should route to choice screen, not blank form. |
| `apps/mobile/app/(app)/lens-create.tsx` | Low | New smoke test | New choice screen for `Create your own` and `Browse Lens Library`. |
| `apps/mobile/app/(app)/lens-library.tsx` | Medium | New smoke test | New browse list; must render install state and route to preview. |
| `apps/mobile/app/(app)/lens-library-preview.tsx` | Medium | New smoke test | Installs a lens and must produce a normal editable `lenses` row. |
| `apps/mobile/app/(app)/lens-form.tsx` | Low | Existing form behavior should remain covered | May receive prefilled values only if implementation chooses route params; preferred path is direct insert from preview. |
| `apps/mobile/lib/testIds.ts` | Low | Smoke tests | Add selectors for choice, library, preview, and install button. |
| `features/lens-library/FEATURE_SPEC.md` | Low | Spec verification | Product source of truth. |
| `plans/PLAN_STATUS.md` | Low | Manual review | Mark `features/lens-library/` status without requiring one primary workstream. |

## Codebase Maturity Assessment

This is a brownfield feature on a recently built app. The custom-lenses implementation is current and coherent, but the worktree has many uncommitted changes, so implementation agents must avoid unrelated edits and verify exact current file contents before patching.

Relevant maturity notes:

- The lens engine is already implemented and verified, including local Supabase migration evidence and Android-device push checks from prior work.
- Mobile tests exist but are mostly smoke/static tests, not full UI automation for every lens path.
- `packages/shared/src/supabase.ts` appears manually maintained rather than generated during this workflow, so schema changes must update it explicitly.
- `useLenses.ts` currently uses `(supabase as any)` for table operations, reducing compile-time protection around payload drift.
- The existing `lenses` table has a hard max of 10 lenses per user. Library installs count against the same limit.

## Technical Direction

Implement the Lens Library as a **curated bundled template catalog** in mobile code, with copied installs into the existing `lenses` table.

Reasons:

- It satisfies the v1 product goal without introducing server-side marketplace infrastructure.
- It works offline for browsing curated seed lenses.
- It uses the existing authenticated Supabase CRUD path for install.
- It preserves the future path to server/community templates through source metadata and stable template IDs.

No new dependencies are required.

## Data Model Changes

### Modify `lenses`

Add source/provenance fields to installed user lenses:

```sql
ALTER TABLE lenses
  ADD COLUMN source_template_id TEXT,
  ADD COLUMN source_template_version INTEGER,
  ADD COLUMN installed_from_library_at TIMESTAMPTZ,
  ADD COLUMN template_snapshot JSONB;
```

Field behavior:

| Field | Nullability | Meaning |
| --- | --- | --- |
| `source_template_id` | nullable | Stable ID of the library template used to create this lens. Null for manually created lenses. |
| `source_template_version` | nullable | Version installed by the user. Null for manually created lenses. |
| `installed_from_library_at` | nullable | Timestamp of library install. Null for manually created lenses. |
| `template_snapshot` | nullable JSONB | Copy of non-sensitive template metadata at install time: name, description, category, version, cadence defaults. Do not rely on this at execution time. |

Do **not** add a library-template table in v1. The curated catalog should be bundled in app code. A server-backed table can be added when community publishing or remotely updated curated lenses are in scope.

### Morning Briefing Backfill

`Morning Briefing` is both an existing auto-created default lens and an initial library seed. The implementation must not let users install a duplicate Morning Briefing simply because existing default rows lack template metadata.

Migration `00008_lens_library.sql` must:

1. Add the metadata columns above.
2. Backfill existing default Morning Briefing rows:

   ```sql
   UPDATE lenses
   SET
     source_template_id = 'morning-briefing',
     source_template_version = 1,
     installed_from_library_at = COALESCE(created_at, NOW()),
     template_snapshot = jsonb_build_object(
       'template_id', 'morning-briefing',
       'version', 1,
       'name', 'Morning Briefing',
       'description', 'Top actions, avoidance, and one small win',
       'category', 'planning',
       'author_type', 'curated',
       'author_name', 'Notes Brain'
     )
   WHERE is_default = true
     AND name = 'Morning Briefing'
     AND source_template_id IS NULL;
   ```

3. Replace `create_default_lens()` so newly created users receive the same source metadata on the auto-created default row.

Do not backfill non-default user-created lenses that happen to have the same name. Name-only matching would risk incorrectly marking a user's unrelated custom lens as a library install.

### Update Shared Types

Extend `Lens` in `packages/shared/src/types.ts`:

```ts
export interface Lens {
  // existing fields...
  source_template_id: string | null;
  source_template_version: number | null;
  installed_from_library_at: string | null;
  template_snapshot: LensTemplateSnapshot | null;
}
```

Add template types:

```ts
export type LensTemplateAuthorType = "curated" | "community";

export interface LensTemplateSnapshot {
  template_id: string;
  version: number;
  name: string;
  description: string;
  category: string;
  author_type: LensTemplateAuthorType;
  author_name: string;
}

export interface LensTemplate {
  template_id: string;
  version: number;
  name: string;
  description: string;
  focus: string;
  prompt: string;
  schedule_type: LensScheduleType;
  schedule_time: string;
  schedule_day: number | null;
  lookback_hours: number;
  categories: string[] | null;
  category: string;
  author_type: LensTemplateAuthorType;
  author_name: string;
  updated_at: string;
  changelog: string[];
  example_output?: string;
}
```

Update `packages/shared/src/supabase.ts` `lenses.Row`, `Insert`, and `Update` with the new nullable columns. `Update` should allow these fields only if needed for future migration/admin changes; normal user editing should not mutate source metadata.

### RLS and Constraints

Existing `lenses_policy` remains sufficient because installed templates are normal user-owned lens rows. No new RLS policy is required.

Add a partial index for install-state lookups:

```sql
CREATE INDEX idx_lenses_source_template
  ON lenses(user_id, source_template_id)
  WHERE source_template_id IS NOT NULL;
```

The existing max-10-lenses trigger applies to library installs. The UI must surface the Supabase error if the user is at the limit.

## Curated Template Storage

Create `apps/mobile/lib/lensLibrary.ts`.

Responsibilities:

- Export the curated seed list as typed `LensTemplate[]`.
- Keep stable `template_id` values, for example `morning-briefing`, `tomorrow-planner`, `weekly-project-pulse`.
- Use `version: 1` for first release.
- Include install-ready prompt, cadence, category defaults, lookback, and short description.
- Export helpers:
  - `getLensTemplateById(templateId: string): LensTemplate | null`
  - `createLensInputFromTemplate(template: LensTemplate): CreateLensInput`
  - `createTemplateSnapshot(template: LensTemplate): LensTemplateSnapshot`

The prompt text is product content and should be concise, direct, and compatible with the existing 20-2000 character database constraint.

## Mobile Architecture

### Routes

Add three app routes:

| Route | Purpose |
| --- | --- |
| `/(app)/lens-create` | Choice screen with `Create your own` and `Browse Lens Library`. |
| `/(app)/lens-library` | Browse curated templates. |
| `/(app)/lens-library-preview` | Preview one template and install it. Expects `templateId` route param. |

Update existing entry points:

- `summary.tsx` header `+` should route to `/(app)/lens-create`.
- Summary empty state CTA should route to `/(app)/lens-create`.
- `lens-manage.tsx` empty state CTA, if changed, should route to `/(app)/lens-create`.
- `Create your own` routes to existing `/(app)/lens-form`.
- `Browse Lens Library` routes to `/(app)/lens-library`.

### Hooks

#### Extend `useLenses`

Export `CreateLensInput` and allow source metadata:

```ts
type CreateLensInput = {
  name: string;
  prompt: string;
  schedule_type?: "daily" | "weekly";
  schedule_time?: string;
  schedule_day?: number | null;
  lookback_hours?: number;
  categories?: string[] | null;
  source_template_id?: string | null;
  source_template_version?: number | null;
  installed_from_library_at?: string | null;
  template_snapshot?: LensTemplateSnapshot | null;
};
```

Mutation success should continue invalidating `["lenses", userId]`. It should also be acceptable to invalidate `["lens-results", userId]` after install only if UI state depends on result feed empty-state copy; installing does not create a result.

#### Add `useLensLibrary`

Create a small derived hook:

```ts
export function useLensLibrary() {
  const { data: lenses = [], create } = useLenses();
  // derive templates with install state
}
```

Install-state derivation:

- `Not installed`: no lens with matching `source_template_id`.
- `Installed`: at least one lens with matching `source_template_id` and current `source_template_version`.
- `Update available`: at least one lens with matching `source_template_id` and lower `source_template_version`.
- `Customized`: future state only. Do not implement `has_user_edits` in v1 unless it is needed by update UX.

Because v1 does not implement update prompts, the UI can show only `Installed` and omit update badges unless a newer bundled template version exists.

### Screens

#### `lens-create.tsx`

UI:

- Warm Ink background.
- Two prominent rows/buttons:
  - `Create your own`
  - `Browse Lens Library`
- Use Ionicons, not emojis.
- No long explanatory onboarding copy.

#### `lens-library.tsx`

UI:

- FlatList of curated template cards.
- Show name, description/focus, cadence, category, install state.
- Pressing a card routes to preview with `templateId`.
- Installed items remain viewable.

#### `lens-library-preview.tsx`

UI:

- Shows template name, description, focus, cadence, categories, lookback window, example output if present.
- Prompt appears in a collapsed/details section or lower-priority panel.
- Primary action:
  - `Add to My Lenses` when not installed.
  - `Add Another Copy` may be allowed if already installed, but default should visually indicate `Installed`.
- On successful install, show confirmation and route back to lens management or the Summary tab. Preferred v1: route back to `lens-manage` so the user sees the created editable lens.

Install payload:

```ts
{
  name: template.name,
  prompt: template.prompt,
  schedule_type: template.schedule_type,
  schedule_time: template.schedule_time,
  schedule_day: template.schedule_day,
  lookback_hours: template.lookback_hours,
  categories: template.categories,
  source_template_id: template.template_id,
  source_template_version: template.version,
  installed_from_library_at: new Date().toISOString(),
  template_snapshot: createTemplateSnapshot(template)
}
```

### Editing Installed Lenses

No special edit mode is needed. Installed lenses load in `lens-form.tsx` exactly like manually created lenses.

Do not let normal edits clear or rewrite source metadata. `updateLens` should only update user-editable fields unless a future update workflow explicitly handles template metadata.

## Update Semantics

V1 must enforce this product rule:

> Template changes do not silently change installed user lenses.

Technical implications:

- `execute-lens` reads only the installed `lenses.prompt`, schedule, categories, and lookback fields.
- The app never joins to bundled template data when executing a lens.
- Changing `apps/mobile/lib/lensLibrary.ts` affects only future installs and optional update-state badges.
- No field-level merge is implemented in v1.

Future update UX can compare bundled `template.version` with `lens.source_template_version`. If a newer version exists, the first implementation should offer `Add updated copy` instead of mutating the existing lens.

## Regression Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| Existing `+` flow regresses for users who want a blank lens. | Choice screen keeps `Create your own` as the first option and routes to the existing form unchanged. |
| Morning Briefing appears installable even though every user already has the default lens. | Migration backfills `source_template_id = 'morning-briefing'` for existing `is_default` Morning Briefing rows and updates the default-lens trigger for new users. |
| Installed templates exceed the 10-lens limit. | Reuse Supabase error handling; optionally disable install if `lenses.length >= 10`. |
| Source metadata columns drift from shared types. | Update migration, `types.ts`, and `supabase.ts` together; add root static test for column names. |
| Library install creates a lens that cannot execute. | Use the same `create` mutation and existing `lenses` constraints; include template prompts within 20-2000 chars. |
| User edits accidentally change source metadata. | Keep `UpdateLensInput` restricted to user-editable fields. |
| Warm Ink design inconsistency. | Import tokens from `theme.ts`; use Ionicons. |
| Empty state/header navigation tests fail due route changes. | Update or add mobile smoke tests for Summary and lens-create routes. |

## Implementation Sequence

1. Add migration `00008_lens_library.sql` for source metadata columns, Morning Briefing backfill/default-trigger update, and index.
2. Update shared lens/template types and Supabase database shape.
3. Add curated template data and helpers in `apps/mobile/lib/lensLibrary.ts`.
4. Extend `useLenses` create payload for source metadata while keeping update payload user-editable only.
5. Add `useLensLibrary` install-state derivation.
6. Add `lens-create`, `lens-library`, and `lens-library-preview` screens.
7. Update Summary and lens management entry points to route to `lens-create`.
8. Add test IDs and mobile smoke tests for choice, browse, preview, and install payload.
9. Add root static tests for migration/type/schema alignment.
10. Run verification commands and mobile smoke flow.

## Testing Plan

### Static and Unit Tests

- Add a root `node --test` file that asserts:
  - `00008_lens_library.sql` adds all source metadata columns.
  - `00008_lens_library.sql` backfills `is_default` Morning Briefing rows with `source_template_id = 'morning-briefing'`.
  - `00008_lens_library.sql` updates `create_default_lens()` so new default Morning Briefing rows include source metadata.
  - `packages/shared/src/types.ts` includes the same fields.
  - `packages/shared/src/supabase.ts` includes the same fields in `Row` and `Insert`.
- Add mobile Vitest smoke tests for:
  - `lens-create` renders both options and routes correctly.
  - `lens-library` renders seeded templates and installed state from mocked lenses.
  - `lens-library-preview` calls `create.mutateAsync` with copied template fields and source metadata.
  - `summary` header/empty CTA routes to `/(app)/lens-create`.

### Manual / Agent Flow

Use the dedicated [FLOW_VERIFICATION_PLAN.md](./FLOW_VERIFICATION_PLAN.md).

### Commands

Expected verification after implementation:

```bash
npm run test:root
npm run test -w @notesbrain/mobile
npm run typecheck -w @notesbrain/shared
npm run typecheck -w @notesbrain/mobile
npm run lint -w @notesbrain/mobile
```

If implementation touches only mobile/shared/migration files, full `npm run verify` is still preferred before merge but can be deferred if local mobile tooling blocks.

## Migration and Rollback

Migration:

- Add nullable columns only.
- Add one partial index.
- Backfill only existing `is_default` Morning Briefing lenses with template metadata.
- Do not backfill non-default user-created lenses.
- Do not change existing triggers, RLS policies, or result tables.

Rollback:

```sql
DROP INDEX IF EXISTS idx_lenses_source_template;
-- Optional: restore the pre-library create_default_lens() body from 00006_custom_lenses.sql.
ALTER TABLE lenses
  DROP COLUMN IF EXISTS template_snapshot,
  DROP COLUMN IF EXISTS installed_from_library_at,
  DROP COLUMN IF EXISTS source_template_version,
  DROP COLUMN IF EXISTS source_template_id;
```

Rollback would remove provenance metadata but installed lenses would continue functioning because prompt/schedule/filter values are copied into normal `lenses` columns.

## Human Decision Points

No blocking human decision remains for v1.

Documented product decisions:

- Copy on install, do not live-sync.
- Curated templates first, community publishing later.
- Manual update prompts later, no silent updates.
- Installed lenses remain editable and user-owned.

Future human decisions, explicitly out of v1:

- Whether curated and community lenses share one browsing surface.
- Whether a server-backed `lens_templates` table replaces bundled seed data.
- Whether update UX supports in-place replacement or only `Add updated copy`.
- How community prompts are reviewed before publication.

## Migration Risk Checklist

- [x] Data migration required? Nullable metadata columns plus targeted backfill for existing default Morning Briefing rows.
- [x] Breaking changes to existing APIs? No; existing lens CRUD payloads remain valid.
- [x] Dependent services affected? No; `execute-lens` and `dispatch-lenses` continue using installed lens rows.
- [x] Feature flags needed for gradual rollout? No for v1; navigation can ship with bundled templates.
- [x] Rollback plan if deployment fails? Drop index/columns; installed copied lenses still work if created before rollback.
