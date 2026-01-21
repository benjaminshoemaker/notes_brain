import { describe, expect, it, vi } from "vitest";

const fromMock = vi.hoisted(() => vi.fn());
const insertMock = vi.hoisted(() => vi.fn());
const selectMock = vi.hoisted(() => vi.fn());
const singleMock = vi.hoisted(() => vi.fn());

vi.mock("../lib/supabaseClient", () => {
  const chain = {
    insert: (...args: unknown[]) => {
      insertMock(...args);
      return chain;
    },
    select: (...args: unknown[]) => {
      selectMock(...args);
      return chain;
    },
    single: (...args: unknown[]) => {
      singleMock(...args);
      return Promise.resolve({
        data: {
          id: "note_1",
          user_id: "user_1",
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
          type: "text",
          content: "hello",
          category: "uncategorized",
          classification_confidence: null,
          classification_status: "pending",
          attachments: []
        },
        error: null
      });
    }
  };

  fromMock.mockImplementation(() => chain);

  return {
    supabase: {
      from: fromMock
    }
  };
});

import { createTextNote } from "../lib/notesApi";

describe("Task 2.4.A (API)", () => {
  it("should save text notes as uncategorized pending when creating a note", async () => {
    await createTextNote("user_1", "hello");

    expect(fromMock).toHaveBeenCalledWith("notes");
    expect(insertMock).toHaveBeenCalledWith({
      user_id: "user_1",
      type: "text",
      content: "hello",
      category: "uncategorized",
      classification_status: "pending",
      classification_confidence: null
    });
  });
});

