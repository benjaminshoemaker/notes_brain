import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const ROOT_PACKAGE_JSON = "package.json";
const HEALTHCHECK_SCRIPT_PATH = "scripts/healthcheck-edge-functions.mjs";
const DEPLOY_SCRIPT_PATH = "scripts/deploy-staging.mjs";
const DEV_FUNCTIONS_SCRIPT_PATH = "scripts/dev-edge-functions.mjs";
const DEV_DISPATCHER_SCRIPT_PATH = "scripts/dev-lens-dispatcher.mjs";

const CLASSIFY_INDEX_PATH = "supabase/functions/classify-note/index.ts";
const TRANSCRIBE_INDEX_PATH = "supabase/functions/transcribe-voice/index.ts";
const SUMMARY_INDEX_PATH = "supabase/functions/generate-summary/index.ts";
const SEND_PUSH_INDEX_PATH = "supabase/functions/send-push/index.ts";
const EXECUTE_LENS_INDEX_PATH = "supabase/functions/execute-lens/index.ts";
const DISPATCH_LENSES_INDEX_PATH = "supabase/functions/dispatch-lenses/index.ts";

async function readFileText(path) {
  return readFile(path, "utf8");
}

test("should define deploy and healthcheck scripts in root package.json", async () => {
  const text = await readFileText(ROOT_PACKAGE_JSON);
  assert.match(text, /"deploy:staging"\s*:/);
  assert.match(text, /"healthcheck:edge"\s*:/);
});

test("should define local scheduled lens dev scripts in root package.json", async () => {
  const text = await readFileText(ROOT_PACKAGE_JSON);
  assert.match(text, /"dev:functions"\s*:/);
  assert.match(text, /"dev:lens-dispatcher"\s*:/);
  assert.match(text, /"dev:scheduled-lenses"\s*:/);
  assert.match(text, /"dev:scheduled-lenses:dogfood"\s*:/);
});

test("should include a staging deploy script file", async () => {
  const source = await readFileText(DEPLOY_SCRIPT_PATH);
  assert.match(source, /supabase/);
  assert.match(source, /"functions",\s*"deploy"/);
  assert.match(source, /"execute-lens"/);
  assert.match(source, /"dispatch-lenses"/);
  assert.match(source, /"CRON_SECRET"/);
});

test("should include an edge healthcheck script file", async () => {
  const source = await readFileText(HEALTHCHECK_SCRIPT_PATH);
  assert.match(source, /"classify-note"/);
  assert.match(source, /"transcribe-voice"/);
  assert.match(source, /"generate-summary"/);
  assert.match(source, /"send-push"/);
  assert.match(source, /"execute-lens"/);
  assert.match(source, /"dispatch-lenses"/);
  assert.match(source, /retired/);
});

test("should include local scheduled lens runtime scripts", async () => {
  const functionsSource = await readFileText(DEV_FUNCTIONS_SCRIPT_PATH);
  const dispatcherSource = await readFileText(DEV_DISPATCHER_SCRIPT_PATH);
  assert.match(functionsSource, /functions",\s*"serve"/);
  assert.match(functionsSource, /--env-file/);
  assert.match(dispatcherSource, /dispatch-lenses/);
  assert.match(dispatcherSource, /x-cron-secret/);
  assert.match(dispatcherSource, /local-interval-hours/);
});

test("should expose health endpoints for classify and transcribe functions", async () => {
  const classifySource = await readFileText(CLASSIFY_INDEX_PATH);
  const transcribeSource = await readFileText(TRANSCRIBE_INDEX_PATH);
  assert.match(classifySource, /req\.method\s*===\s*"GET"/);
  assert.match(classifySource, /"status":\s*"ok"|status:\s*"ok"/);
  assert.match(transcribeSource, /req\.method\s*===\s*"GET"/);
  assert.match(transcribeSource, /"status":\s*"ok"|status:\s*"ok"/);
});

test("should expose health endpoints for retired summary and send-push functions", async () => {
  const summarySource = await readFileText(SUMMARY_INDEX_PATH);
  const sendPushSource = await readFileText(SEND_PUSH_INDEX_PATH);
  assert.match(summarySource, /req\.method\s*===\s*"GET"/);
  assert.match(summarySource, /"status":\s*"ok"|status:\s*"ok"/);
  assert.match(summarySource, /retired:\s*true/);
  assert.match(sendPushSource, /req\.method\s*===\s*"GET"/);
  assert.match(sendPushSource, /"status":\s*"ok"|status:\s*"ok"/);
});

test("should expose health endpoints for scheduled lens functions", async () => {
  const executeLensSource = await readFileText(EXECUTE_LENS_INDEX_PATH);
  const dispatchLensesSource = await readFileText(DISPATCH_LENSES_INDEX_PATH);
  assert.match(executeLensSource, /req\.method\s*===\s*"GET"/);
  assert.match(executeLensSource, /"status":\s*"ok"|status:\s*"ok"/);
  assert.match(dispatchLensesSource, /req\.method\s*===\s*"GET"/);
  assert.match(dispatchLensesSource, /"status":\s*"ok"|status:\s*"ok"/);
});

test("should strip markdown formatting from lens push previews", async () => {
  const executeLensSource = await readFileText(EXECUTE_LENS_INDEX_PATH);
  assert.match(executeLensSource, /function buildPushPreview/);
  assert.ok(executeLensSource.includes('.replace(/^#{1,6}\\s+/gm, "")'));
  assert.ok(executeLensSource.includes('.replace(/^\\s*[-*+]\\s+/gm, "")'));
  assert.ok(executeLensSource.includes('.replace(/\\[([^\\]]+)\\]\\([^)]+\\)/g, "$1")'));
  assert.ok(executeLensSource.includes('.replace(/[*_~>#]/g, "")'));
});
