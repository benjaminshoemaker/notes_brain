# Flow Verification Plan: editable-notes

Status: Applicable

## Flow Claim

A signed-in mobile user can open the Notes tab, edit one existing note inline, change its body and category, save it, and then see the updated note remain in its original list position without triggering reclassification.

## Channel Under Test

Mobile app UI plus Supabase-backed notes data path.

The agent verifies through the Expo mobile surface when an emulator or device is available, not only by calling the Supabase client directly, because the feature is primarily an inline card editing interaction.

## Harness Shape

Use a layered harness:

- Vitest/react-test-renderer tests for deterministic component and hook behavior.
- An agent-runnable mobile smoke flow using the existing `npm run dev:mobile:mcp`/Expo automation path when an emulator or device is available.
- Supabase local database assertions for persistence, ordering, and classification fields.

## Setup/State

- Local Supabase stack with a test user.
- Seed at least four notes owned by that user:
  - completed text note with content and category `ideas`;
  - completed voice note with transcript content and category `uncategorized`;
  - completed file note with filename-like content and one attachment row;
  - pending note that is not editable.
- Ensure notes have distinct `created_at` values so ordering assertions are deterministic.
- If running on Android against local Supabase, run `adb reverse tcp:65421 tcp:65421` before launching the app.

## Driver

1. Start the mobile MCP dev server from repo root:

   ```bash
   npm run dev:mobile:mcp
   ```

2. Launch the mobile app on iOS simulator or Android emulator/device.
3. Sign in as the seeded test user.
4. Open the Notes tab.
5. Tap Edit on the middle completed note.
6. Change the body text and choose a different existing category.
7. Confirm other notes' edit controls are disabled.
8. Save.
9. Reopen the same note and test Cancel by changing text/category and canceling.
10. Attempt an empty body save and verify inline validation.
11. Attempt to edit the pending note and verify editing is unavailable.

## Assertions

- Edited body appears in the note card after save.
- Edited category appears in the note card and category filter behavior reflects it.
- The note's relative list position is unchanged after save.
- The note's `classification_status` is not reset to `pending`.
- The note's `classification_confidence` is not recomputed by the edit save.
- No classify-note invocation is triggered by the edit save path.
- Other edit controls are disabled while one note is editing.
- Cancel discards local draft changes.
- Empty body save is blocked with inline validation.
- Category-only save works for a note that starts with null or empty body content.
- Pending note has no active edit flow.
- Voice/file note source indicators remain visible after edit.
- Active draft is discarded when the agent navigates away from the Notes tab and returns.

## Evidence

- Test output from `cd apps/mobile && npm test`.
- Screenshot or accessibility-tree snapshot of:
  - edit mode;
  - disabled other-note edit controls;
  - saved read mode;
  - empty-body validation.
- Optional Supabase query output showing the edited row's `content`, `category`, `created_at`, `updated_at`, `classification_status`, and `classification_confidence`.

## Teardown/Rerun

- Use deterministic test user and deterministic note content prefixes.
- Before each run, delete seeded notes for that test user by content prefix or recreate the local Supabase database from migrations/seeds.
- Keep screenshots/logs under `artifacts/` or `test-results/` for failed runs.
- Reruns are idempotent after seed cleanup.

## Open Decisions

None blocking. The exact seed script location and mobile automation selectors are finalized during `/feature-plan`.
