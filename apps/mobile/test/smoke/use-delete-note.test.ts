import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NoteWithAttachments } from "@notesbrain/shared";

const {
  fromMock,
  deleteMock,
  deleteEqMock,
  deleteSelectMock,
  deleteMaybeSingleMock,
  lookupSelectMock,
  lookupEqMock,
  lookupMaybeSingleMock,
} = vi.hoisted(() => ({
  fromMock: vi.fn(),
  deleteMock: vi.fn(),
  deleteEqMock: vi.fn(),
  deleteSelectMock: vi.fn(),
  deleteMaybeSingleMock: vi.fn(),
  lookupSelectMock: vi.fn(),
  lookupEqMock: vi.fn(),
  lookupMaybeSingleMock: vi.fn(),
}));

vi.mock("../../lib/supabaseClient", () => ({
  supabase: {
    from: fromMock,
  },
}));

import {
  applyDeletedNoteToCache,
  deleteNoteForUser,
  requireDeleteNoteUser,
} from "../../hooks/useDeleteNote";

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
  const deleteBuilder = {
    eq: deleteEqMock,
    select: deleteSelectMock,
    maybeSingle: deleteMaybeSingleMock,
  };
  const lookupBuilder = {
    eq: lookupEqMock,
    maybeSingle: lookupMaybeSingleMock,
  };
  const tableBuilder = {
    delete: deleteMock,
    select: lookupSelectMock,
  };

  deleteMock.mockReturnValue(deleteBuilder);
  deleteEqMock.mockReturnValue(deleteBuilder);
  deleteSelectMock.mockReturnValue(deleteBuilder);
  lookupSelectMock.mockReturnValue(lookupBuilder);
  lookupEqMock.mockReturnValue(lookupBuilder);
  fromMock.mockReturnValue(tableBuilder);
}

describe("useDeleteNote helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupSupabaseMocks();
    deleteMaybeSingleMock.mockResolvedValue({ data: null, error: null });
    lookupMaybeSingleMock.mockResolvedValue({ data: null, error: null });
  });

  it("removes the deleted note from the cached list", () => {
    const noteA = makeNote({ id: "note-a" });
    const noteB = makeNote({ id: "note-b" });
    const noteC = makeNote({ id: "note-c" });

    expect(applyDeletedNoteToCache([noteA, noteB, noteC], "note-b")?.map((note) => note.id)).toEqual([
      "note-a",
      "note-c",
    ]);
  });

  it("filters by id, user_id, and updated_at before deleting", async () => {
    const note = makeNote({});
    deleteMaybeSingleMock.mockResolvedValue({ data: { id: note.id }, error: null });

    await deleteNoteForUser({
      id: note.id,
      expectedUpdatedAt: note.updated_at,
    }, "user-1");

    expect(deleteEqMock).toHaveBeenCalledWith("id", note.id);
    expect(deleteEqMock).toHaveBeenCalledWith("user_id", "user-1");
    expect(deleteEqMock).toHaveBeenCalledWith("updated_at", note.updated_at);
    expect(deleteSelectMock).toHaveBeenCalledWith("id");
  });

  it("throws conflict when the note exists with a different updated_at", async () => {
    const note = makeNote({});
    lookupMaybeSingleMock.mockResolvedValue({ data: { id: note.id, updated_at: "newer" }, error: null });

    await expect(
      deleteNoteForUser({
        id: note.id,
        expectedUpdatedAt: note.updated_at,
      }, "user-1")
    ).rejects.toMatchObject({ code: "conflict" });
  });

  it("throws not_found when no row is deleted or found", async () => {
    const note = makeNote({});
    lookupMaybeSingleMock.mockResolvedValue({ data: null, error: null });

    await expect(
      deleteNoteForUser({
        id: note.id,
        expectedUpdatedAt: note.updated_at,
      }, "user-1")
    ).rejects.toMatchObject({ code: "not_found" });
  });

  it("throws not_authenticated before a user-scoped delete can run", () => {
    expect(() => requireDeleteNoteUser(null)).toThrowError(
      expect.objectContaining({ code: "not_authenticated" })
    );
    expect(deleteMock).not.toHaveBeenCalled();
  });
});
