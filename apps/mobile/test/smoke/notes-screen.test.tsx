import React from "react";
import { act, create } from "react-test-renderer";
import type { ReactTestInstance, ReactTestRenderer } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { useNotesMock, useRealtimeNotesMock } = vi.hoisted(() => ({
  useNotesMock: vi.fn(),
  useRealtimeNotesMock: vi.fn()
}));

vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-1" }
  })
}));

vi.mock("../../hooks/useNotes", () => ({
  useNotes: () => useNotesMock()
}));

vi.mock("../../hooks/useRealtimeNotes", () => ({
  useRealtimeNotes: (userId: string | undefined) => useRealtimeNotesMock(userId)
}));

vi.mock("../../components/MobileCategoryFilter", () => ({
  MobileCategoryFilter: () => React.createElement("Text", null, "Category Filter")
}));

vi.mock("../../components/NotesList", () => ({
  NotesList: ({ notes }: { notes: Array<{ id: string }> }) =>
    React.createElement("Text", null, `Notes count: ${notes.length}`)
}));

import NotesScreen from "../../app/(app)/notes";

describe("mobile notes screen smoke", () => {
  beforeEach(() => {
    useNotesMock.mockReset();
    useRealtimeNotesMock.mockReset();
    useNotesMock.mockReturnValue({
      data: [
        {
          id: "note-1",
          user_id: "user-1",
          created_at: "2026-03-06T00:00:00.000Z",
          updated_at: "2026-03-06T00:00:00.000Z",
          content: "First note",
          category: "ideas",
          type: "text",
          classification_status: "completed",
          classification_confidence: 0.88,
          attachments: []
        },
        {
          id: "note-2",
          user_id: "user-1",
          created_at: "2026-03-06T00:01:00.000Z",
          updated_at: "2026-03-06T00:01:00.000Z",
          content: "Second note",
          category: "projects",
          type: "text",
          classification_status: "completed",
          classification_confidence: 0.91,
          attachments: []
        }
      ],
      isLoading: false,
      isRefetching: false,
      refetch: vi.fn(),
      error: null
    });
  });

  it("should render notes list data", async () => {
    let tree!: ReactTestRenderer;
    await act(async () => {
      tree = create(<NotesScreen />);
      await Promise.resolve();
    });
    const text = tree.root
      .findAll((item: ReactTestInstance) => String(item.type) === "Text")
      .map((item: ReactTestInstance) => item.children.join(""));

    expect(text).toContain("Category Filter");
    expect(text).toContain("Notes count: 2");
    expect(useRealtimeNotesMock).toHaveBeenCalledWith("user-1");
  });
});
