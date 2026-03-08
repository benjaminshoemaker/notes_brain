import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const ROOT_PACKAGE_JSON = "package.json";
const HEALTHCHECK_SCRIPT_PATH = "scripts/healthcheck-edge-functions.mjs";
const DEPLOY_SCRIPT_PATH = "scripts/deploy-staging.mjs";

const CLASSIFY_INDEX_PATH = "supabase/functions/classify-note/index.ts";
const TRANSCRIBE_INDEX_PATH = "supabase/functions/transcribe-voice/index.ts";
const SUMMARY_INDEX_PATH = "supabase/functions/generate-summary/index.ts";
const SEND_PUSH_INDEX_PATH = "supabase/functions/send-push/index.ts";

async function readFileText(path) {
  return readFile(path, "utf8");
}

test("should define deploy and healthcheck scripts in root package.json", async () => {
  const text = await readFileText(ROOT_PACKAGE_JSON);
  assert.match(text, /"deploy:staging"\s*:/);
  assert.match(text, /"healthcheck:edge"\s*:/);
});

test("should include a staging deploy script file", async () => {
  const source = await readFileText(DEPLOY_SCRIPT_PATH);
  assert.match(source, /supabase/);
  assert.match(source, /"functions",\s*"deploy"/);
});

test("should include an edge healthcheck script file", async () => {
  const source = await readFileText(HEALTHCHECK_SCRIPT_PATH);
  assert.match(source, /"classify-note"/);
  assert.match(source, /"transcribe-voice"/);
  assert.match(source, /"generate-summary"/);
  assert.match(source, /"send-push"/);
});

test("should expose health endpoints for classify and transcribe functions", async () => {
  const classifySource = await readFileText(CLASSIFY_INDEX_PATH);
  const transcribeSource = await readFileText(TRANSCRIBE_INDEX_PATH);
  assert.match(classifySource, /req\.method\s*===\s*"GET"/);
  assert.match(classifySource, /"status":\s*"ok"|status:\s*"ok"/);
  assert.match(transcribeSource, /req\.method\s*===\s*"GET"/);
  assert.match(transcribeSource, /"status":\s*"ok"|status:\s*"ok"/);
});

test("should expose health endpoints for summary and send-push functions", async () => {
  const summarySource = await readFileText(SUMMARY_INDEX_PATH);
  const sendPushSource = await readFileText(SEND_PUSH_INDEX_PATH);
  assert.match(summarySource, /req\.method\s*===\s*"GET"/);
  assert.match(summarySource, /"status":\s*"ok"|status:\s*"ok"/);
  assert.match(sendPushSource, /req\.method\s*===\s*"GET"/);
  assert.match(sendPushSource, /"status":\s*"ok"|status:\s*"ok"/);
});
