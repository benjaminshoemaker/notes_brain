import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { waitFor } from "@testing-library/react";

import { ToastProvider } from "../components/ToastProvider";

const fetchNotesMock = vi.hoisted(() => vi.fn());
const searchNotesMock = vi.hoisted(() => vi.fn());
const createTextNoteMock = vi.hoisted(() => vi.fn());
const updateNoteCategoryMock = vi.hoisted(() => vi.fn());

vi.mock("../lib/notesApi", () => ({
  fetchNotes: fetchNotesMock,
  searchNotes: searchNotesMock,
  createTextNote: createTextNoteMock,
  updateNoteCategory: updateNoteCategoryMock
}));

vi.mock("../hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user_1", email: "me@example.com" },
    session: { user: { id: "user_1", email: "me@example.com" } },
    isLoading: false
  })
}));

vi.mock("../lib/uploadApi", () => ({
  uploadAttachmentFile: vi.fn()
}));

import NotesPage from "../pages/Notes";

function renderNotes() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false
      }
    }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter>
          <NotesPage />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

describe("Task 2.5.A (UI)", () => {
  it("should open a category selector when clicking the category badge", async () => {
    fetchNotesMock.mockResolvedValue([
      {
        id: "note_1",
        user_id: "user_1",
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
        type: "text",
        content: "note",
        category: "projects",
        classification_confidence: null,
        classification_status: "pending",
        attachments: []
      }
    ]);
    searchNotesMock.mockResolvedValue([]);

    const { findByTestId, findByLabelText } = renderNotes();

    const card = await findByTestId("note-card");
    const badge = within(card).getByRole("button", { name: /^projects$/i });
    fireEvent.click(badge);

    expect(await findByLabelText(/edit note category/i)).toBeInTheDocument();
  });

  it("should optimistically update the category when selecting a new category", async () => {
    fetchNotesMock.mockResolvedValue([
      {
        id: "note_1",
        user_id: "user_1",
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
        type: "text",
        content: "note",
        category: "projects",
        classification_confidence: null,
        classification_status: "pending",
        attachments: []
      }
    ]);
    searchNotesMock.mockResolvedValue([]);

    const deferred = createDeferred<unknown>();
    updateNoteCategoryMock.mockReturnValue(deferred.promise);

    const { findByTestId, findByLabelText, getByTestId } = renderNotes();

    const card = await findByTestId("note-card");
    const badge = within(card).getByRole("button", { name: /^projects$/i });
    fireEvent.click(badge);

    const select = await findByLabelText(/edit note category/i);
    fireEvent.change(select, { target: { value: "ideas" } });

    await findByTestId("note-card");
    await waitFor(() => {
      const updatedCard = getByTestId("note-card");
      expect(within(updatedCard).getByRole("button", { name: /^ideas$/i })).toBeInTheDocument();
    });
  });

  it("should close the selector after selecting a category", async () => {
    fetchNotesMock.mockResolvedValue([
      {
        id: "note_1",
        user_id: "user_1",
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
        type: "text",
        content: "note",
        category: "projects",
        classification_confidence: null,
        classification_status: "pending",
        attachments: []
      }
    ]);
    searchNotesMock.mockResolvedValue([]);
    updateNoteCategoryMock.mockResolvedValue({
      id: "note_1",
      category: "ideas",
      classification_status: "manual",
      classification_confidence: null
    });

    const { findByTestId, findByLabelText, queryByLabelText } = renderNotes();

    const card = await findByTestId("note-card");
    const badge = within(card).getByRole("button", { name: /^projects$/i });
    fireEvent.click(badge);

    const select = await findByLabelText(/edit note category/i);
    fireEvent.change(select, { target: { value: "ideas" } });

    expect(queryByLabelText(/edit note category/i)).not.toBeInTheDocument();
  });

  it("should persist the updated category when the page is refreshed", async () => {
    fetchNotesMock.mockResolvedValueOnce([
      {
        id: "note_1",
        user_id: "user_1",
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
        type: "text",
        content: "note",
        category: "projects",
        classification_confidence: null,
        classification_status: "pending",
        attachments: []
      }
    ]);

    fetchNotesMock.mockResolvedValueOnce([
      {
        id: "note_1",
        user_id: "user_1",
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
        type: "text",
        content: "note",
        category: "ideas",
        classification_confidence: null,
        classification_status: "manual",
        attachments: []
      }
    ]);

    searchNotesMock.mockResolvedValue([]);
    updateNoteCategoryMock.mockResolvedValue({
      id: "note_1",
      category: "ideas",
      classification_status: "manual",
      classification_confidence: null
    });

    const view = renderNotes();

    const card = await view.findByTestId("note-card");
    const badge = within(card).getByRole("button", { name: /^projects$/i });
    fireEvent.click(badge);

    const select = await view.findByLabelText(/edit note category/i);
    fireEvent.change(select, { target: { value: "ideas" } });

    await view.findByTestId("note-card");
    await waitFor(() => {
      const updatedCard = view.getByTestId("note-card");
      expect(within(updatedCard).getByRole("button", { name: /^ideas$/i })).toBeInTheDocument();
    });

    view.unmount();

    const view2 = renderNotes();
    const refreshedCard = await view2.findByTestId("note-card");
    await waitFor(() => {
      expect(within(refreshedCard).getByRole("button", { name: /^ideas$/i })).toBeInTheDocument();
    });
  });
});
