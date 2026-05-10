# Lens Library Verification Notes

## Driver

Start the mobile dev server with Expo MCP support from the repo root:

```bash
npm run dev:mobile:mcp
```

Open the app in a development build:

```bash
cd apps/mobile && npx expo run:ios
```

Use Expo automation with `platform: "ios"` and testID selectors where available.

## Expected Flow

1. Open the Lenses tab.
2. Tap the Summary/Lenses header `+`.
3. Verify the choice screen shows `Create your own` and `Browse Lens Library`.
4. Tap `Browse Lens Library`.
5. Verify the library list shows curated lenses including `Morning Briefing`.
6. Open `Morning Briefing`.
7. Verify preview details include cadence, lookback, categories, and prompt details.
8. Tap `Add to My Lenses`.
9. Confirm the installed lens appears in lens management.
10. Open edit and verify the existing `lens-form` route renders for the installed lens.

## Evidence

- Route sitemap contained `/lens-create`, `/lens-library`, `/lens-library-preview`, `/lens-manage`, and `/summary`.
- iOS simulator evidence showed the choice screen with `Create your own` and `Browse Lens Library`.
- iOS simulator evidence showed the browse list with `Morning Briefing`, `Tomorrow Planner`, `Weekly Project Pulse`, `Health Pattern Check`, and `Relationship Reminders`.
- iOS simulator evidence showed the preview screen for `Morning Briefing` with cadence, lookback, category, categories, and prompt details sections.
- Install attempt produced an app alert: `Couldn't add lens` / `Please try again.`
- Screenshot artifact: `features/lens-library/evidence/screenshots/ios-install-failure.png`
- Root cause found on 2026-05-10: local Supabase had only migrations `00001` through `00007`, so `lenses` was missing `source_template_id`, `source_template_version`, `installed_from_library_at`, and `template_snapshot`.
- Applied pending local migrations with `supabase migration up`; local schema now has migrations `00001` through `00009`.
- Verified local `notesbrain-e2e@example.com` Morning Briefing was backfilled with `source_template_id = 'morning-briefing'` and `source_template_version = 1`.
- Verified a normal authenticated anon-client insert with source metadata succeeds for clean local account `notesbrain-lens-library-e2e@example.com`; inserted row had `source_template_id = 'tomorrow-planner-smoke'`, `source_template_version = 1`, and non-null `next_run_at`, then was deleted as teardown.
- Automated verification after applying migrations: `npm run test:root`, `npm run test -w @notesbrain/mobile`, `npm run typecheck -w @notesbrain/shared`, `npm run typecheck -w @notesbrain/mobile`, and `npm run lint -w @notesbrain/mobile` all passed. Mobile lint emitted 3 pre-existing warnings and 0 errors.
- Rebuilt and reopened the iOS dev build with `cd apps/mobile && npx expo run:ios`.
- Fresh iOS emulator flow showed Morning Briefing as `Installed` after migration backfill, opened `Tomorrow Planner`, tapped `Add to My Lenses`, and received the success alert `Added to My Lenses` / `You can edit it anytime.`
- Tapping `View` routed to the existing lens management screen; the local database showed a new `Tomorrow Planner` row with `source_template_id = 'tomorrow-planner'`, `source_template_version = 1`, and non-null `installed_from_library_at`.
- The existing library-backed Morning Briefing row opened the normal editable `lens-form-screen`, proving installed library lenses remain editable through the existing form route.
- Screenshot artifact: `features/lens-library/evidence/screenshots/ios-lens-form-after-install.png`

## Data Checks

Expected installed lens row fields after a successful add:

- `source_template_id = 'morning-briefing'`
- `source_template_version = 1`
- `installed_from_library_at` is non-null
- `template_snapshot` contains copied template content

The automated tests verify this payload shape before persistence.

## Current Status

The original install failure is resolved. The local database is migrated, the authenticated insert path succeeds, and the fresh iOS emulator flow now reaches success, lens management, and the existing edit form for an installed library-backed lens.

## Teardown

Stop Metro with `Ctrl+C`.

If a test lens is created while rerunning the flow, remove that lens from the test account after screenshot and SQL evidence are captured.
