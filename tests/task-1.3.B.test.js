import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";

const migrationPath = "supabase/migrations/00002_storage_bucket.sql";

test("should create storage bucket migration when checking supabase migrations", async () => {
  const migrationStat = await stat(migrationPath);
  assert.ok(migrationStat.isFile());
});

test("should create a private attachments bucket when reading the storage migration", async () => {
  const sql = await readFile(migrationPath, "utf8");
  assert.match(sql, /insert\s+into\s+storage\.buckets/i);
  assert.match(sql, /'attachments'/i);
  assert.match(sql, /\bfalse\b/i);
});

test("should scope storage policies to auth uid folder when reading the storage migration", async () => {
  const sql = await readFile(migrationPath, "utf8");
  assert.match(sql, /\(storage\.foldername\(name\)\)\[1\]\s*=\s*auth\.uid\(\)::text/i);
});

