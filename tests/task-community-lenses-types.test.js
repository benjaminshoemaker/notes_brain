import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const SHARED_TYPES_PATH = "packages/shared/src/types.ts";
const SHARED_INDEX_PATH = "packages/shared/src/index.ts";
const SHARED_SUPABASE_PATH = "packages/shared/src/supabase.ts";

async function readFileText(path) {
  return readFile(path, "utf8");
}

test("shared exports include community lens domain and RPC contract types", async () => {
  const types = await readFileText(SHARED_TYPES_PATH);
  const index = await readFileText(SHARED_INDEX_PATH);

  for (const symbol of [
    "LensTemplateStatus",
    "LensTemplateReportReason",
    "CommunityLensTemplate",
    "CommunityLensTemplatePublic",
    "LensTemplateVersion",
    "LensTemplateInstall",
    "LensTemplateReport",
    "PublishLensTemplate",
    "UnpublishLensTemplate",
    "InstallLensTemplate",
    "ReportLensTemplate"
  ]) {
    assert.match(types, new RegExp(`(interface|type) ${symbol}`));
    assert.match(index, new RegExp(`\\b${symbol}\\b`));
  }
});

test("lens template snapshots can preserve community install fields", async () => {
  const types = await readFileText(SHARED_TYPES_PATH);
  const snapshot = types.match(/export interface LensTemplateSnapshot \{[\s\S]*?\n\}/)?.[0];

  assert.ok(snapshot, "Expected LensTemplateSnapshot interface");

  for (const field of [
    "template_id",
    "version",
    "name",
    "description",
    "category",
    "author_type",
    "author_name",
    "prompt",
    "schedule_type",
    "schedule_time",
    "schedule_day",
    "lookback_hours",
    "categories"
  ]) {
    assert.match(snapshot, new RegExp(`${field}[?]?:`));
  }
});

test("manual supabase database type includes community tables and view", async () => {
  const source = await readFileText(SHARED_SUPABASE_PATH);

  for (const table of [
    "lens_templates",
    "lens_template_versions",
    "lens_template_installs",
    "lens_template_reports"
  ]) {
    assert.match(source, new RegExp(`${table}:\\s*\\{[\\s\\S]*?Row:`));
    assert.match(source, new RegExp(`${table}:\\s*\\{[\\s\\S]*?Insert:`));
    assert.match(source, new RegExp(`${table}:\\s*\\{[\\s\\S]*?Update:`));
  }

  assert.match(source, /community_lens_templates_public:\s*\{[\s\S]*?Row:/);
  assert.doesNotMatch(source.match(/community_lens_templates_public:\s*\{[\s\S]*?Relationships: \[\];\n      };/)?.[0] ?? "", /author_user_id|source_lens_id|reporter_user_id/);
});

test("manual supabase database type includes community enums and RPC signatures", async () => {
  const source = await readFileText(SHARED_SUPABASE_PATH);

  assert.match(source, /lens_template_status: LensTemplateStatus/);
  assert.match(source, /lens_template_report_reason: LensTemplateReportReason/);

  for (const functionName of [
    "publish_lens_template",
    "unpublish_lens_template",
    "install_lens_template",
    "report_lens_template"
  ]) {
    assert.match(source, new RegExp(`${functionName}:\\s*\\{[\\s\\S]*?Args:`));
    assert.match(source, new RegExp(`${functionName}:\\s*\\{[\\s\\S]*?Returns:`));
  }
});
