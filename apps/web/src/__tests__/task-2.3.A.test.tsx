import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, waitFor } from "@testing-library/react";
import { within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchNotesMock = vi.hoisted(() => vi.fn());
vi.mock("../lib/notesApi", () => ({
  fetchNotes: fetchNotesMock
}));

import NotesPage from "../pages/Notes";

function renderNotes() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 1000 * 60 * 5
      }
    }
  });

  const view = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <NotesPage />
      </MemoryRouter>
    </QueryClientProvider>
  );

  return { ...view, queryClient };
}

describe("Task 2.3.A", () => {
  beforeEach(() => {
    fetchNotesMock.mockReset();
  });

  it("should display notes in reverse chronological order when notes are loaded", async () => {
    fetchNotesMock.mockResolvedValue([
      {
        id: "note_old",
        user_id: "user_1",
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
        type: "text",
        content: "old note",
        category: "projects",
        classification_confidence: null,
        classification_status: "pending",
        attachments: []
      },
      {
        id: "note_new",
        user_id: "user_1",
        created_at: "2026-01-02T00:00:00.000Z",
        updated_at: "2026-01-02T00:00:00.000Z",
        type: "text",
        content: "new note",
        category: "ideas",
        classification_confidence: null,
        classification_status: "pending",
        attachments: []
      }
    ]);

    const { findAllByTestId } = renderNotes();
    const cards = await findAllByTestId("note-card");

    expect(cards[0]).toHaveTextContent("new note");
    expect(cards[1]).toHaveTextContent("old note");
  });

  it("should show content preview, category badge, and timestamp when a note is rendered", async () => {
    fetchNotesMock.mockResolvedValue([
      {
        id: "note_1",
        user_id: "user_1",
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
        type: "text",
        content: "x".repeat(400),
        category: "projects",
        classification_confidence: null,
        classification_status: "pending",
        attachments: []
      }
    ]);

    const { findByTestId, getByText } = renderNotes();

    const card = await findByTestId("note-card");
    expect(card.textContent ?? "").toContain("…");
    expect(within(card).getByText(/^projects$/i)).toBeInTheDocument();

    const timestamp = await findByTestId("note-timestamp");
    expect(timestamp).toHaveAttribute("datetime", "2026-01-01T00:00:00.000Z");
  });

  it("should filter notes by a single category when a category button is clicked", async () => {
    fetchNotesMock.mockResolvedValue([
      {
        id: "note_1",
        user_id: "user_1",
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
        type: "text",
        content: "project note",
        category: "projects",
        classification_confidence: null,
        classification_status: "pending",
        attachments: []
      },
      {
        id: "note_2",
        user_id: "user_1",
        created_at: "2026-01-02T00:00:00.000Z",
        updated_at: "2026-01-02T00:00:00.000Z",
        type: "text",
        content: "idea note",
        category: "ideas",
        classification_confidence: null,
        classification_status: "pending",
        attachments: []
      }
    ]);

    const user = userEvent.setup();
    const { findAllByTestId, getByRole } = renderNotes();

    await findAllByTestId("note-card");
    await user.click(getByRole("button", { name: /projects/i }));

    const cards = await findAllByTestId("note-card");
    expect(cards).toHaveLength(1);
    expect(cards[0]).toHaveTextContent("project note");
  });

  it("should show all notes when the All filter is selected", async () => {
    fetchNotesMock.mockResolvedValue([
      {
        id: "note_1",
        user_id: "user_1",
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
        type: "text",
        content: "project note",
        category: "projects",
        classification_confidence: null,
        classification_status: "pending",
        attachments: []
      },
      {
        id: "note_2",
        user_id: "user_1",
        created_at: "2026-01-02T00:00:00.000Z",
        updated_at: "2026-01-02T00:00:00.000Z",
        type: "text",
        content: "idea note",
        category: "ideas",
        classification_confidence: null,
        classification_status: "pending",
        attachments: []
      }
    ]);

    const user = userEvent.setup();
    const { findAllByTestId, getByRole } = renderNotes();

    await findAllByTestId("note-card");

    await user.click(getByRole("button", { name: /projects/i }));
    let cards = await findAllByTestId("note-card");
    expect(cards).toHaveLength(1);

    await user.click(getByRole("button", { name: /^all$/i }));
    cards = await findAllByTestId("note-card");
    expect(cards).toHaveLength(2);
  });

  it("should show an empty state when no notes exist", async () => {
    fetchNotesMock.mockResolvedValue([]);

    const { getByText } = renderNotes();

    await waitFor(() => {
      expect(getByText(/no notes/i)).toBeInTheDocument();
    });
  });

  it("should cache notes when remounting within stale time", async () => {
    fetchNotesMock.mockResolvedValue([
      {
        id: "note_1",
        user_id: "user_1",
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
        type: "text",
        content: "project note",
        category: "projects",
        classification_confidence: null,
        classification_status: "pending",
        attachments: []
      }
    ]);

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          staleTime: 1000 * 60 * 5
        }
      }
    });

    const view = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <NotesPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await view.findAllByTestId("note-card");
    view.unmount();

    const view2 = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <NotesPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await view2.findAllByTestId("note-card");
    expect(fetchNotesMock).toHaveBeenCalledTimes(1);
  });
});
