# Mobile E2E (Detox, Android)

## Configuration

- Detox config: `tests/e2e/mobile/detox.config.cjs`
- Jest config: `tests/e2e/mobile/jest.config.cjs`
- Jest setup: `tests/e2e/mobile/setup.cjs`

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

You can pass extra Detox args:

```bash
npm run test:e2e:mobile -- --record-logs all
```

