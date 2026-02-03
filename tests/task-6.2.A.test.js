import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";

const WEB_LOADING_PATH = "apps/web/src/components/LoadingSpinner.tsx";
const MOBILE_LOADING_PATH = "apps/mobile/components/LoadingSpinner.tsx";
const WEB_NOTES_PATH = "apps/web/src/pages/Notes.tsx";
const MOBILE_NOTES_LIST_PATH = "apps/mobile/components/NotesList.tsx";
const WEB_TOAST_PATH = "apps/web/src/components/Toast.tsx";
const MOBILE_CAPTURE_PATH = "apps/mobile/app/(app)/index.tsx";
const WEB_ONLINE_PATH = "apps/web/src/hooks/useOnlineStatus.ts";
const MOBILE_ONLINE_PATH = "apps/mobile/hooks/useOnlineStatus.ts";
const WEB_LOGIN_PATH = "apps/web/src/pages/Login.tsx";
const WEB_SIGNUP_PATH = "apps/web/src/pages/Signup.tsx";
const WEB_MAIN_PATH = "apps/web/src/main.tsx";
const MOBILE_LAYOUT_PATH = "apps/mobile/app/_layout.tsx";

async function readFileText(path) {
  return readFile(path, "utf8");
}

test("should render loading spinners for data fetches", async () => {
  const webSpinnerStat = await stat(WEB_LOADING_PATH);
  const mobileSpinnerStat = await stat(MOBILE_LOADING_PATH);
  assert.ok(webSpinnerStat.isFile());
  assert.ok(mobileSpinnerStat.isFile());

  const webNotesSource = await readFileText(WEB_NOTES_PATH);
  const mobileNotesSource = await readFileText(MOBILE_NOTES_LIST_PATH);
  assert.match(webNotesSource, /LoadingSpinner/);
  assert.match(mobileNotesSource, /LoadingSpinner/);
});

test("should show retry actions for network errors", async () => {
  const toastSource = await readFileText(WEB_TOAST_PATH);
  const captureSource = await readFileText(MOBILE_CAPTURE_PATH);
  assert.match(toastSource, /action/);
  assert.match(captureSource, /Retry/);
});

test("should detect offline state for web and mobile", async () => {
  const webOnlineSource = await readFileText(WEB_ONLINE_PATH);
  const mobileOnlineSource = await readFileText(MOBILE_ONLINE_PATH);
  assert.match(webOnlineSource, /navigator\.onLine/);
  assert.match(mobileOnlineSource, /NetInfo/);
});

test("should show progress labels for form submissions", async () => {
  const loginSource = await readFileText(WEB_LOGIN_PATH);
  const signupSource = await readFileText(WEB_SIGNUP_PATH);
  assert.match(loginSource, /Signing in/);
  assert.match(signupSource, /Creating account/);
});

test("should display friendly api errors", async () => {
  const loginSource = await readFileText(WEB_LOGIN_PATH);
  const signupSource = await readFileText(WEB_SIGNUP_PATH);
  assert.match(loginSource, /Unable to sign in/);
  assert.match(signupSource, /Unable to create account/);
});

test("should wrap apps with error boundaries", async () => {
  const webMainSource = await readFileText(WEB_MAIN_PATH);
  const mobileLayoutSource = await readFileText(MOBILE_LAYOUT_PATH);
  assert.match(webMainSource, /QueryErrorBoundary/);
  assert.match(mobileLayoutSource, /RootErrorBoundary/);
});
