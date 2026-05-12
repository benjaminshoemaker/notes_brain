# Session Learnings

> Persistent knowledge extracted from AI coding sessions.
> Captures decisions, context, action items, and insights that should survive between sessions.
> Add entries with `/capture-session` (full sweep) or `/capture-learning` (single item).

## Decisions

- **[2026-05-05]** Custom lenses are complete and should be treated as closed unless a new plan explicitly reopens them. `plans/PLAN_STATUS.md` is the repo-level plan authority; only a plan marked `active` is implementable, and `features/custom-lenses/EXECUTION_PLAN.md` is now completed. *(source: conversation and plan closeout)*
- **[2026-05-05]** Physical Android push verification should use a native Android build, not Expo Go, because the backend sends native FCM tokens and Expo Go does not represent the production push path. *(source: device verification)*
- **[2026-05-05]** Real dogfooding should use a production-pointed Android APK backed by hosted Supabase, not a local Supabase build with `adb reverse`; local builds are only suitable for USB-connected development. *(source: hosted dogfood setup)*
- **[2026-05-08]** Capture should use a single composer instead of separate "Text Note" and "Voice Note" sections. The user preferred the ChatGPT/Claude-style model because it removes the mode-choice step while keeping text save and microphone capture in one surface. *(source: conversation and capture UI implementation)*
- **[2026-05-08]** Mobile capture actions should use real Ionicons, especially `mic-outline` for voice capture, not placeholder glyphs or emoji-style stand-ins. This matches the project mobile design guidance and existing icon system. *(source: conversation and capture UI implementation)*
- **[2026-05-10]** Lens Library v1 is complete and should be treated as closed unless a new plan explicitly reopens it. `plans/PLAN_STATUS.md`, `features/lens-library/EXECUTION_PLAN.md`, and `features/lens-library/.claude/phase-state.json` all mark the feature complete. *(source: conversation, plan closeout, and full-flow verification)*
- **[2026-05-10]** Community lenses are a separate future feature, not part of Lens Library v1. Community creation, publishing, discovery, and leaderboard work is captured in `features/community-lenses/NOTES.md` as planned discovery. *(source: conversation and feature note)*
- **[2026-05-10]** Community lens installs should keep the copy-on-install trust model: published templates can be installed into a user account, but installed lenses should remain user-owned copies and should not silently mutate when the public template changes. *(source: conversation and Lens Library implementation model)*

## Action Items

- [ ] **[2026-05-05]** Verify hosted Supabase `pg_cron` is actively firing `dispatch-lenses` on schedule, using the Supabase SQL/dashboard cron job list and recent job run details. — Owner: future agent/user
- [ ] **[2026-05-05]** When ready for non-sideloaded dogfooding, replace the debug-signed local release install path with a proper distribution build path. — Owner: future agent/user
- [ ] **[2026-05-08]** Verify the new single capture composer in a real mobile runtime, including text save, microphone permission, recording, cancel, and stop/save upload behavior. — Owner: future agent/user
- [ ] **[2026-05-10]** Push local commit `eda9224 docs: Add community lenses feature note` if it should be published to `origin/main`. At capture time, local `main` was ahead of `origin/main` by this commit. — Owner: next agent/user action
- [ ] **[2026-05-10]** Plan community lenses from `features/community-lenses/NOTES.md` when ready for formal feature-spec and technical-spec work. — Owner: future feature planning session

## Context

- **[2026-05-05]** Hosted Supabase project for dogfooding is `notesbrain`, ref `zdgclcjbcjvnfajdofun`, URL `https://zdgclcjbcjvnfajdofun.supabase.co`. Migrations `00001` through `00007` and Edge Functions `classify-note`, `transcribe-voice`, `generate-summary`, `send-push`, `execute-lens`, and `dispatch-lenses` were present on the hosted project. *(source: Supabase CLI and hosted health checks)*
- **[2026-05-05]** Physical Android test phone is serial `55181JEBF04267` (`Pixel_9a`). The hosted release APK installed successfully and opened after removing all `adb reverse` tunnels, confirming it was not dependent on local Supabase or Metro. *(source: Android device testing)*
- **[2026-05-05]** Hosted push delivery was verified for `notesbrain-e2e@example.com`: hosted `devices` had a fresh Android native FCM token, hosted `send-push` returned `tokens_sent: 1`, `lens_results.sent_at` updated, and Android notification manager showed the expected hosted notification. *(source: hosted push verification)*
- **[2026-05-08]** The single-composer capture implementation was committed as `ebb79a5 task(capture): Add single composer capture UI`. It changed `apps/mobile/app/(app)/index.tsx`, `apps/mobile/components/CaptureInput.tsx`, `apps/mobile/components/VoiceRecorder.tsx`, `apps/mobile/test/smoke/capture-screen.test.tsx`, and the capture mockup artifacts. *(source: git commit and conversation)*
- **[2026-05-10]** Lens Library completion evidence includes curated bundled templates, lens source metadata/backfill, install/edit/management paths, and committed iOS screenshots under `features/lens-library/evidence/screenshots/full-flow/`. The closing commits are `c2f6e6a task(4.2.A): Close lens library verification` and `ca66e84 test(lens-library): Add full flow screenshots`. *(source: git commits and simulator verification)*
- **[2026-05-10]** `features/community-lenses/NOTES.md` is the durable planning note for future community lens creation, publishing, browse/install, leaderboards, trust/moderation, data model, phases, open questions, and non-goals. The note was committed as `eda9224 docs: Add community lenses feature note`. *(source: feature note and git commit)*

## Bugs & Issues

- **[2026-05-05]** Editing a non-default lens could open stale Morning Briefing data because the mobile edit form only hydrated once. Fixed in `apps/mobile/app/(app)/lens-form.tsx` by rehydrating when `lensId` changes, and `apps/mobile/app/(app)/lens-manage.tsx` now routes edit actions with an object route carrying `lensId`. *(source: bug report and code fix)*
- **[2026-05-05]** Android `npx expo run:android --device "$PHONE_SERIAL"` can fail because Expo expects a device name rather than the ADB serial; direct Gradle build plus `adb -s <serial> install` is more reliable when an emulator and physical device are both attached. *(source: Android install troubleshooting)*
- **[2026-05-05]** A previously installed `com.notesbrain.echo` build can block install with `INSTALL_FAILED_UPDATE_INCOMPATIBLE` when signatures differ. Uninstalling the old package resolves it, but it clears local app data only; hosted data is unaffected. *(source: Android install troubleshooting)*
- **[2026-05-08]** The initial capture mockup used a placeholder dot instead of a microphone icon. Fixed in the mockup artifact and implemented in-app with `Ionicons name="mic-outline"`. *(source: conversation and mockup correction)*
- **[2026-05-10]** Local Supabase Lens Library installs failed because the local database had only migrations `00001` through `00007`, so `lenses` lacked Lens Library metadata columns. Running `supabase migration up` applied `00008_lens_library.sql` and `00009_consolidate_lens_scheduling.sql`; `Morning Briefing` was backfilled with `source_template_id='morning-briefing'`, and later installs succeeded. Status: fixed locally and verified in the iOS full-flow pass. *(source: migration debugging and simulator verification)*
- **[2026-05-10]** If simulator automation appears stuck in the Expo dev launcher or stale bundle, rebuild/reopen the dev build with `cd apps/mobile && npx expo run:ios` before rerunning Expo automation. Status: workaround verified during Lens Library flow testing. *(source: simulator troubleshooting)*

## Deferred Investigations

- **[2026-05-05]** Confirm whether the large `.claude/skills` to `.claude/skills.bak` toolkit migration should remain committed in this repo or be handled as global/shared tooling outside the app repository. *(source: dirty worktree inspection)*
- **[2026-05-05]** Consider improving mobile sign-in automation or adding a reliable test-only auth path; ADB text input mishandled special characters/case during hosted E2E login automation. *(source: device automation troubleshooting)*
- **[2026-05-08]** Decide whether the now-unused separate `VoiceRecorder` component should be removed or kept temporarily for rollback/reference. It is no longer used by the Capture screen after the single-composer implementation. *(source: conversation and capture UI implementation)*
- **[2026-05-10]** Decide whether the first community lens version should use private link sharing, reviewed public library submissions, or open publishing. *(source: community lenses planning note)*
- **[2026-05-10]** Define community lens leaderboard guardrails for installs, saves, ratings, recency, reports, and abuse prevention before implementation. *(source: community lenses planning note)*
- **[2026-05-10]** Decide whether `features/community-lenses/` should be added to `plans/PLAN_STATUS.md` as planned/non-active work now or only when the feature is formally activated. *(source: conversation and plan status review)*
