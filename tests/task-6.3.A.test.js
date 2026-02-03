import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const WEB_ENV_PATH = "apps/web/.env.production";
const MOBILE_ENV_PATH = "apps/mobile/.env.production";
const WEB_VITE_PATH = "apps/web/vite.config.ts";
const WEB_PACKAGE_PATH = "apps/web/package.json";
const MOBILE_EAS_PATH = "apps/mobile/eas.json";

async function readFileText(path) {
  return readFile(path, "utf8");
}

test("should configure web production build scripts", async () => {
  const pkg = JSON.parse(await readFileText(WEB_PACKAGE_PATH));
  assert.equal(pkg.scripts.build, "vite build");
});

test("should set production env vars for Supabase", async () => {
  const webEnv = await readFileText(WEB_ENV_PATH);
  const mobileEnv = await readFileText(MOBILE_ENV_PATH);
  assert.match(webEnv, /VITE_SUPABASE_URL/);
  assert.match(webEnv, /VITE_SUPABASE_ANON_KEY/);
  assert.match(mobileEnv, /EXPO_PUBLIC_SUPABASE_URL/);
  assert.match(mobileEnv, /EXPO_PUBLIC_SUPABASE_ANON_KEY/);
});

test("should configure Android builds in EAS", async () => {
  const eas = JSON.parse(await readFileText(MOBILE_EAS_PATH));
  assert.ok(eas.build.production.android);
});

test("should generate APK and AAB artifacts for Android", async () => {
  const eas = JSON.parse(await readFileText(MOBILE_EAS_PATH));
  assert.equal(eas.build.preview.android.buildType, "apk");
  assert.equal(eas.build.production.android.buildType, "app-bundle");
});

test("should keep dev dependencies out of runtime bundle", async () => {
  const pkg = JSON.parse(await readFileText(WEB_PACKAGE_PATH));
  assert.ok(pkg.devDependencies.vite);
  assert.ok(!pkg.dependencies?.vite);
});

test("should enable source maps for production builds", async () => {
  const viteConfig = await readFileText(WEB_VITE_PATH);
  assert.match(viteConfig, /sourcemap:\s*true/);
});
