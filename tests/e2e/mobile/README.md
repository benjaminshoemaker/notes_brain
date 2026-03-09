# Mobile E2E (Detox, Android)

## Configuration

- Detox config: `tests/e2e/mobile/detox.config.cjs`
- Jest config: `tests/e2e/mobile/jest.config.cjs`
- Detox lifecycle hooks are wired via `detox/runners/jest/*` in Jest config.

## Prerequisites

1. Android SDK and emulator installed.
2. AVD available (default: `Pixel_6_API_34`).
3. Set `DETOX_AVD_NAME` if you use a different emulator.
4. Set E2E Supabase env vars from the main E2E README.

## Run

```bash
npm run test:e2e:mobile
```

The runner performs:

1. `detox build` for `android.emu.release`
2. `detox test` against the same configuration

Current auth coverage includes:

- Email/password sign-in
- Password reset request from login (`Forgot password?`)
- Primary tab navigation

You can pass extra Detox args:

```bash
npm run test:e2e:mobile -- --record-logs all
```
