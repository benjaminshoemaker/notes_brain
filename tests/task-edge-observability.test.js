import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const LOGGER_PATH = "supabase/functions/_shared/logger.ts";
const FCM_HELPER_PATH = "supabase/functions/_shared/fcm.ts";
const FUNCTION_FILES = [
  "supabase/functions/classify-note/index.ts",
  "supabase/functions/transcribe-voice/index.ts",
  "supabase/functions/generate-summary/index.ts",
  "supabase/functions/send-push/index.ts",
  "supabase/functions/execute-lens/index.ts",
  "supabase/functions/dispatch-lenses/index.ts"
];

async function readSource(path) {
  return readFile(path, "utf8");
}

test("should provide a shared structured logger utility for edge functions", async () => {
  const source = await readSource(LOGGER_PATH);
  assert.match(source, /export function createFunctionLogger/);
  assert.match(source, /request_id/);
  assert.match(source, /JSON\.stringify/);
});

for (const file of FUNCTION_FILES) {
  test(`should use structured logger in ${file}`, async () => {
    const source = await readSource(file);
    assert.match(source, /createFunctionLogger/);
    assert.match(source, /requestId/);
  });
}

test("should avoid logging FCM secrets and access tokens", async () => {
  const source = await readSource(FCM_HELPER_PATH);
  assert.doesNotMatch(source, /private_key preview/);
  assert.doesNotMatch(source, /body:\s*responseText/);
  assert.doesNotMatch(source, /token="\$\{tokenStart/);
});
