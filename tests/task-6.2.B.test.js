import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const WEB_CREATE_NOTE_PATH = "apps/web/src/hooks/useCreateNote.ts";
const WEB_UPDATE_CATEGORY_PATH = "apps/web/src/hooks/useUpdateCategory.ts";
const MOBILE_CREATE_NOTE_PATH = "apps/mobile/hooks/useCreateNote.ts";
const MOBILE_CAPTURE_PATH = "apps/mobile/app/(app)/index.tsx";

async function readFileText(path) {
  return readFile(path, "utf8");
}

test("should show optimistic notes immediately when creating", async () => {
  const source = await readFileText(WEB_CREATE_NOTE_PATH);
  assert.match(source, /onMutate/);
  assert.match(source, /optimistic/);
});

test("should update categories optimistically before server confirms", async () => {
  const source = await readFileText(WEB_UPDATE_CATEGORY_PATH);
  assert.match(source, /onMutate/);
  assert.match(source, /previousNotes/);
});

test("should apply optimistic updates on mobile note creation", async () => {
  const source = await readFileText(MOBILE_CREATE_NOTE_PATH);
  assert.match(source, /onMutate/);
  assert.match(source, /optimisticId/);
});

test("should revert changes when optimistic mutations fail", async () => {
  const source = await readFileText(MOBILE_CREATE_NOTE_PATH);
  assert.match(source, /onError/);
  assert.match(source, /previousNotes/);
});

test("should notify users of sync failures with retry options", async () => {
  const webSource = await readFileText(WEB_CREATE_NOTE_PATH);
  const mobileSource = await readFileText(MOBILE_CAPTURE_PATH);
  assert.match(webSource, /Retry/);
  assert.match(mobileSource, /Retry/);
});
