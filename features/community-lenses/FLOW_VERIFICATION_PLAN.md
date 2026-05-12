# Flow Verification Plan: community-lenses

Status: Applicable

## Flow Claim

A signed-in mobile user can publish one of their own saved lenses to Community, another signed-in user can find it in the Lens Library Community tab, preview it, install a copied lens, and the installed copy remains private and unchanged when the source template is unpublished or delisted.

## Channel Under Test

Mobile app plus Supabase local backend.

The real product claim is a mobile workflow, so browser-only or SQL-only verification is not enough. Backend E2E should still cover RLS/RPC edge cases, but final flow evidence should drive the mobile app.

## Harness Shape

Use a two-layer harness:

1. Backend E2E test for deterministic database/RPC behavior.
2. Mobile flow verification on Expo dev-client using stable `testID` selectors and seeded local Supabase data.

Recommended commands after implementation:

```bash
npm run test:e2e:backend
npm run dev:mobile:mcp
```

Then drive the app with Expo automation tools or the repo's mobile E2E runner if the implementation adds a Detox spec.

## Setup And State

Required state:

- Local Supabase running with migration `00010_community_lenses.sql` applied.
- Two test users:
  - author user
  - installer user
- Author user has one saved user-created lens with `source_template_id IS NULL`.
- Author user has one installed library lens with `source_template_id IS NOT NULL` to verify publish is blocked.
- Installer user has no installed copy of the community template at flow start.

Preferred setup:

- Add `scripts/e2e/seed-community-lenses-flow.mjs`.
- Use Supabase admin client to create users and clean all rows for those users before each run.
- Seed the author-owned lens directly through Supabase.
- Avoid real private notes. The flow does not require note content or lens execution.

## Driver

Author path:

1. Sign in as author.
2. Open Lenses management.
3. Verify the installed library lens does not expose Publish.
4. Tap Publish on the eligible user-created lens.
5. Review template fields.
6. Enter valid author display name and description.
7. Confirm publish.
8. Verify lens management shows the lens as Public.

Installer path:

1. Sign out and sign in as installer.
2. Open Lens Library.
3. Switch to Community tab.
4. Search or filter until the seeded template is visible.
5. Open preview.
6. Verify author display name, prompt-public template details, cadence, lookback, category, install count, and install action.
7. Tap Add to My Lenses.
8. Verify confirmation and Manage Lenses shows the copied lens.

Post-install stability path:

1. Use Supabase admin or author session to unpublish or delist the template.
2. As installer, verify the copied lens remains in Manage Lenses.
3. Verify the template no longer appears in Community and cannot be newly installed.

## Assertions

Success assertions:

- Publish review displays the prompt-public warning.
- Publish is blocked without a valid display name.
- Publish is unavailable for installed template copies.
- Community tab shows the published template to a different signed-in user.
- Install creates a new `lenses` row owned by the installer.
- Installed row contains copied name, prompt, schedule, lookback, categories, `source_template_id`, `source_template_version`, `installed_from_library_at`, and `template_snapshot`.
- Installed row has no access to author notes or results.
- `lens_templates.install_count` increments after successful install.
- Public browse evidence comes from public mobile UI or the `community_lens_templates_public` view, not from raw `lens_templates` rows that include internal ids.
- Unpublish/delist removes the template from Community browse/search and blocks new installs.
- Hidden/delisted templates cannot be republished from the author path.
- Editing a versioned field on the author's public source lens creates a new template version without changing the installer's copied lens.
- Existing installed copies remain present after unpublish/delist.

Negative assertions:

- No publisher notes, generated results, run history, or installer identities appear in public template rows or mobile UI.
- No `author_user_id` or `source_lens_id` appears in public browse/preview UI or public-view snapshots.
- Duplicate active report from the same user/template returns the existing active report without changing reason/note.
- A hidden/delisted template cannot be installed through the RPC even if the client has a stale template id.
- Direct client insert into `lenses` with a community template id in `source_template_id` is rejected outside the install RPC.
- Accessibility checks confirm labels for publish/unpublish, report, search/filter, confirmation actions, text-visible public/private status, and 44 by 44 point touch targets for the main controls.

## Evidence

Keep artifacts under:

```text
artifacts/community-lenses/end-to-end/
```

Evidence to retain:

- Mobile screenshots or automation snapshots for:
  - publish review
  - Community tab listing
  - community preview
  - installed copy in Manage Lenses
  - Community tab after unpublish/delist
- Backend E2E output.
- JSON snapshot of relevant rows:
  - `lens_templates`
  - `lens_template_versions`
  - `lens_template_installs`
  - installer's copied `lenses` row
  - `lens_template_reports` when report flow is included

## Teardown And Rerun

Each run should:

1. Delete seeded users' community reports, installs, templates, lens results, and lenses.
2. Recreate the author and installer users if needed.
3. Seed fresh author-owned lenses.
4. Use unique template/lens names with a run id.
5. Keep artifacts from failed runs for debugging.

The harness is rerunnable if cleanup keys by test user ids and run id rather than broad table truncation.

## Open Decisions

None blocking.

The implementation can choose Expo MCP automation or Detox for the final mobile driver. The required verification claim and evidence are the same either way.

FLOW_VERIFICATION_DISCOVERY_RESULT
==================================
Status: APPLICABLE
Flow: A signed-in mobile user publishes a lens to Community, another signed-in user installs a copied lens, and installed copies remain private and stable after unpublish/delist.
Harness: Backend E2E plus mobile app flow with seeded local Supabase users and stable testID selectors.
Command: npm run test:e2e:backend, then npm run dev:mobile:mcp with Expo automation or a dedicated mobile E2E spec.
