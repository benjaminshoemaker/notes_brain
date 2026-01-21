import { describe, expect, it, vi } from "vitest";

const fromMock = vi.hoisted(() => vi.fn());
const updateMock = vi.hoisted(() => vi.fn());
const eqMock = vi.hoisted(() => vi.fn());
const selectMock = vi.hoisted(() => vi.fn());
const singleMock = vi.hoisted(() => vi.fn());

vi.mock("../lib/supabaseClient", () => {
  const chain = {
    update: (...args: unknown[]) => {
      updateMock(...args);
      return chain;
    },
    eq: (...args: unknown[]) => {
      eqMock(...args);
      return chain;
    },
    select: (...args: unknown[]) => {
      selectMock(...args);
      return chain;
    },
    single: () =>
      Promise.resolve({
        data: {
          id: "note_1",
          category: "ideas",
          classification_status: "manual",
          classification_confidence: null
        },
        error: null
      })
  };

  fromMock.mockImplementation(() => chain);

  return {
    supabase: {
      from: fromMock
    }
  };
});

import { updateNoteCategory } from "../lib/notesApi";

describe("Task 2.5.A (API)", () => {
  it("should set manual classification fields when updating note category", async () => {
    await updateNoteCategory("note_1", "ideas");

    expect(fromMock).toHaveBeenCalledWith("notes");
    expect(updateMock).toHaveBeenCalledWith({
      category: "ideas",
      classification_status: "manual",
      classification_confidence: null
    });
    expect(eqMock).toHaveBeenCalledWith("id", "note_1");
  });
});

