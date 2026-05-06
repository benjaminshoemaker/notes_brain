# Session Learnings

> Persistent knowledge extracted from AI coding sessions.
> Captures decisions, context, action items, and insights that should survive between sessions.
> Add entries with `/capture-session` (full sweep) or `/capture-learning` (single item).

## Decisions

- **[2026-05-05]** Custom lenses are complete and should be treated as closed unless a new plan explicitly reopens them. `plans/PLAN_STATUS.md` is the repo-level plan authority; only a plan marked `active` is implementable, and `features/custom-lenses/EXECUTION_PLAN.md` is now completed. *(source: conversation and plan closeout)*
- **[2026-05-05]** Physical Android push verification should use a native Android build, not Expo Go, because the backend sends native FCM tokens and Expo Go does not represent the production push path. *(source: device verification)*
- **[2026-05-05]** Real dogfooding should use a production-pointed Android APK backed by hosted Supabase, not a local Supabase build with `adb reverse`; local builds are only suitable for USB-connected development. *(source: hosted dogfood setup)*

## Action Items

- [ ] **[2026-05-05]** Verify hosted Supabase `pg_cron` is actively firing `dispatch-lenses` on schedule, using the Supabase SQL/dashboard cron job list and recent job run details. — Owner: future agent/user
- [ ] **[2026-05-05]** When ready for non-sideloaded dogfooding, replace the debug-signed local release install path with a proper distribution build path. — Owner: future agent/user

## Context

- **[2026-05-05]** Hosted Supabase project for dogfooding is `notesbrain`, ref `zdgclcjbcjvnfajdofun`, URL `https://zdgclcjbcjvnfajdofun.supabase.co`. Migrations `00001` through `00007` and Edge Functions `classify-note`, `transcribe-voice`, `generate-summary`, `send-push`, `execute-lens`, and `dispatch-lenses` were present on the hosted project. *(source: Supabase CLI and hosted health checks)*
- **[2026-05-05]** Physical Android test phone is serial `55181JEBF04267` (`Pixel_9a`). The hosted release APK installed successfully and opened after removing all `adb reverse` tunnels, confirming it was not dependent on local Supabase or Metro. *(source: Android device testing)*
- **[2026-05-05]** Hosted push delivery was verified for `notesbrain-e2e@example.com`: hosted `devices` had a fresh Android native FCM token, hosted `send-push` returned `tokens_sent: 1`, `lens_results.sent_at` updated, and Android notification manager showed the expected hosted notification. *(source: hosted push verification)*

## Bugs & Issues

- **[2026-05-05]** Editing a non-default lens could open stale Morning Briefing data because the mobile edit form only hydrated once. Fixed in `apps/mobile/app/(app)/lens-form.tsx` by rehydrating when `lensId` changes, and `apps/mobile/app/(app)/lens-manage.tsx` now routes edit actions with an object route carrying `lensId`. *(source: bug report and code fix)*
- **[2026-05-05]** Android `npx expo run:android --device "$PHONE_SERIAL"` can fail because Expo expects a device name rather than the ADB serial; direct Gradle build plus `adb -s <serial> install` is more reliable when an emulator and physical device are both attached. *(source: Android install troubleshooting)*
- **[2026-05-05]** A previously installed `com.notesbrain.echo` build can block install with `INSTALL_FAILED_UPDATE_INCOMPATIBLE` when signatures differ. Uninstalling the old package resolves it, but it clears local app data only; hosted data is unaffected. *(source: Android install troubleshooting)*

## Deferred Investigations

- **[2026-05-05]** Confirm whether the large `.claude/skills` to `.claude/skills.bak` toolkit migration should remain committed in this repo or be handled as global/shared tooling outside the app repository. *(source: dirty worktree inspection)*
- **[2026-05-05]** Consider improving mobile sign-in automation or adding a reliable test-only auth path; ADB text input mishandled special characters/case during hosted E2E login automation. *(source: device automation troubleshooting)*
