import { describe, expect, it, vi } from "vitest";

const uploadMock = vi.hoisted(() => vi.fn());
const storageFromMock = vi.hoisted(() => vi.fn());
const fromMock = vi.hoisted(() => vi.fn());
const notesInsertMock = vi.hoisted(() => vi.fn());
const attachmentsInsertMock = vi.hoisted(() => vi.fn());

vi.mock("../lib/supabaseClient", () => {
  const notesChain = {
    insert: (...args: unknown[]) => {
      notesInsertMock(...args);
      return notesChain;
    },
    select: () => notesChain,
    single: () =>
      Promise.resolve({
        data: {
          id: "note_1",
          user_id: "user_1",
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
          type: "file",
          content: null,
          category: "uncategorized",
          classification_confidence: null,
          classification_status: "manual",
          attachments: []
        },
        error: null
      })
  };

  const attachmentsChain = {
    insert: (...args: unknown[]) => {
      attachmentsInsertMock(...args);
      return attachmentsChain;
    },
    select: () => attachmentsChain,
    single: () =>
      Promise.resolve({
        data: {
          id: "att_1",
          note_id: "note_1",
          filename: "test.pdf",
          mime_type: "application/pdf",
          storage_path: "user_1/attachments/note_1/test.pdf",
          size_bytes: 5,
          created_at: "2026-01-01T00:00:00.000Z"
        },
        error: null
      })
  };

  fromMock.mockImplementation((table: string) => {
    if (table === "notes") return notesChain;
    if (table === "attachments") return attachmentsChain;
    throw new Error(`Unexpected table: ${table}`);
  });

  uploadMock.mockResolvedValue({
    data: { path: "user_1/attachments/note_1/test.pdf" },
    error: null
  });

  storageFromMock.mockReturnValue({
    upload: uploadMock
  });

  return {
    supabase: {
      from: fromMock,
      storage: {
        from: storageFromMock
      }
    }
  };
});

import { uploadAttachmentFile } from "../lib/uploadApi";

describe("Task 2.4.B (API)", () => {
  it("should create a file note with manual classification status when uploading a file", async () => {
    const file = new File(["hello"], "test.pdf", { type: "application/pdf" });
    await uploadAttachmentFile({ userId: "user_1", file, category: "ideas" });

    expect(notesInsertMock).toHaveBeenCalledWith({
      user_id: "user_1",
      type: "file",
      content: null,
      category: "ideas",
      classification_status: "manual",
      classification_confidence: null
    });
  });

  it("should upload files to the expected storage path when uploading a file", async () => {
    const file = new File(["hello"], "test.pdf", { type: "application/pdf" });
    await uploadAttachmentFile({ userId: "user_1", file });

    expect(storageFromMock).toHaveBeenCalledWith("attachments");
    expect(uploadMock).toHaveBeenCalledWith("user_1/attachments/note_1/test.pdf", file);
  });
});

