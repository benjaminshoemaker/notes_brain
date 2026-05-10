import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const MIGRATION_PATH = "supabase/migrations/00009_consolidate_lens_scheduling.sql";
const EXECUTE_LENS_PATH = "supabase/functions/execute-lens/index.ts";

async function readFileText(path) {
  return readFile(path, "utf8");
}

test("lens scheduling should have a database-owned success helper", async () => {
  const source = await readFileText(MIGRATION_PATH);

  assert.match(source, /CREATE OR REPLACE FUNCTION calculate_next_lens_run_at/);
  assert.match(source, /CREATE OR REPLACE FUNCTION mark_lens_execution_success/);
  assert.match(source, /CREATE OR REPLACE FUNCTION compute_next_run_at/);
  assert.match(source, /NEW\.is_active = false/);
  assert.match(source, /NEW\.next_run_at := NULL/);
});

test("execute-lens should delegate successful rescheduling to SQL", async () => {
  const source = await readFileText(EXECUTE_LENS_PATH);

  assert.match(source, /\.rpc\("mark_lens_execution_success"/);
  assert.doesNotMatch(source, /function computeNextRunAt/);
  assert.doesNotMatch(source, /function localDateInTimeZoneToUtc/);
});
