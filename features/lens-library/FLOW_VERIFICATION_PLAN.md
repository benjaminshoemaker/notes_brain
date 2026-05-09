# Flow Verification Plan: lens-library

Status: Applicable

## Flow Claim

A signed-in mobile user can choose `Browse Lens Library`, preview a curated lens, add it to their account, edit it as a normal lens, and then see that the installed lens is a user-owned copy whose execution uses the copied `lenses` row rather than a live-linked template.

## Channel Under Test

Mobile app plus database-backed `lenses` read/write path.

This flow should not be verified only through static tests because the product claim is a user-facing mobile creation flow. Static tests are still useful for schema/type alignment.

## Harness Shape

Use a layered harness:

1. Mobile Vitest smoke tests for route-level behavior and install payload construction.
2. Root static tests for migration/shared-type/source-metadata alignment.
3. Agent-run mobile smoke pass using Expo MCP or emulator, after implementation, for the real UI path.
4. Optional local Supabase verification if the agent has the local Supabase stack running.

## Setup / State

- Seeded curated templates are bundled in `apps/mobile/lib/lensLibrary.ts`.
- Test user auth should use the existing mobile auth/test setup when running on emulator.
- The agent should start from a user with fewer than 10 lenses, or delete a test-created lens before rerun.
- No private user data is required.
- No external marketplace, server template table, or community account is required.

## Driver

Automated/unit driver:

```bash
npm run test:root
npm run test -w @notesbrain/mobile
```

Agent mobile driver:

1. Start mobile dev server with MCP support:

   ```bash
   npm run dev:mobile:mcp
   ```

2. Open the app on iOS or Android emulator using the repo's AGENTS.md emulator instructions.
3. Sign in with a test account.
4. Navigate to Summary.
5. Tap `+`.
6. Tap `Browse Lens Library`.
7. Open a curated lens preview.
8. Tap `Add to My Lenses`.
9. Confirm the app shows the created lens in Manage Lenses or allows editing it.
10. Open the created lens in the existing lens form and verify fields are editable.

Optional database driver:

1. Query the newest `lenses` row for the test user.
2. Confirm copied fields match the selected template.
3. Confirm `source_template_id`, `source_template_version`, and `installed_from_library_at` are populated.

## Assertions

Pass conditions:

- `+` no longer routes directly to a blank lens form.
- `Create your own` still opens the current blank lens form.
- `Browse Lens Library` shows curated templates.
- Preview shows name, description, prompt or prompt details, cadence, categories, and lookback window.
- Install creates a normal `lenses` row for the current user.
- Installed lens appears in existing management UI.
- Installed lens can be edited through `lens-form`.
- Installed lens source metadata is present when the migration/schema is part of the implementation.
- Installed lens prompt/schedule/filter values are stored on the `lenses` row.
- Existing default `Morning Briefing` lenses are recognized as installed from the `morning-briefing` template after migration.

Negative assertions:

- Installing does not create or require a separate execution pipeline.
- A user who already has the default `Morning Briefing` lens is not shown a misleading uninstalled state for the `Morning Briefing` library template.
- Editing the installed lens does not mutate bundled template data.
- Updating bundled template data in code would not silently alter an existing installed lens row.
- The install flow does not bypass the existing max-10-lenses constraint.

## Evidence

Keep:

- Test command output.
- Emulator screenshots for choice screen, library list, preview, and installed lens form.
- If local Supabase is used, a redacted SQL result for the installed `lenses` row showing source metadata and copied fields.

## Teardown / Rerun

- Delete the test-created lens through the app or direct local Supabase cleanup.
- Use unique template install names only if duplicate installs are allowed; otherwise rerun after deletion.
- Reuse the same test account only if cleanup succeeds.
- Screenshots may be overwritten between runs unless debugging a failure.

## Open Decisions

None blocking v1 flow verification.
