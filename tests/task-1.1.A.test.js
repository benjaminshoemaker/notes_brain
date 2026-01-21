import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";

test("should configure npm workspaces when reading root package.json", async () => {
  const raw = await readFile("package.json", "utf8");
  const pkg = JSON.parse(raw);

  assert.equal(pkg.private, true);
  assert.ok(Array.isArray(pkg.workspaces));
  assert.ok(pkg.workspaces.includes("apps/*"));
  assert.ok(pkg.workspaces.includes("packages/*"));
});

test("should define turbo pipeline tasks when reading turbo.json", async () => {
  const raw = await readFile("turbo.json", "utf8");
  const turbo = JSON.parse(raw);
  const pipeline = turbo.pipeline ?? turbo.tasks;

  assert.ok(pipeline && typeof pipeline === "object");
  for (const taskName of ["build", "test", "lint", "typecheck"]) {
    assert.ok(taskName in pipeline, `Expected turbo pipeline to include "${taskName}"`);
  }
});

test("should have the expected monorepo directories when checking the filesystem", async () => {
  for (const dir of ["apps/mobile", "apps/web", "packages/shared", "supabase"]) {
    const dirStat = await stat(dir);
    assert.ok(dirStat.isDirectory(), `Expected ${dir} to be a directory`);
  }
});

test("should ignore expected paths when reading .gitignore", async () => {
  const gitignore = await readFile(".gitignore", "utf8");

  for (const pattern of ["node_modules", ".env*", ".turbo", "dist"]) {
    assert.ok(
      gitignore.includes(pattern),
      `Expected .gitignore to include pattern "${pattern}"`
    );
  }
});

test("should create package-lock.json when npm install has completed", async () => {
  const lockStat = await stat("package-lock.json");
  assert.ok(lockStat.isFile());
});

