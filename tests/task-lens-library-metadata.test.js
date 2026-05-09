import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const MIGRATION_PATH = "supabase/migrations/00008_lens_library.sql";
const SHARED_TYPES_PATH = "packages/shared/src/types.ts";
const SHARED_SUPABASE_PATH = "packages/shared/src/supabase.ts";

const METADATA_FIELDS = [
  "source_template_id",
  "source_template_version",
  "installed_from_library_at",
  "template_snapshot"
];

async function readFileText(path) {
  return readFile(path, "utf8");
}

test("lens library migration should add source metadata columns", async () => {
  const source = await readFileText(MIGRATION_PATH);

  for (const field of METADATA_FIELDS) {
    assert.match(source, new RegExp(`ADD COLUMN ${field}`));
  }
});

test("lens library migration should index source template lookups", async () => {
  const source = await readFileText(MIGRATION_PATH);

  assert.match(source, /idx_lenses_source_template/);
  assert.match(source, /ON lenses\(user_id,\s*source_template_id\)/);
  assert.match(source, /source_template_id IS NOT NULL/);
});

test("lens library migration should backfill only default Morning Briefing lenses", async () => {
  const source = await readFileText(MIGRATION_PATH);

  assert.match(source, /source_template_id = 'morning-briefing'/);
  assert.match(source, /is_default = true/);
  assert.match(source, /name = 'Morning Briefing'/);
  assert.match(source, /source_template_id IS NULL/);
});

test("lens library migration should update new-user default lens metadata", async () => {
  const source = await readFileText(MIGRATION_PATH);

  assert.match(source, /CREATE OR REPLACE FUNCTION create_default_lens/);
  assert.match(source, /source_template_version/);
  assert.match(source, /installed_from_library_at/);
  assert.match(source, /template_snapshot/);
});

test("lens library migration should document rollback for metadata fields", async () => {
  const source = await readFileText(MIGRATION_PATH);

  assert.match(source, /DROP INDEX IF EXISTS idx_lenses_source_template/);
  assert.match(source, /DROP COLUMN IF EXISTS source_template_id/);
});

test("shared lens types should include source metadata and templates", async () => {
  const source = await readFileText(SHARED_TYPES_PATH);

  for (const field of METADATA_FIELDS) {
    assert.match(source, new RegExp(field));
  }

  assert.match(source, /export type LensTemplateAuthorType/);
  assert.match(source, /export interface LensTemplateSnapshot/);
  assert.match(source, /export interface LensTemplate/);
});

test("shared supabase database type should include source metadata", async () => {
  const source = await readFileText(SHARED_SUPABASE_PATH);
  const lensesSection = source.match(/lenses:\s*{[\s\S]*?Relationships: \[\];\n      };/)?.[0];

  assert.ok(lensesSection, "Expected to find lenses table section");

  const rowSection = lensesSection.match(/Row:\s*{[\s\S]*?};/)?.[0];
  const insertSection = lensesSection.match(/Insert:\s*{[\s\S]*?};/)?.[0];
  const updateSection = lensesSection.match(/Update:\s*{[\s\S]*?};/)?.[0];

  assert.ok(rowSection, "Expected to find lenses Row type");
  assert.ok(insertSection, "Expected to find lenses Insert type");
  assert.ok(updateSection, "Expected to find lenses Update type");

  for (const field of METADATA_FIELDS) {
    assert.match(rowSection, new RegExp(`${field}:`));
    assert.match(insertSection, new RegExp(`${field}\\?:`));
    assert.match(updateSection, new RegExp(`${field}\\?:`));
  }
});
