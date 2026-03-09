# Agent Debug Workflow (Expo + MCP)

This runbook defines the fastest local loop for AI-assisted testing and debugging on mobile.

## 1. Prerequisites

- Install dependencies from repo root: `npm install`
- Ensure root `.env.local` contains:
  - `EXPO_PUBLIC_SUPABASE_URL`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- Ensure `apps/mobile/google-services.json` exists for Android notification flows.
- Use Expo SDK 54+.
- Ensure `expo-mcp` is installed in `apps/mobile`:
  - `cd apps/mobile && npx expo install expo-mcp`
- Ensure Android SDK tools are on `PATH`:
  - `adb`
  - `emulator`

## 1.1 Native Tooling Verification

- Verify `adb` and emulator visibility:
  - `adb version`
  - `emulator -list-avds`
- If no emulator is running, start one:
  - `emulator -avd Pixel_9`
- Confirm device connection:
  - `adb devices`

## 1.2 Codex MCP Integration

Codex CLI MCP config should include an Expo server in `~/.codex/config.toml`:

```toml
[mcp_servers.expo]
command = "npx"
args = ["-y", "expo-mcp@0.2.4", "--root", "/Users/coding/Projects/notes_brain/apps/mobile", "--dev-server-url", "http://127.0.0.1:8081"]
```

If you add or change MCP server entries, restart Codex CLI so new tools are loaded.

## 2. Start Sessions

### Web

- `npm run dev`
- App URL: `http://localhost:5173`

### Mobile (regular dev)

- `npm run dev:mobile`
- Press `a` to open Android emulator.

### Mobile (agent + MCP mode)

- `npm run dev:mcp`
- This enables local MCP capabilities via `EXPO_UNSTABLE_MCP_SERVER=1` and starts Expo with `--dev-client`.

## 3. Screen/TestID Conventions

Use stable, behavior-focused IDs so agents can click and assert reliably.

- Prefix by feature: `capture-*`, `notes-*`
- Avoid text-based selectors in automation.
- Keep IDs stable across UI copy changes.

Implemented IDs for core flows:

- Capture:
  - `capture-screen`
  - `capture-text-input`
  - `capture-submit-button`
  - `capture-voice-start-button`
  - `capture-voice-stop-button`
  - `capture-voice-cancel-button`
  - `capture-toast`
- Notes:
  - `notes-screen`
  - `notes-list`
  - `notes-empty-state`
  - `notes-filter-all`
  - `notes-filter-{category}`
  - `notes-card-{noteId}`

Source of truth: `apps/mobile/lib/testIds.ts`.

## 4. Repeatable Repro Checklist (Capture + Notes)

Run this checklist in one session and collect logs/screenshots at each step.

1. Launch app and authenticate.
2. Verify capture input autofocus on `capture-text-input`.
3. Create a text note via `capture-submit-button`.
4. Confirm success toast appears (`capture-toast`).
5. Navigate to Notes tab and confirm `notes-list` renders.
6. Confirm a new note card exists with `notes-card-{noteId}`.
7. Switch filter to `notes-filter-projects` and verify filtering behavior.
8. Return to `notes-filter-all`.
9. Create a voice note via `capture-voice-start-button`, then stop with `capture-voice-stop-button`.
10. Re-open Notes tab and verify new voice note entry appears.

## 5. Debugging Shortcuts

- Expo terminal:
  - `j` opens React Native DevTools
  - `shift+m` opens more tools / plugin menu
  - `r` reloads app
- Full repo verification:
  - `npm run verify`

## 6. Known Caveat

If `@react-native-community/netinfo` native linking is missing, the app now falls back to an online-default mode instead of crashing. Fix linking in the dev client for accurate offline behavior tests.
