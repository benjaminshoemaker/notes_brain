# Editable Notes Mobile Flow

This runbook verifies the seeded editable-notes flow through the mobile UI and Supabase row state.

Coverage map: setup, driver, assertions, evidence, teardown.

## Setup

1. Start or refresh local Supabase from the repo root.

   ```bash
   npx supabase status -o env >/tmp/notesbrain-supabase-env.txt
   ```

2. Seed deterministic test data.

   ```bash
   node scripts/e2e/seed-editable-notes-flow.mjs --seed
   ```

3. For Android against the local backend, apply reverse port forwarding.

   ```bash
   adb reverse tcp:65421 tcp:65421
   ```

4. Start the mobile MCP dev server.

   ```bash
   npm run dev:mobile:mcp
   ```

5. Launch the app on an iOS simulator or Android emulator/device.

## Seeded Account

- Email: `editable-notes-flow@example.test`
- Password: `EditableNotesFlow123!`
- Cleanup: `node scripts/e2e/seed-editable-notes-flow.mjs --cleanup`

The seed includes completed text, completed voice, completed file with attachment, pending, and category-only null-content notes. Reruns are idempotent after cleanup because notes use deterministic IDs and the `editable-notes-flow` content prefix.

## Selectors

Use the centralized selectors from `apps/mobile/lib/testIds.ts`.

- Notes tab: `tab-notes`
- Notes list: `notes-list`
- Note card: `notes-card-${noteId}`
- Edit button: `notes-edit-${noteId}` from `editButton(noteId)`
- Edit input: `notes-edit-input-${noteId}` from `editInput(noteId)`
- Category option: `notes-edit-category-${noteId}-${category}` from `categoryOption(noteId, category)`
- Save button: `notes-edit-save-${noteId}` from `saveButton(noteId)`
- Cancel button: `notes-edit-cancel-${noteId}` from `cancelButton(noteId)`
- Validation error: `notes-edit-error-${noteId}` from `editError(noteId)`
- Conflict message: `notes-edit-conflict-${noteId}` from `editConflict(noteId)`

## Driver

1. Sign in with the seeded account.
2. Open the Notes tab with `tab-notes`.
3. On the completed voice note `00000000-0000-4000-8000-000000000402`, tap Edit.
4. Capture edit mode evidence:
   - screenshot: `artifacts/editable-notes/edit-mode.png`
   - accessibility tree: `artifacts/editable-notes/edit-mode-accessibility.json`
5. Assert the multiline edit input is visible and contains the seeded voice transcript.
6. Assert other notes' Edit controls are disabled while this editor is open.
7. Change the body to `editable-notes-flow: edited voice transcript`.
8. Select an existing category option, for example `health`.
9. Tap Save.
10. Capture saved read mode evidence:
    - screenshot: `artifacts/editable-notes/saved-read-mode.png`
    - accessibility tree: `artifacts/editable-notes/saved-read-mode-accessibility.json`
11. Assert the card still appears in the same created_at list position and shows the saved body/category.
12. Reopen the same note, change text/category, tap Cancel, and assert the saved read mode text/category remain unchanged.
13. Reopen the same note, clear the body to whitespace, and assert Save is disabled and `editError(noteId)` shows empty validation.
14. On the null-content note `00000000-0000-4000-8000-000000000405`, tap Edit, change only the category, tap Save, and assert category-only save succeeds.
15. On the pending note `00000000-0000-4000-8000-000000000404`, assert the Edit control is disabled and does not enter edit mode.
16. Confirm the voice source indicator remains visible after saving the voice note.
17. Confirm the file source indicator and attachment count remain visible after editing the file note `00000000-0000-4000-8000-000000000403`.

## Supabase Assertions

Record row output in `features/editable-notes/FLOW_VERIFICATION_EVIDENCE.md`.

```sql
select id, type, content, category, created_at, updated_at,
       classification_status, classification_confidence
from notes
where id in (
  '00000000-0000-4000-8000-000000000402',
  '00000000-0000-4000-8000-000000000403',
  '00000000-0000-4000-8000-000000000405'
)
order by created_at asc;
```

Expected:

- Updated content/category are persisted.
- `created_at` ordering remains stable.
- `classification_status` is not reset to `pending`.
- `classification_confidence` is unchanged by save.
- File note still has its attachment row.

## Evidence

Keep successful or failed-run evidence under `artifacts/editable-notes/` or `test-results/editable-notes/`.

Required captures:

- edit mode screenshot and accessibility tree
- disabled other-note edit controls
- saved read mode screenshot and accessibility tree
- empty validation screenshot or accessibility tree
- Supabase row output with `classification_status` and `classification_confidence`
- seed command output and teardown command output

## Teardown

```bash
node scripts/e2e/seed-editable-notes-flow.mjs --cleanup
```

After cleanup, rerun `--seed` for an idempotent fresh run. If the app or emulator fails mid-run, keep partial screenshots, accessibility snapshots, and logs in `artifacts/` or `test-results/` before cleanup.
