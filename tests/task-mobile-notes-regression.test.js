import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const MOBILE_CREATE_NOTE_PATH = "apps/mobile/hooks/useCreateNote.ts";

async function readSource(path) {
  return readFile(path, "utf8");
}

test("should invalidate notes query after mobile note creation to avoid stale single-item cache", async () => {
  const source = await readSource(MOBILE_CREATE_NOTE_PATH);
  assert.match(
    source,
    /invalidateQueries\(\{\s*queryKey:\s*\["notes"\]\s*\}\)/,
    "Expected mobile create-note mutation to invalidate notes query"
  );
});
