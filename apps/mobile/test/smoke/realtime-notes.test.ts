import { describe, expect, it, vi } from "vitest";
import type { NoteWithAttachments } from "@notesbrain/shared";

vi.mock("../../lib/supabaseClient", () => ({
  supabase: {
    channel: vi.fn(),
    removeChannel: vi.fn(),
  },
}));

import {
  applyRealtimeNoteDelete,
  applyRealtimeNoteInsert,
  applyRealtimeNoteUpdate,
  type RealtimeNoteCallbacks,
} from "../../hooks/useRealtimeNotes";

function makeNote(overrides: Partial<NoteWithAttachments>): NoteWithAttachments {
  return {
    id: "note-1",
    user_id: "user-1",
    created_at: "2026-05-01T00:00:00.000Z",
    updated_at: "2026-05-01T00:00:00.000Z",
    type: "text",
    content: "Original",
    category: "ideas",
    classification_status: "completed",
    classification_confidence: 0.9,
    attachments: [],
    ...overrides,
  };
}

describe("realtime notes cache helpers", () => {
  it("updates read-mode notes in the cache", () => {
    const original = makeNote({ id: "note-1", content: "Original" });
    const updated = makeNote({
      id: "note-1",
      content: "Remote update",
      category: "projects",
      updated_at: "2026-05-01T00:01:00.000Z",
    });

    expect(applyRealtimeNoteUpdate([original], updated)).toEqual([
      expect.objectContaining({
        id: "note-1",
        content: "Remote update",
        category: "projects",
        updated_at: "2026-05-01T00:01:00.000Z",
      }),
    ]);
  });

  it("skips update replacement when onRemoteUpdate returns true", () => {
    const original = makeNote({ id: "note-1", content: "Local draft base" });
    const updated = makeNote({ id: "note-1", content: "Remote update" });
    const callbacks: RealtimeNoteCallbacks = {
      onRemoteUpdate: vi.fn(() => true),
    };

    const result = applyRealtimeNoteUpdate([original], updated, callbacks);

    expect(callbacks.onRemoteUpdate).toHaveBeenCalledWith("note-1");
    expect(result).toEqual([original]);
  });

  it("removes read-mode notes on delete", () => {
    const noteA = makeNote({ id: "note-a" });
    const noteB = makeNote({ id: "note-b" });

    expect(applyRealtimeNoteDelete([noteA, noteB], { id: "note-a" })).toEqual([noteB]);
  });

  it("skips delete removal when onRemoteDelete returns true", () => {
    const note = makeNote({ id: "note-1" });
    const callbacks: RealtimeNoteCallbacks = {
      onRemoteDelete: vi.fn(() => true),
    };

    const result = applyRealtimeNoteDelete([note], { id: "note-1" }, callbacks);

    expect(callbacks.onRemoteDelete).toHaveBeenCalledWith("note-1");
    expect(result).toEqual([note]);
  });

  it("keeps insert behavior for new and duplicate notes", () => {
    const existing = makeNote({ id: "note-a" });
    const incoming = makeNote({ id: "note-b", attachments: undefined as unknown as NoteWithAttachments["attachments"] });

    expect(applyRealtimeNoteInsert([existing], incoming)).toEqual([
      expect.objectContaining({ id: "note-b", attachments: [] }),
      existing,
    ]);
    expect(applyRealtimeNoteInsert([existing], existing)).toEqual([existing]);
  });
});
