import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const SEND_PUSH_INDEX_PATH = "supabase/functions/send-push/index.ts";

async function readSource() {
  return readFile(SEND_PUSH_INDEX_PATH, "utf8");
}

test("should accept result_id with legacy summary_id fallback", async () => {
  const source = await readSource();

  assert.match(source, /result_id\??:\s*string/);
  assert.match(source, /summary_id\??:\s*string/);
  assert.match(source, /const resultId = body\.result_id \?\? body\.summary_id/);
});

test("should validate allowed result_table values", async () => {
  const source = await readSource();

  assert.match(source, /const ALLOWED_TABLES = \["daily_summaries", "lens_results"\]/);
  assert.match(source, /const resultTable = body\.result_table \?\? "daily_summaries"/);
  assert.match(source, /ALLOWED_TABLES\.includes\(resultTable\)/);
  assert.match(source, /Invalid result_table/);
});

test("should update sent_at using the resolved result table and result id", async () => {
  const source = await readSource();

  assert.match(source, /\.from\(resultTable\)/);
  assert.match(source, /\.eq\("id", resultId\)/);
});
