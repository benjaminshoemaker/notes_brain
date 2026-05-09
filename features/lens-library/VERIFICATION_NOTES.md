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

## Data Checks

Expected installed lens row fields after a successful add:

- `source_template_id = 'morning-briefing'`
- `source_template_version = 1`
- `installed_from_library_at` is non-null
- `template_snapshot` contains copied template content

The automated tests verify this payload shape before persistence.

## Current Blocker

The emulator was available and selector-based navigation worked through preview. The final install-to-edit flow could not be completed because the current signed-in test account returned the generic app error alert when tapping `Add to My Lenses`. The existing app alert path hides the underlying Supabase error message, so the remaining browser evidence needs either a clean test account or temporary diagnostic logging for the create mutation.

## Teardown

Stop Metro with `Ctrl+C`.

If a test lens is created while rerunning the flow, remove that lens from the test account after screenshot and SQL evidence are captured.
