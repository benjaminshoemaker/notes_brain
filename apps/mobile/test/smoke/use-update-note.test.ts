import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NoteWithAttachments } from "@notesbrain/shared";

const {
  fromMock,
  updateMock,
  updateEqMock,
  updateSelectMock,
  updateMaybeSingleMock,
  lookupSelectMock,
  lookupEqMock,
  lookupMaybeSingleMock,
  invokeLocalEdgeFunctionMock,
} = vi.hoisted(() => ({
  fromMock: vi.fn(),
  updateMock: vi.fn(),
  updateEqMock: vi.fn(),
  updateSelectMock: vi.fn(),
  updateMaybeSingleMock: vi.fn(),
  lookupSelectMock: vi.fn(),
  lookupEqMock: vi.fn(),
  lookupMaybeSingleMock: vi.fn(),
  invokeLocalEdgeFunctionMock: vi.fn(),
}));

vi.mock("../../lib/supabaseClient", () => ({
  supabase: {
    from: fromMock,
  },
}));

vi.mock("../../lib/localEdgeFunctions", () => ({
  invokeLocalEdgeFunction: invokeLocalEdgeFunctionMock,
}));

import {
  applyUpdatedNoteToCache,
  requireUpdateNoteUser,
  toUpdatePayload,
  updateNoteForUser,
} from "../../hooks/useUpdateNote";

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

function setupSupabaseMocks() {
  const updateBuilder = {
    eq: updateEqMock,
    select: updateSelectMock,
    maybeSingle: updateMaybeSingleMock,
  };
  const lookupBuilder = {
    eq: lookupEqMock,
    maybeSingle: lookupMaybeSingleMock,
  };
  const tableBuilder = {
    update: updateMock,
    select: lookupSelectMock,
  };

  updateMock.mockReturnValue(updateBuilder);
  updateEqMock.mockReturnValue(updateBuilder);
  updateSelectMock.mockReturnValue(updateBuilder);
  lookupSelectMock.mockReturnValue(lookupBuilder);
  lookupEqMock.mockReturnValue(lookupBuilder);
  fromMock.mockReturnValue(tableBuilder);
}

describe("useUpdateNote helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupSupabaseMocks();
    updateMaybeSingleMock.mockResolvedValue({ data: null, error: null });
    lookupMaybeSingleMock.mockResolvedValue({ data: null, error: null });
  });

  it("updates an existing cached row without moving it", () => {
    const noteA = makeNote({ id: "note-a", content: "A" });
    const noteB = makeNote({ id: "note-b", content: "B", updated_at: "2026-05-01T00:01:00.000Z" });
    const noteC = makeNote({ id: "note-c", content: "C" });
    const updated = makeNote({
      id: "note-b",
      content: "Updated B",
      category: "projects",
      updated_at: "2026-05-01T00:02:00.000Z",
    });

    const cached = applyUpdatedNoteToCache([noteA, noteB, noteC], updated)!;

    expect(cached.map((note) => note.id)).toEqual(["note-a", "note-b", "note-c"]);
    expect(cached[1]).toMatchObject({
      id: "note-b",
      content: "Updated B",
      category: "projects",
      updated_at: "2026-05-01T00:02:00.000Z",
    });
  });

  it("preserves existing attachments if the returned row omits attachments", () => {
    const existingAttachment = {
      id: "att-1",
      note_id: "note-1",
      filename: "voice.m4a",
      mime_type: "audio/mp4",
      storage_path: "voice",
      size_bytes: 10,
      created_at: "2026-05-01T00:00:00.000Z",
    };
    const note = makeNote({ attachments: [existingAttachment] });
    const updated = {
      ...note,
      content: "Updated",
      attachments: undefined,
    } as unknown as NoteWithAttachments;

    expect(applyUpdatedNoteToCache([note], updated)?.[0].attachments).toEqual([existingAttachment]);
  });

  it("throws conflict when the note exists with a different updated_at", async () => {
    const note = makeNote({});
    updateMaybeSingleMock.mockResolvedValue({ data: null, error: null });
    lookupMaybeSingleMock.mockResolvedValue({ data: { id: note.id, updated_at: "newer" }, error: null });

    await expect(
      updateNoteForUser({
        id: note.id,
        category: "projects",
        expectedUpdatedAt: note.updated_at,
      }, "user-1")
    ).rejects.toMatchObject({ code: "conflict" });
  });

  it("throws not_found when no row is updated or found", async () => {
    const note = makeNote({});
    updateMaybeSingleMock.mockResolvedValue({ data: null, error: null });
    lookupMaybeSingleMock.mockResolvedValue({ data: null, error: null });

    await expect(
      updateNoteForUser({
        id: note.id,
        category: "projects",
        expectedUpdatedAt: note.updated_at,
      }, "user-1")
    ).rejects.toMatchObject({ code: "not_found" });
  });

  it("throws supabase_error and leaves cache behavior to the caller", async () => {
    const note = makeNote({});
    updateMaybeSingleMock.mockResolvedValue({ data: null, error: { message: "database unavailable" } });

    await expect(
      updateNoteForUser({
        id: note.id,
        content: "Updated",
        expectedUpdatedAt: note.updated_at,
      }, "user-1")
    ).rejects.toMatchObject({ code: "supabase_error" });
  });

  it("throws not_authenticated before a user-scoped update can run", () => {
    expect(() => requireUpdateNoteUser(null)).toThrowError(
      expect.objectContaining({ code: "not_authenticated" })
    );
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("filters by id, user_id, and updated_at and selects attachments", async () => {
    const note = makeNote({});
    updateMaybeSingleMock.mockResolvedValue({ data: note, error: null });

    await updateNoteForUser({
      id: note.id,
      content: "Updated",
      expectedUpdatedAt: note.updated_at,
    }, "user-1");

    expect(updateEqMock).toHaveBeenCalledWith("id", note.id);
    expect(updateEqMock).toHaveBeenCalledWith("user_id", "user-1");
    expect(updateEqMock).toHaveBeenCalledWith("updated_at", note.updated_at);
    expect(updateSelectMock).toHaveBeenCalledWith("*, attachments(*)");
  });

  it("never sends classification fields or invokes classification", async () => {
    const note = makeNote({});
    updateMaybeSingleMock.mockResolvedValue({ data: note, error: null });

    await updateNoteForUser({
      id: note.id,
      content: "Updated",
      category: "projects",
      expectedUpdatedAt: note.updated_at,
    }, "user-1");

    expect(updateMock).toHaveBeenCalledWith({
      content: "Updated",
      category: "projects",
    });
    expect(JSON.stringify(updateMock.mock.calls[0][0])).not.toContain("classification_status");
    expect(JSON.stringify(updateMock.mock.calls[0][0])).not.toContain("classification_confidence");
    expect(invokeLocalEdgeFunctionMock).not.toHaveBeenCalled();
  });

  it("builds payloads only from provided content and category fields", () => {
    expect(toUpdatePayload({
      id: "note-1",
      category: "admin",
      expectedUpdatedAt: "timestamp",
    })).toEqual({ category: "admin" });
  });
});
