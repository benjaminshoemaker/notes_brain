import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";

const migrationPath = "supabase/migrations/00001_initial_schema.sql";

test("should create initial schema migration when checking supabase migrations", async () => {
  const migrationStat = await stat(migrationPath);
  assert.ok(migrationStat.isFile());
});

test("should define required enums when reading the schema migration", async () => {
  const sql = await readFile(migrationPath, "utf8");
  for (const enumName of [
    "note_category",
    "note_type",
    "classification_status",
    "device_platform"
  ]) {
    assert.match(sql, new RegExp(`CREATE TYPE\\s+${enumName}\\s+AS ENUM`, "i"));
  }
});

test("should define required tables when reading the schema migration", async () => {
  const sql = await readFile(migrationPath, "utf8");
  for (const tableName of ["users", "notes", "attachments", "daily_summaries", "devices"]) {
    assert.match(sql, new RegExp(`CREATE TABLE\\s+${tableName}\\b`, "i"));
  }
});

test("should define required indexes when reading the schema migration", async () => {
  const sql = await readFile(migrationPath, "utf8");
  for (const indexName of [
    "idx_notes_user_id",
    "idx_notes_category",
    "idx_notes_created_at",
    "idx_notes_classification_status",
    "idx_notes_search_vector",
    "idx_attachments_note_id",
    "idx_daily_summaries_user_date",
    "idx_devices_user_id"
  ]) {
    assert.match(sql, new RegExp(`CREATE INDEX\\s+${indexName}\\b`, "i"));
  }
});

test("should enable rls and define policies when reading the schema migration", async () => {
  const sql = await readFile(migrationPath, "utf8");
  for (const tableName of ["users", "notes", "attachments", "daily_summaries", "devices"]) {
    assert.match(sql, new RegExp(`ALTER TABLE\\s+${tableName}\\s+ENABLE ROW LEVEL SECURITY`, "i"));
  }

  for (const policyName of [
    "users_policy",
    "notes_policy",
    "attachments_policy",
    "daily_summaries_policy",
    "devices_policy"
  ]) {
    assert.match(sql, new RegExp(`CREATE POLICY\\s+${policyName}\\b`, "i"));
  }
});

test("should include updated_at triggers when reading the schema migration", async () => {
  const sql = await readFile(migrationPath, "utf8");

  assert.match(sql, /CREATE OR REPLACE FUNCTION\s+update_updated_at\(\)/i);
  for (const triggerName of ["users_updated_at", "notes_updated_at", "devices_updated_at"]) {
    assert.match(sql, new RegExp(`CREATE TRIGGER\\s+${triggerName}\\b`, "i"));
  }
});

test("should create supabase config when checking supabase config.toml", async () => {
  const cfgStat = await stat("supabase/config.toml");
  assert.ok(cfgStat.isFile());
});

