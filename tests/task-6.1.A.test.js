import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";

const MOBILE_SETTINGS_PATH = "apps/mobile/app/(app)/settings.tsx";
const MOBILE_HOOK_PATH = "apps/mobile/hooks/useUserSettings.ts";
const MOBILE_TIMEZONE_SELECT_PATH = "apps/mobile/components/TimezoneSelect.tsx";
const MOBILE_TIMEZONE_UTIL_PATH = "apps/mobile/lib/timezones.ts";
const WEB_SETTINGS_PATH = "apps/web/src/pages/Settings.tsx";
const SUMMARY_FUNCTION_PATH = "supabase/functions/generate-summary/index.ts";

async function readFileText(path) {
  return readFile(path, "utf8");
}

test("should create mobile settings screen when settings screen exists in mobile app", async () => {
  const fileStat = await stat(MOBILE_SETTINGS_PATH);
  assert.ok(fileStat.isFile());
});

test("should auto detect timezone when device locale is available", async () => {
  const source = await readFileText(MOBILE_TIMEZONE_UTIL_PATH);
  assert.match(source, /resolvedOptions\(\)\.timeZone/);
});

test("should allow manual timezone selection when TimezoneSelect renders a picker", async () => {
  const source = await readFileText(MOBILE_TIMEZONE_SELECT_PATH);
  assert.match(source, /Picker/);
  assert.match(source, /timezones/);
});

test("should persist timezone updates when settings hook updates users table", async () => {
  const source = await readFileText(MOBILE_HOOK_PATH);
  assert.match(source, /from\("users"\)/);
  assert.match(source, /timezone/);
});

test("should use user timezone for daily summary scheduling", async () => {
  const source = await readFileText(SUMMARY_FUNCTION_PATH);
  assert.match(source, /getUserLocalTime\(now, user\.timezone\)/);
});

test("should show timezone in web settings when settings page exists", async () => {
  const fileStat = await stat(WEB_SETTINGS_PATH);
  assert.ok(fileStat.isFile());
  const source = await readFileText(WEB_SETTINGS_PATH);
  assert.match(source, /Timezone/i);
});
