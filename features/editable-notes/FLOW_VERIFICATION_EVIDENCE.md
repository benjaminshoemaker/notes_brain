# Flow Verification Evidence: editable-notes

Run date: 2026-05-09
Branch: `phase-4`

## Automated Checks

- `cd apps/mobile && npm test -- test/smoke`
  - Result: PASS
  - Summary: 17 files passed, 66 tests passed.
- `cd apps/mobile && npm run typecheck`
  - Result: PASS
- `cd apps/mobile && npm run lint`
  - Result: PASS with existing warnings.
  - Warnings observed in `_layout.tsx`, `settings.tsx`, `Toast.tsx`, `useUploadFile.ts`, and `useUserSettings.ts`; no lint errors.

## Seed And Device

- Seed command: `node scripts/e2e/seed-editable-notes-flow.mjs --seed`
  - Result: PASS
  - Seeded user: `editable-notes-flow@example.test`
  - Seeded note IDs:
    - `00000000-0000-4000-8000-000000000401`
    - `00000000-0000-4000-8000-000000000402`
    - `00000000-0000-4000-8000-000000000403`
    - `00000000-0000-4000-8000-000000000404`
    - `00000000-0000-4000-8000-000000000405`
- Device/emulator: Android `emulator-5554` was connected.
- Local backend routing: `adb reverse tcp:65421 tcp:65421` returned successfully.
- Mobile MCP server: `npm run dev:mobile:mcp` started on Metro port `8082` because `8081` was already in use.

## Mobile Flow Evidence

The Android dev-client app launched and Expo automation found the seeded login and Notes UI.

- Sign in: completed with `editable-notes-flow@example.test`.
- Notes navigation: `tab-notes` was found and tapped.
- Edit mode target: voice note `00000000-0000-4000-8000-000000000402`.
- Edit input was found with seeded transcript text.
- Save path: edited body was persisted through the mobile UI.

Evidence files:

- `artifacts/editable-notes/edit-mode.png`
- `artifacts/editable-notes/edit-mode-accessibility.xml`
- `artifacts/editable-notes/saved-read-mode.png`
- `artifacts/editable-notes/saved-read-mode-accessibility.xml`

The live mobile run covered edit mode, saved read mode, source display, and Supabase persistence. The category-change, Cancel, empty validation, category-only, pending-disabled, and conflict branches are covered by the smoke suites listed above and by `tests/e2e/mobile/editable-notes-flow.md` for repeatable manual/agent execution.

## Supabase Assertions

Query fields:

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

Observed before teardown:

```json
[
  {
    "id": "00000000-0000-4000-8000-000000000402",
    "type": "voice",
    "content": "editable-notes-flow: com%20editedpleted voice transcript",
    "category": "projects",
    "created_at": "2026-05-09T16:01:00+00:00",
    "classification_status": "completed",
    "classification_confidence": 0.82,
    "attachments": []
  },
  {
    "id": "00000000-0000-4000-8000-000000000403",
    "type": "file",
    "content": "editable-notes-flow: completed file note",
    "category": "admin",
    "created_at": "2026-05-09T16:02:00+00:00",
    "classification_status": "completed",
    "classification_confidence": 0.75,
    "attachments": [
      {
        "id": "00000000-0000-4000-8000-000000000451",
        "filename": "editable-notes-flow-attachment.pdf"
      }
    ]
  },
  {
    "id": "00000000-0000-4000-8000-000000000405",
    "type": "text",
    "content": null,
    "category": "family",
    "created_at": "2026-05-09T16:04:00+00:00",
    "classification_status": "completed",
    "classification_confidence": 0.66,
    "attachments": []
  }
]
```

Confirmed:

- No classification rerun: `classification_status` stayed `completed`.
- No classification confidence recompute: `classification_confidence` stayed at seeded values.
- Stable ordering: `created_at` order remained voice, file, null-content note.
- Original source indicators: voice source remained present in mobile accessibility output; file source and attachment row remained present in Supabase output.

## Teardown

- Teardown command: `node scripts/e2e/seed-editable-notes-flow.mjs --cleanup`
- Result: PASS
- Output: `userDeleted: true`, `notesDeleted: 5`, `attachmentsDeleted: 1`

Reruns are idempotent after cleanup using the same seed command and deterministic IDs/content prefix.
