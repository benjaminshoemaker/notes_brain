import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";

test("should document database webhooks when reading webhook documentation migration", async () => {
  const fileStat = await stat("supabase/migrations/00003_webhook_documentation.sql");
  assert.ok(fileStat.isFile());

  const sql = await readFile("supabase/migrations/00003_webhook_documentation.sql", "utf8");

  assert.ok(sql.includes("Database > Webhooks"));
  assert.ok(sql.includes("/functions/v1/classify-note"));
  assert.ok(sql.includes("do not support row-level filters"));
  assert.ok(sql.includes("type = 'text'"));
  assert.ok(sql.includes("classification_status = 'pending'"));

  assert.ok(sql.includes("/functions/v1/transcribe-voice"));
  assert.ok(sql.includes("type = 'voice'"));
});
