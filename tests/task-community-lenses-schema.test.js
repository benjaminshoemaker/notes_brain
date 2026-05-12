import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const MIGRATION_PATH = "supabase/migrations/00010_community_lenses.sql";

async function readMigration() {
  return readFile(MIGRATION_PATH, "utf8");
}

function tableSection(source, tableName) {
  const match = source.match(new RegExp(`CREATE TABLE ${tableName} \\([\\s\\S]*?\\n\\);`));
  assert.ok(match, `Expected ${tableName} table`);
  return match[0];
}

test("community migration defines template enums and tables", async () => {
  const source = await readMigration();

  assert.match(source, /CREATE TYPE lens_template_status AS ENUM \('public', 'unpublished', 'hidden', 'delisted'\)/);
  assert.match(source, /CREATE TYPE lens_template_report_reason AS ENUM/);

  for (const table of [
    "lens_templates",
    "lens_template_versions",
    "lens_template_installs",
    "lens_template_reports"
  ]) {
    assert.match(source, new RegExp(`CREATE TABLE ${table}`));
    assert.match(source, new RegExp(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`));
  }
});

test("public view exposes only safe public template fields", async () => {
  const source = await readMigration();
  const view = source.match(/CREATE VIEW community_lens_templates_public AS[\s\S]*?FROM lens_templates[\s\S]*?WHERE status = 'public';/)?.[0];

  assert.ok(view, "Expected public community template view");

  for (const publicField of [
    "id",
    "name",
    "description",
    "prompt",
    "schedule_type",
    "schedule_time",
    "schedule_day",
    "lookback_hours",
    "categories",
    "category",
    "version",
    "author_display_name",
    "install_count",
    "created_at",
    "updated_at"
  ]) {
    assert.match(view, new RegExp(`\\b${publicField}\\b`));
  }

  for (const privateField of [
    "author_user_id",
    "source_lens_id",
    "lens_template_reports",
    "lens_template_installs",
    "hidden",
    "delisted",
    "unpublished"
  ]) {
    assert.doesNotMatch(view, new RegExp(privateField));
  }

  assert.match(source, /GRANT SELECT ON community_lens_templates_public TO authenticated/);
});

test("community migration includes required validation constraints", async () => {
  const source = await readMigration();
  const templates = tableSection(source, "lens_templates");
  const reports = tableSection(source, "lens_template_reports");

  assert.match(templates, /char_length\(name\) BETWEEN 1 AND 120/);
  assert.match(templates, /char_length\(description\) BETWEEN 1 AND 280/);
  assert.match(templates, /char_length\(prompt\) BETWEEN 20 AND 2000/);
  assert.match(templates, /lookback_hours > 0 AND lookback_hours <= 720/);
  assert.match(templates, /schedule_type != 'weekly' OR schedule_day IS NOT NULL/);
  assert.match(templates, /status lens_template_status NOT NULL DEFAULT 'public'/);
  assert.match(templates, /char_length\(btrim\(author_display_name\)\) BETWEEN 2 AND 40/);
  assert.match(templates, /author_display_name !~\* '[^']+@[^']+\\\.[^']+'/);
  assert.match(templates, /lower\(btrim\(author_display_name\)\) NOT IN \('notes brain', 'admin', 'support'\)/);
  assert.match(reports, /note IS NULL OR char_length\(note\) <= 500/);
  assert.match(source, /idx_lens_template_reports_one_active_per_user/);
  assert.match(source, /WHERE resolved_at IS NULL/);
});

test("community migration defines indexes for browse and ownership paths", async () => {
  const source = await readMigration();

  assert.match(source, /idx_lens_templates_public_sort/);
  assert.match(source, /ON lens_templates\(status, install_count DESC, updated_at DESC\)/);
  assert.match(source, /idx_lens_templates_category/);
  assert.match(source, /WHERE status = 'public'/);
  assert.match(source, /idx_lens_templates_author/);
  assert.match(source, /idx_lens_template_installs_user_template/);
  assert.match(source, /idx_lens_template_reports_template/);
});

test("community migration restricts table reads to owned rows and public view", async () => {
  const source = await readMigration();

  assert.match(source, /CREATE POLICY lens_templates_select_own[\s\S]*?ON lens_templates FOR SELECT[\s\S]*?USING \(auth.uid\(\) = author_user_id\)/);
  assert.match(source, /CREATE POLICY lens_template_versions_select_own[\s\S]*?ON lens_template_versions FOR SELECT[\s\S]*?auth.uid\(\) = lt.author_user_id/);
  assert.match(source, /CREATE POLICY lens_template_installs_select_own[\s\S]*?ON lens_template_installs FOR SELECT[\s\S]*?USING \(auth.uid\(\) = user_id\)/);
  assert.match(source, /CREATE POLICY lens_template_reports_select_own[\s\S]*?ON lens_template_reports FOR SELECT[\s\S]*?USING \(auth.uid\(\) = reporter_user_id\)/);

  assert.match(source, /REVOKE ALL ON lens_templates FROM anon/);
  assert.match(source, /GRANT SELECT ON lens_templates TO authenticated/);
  assert.match(source, /GRANT SELECT ON community_lens_templates_public TO authenticated/);
  assert.doesNotMatch(source, /CREATE POLICY .* FOR ALL/);
});
