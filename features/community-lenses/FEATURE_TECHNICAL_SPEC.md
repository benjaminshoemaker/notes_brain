# Feature Technical Spec: Community Lenses

**Feature:** Community Lenses
**Date:** 2026-05-11
**Status:** Draft
**Upstream:** [FEATURE_SPEC.md](./FEATURE_SPEC.md)

---

## Existing Code Analysis

### Similar Functionality Audit

SIMILAR FUNCTIONALITY FOUND
---------------------------

- `apps/mobile/lib/lensLibrary.ts`: Bundled curated template catalog, template lookup, install input creation, template snapshot creation, and install-state derivation from `source_template_id` plus `source_template_version`.
- `apps/mobile/hooks/useLensLibrary.ts`: React Query hook that combines template data with the current user's installed `lenses` rows and installs templates through `useLenses().create`.
- `apps/mobile/app/(app)/lens-library.tsx`: Curated Lens Library list screen with cards, category badges, install state, and preview navigation.
- `apps/mobile/app/(app)/lens-library-preview.tsx`: Template preview and `Add to My Lenses` install flow.
- `apps/mobile/app/(app)/lens-manage.tsx`: Lens management list, per-lens actions, loading/error states, and Alert-based mutation failures.
- `apps/mobile/hooks/useLenses.ts`: Current CRUD path for user-owned `lenses`, including query keys, mutation invalidation, and Supabase access pattern.
- `supabase/migrations/00008_lens_library.sql`: Existing provenance migration for `source_template_id`, `source_template_version`, `installed_from_library_at`, and `template_snapshot`.
- `packages/shared/src/types.ts` and `packages/shared/src/supabase.ts`: Shared `LensTemplate`, `LensTemplateSnapshot`, `Lens`, and database table types.
- `apps/mobile/test/smoke/lens-library-*.test.*` and `tests/task-lens-library-metadata.test.js`: Existing smoke/root tests for curated template metadata, install input, install state, screen rendering, and migration/type coverage.

Recommendation: hybrid approach.

Community lenses should reuse the existing Lens Library UI and install contract, but add server-backed community templates and mutation RPCs. Curated templates can remain bundled for now. Community templates should be fetched from Supabase and normalized into the same UI-facing `LensTemplate` shape where practical.

### Existing Patterns

EXISTING PATTERNS
-----------------

- File organization: mobile screens live under `apps/mobile/app/(app)/`; mobile hooks live under `apps/mobile/hooks/`; reusable mobile logic lives under `apps/mobile/lib/`; shared data contracts live in `packages/shared/src/`; schema changes live in numbered SQL files under `supabase/migrations/`.
- Naming convention: hooks use `useX`; screen test IDs are centralized in `apps/mobile/lib/testIds.ts`; database tables and columns use snake_case; TypeScript domain types use PascalCase interfaces.
- Error handling: mobile mutations throw Supabase errors from hooks; screens catch mutation failures and show `Alert.alert` or inline state. Existing hooks invalidate React Query keys after successful mutations.
- Testing approach: mobile smoke tests use Vitest and `react-test-renderer`; root tests use `node:test` for migration/static-contract checks; backend E2E tests use Supabase admin/anon clients when real database behavior matters.
- Styling: mobile UI uses Warm Ink tokens from `apps/mobile/lib/theme.ts`; Ionicons are used for icons.

### Integration Point Map

INTEGRATION POINTS
------------------

| File | Risk | Coverage | Notes |
| --- | --- | --- | --- |
| `supabase/migrations/00010_community_lenses.sql` | High | New root migration tests required | Adds public tables, public-field view, RLS, RPCs, counters, triggers, and report constraints. Main privacy boundary lives here. |
| `packages/shared/src/types.ts` | Medium | Existing root metadata tests; add community type checks | Add community template/report/status types without breaking curated template consumers. |
| `packages/shared/src/supabase.ts` | Medium | Existing root metadata tests; add table/RPC checks | Manual generated type file must be kept aligned with migration. |
| `apps/mobile/lib/lensLibrary.ts` | Medium | Existing catalog tests | Refactor helpers so curated and community templates share install-state/snapshot behavior. |
| `apps/mobile/hooks/useLensLibrary.ts` | Medium | Existing hook consumers indirectly tested | Split or extend to fetch curated and community templates, expose search/filter/sort state, and install through RPC for community templates. |
| `apps/mobile/hooks/useCommunityLenses.ts` | Medium | New hook tests required | Own community fetch, publish, unpublish, install, and report mutations. |
| `apps/mobile/app/(app)/lens-library.tsx` | Medium | Existing screen smoke test | Add Curated/Community segmented control, search, category filters, and community cards. |
| `apps/mobile/app/(app)/lens-library-preview.tsx` | Medium | Existing preview smoke test | Preview must handle both bundled curated templates and Supabase community templates, including delisted/install-blocked errors. |
| `apps/mobile/app/(app)/lens-manage.tsx` | High | New screen smoke tests required | Add publish/unpublish controls only for eligible user-created lenses while preserving edit/pause/run/delete behavior. |
| `apps/mobile/app/(app)/community-lens-publish.tsx` | Medium | New screen smoke tests required | New review/confirmation route for author display name, prompt-public warning, and publish mutation. |
| `apps/mobile/lib/testIds.ts` | Low | Static usage through tests | Add selectors for community tab, search, filters, publish controls, report controls, and publish review. |
| `tests/e2e/backend/community-lenses.e2e.test.mjs` | Medium | New E2E | Verifies RLS/RPC behavior without depending on mobile UI. |
| `tests/e2e/mobile/specs/community-lenses.e2e.js` or Expo MCP flow | Medium | New flow harness if implemented | Verifies the real mobile publish/browse/install flow with seeded accounts. |

## Codebase Maturity Assessment

This is an active brownfield app with recent feature work and test coverage, not a legacy rewrite. The relevant lens code is concentrated in a few files, but several behaviors are encoded directly in UI/helper files rather than through a generalized template service.

Technical debt and risks:

- Curated templates are bundled in mobile TypeScript, while community templates must be server-backed. The technical design must avoid creating two unrelated install systems.
- `packages/shared/src/supabase.ts` is manually maintained. Any migration must be mirrored in this file or typecheck/test coverage will drift.
- `useLenses` currently inserts template installs directly into `lenses`. Community installs need a database-owned operation so hidden/delisted templates cannot be installed through stale clients.
- Existing authenticated users can insert their own `lenses` rows, including provenance columns. Community template ids need a server guard so clients cannot spoof community installs by directly setting `source_template_id`.
- The existing `lenses` table has a 10-lens-per-user trigger. Community install RPCs must intentionally rely on that trigger or surface its error cleanly.
- The current Lens Library screen has no search/filter state and no server pagination. MVP should fetch community templates with an explicit 100-row limit and server-side sort.

Human decision points:

- None blocking. The product spec already chose open publishing with post-publication controls, lens-management-only publishing, status-based Supabase admin delisting, no remix/republish in MVP, and no ratings/reviews/leaderboards.

## Architecture Decision

Use Supabase tables plus database RPCs for community publishing and installation.

| Criterion | Direct client table writes | Database RPCs | Edge Function API |
| --- | --- | --- | --- |
| Fit with existing code | Medium | High | Medium |
| Implementation effort | Small | Medium | Medium |
| Privacy/security boundary | Medium | High | High |
| Delisted-template install blocking | Weak unless repeated in client | Strong | Strong |
| New dependencies | 0 | 0 | 0 |
| Operational overhead | Low | Low | Medium |

Recommendation: Database RPCs for publish, unpublish, install, and report.

Rationale: Supabase RPCs keep validation, ownership, anti-spam, version snapshots, install counts, and hidden/delisted checks in one server-owned path. This matches the existing Supabase-first architecture and avoids introducing Edge Functions or new dependencies for CRUD-style operations.

## Data Model

Add migration `supabase/migrations/00010_community_lenses.sql`.

### Enums

```sql
CREATE TYPE lens_template_status AS ENUM ('public', 'unpublished', 'hidden', 'delisted');
CREATE TYPE lens_template_report_reason AS ENUM (
  'spam',
  'unsafe_prompt',
  'misleading',
  'private_information',
  'impersonation',
  'other'
);
```

### `lens_templates`

Server-backed public template current-state table.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid primary key default uuid_generate_v4()` | Stable template id. Use text conversion for existing `source_template_id` field. |
| `source_lens_id` | `uuid not null references lenses(id) on delete cascade` | Author-owned source lens. |
| `author_user_id` | `uuid not null references users(id) on delete cascade` | Internal owner/moderation link. |
| `author_display_name` | `text not null` | Validate length, no email, no reserved names. |
| `name` | `text not null` | Snapshot from source lens. |
| `description` | `text not null` | Required user-entered text on publish screen. |
| `prompt` | `text not null` | Same 20-2000 bounds as `lenses.prompt`. |
| `schedule_type` | `lens_schedule_type not null` | Existing enum. |
| `schedule_time` | `time not null` | Existing schedule model. |
| `schedule_day` | `smallint` | Same weekly constraint. |
| `lookback_hours` | `integer not null` | Same 1-720 constraint. |
| `categories` | `text[]` | Null means all categories. |
| `category` | `text not null default 'uncategorized'` | Discovery category constrained to the existing `CATEGORIES` values. |
| `version` | `integer not null default 1` | Current public content version. |
| `status` | `lens_template_status not null default 'public'` | Public visibility/moderation state. |
| `install_count` | `integer not null default 0` | Successful install events. |
| `created_at` | `timestamptz not null default now()` | Publication timestamp. |
| `updated_at` | `timestamptz not null default now()` | Current row update timestamp. |

Constraints and indexes:

- `UNIQUE (source_lens_id)` so one personal lens maps to one community template.
- `CHECK (char_length(name) BETWEEN 1 AND 120)`.
- `CHECK (char_length(description) BETWEEN 1 AND 280)`.
- `CHECK (char_length(prompt) BETWEEN 20 AND 2000)`.
- `CHECK (lookback_hours > 0 AND lookback_hours <= 720)`.
- Weekly schedule constraint matching `lenses`.
- Author display name checks:
  - `char_length(btrim(author_display_name)) BETWEEN 2 AND 40`.
  - No email-shaped value using a conservative regex check.
  - Lowercased value not in `('notes brain', 'admin', 'support')`.
- `CREATE INDEX idx_lens_templates_public_sort ON lens_templates(status, install_count DESC, updated_at DESC)`.
- `CREATE INDEX idx_lens_templates_category ON lens_templates(category) WHERE status = 'public'`.
- `CREATE INDEX idx_lens_templates_author ON lens_templates(author_user_id)`.

Authenticated clients must not read this table directly for public browse because it contains internal ids (`author_user_id`, `source_lens_id`). Mobile public browse reads through the public-field view below.

### `community_lens_templates_public`

Create a view for public browsing and preview:

```sql
CREATE VIEW community_lens_templates_public AS
SELECT
  id,
  name,
  description,
  prompt,
  schedule_type,
  schedule_time,
  schedule_day,
  lookback_hours,
  categories,
  category,
  version,
  author_display_name,
  install_count,
  created_at,
  updated_at
FROM lens_templates
WHERE status = 'public';
```

The view exposes no `author_user_id`, `source_lens_id`, report rows, installer rows, or operator-only status values. Grant authenticated read access to this view. Use table RLS for authors to read their own template status from `lens_templates`; public browse must query the view.

### `lens_template_versions`

Immutable public snapshots.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid primary key default uuid_generate_v4()` | Version row id. |
| `template_id` | `uuid not null references lens_templates(id) on delete cascade` | Parent template. |
| `version` | `integer not null` | Monotonic version. |
| `snapshot` | `jsonb not null` | Template fields copied at publication/version time. |
| `created_at` | `timestamptz not null default now()` | Version creation time. |

Constraints and indexes:

- `UNIQUE (template_id, version)`.
- Snapshot must include: `template_id`, `version`, `name`, `description`, `category`, `author_type`, `author_name`, `prompt`, `schedule_type`, `schedule_time`, `schedule_day`, `lookback_hours`, and `categories`.

### `lens_template_installs`

Install-event audit and current-user install-state support.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid primary key default uuid_generate_v4()` | Event row id. |
| `template_id` | `uuid not null references lens_templates(id) on delete restrict` | Source template. |
| `template_version` | `integer not null` | Installed version. |
| `installed_lens_id` | `uuid not null references lenses(id) on delete cascade` | Created user lens. |
| `user_id` | `uuid not null references users(id) on delete cascade` | Installer. |
| `created_at` | `timestamptz not null default now()` | Install event timestamp. |

Indexes:

- `idx_lens_template_installs_template_id` on `(template_id)`.
- `idx_lens_template_installs_user_template` on `(user_id, template_id, created_at DESC)`.
- `UNIQUE (installed_lens_id)`.

`install_count` counts successful install events. If the user deletes their installed lens and later installs again, the second install creates a new event and increments the count again.

### `lens_template_reports`

Moderation report table.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid primary key default uuid_generate_v4()` | Report id. |
| `template_id` | `uuid not null references lens_templates(id) on delete cascade` | Reported template. |
| `reporter_user_id` | `uuid not null references users(id) on delete cascade` | Reporter. |
| `reason` | `lens_template_report_reason not null` | Product-defined reason. |
| `note` | `text` | Optional short note, max 500 chars. |
| `resolved_at` | `timestamptz` | Null while active. |
| `created_at` | `timestamptz not null default now()` | Report timestamp. |

Constraints and indexes:

- `CREATE UNIQUE INDEX idx_lens_template_reports_one_active_per_user ON lens_template_reports(template_id, reporter_user_id) WHERE resolved_at IS NULL` to enforce one active report per user/template.
- `CHECK (note IS NULL OR char_length(note) <= 500)`.
- `idx_lens_template_reports_template` on `(template_id, created_at DESC)`.

### Guard direct community provenance writes on `lenses`

Add a trigger to prevent clients from bypassing `install_lens_template` by directly inserting a `lenses` row with a community template id in `source_template_id`.

Behavior:

- If `NEW.source_template_id` is null or does not parse as a UUID, allow the write. This preserves existing curated template ids such as `morning-briefing`.
- If `NEW.source_template_id` parses as a UUID and matches `lens_templates.id`, allow only when `current_setting('app.community_lens_install', true) = 'true'`.
- `install_lens_template` sets this transaction-local value before inserting the copied `lenses` row.
- Apply the guard on insert and on updates to `source_template_id`.

This keeps user-created lenses and curated installs working while making community installs database-owned.

### Sync published templates when source lenses change

Add an `AFTER UPDATE` trigger on `lenses` for versioned source fields:

- `name`
- `prompt`
- `schedule_type`
- `schedule_time`
- `schedule_day`
- `lookback_hours`
- `categories`

Behavior:

- Find `lens_templates` where `source_lens_id = NEW.id`.
- Do nothing if no template exists.
- Do nothing when template status is `hidden` or `delisted`; these are operator-owned moderation states.
- If versioned source fields changed, update the current `lens_templates` row, increment `version`, set `updated_at`, and insert a `lens_template_versions` snapshot.
- Preserve `description`, `category`, and `author_display_name` unless changed through `publish_lens_template`.

This is required because existing lens edits use `useLenses.update` directly. The trigger prevents published templates from silently going stale when an author edits the source lens.

## RLS And RPC Design

Enable RLS on all new tables.

### Read policies

- `lens_templates`: authenticated users can select only rows where `author_user_id = auth.uid()`. Public browse reads `community_lens_templates_public`, not this table.
- `community_lens_templates_public`: authenticated users can select all rows exposed by the view.
- `lens_template_versions`: authenticated users can select versions for their own templates. Public preview uses current public fields from the view; version history is not public in MVP.
- `lens_template_installs`: users can select only their own install rows.
- `lens_template_reports`: reporters can select their own reports. Operators use Supabase admin/service role outside mobile.

### Write policies

Do not allow direct authenticated inserts/updates for publication, install, or reports. Use `SECURITY DEFINER` functions with explicit checks and fixed `search_path`.

### RPCs

#### `publish_lens_template(...)`

Inputs:

- `p_lens_id uuid`
- `p_author_display_name text`
- `p_description text`
- `p_category text`

Behavior:

1. Require `auth.uid()` and load `lenses` row by `id = p_lens_id` and `user_id = auth.uid()`.
2. Reject if `source_template_id IS NOT NULL`.
3. Validate display name, description, prompt, schedule, lookback, and category.
4. Enforce publish rate limit: no more than 10 newly public templates per user in the trailing 24 hours. Count rows whose first `created_at` falls inside the window.
5. Upsert by `source_lens_id`.
6. If no template exists, create `lens_templates` version 1 with status `public`.
7. If a template exists with status `hidden` or `delisted`, reject with a moderation-state error; authors cannot republish operator-hidden templates.
8. If a template exists with status `public` or `unpublished`, compare versioned fields. Increment version only when versioned fields changed. Status changes alone do not increment version.
9. Set status to `public` only for new templates or existing `public`/`unpublished` templates.
10. Insert `lens_template_versions` snapshot when creating a new content version.
11. Return the current template row.

#### `unpublish_lens_template(p_lens_id uuid)`

Behavior:

1. Require ownership through `source_lens_id` and `author_user_id = auth.uid()`.
2. Set `status = 'unpublished'`.
3. Do not delete versions or installs.
4. Return the updated template row.

#### `install_lens_template(p_template_id uuid)`

Behavior:

1. Require `auth.uid()`.
2. Load template where `id = p_template_id` and `status = 'public'`.
3. Reject if `author_user_id = auth.uid()`.
4. Reject if the user already has a current installed lens with `source_template_id = p_template_id::text`. A current installed lens is a `lenses` row still present for this user.
5. Set transaction-local guard `app.community_lens_install = 'true'`.
6. Insert a copied `lenses` row using template fields and existing provenance columns:
   - `source_template_id = p_template_id::text`
   - `source_template_version = template.version`
   - `installed_from_library_at = now()`
   - `template_snapshot = public metadata snapshot`
7. Let existing `lenses` triggers compute `next_run_at` and enforce the 10-lens limit.
8. Insert `lens_template_installs`.
9. Increment `lens_templates.install_count`.
10. Return the created `lenses` row.

#### `report_lens_template(...)`

Inputs:

- `p_template_id uuid`
- `p_reason lens_template_report_reason`
- `p_note text default null`

Behavior:

1. Require `auth.uid()`.
2. Load template where `status = 'public'`.
3. If an active report already exists for this reporter/template, return that existing report without changing `reason` or `note`.
4. Reject notes over 500 characters.
5. Return report row.

## Shared Type Changes

Update `packages/shared/src/types.ts`:

- Add `LensTemplateStatus`.
- Add `LensTemplateReportReason`.
- Add `CommunityLensTemplate`.
- Add `LensTemplateVersion`.
- Add `LensTemplateInstall`.
- Add `LensTemplateReport`.
- Extend `LensTemplateSnapshot` with `prompt`, `schedule_type`, `schedule_time`, `schedule_day`, `lookback_hours`, and `categories` so installed community copies preserve the public template snapshot used at install time.

Update `packages/shared/src/supabase.ts`:

- Add table definitions for `lens_templates`, `lens_template_versions`, `lens_template_installs`, and `lens_template_reports`.
- Add enum definitions for `lens_template_status` and `lens_template_report_reason`.
- Add function signatures for `publish_lens_template`, `unpublish_lens_template`, `install_lens_template`, and `report_lens_template` if this manual type file models functions.

Update `packages/shared/src/index.ts` exports.

No new npm dependencies are required.

## Mobile Implementation

### Data hooks

Create `apps/mobile/hooks/useCommunityLenses.ts`.

Responsibilities:

- Fetch public community templates:
  - query key: `["community-lens-templates", filters]`
  - Supabase query from `community_lens_templates_public`
  - search by name/description/author display name using `ilike`
  - category filter when selected
  - order by `install_count desc`, `updated_at desc`
  - limit first page to 100 templates for MVP
- Fetch current user's authored templates:
  - query key: `["authored-community-lens-templates", userId]`
  - needed by lens management to show public/unpublished status for each source lens.
  - query from `lens_templates`, where RLS limits results to the current author.
- Publish via RPC `publish_lens_template`.
- Unpublish via RPC `unpublish_lens_template`.
- Install via RPC `install_lens_template`.
- Report via RPC `report_lens_template`.
- Invalidate affected query keys:
  - community templates
  - authored templates
  - `["lenses", userId]`

Refactor `apps/mobile/hooks/useLensLibrary.ts` so it can return:

- curated templates from bundled data
- community templates from `useCommunityLenses`
- install states derived from existing `lenses`
- loading/error state per tab

Do not route community installs through `useLenses().create`, because stale clients must not be able to install hidden/delisted templates.

### Template normalization

Keep existing curated `LensTemplate` support. Add a helper in `apps/mobile/lib/lensLibrary.ts`:

- `communityTemplateToLensTemplate(row: CommunityLensTemplate): LensTemplate`
- `createTemplateSnapshot(template: LensTemplate)` should continue to include public metadata only.
- `getTemplateInstallState` can remain shared because it only depends on `template_id`, `version`, and installed lenses.

For community templates, `template_id` should be `lens_templates.id` as a string. This matches existing `lenses.source_template_id` type.

### Lens Library screen

Update `apps/mobile/app/(app)/lens-library.tsx`:

- Add a Curated/Community segmented control.
- Keep existing curated list as default if preferred, or default to Curated to preserve existing behavior.
- Community tab shows:
  - search input
  - category filter row
  - list sorted by install count
  - card metadata: name, description, author display name, category, cadence, install count, install state
- Use `testIds.lens.library.communityTab`, `communitySearch`, `communityFilter(category)`, and `communityCard(templateId)`.
- Empty states:
  - no public templates
  - no search/filter matches
- Error state:
  - community templates failed to load, with retry.

### Preview screen

Update `apps/mobile/app/(app)/lens-library-preview.tsx`:

- Accept route params:
  - `templateId`
  - optional `source` with values `curated` or `community`
- Curated source uses existing `getLensTemplateById`.
- Community source looks up the row from `useCommunityLenses` cache/fetch.
- Show author display name for community templates.
- Show install count for community templates.
- Add report action for community templates.
- Install button calls the community install RPC for community templates.
- If the template is no longer public, render "Lens not available" and disable install.

### Lens management publish controls

Update `apps/mobile/app/(app)/lens-manage.tsx`:

- Fetch authored community templates through `useCommunityLenses`.
- For each lens:
  - If `source_template_id` is set, show no publish control and show a `From library` metadata label.
  - If user-owned and not installed from a template, show community status:
    - `Private`
    - `Public`
    - `Unpublished`
    - `Hidden` or `Delisted` if operator changed status
  - Add `Publish` or `Unpublish` control.
- For `Hidden` or `Delisted`, do not show Publish or Unpublish. Show a non-actionable status message because these are operator-owned moderation states.
- Publish routes to a new review screen.
- Unpublish can use an Alert confirmation before calling RPC.
- Keep existing edit, pause/resume, run now, and delete actions unchanged.

### Publish review screen

Create `apps/mobile/app/(app)/community-lens-publish.tsx`.

Route params:

- `lensId`

Screen behavior:

1. Load the selected lens from `useLenses`.
2. If missing, show recoverable missing state.
3. If `source_template_id` is set, block publication with a message that installed library/community lenses cannot be published in MVP.
4. Display all public fields:
   - name
   - description input
   - prompt
   - schedule
   - lookback
   - categories
   - discovery category picker
   - author display name input
5. Validate author display name locally using the same visible rules as the database.
6. Show explicit prompt-public warning.
7. Confirm calls `publish_lens_template`.
8. On success, return to lens management and show confirmation.

MVP description handling:

- Add a required description field on publish review, max 280 characters.
- It is template metadata only and does not alter the source lens row.

### Accessibility implementation requirements

Apply these requirements in the Community tab, community preview, lens management publish controls, publish review, report action, and unpublish confirmation:

- Every interactive control has an `accessibilityRole` and descriptive `accessibilityLabel`.
- Publish/unpublish and install/report pending states expose `accessibilityState={{ disabled: true }}` when disabled.
- Public/private/template moderation status is rendered as visible text, not color alone.
- Destructive or state-changing actions use explicit labels: `Publish to Community`, `Unpublish from Community`, `Report Community Lens`, `Add to My Lenses`, and `Cancel`.
- Primary controls have minimum dimensions of 44 by 44 points through explicit style dimensions or padding.
- Search input exposes a label or placeholder that names the search target, such as `Search community lenses`.
- Category filters expose selected state through `accessibilityState={{ selected }}`.
- All new UI uses Warm Ink tokens imported from `apps/mobile/lib/theme.ts`; do not hardcode colors/radii/shadows.

### Test IDs

Extend `apps/mobile/lib/testIds.ts`:

- `lens.library.curatedTab`
- `lens.library.communityTab`
- `lens.library.communitySearch`
- `lens.library.communityFilter(category)`
- `lens.library.communityCard(templateId)`
- `lens.preview.reportButton`
- `lens.manage.publishButton(lensId)`
- `lens.manage.unpublishButton(lensId)`
- `lens.manage.communityStatus(lensId)`
- `lens.publish.screen`
- `lens.publish.displayNameInput`
- `lens.publish.descriptionInput`
- `lens.publish.categoryOption(category)`
- `lens.publish.confirmButton`
- `lens.publish.privacyWarning`
- `lens.publish.error`

## Regression Risk Assessment

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Existing curated Lens Library breaks while adding Community tab | Existing user flow regression | Preserve curated helpers and tests; add tests that default curated list still renders and installs. |
| Hidden/delisted template can be installed by stale mobile client | Trust/privacy failure | Make community install database-owned through RPC and require `status = 'public'`. |
| Installed community lens live-links to template instead of copying fields | Violates copy-on-install | RPC inserts copied `lenses` row and execution continues reading `lenses` only. |
| Author can publish installed copy from another template | Attribution/remix gap | Publish RPC rejects `source_template_id IS NOT NULL`; UI hides publish controls for these rows. |
| Public browse leaks internal ids | Privacy issue | Query `community_lens_templates_public` view, not `lens_templates`, for public browse/preview. |
| Author can undo operator delist | Moderation failure | `publish_lens_template` rejects `hidden` and `delisted`; UI makes those statuses non-actionable. |
| Published template drifts stale after lens edit | Product behavior failure | `lenses` update trigger syncs source lens field changes into template versions for public/unpublished templates. |
| Client spoofs community source metadata through direct `lenses` insert | Audit/count bypass | `lenses` trigger blocks UUID community template provenance unless set by `install_lens_template`. |
| Manual Supabase delist deletes rows instead of status-changing | Provenance/audit loss | Spec, migration comments, and operator notes must say use `status = 'hidden'` or `delisted`. |
| Type drift between migration and shared Supabase types | Build/runtime mismatch | Add root tests that assert new tables/enums/RPC names exist in `packages/shared/src/supabase.ts`. |
| Install count leaks user identity | Privacy issue | Store event rows behind RLS; expose only aggregate `install_count`. |
| 10-lens limit creates confusing install failure | UX issue | Surface Supabase error as recoverable "Couldn't add lens" and keep preview visible. |

## Migration Strategy And Rollback

Migration steps:

1. Add enums.
2. Add `lens_templates`.
3. Add `lens_template_versions`.
4. Add `lens_template_installs`.
5. Add `lens_template_reports`.
6. Add `community_lens_templates_public` view.
7. Add indexes and constraints.
8. Enable RLS.
9. Add read policies and grants.
10. Add RPC functions.
11. Add `lenses` provenance guard trigger.
12. Add source-lens-to-template sync trigger.
13. Add rollback comments at bottom of migration.

Rollback plan:

- No existing data is rewritten.
- Drop RPCs.
- Drop triggers added to `lenses`.
- Drop public view.
- Drop policies.
- Drop report/install/version/template tables in dependency order.
- Drop enums.
- Existing `lenses`, curated Lens Library, and custom lens execution remain usable.

Migration risk checklist:

- [x] Data migration required? No backfill required for existing rows.
- [x] Breaking changes to existing APIs? No. Existing `lenses` table and curated installs remain.
- [x] Dependent services affected? No Edge Function execution changes required.
- [x] Feature flags needed? No separate feature flag required for local MVP, but Community tab can remain hidden until implementation is complete.
- [x] Rollback plan if deployment fails? Drop new community objects; existing lens behavior remains.

## Implementation Sequence

1. **Schema foundation**
   - Add `00010_community_lenses.sql`.
   - Add RLS policies, public-field view, RPCs, and triggers.
   - Add root tests for migration structure, constraints, RLS, public view, triggers, and rollback comments.

2. **Shared contracts**
   - Extend `packages/shared/src/types.ts`, `supabase.ts`, and `index.ts`.
   - Add tests that shared types contain community tables/enums/RPC references.

3. **Community template helpers**
   - Extend `apps/mobile/lib/lensLibrary.ts` with community normalization and shared snapshot/install-state helpers.
   - Extend existing catalog tests for community template conversion and install-state behavior.

4. **Community hook**
   - Add `useCommunityLenses`.
   - Add hook/unit tests for query key shape, local validators, and mutation behavior with mocked Supabase.

5. **Lens management publishing**
   - Add publish/unpublish controls and status display.
   - Add publish review route/screen.
   - Add smoke tests for eligible vs ineligible lenses and validation states.

6. **Community browse and preview**
   - Add Curated/Community tabs, search, filters, cards, community preview, install, and report.
   - Preserve existing curated tests and add community screen/preview tests.

7. **Backend E2E**
  - Add Supabase E2E test covering publish, public browse, install copy, source metadata, duplicate active report prevention, unpublish install blocking, and delist install blocking.
   - Include direct `lenses` insert spoof attempt and source-lens edit version-sync assertions.

8. **Mobile flow verification**
   - Add or run the flow described in [FLOW_VERIFICATION_PLAN.md](./FLOW_VERIFICATION_PLAN.md).

## Verification Plan

Unit/static tests:

- `npm run test:root`
  - Migration includes new tables, public view, indexes, RLS, RPCs, triggers, constraints, and rollback comments.
  - Shared Supabase types include new table/enums/functions.
- `npm run test -w @notesbrain/mobile`
  - Existing Lens Library curated tests still pass.
  - Community template conversion and install-state tests.
  - Lens management publish control eligibility tests.
  - Publish review validation and accessibility tests.
  - Community list search/filter/render and accessibility tests.
  - Community preview install/report and accessibility tests.
  - Accessibility tests assert labels, disabled state, selected state, visible text status, and 44 by 44 point minimum style for main controls.

Backend E2E:

- `npm run test:e2e:backend`
  - Publish own user-created lens.
  - Reject publishing installed template copies.
  - Read public template from another signed-in user.
  - Install creates user-owned `lenses` row with copied fields and source metadata.
  - Existing installed copies do not change when source template is edited.
  - Source template gets a new version when an author edits a versioned field on a public source lens.
  - Unpublished/hidden/delisted templates cannot be newly installed.
  - Hidden/delisted templates cannot be republished by authors.
  - Direct client insert with community `source_template_id` is blocked outside `install_lens_template`.
  - Second report submission by the same reporter/template returns the existing active report without changing it.

Full repo gates:

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run verify` when implementation is complete.

## Open Technical Questions

None blocking for implementation planning.

Technical assumptions:

- Community templates use UUID ids stored as text in existing `lenses.source_template_id`.
- First page of community templates is limited to 100 rows.
- Publish review adds a required template description field without changing the source lens.
- Manual operator delisting is done by setting `lens_templates.status` in Supabase admin.
