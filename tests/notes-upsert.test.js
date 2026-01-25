import { test } from "node:test";
import assert from "node:assert/strict";

import { upsertNoteWithAttachments } from "@notesbrain/shared";

function makeAttachment(overrides = {}) {
  return {
    id: "att-1",
    note_id: "note-1",
    filename: "note-1.m4a",
    mime_type: "audio/mp4",
    storage_path: "user-1/voice/note-1.m4a",
    size_bytes: 123,
    created_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeNote(overrides = {}) {
  return {
    id: "note-1",
    user_id: "user-1",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    type: "voice",
    content: null,
    category: "uncategorized",
    classification_confidence: null,
    classification_status: "pending",
    attachments: [],
    ...overrides,
  };
}

test("should prepend the note when id does not exist", () => {
  // Arrange
  const existing = makeNote({ id: "note-2" });
  const incoming = makeNote({ id: "note-1" });

  // Act
  const result = upsertNoteWithAttachments([existing], incoming);

  // Assert
  assert.deepEqual(
    result.map((n) => n.id),
    ["note-1", "note-2"]
  );
});

test("should merge attachments without duplicating the note when id already exists", () => {
  // Arrange
  const existing = makeNote({
    id: "note-1",
    content: "transcribed text",
    classification_status: "completed",
    updated_at: "2026-01-01T00:00:10.000Z",
  });

  const incoming = makeNote({
    id: "note-1",
    content: null,
    classification_status: "pending",
    attachments: [makeAttachment({ id: "att-1" })],
    updated_at: "2026-01-01T00:00:00.000Z",
  });

  // Act
  const result = upsertNoteWithAttachments([existing], incoming);

  // Assert
  assert.equal(result.length, 1);
  assert.equal(result[0].id, "note-1");
  assert.equal(result[0].content, "transcribed text");
  assert.equal(result[0].classification_status, "completed");
  assert.deepEqual(
    result[0].attachments.map((a) => a.id),
    ["att-1"]
  );
});

