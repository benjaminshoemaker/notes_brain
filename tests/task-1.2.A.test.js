import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";

test("should set shared package name when reading packages/shared/package.json", async () => {
  const raw = await readFile("packages/shared/package.json", "utf8");
  const pkg = JSON.parse(raw);

  assert.equal(pkg.name, "@notesbrain/shared");
});

test("should export all required types when reading shared dist types", async () => {
  const distStat = await stat("packages/shared/dist/index.d.ts");
  assert.ok(distStat.isFile());

  const dts = await readFile("packages/shared/dist/index.d.ts", "utf8");
  for (const exportName of [
    "User",
    "Note",
    "Attachment",
    "NoteWithAttachments",
    "DailySummary",
    "Device",
    "Category",
    "NoteType",
    "ClassificationStatus",
    "DevicePlatform"
  ]) {
    assert.match(dts, new RegExp(`\\b${exportName}\\b`));
  }
});

test("should export CATEGORIES constant when reading shared dist types", async () => {
  const dts = await readFile("packages/shared/dist/index.d.ts", "utf8");
  assert.match(dts, /\bCATEGORIES\b/);
});

test("should expose zod schemas when reading shared dist types", async () => {
  const dts = await readFile("packages/shared/dist/index.d.ts", "utf8");
  for (const exportName of ["CreateNoteRequestSchema", "ClassificationResultSchema"]) {
    assert.match(dts, new RegExp(`\\b${exportName}\\b`));
  }
});

