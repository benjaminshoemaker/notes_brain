import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const SEND_PUSH_INDEX_PATH = "supabase/functions/send-push/index.ts";

async function readSource() {
  return readFile(SEND_PUSH_INDEX_PATH, "utf8");
}

test("should require explicit result_id without legacy summary_id fallback", async () => {
  const source = await readSource();

  assert.match(source, /result_id:\s*string/);
  assert.doesNotMatch(source, /summary_id/);
  assert.doesNotMatch(source, /body\.result_id \?\?/);
});

test("should validate allowed result_table values", async () => {
  const source = await readSource();

  assert.match(source, /const ALLOWED_TABLES = \["lens_results"\]/);
  assert.doesNotMatch(source, /daily_summaries/);
  assert.match(source, /ALLOWED_TABLES\.includes\(resultTable\)/);
  assert.match(source, /Invalid result_table/);
});

test("should update sent_at using the resolved result table and result id", async () => {
  const source = await readSource();

  assert.match(source, /\.from\(resultTable\)/);
  assert.match(source, /\.eq\("id", resultId\)/);
});
