import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const MIGRATION_PATH = "supabase/migrations/00010_community_lenses.sql";

async function readMigration() {
  return readFile(MIGRATION_PATH, "utf8");
}

function functionSection(source, functionName) {
  const match = source.match(new RegExp(`CREATE OR REPLACE FUNCTION ${functionName}\\([\\s\\S]*?\\n\\$\\$ LANGUAGE plpgsql SECURITY DEFINER[\\s\\S]*?;`));
  assert.ok(match, `Expected ${functionName} SECURITY DEFINER function`);
  return match[0];
}

test("community migration defines server-owned RPC functions", async () => {
  const source = await readMigration();

  for (const functionName of [
    "publish_lens_template",
    "unpublish_lens_template",
    "install_lens_template",
    "report_lens_template"
  ]) {
    const section = functionSection(source, functionName);
    assert.match(section, /SECURITY DEFINER/);
    assert.match(section, /SET search_path = public, extensions/);
  }

  assert.match(source, /GRANT EXECUTE ON FUNCTION publish_lens_template/);
  assert.match(source, /GRANT EXECUTE ON FUNCTION unpublish_lens_template/);
  assert.match(source, /GRANT EXECUTE ON FUNCTION install_lens_template/);
  assert.match(source, /GRANT EXECUTE ON FUNCTION report_lens_template/);
});

test("publish RPC validates ownership, eligibility, moderation, metadata, and rate limits", async () => {
  const source = await readMigration();
  const section = functionSection(source, "publish_lens_template");

  assert.match(section, /WHERE id = p_lens_id\s+AND user_id = auth.uid\(\)/);
  assert.match(section, /v_source_lens.source_template_id IS NOT NULL/);
  assert.match(section, /author display name is required/);
  assert.match(section, /must not contain an email address/);
  assert.match(section, /reserved author display name/);
  assert.match(section, /description is required/);
  assert.match(section, /status IN \('hidden', 'delisted'\)/);
  assert.match(section, /created_at >= NOW\(\) - INTERVAL '24 hours'/);
  assert.match(section, />= 10/);
  assert.match(section, /INSERT INTO lens_template_versions/);
});

test("install RPC copies a public template through a transaction-local guard", async () => {
  const source = await readMigration();
  const section = functionSection(source, "install_lens_template");

  assert.match(section, /status = 'public'/);
  assert.match(section, /v_template.author_user_id = auth.uid\(\)/);
  assert.match(section, /source_template_id = p_template_id::text/);
  assert.match(section, /set_config\('app.community_lens_install', 'true', true\)/);
  assert.match(section, /INSERT INTO lenses/);
  assert.match(section, /source_template_id,\s*source_template_version,\s*installed_from_library_at,\s*template_snapshot/);
  assert.match(section, /INSERT INTO lens_template_installs/);
  assert.match(section, /install_count = install_count \+ 1/);
});

test("community provenance trigger blocks direct UUID template spoofing", async () => {
  const source = await readMigration();

  assert.match(source, /CREATE OR REPLACE FUNCTION enforce_community_lens_install_guard/);
  assert.match(source, /NEW.source_template_id::UUID/);
  assert.match(source, /current_setting\('app.community_lens_install', true\) = 'true'/);
  assert.match(source, /RAISE EXCEPTION 'Community lens provenance can only be set by install_lens_template'/);
  assert.match(source, /CREATE TRIGGER lenses_community_install_guard/);
  assert.match(source, /BEFORE INSERT OR UPDATE OF source_template_id ON lenses/);
});

test("source lens edit trigger versions public and unpublished templates", async () => {
  const source = await readMigration();

  assert.match(source, /CREATE OR REPLACE FUNCTION sync_lens_template_from_source_lens/);
  assert.match(source, /status IN \('public', 'unpublished'\)/);
  assert.match(source, /OLD.name IS DISTINCT FROM NEW.name/);
  assert.match(source, /OLD.prompt IS DISTINCT FROM NEW.prompt/);
  assert.match(source, /OLD.schedule_type IS DISTINCT FROM NEW.schedule_type/);
  assert.match(source, /OLD.schedule_time IS DISTINCT FROM NEW.schedule_time/);
  assert.match(source, /OLD.schedule_day IS DISTINCT FROM NEW.schedule_day/);
  assert.match(source, /OLD.lookback_hours IS DISTINCT FROM NEW.lookback_hours/);
  assert.match(source, /OLD.categories IS DISTINCT FROM NEW.categories/);
  assert.match(source, /version = v_template.version \+ 1/);
  assert.match(source, /INSERT INTO lens_template_versions/);
  assert.match(source, /CREATE TRIGGER lenses_sync_community_template/);
});

test("report RPC returns duplicate active reports without overwriting details", async () => {
  const source = await readMigration();
  const section = functionSection(source, "report_lens_template");

  assert.match(section, /status = 'public'/);
  assert.match(section, /WHERE template_id = p_template_id\s+AND reporter_user_id = auth.uid\(\)\s+AND resolved_at IS NULL/);
  assert.match(section, /RETURN v_existing_report/);
  assert.match(section, /char_length\(p_note\) > 500/);
  assert.match(section, /INSERT INTO lens_template_reports/);
});
