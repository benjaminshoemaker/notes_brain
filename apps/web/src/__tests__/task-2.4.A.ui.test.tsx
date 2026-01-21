import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { ToastProvider } from "../components/ToastProvider";

const fetchNotesMock = vi.hoisted(() => vi.fn());
const searchNotesMock = vi.hoisted(() => vi.fn());
const createTextNoteMock = vi.hoisted(() => vi.fn());

vi.mock("../lib/notesApi", () => ({
  fetchNotes: fetchNotesMock,
  searchNotes: searchNotesMock,
  createTextNote: createTextNoteMock
}));

vi.mock("../hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user_1", email: "me@example.com" },
    session: { user: { id: "user_1", email: "me@example.com" } },
    isLoading: false
  })
}));

vi.mock("../hooks/useRealtimeNotes", () => ({
  useRealtimeNotes: () => undefined
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

describe("Task 2.4.A (UI)", () => {
  it("should show a focused note input when the notes page loads", async () => {
    fetchNotesMock.mockResolvedValue([]);
    searchNotesMock.mockResolvedValue([]);

    const { getByLabelText, findByText } = renderNotes();
    await findByText(/no notes/i);

    const textarea = getByLabelText(/new note/i);
    await waitFor(() => {
      expect(textarea).toHaveFocus();
    });
  });

  it("should create a note when pressing Enter in the note input", async () => {
    fetchNotesMock.mockResolvedValue([]);
    searchNotesMock.mockResolvedValue([]);
    createTextNoteMock.mockResolvedValue({
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
    });

    const user = userEvent.setup();
    const { getByLabelText, findByText } = renderNotes();
    await findByText(/no notes/i);

    const textarea = getByLabelText(/new note/i);
    await user.type(textarea, "hello{enter}");

    await waitFor(() => {
      expect(createTextNoteMock).toHaveBeenCalledWith("user_1", "hello");
    });
  });

  it("should show a new note immediately when creating a note", async () => {
    fetchNotesMock.mockResolvedValue([]);
    searchNotesMock.mockResolvedValue([]);

    const deferred = createDeferred<unknown>();
    createTextNoteMock.mockReturnValue(deferred.promise);

    const user = userEvent.setup();
    const { getByLabelText, findByText, findByTestId } = renderNotes();
    await findByText(/no notes/i);

    const textarea = getByLabelText(/new note/i);
    await user.type(textarea, "optimistic{enter}");

    const card = await findByTestId("note-card");
    expect(card).toHaveTextContent("optimistic");

    deferred.resolve({
      id: "note_saved",
      user_id: "user_1",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      type: "text",
      content: "optimistic",
      category: "uncategorized",
      classification_confidence: null,
      classification_status: "pending",
      attachments: []
    });
  });

  it("should clear the input when note creation succeeds", async () => {
    fetchNotesMock.mockResolvedValue([]);
    searchNotesMock.mockResolvedValue([]);

    const deferred = createDeferred<unknown>();
    createTextNoteMock.mockReturnValue(deferred.promise);

    const user = userEvent.setup();
    const { getByLabelText, findByText } = renderNotes();
    await findByText(/no notes/i);

    const textarea = getByLabelText(/new note/i) as HTMLTextAreaElement;
    await user.type(textarea, "clear me{enter}");

    deferred.resolve({
      id: "note_saved",
      user_id: "user_1",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      type: "text",
      content: "clear me",
      category: "uncategorized",
      classification_confidence: null,
      classification_status: "pending",
      attachments: []
    });

    await waitFor(() => {
      expect(textarea.value).toBe("");
    });
  });

  it("should display an error toast when note creation fails", async () => {
    fetchNotesMock.mockResolvedValue([]);
    searchNotesMock.mockResolvedValue([]);

    createTextNoteMock.mockRejectedValue(new Error("boom"));

    const user = userEvent.setup();
    const { getByLabelText, findByText } = renderNotes();
    await findByText(/no notes/i);

    const textarea = getByLabelText(/new note/i);
    await user.type(textarea, "fail{enter}");

    await findByText(/failed to create note/i);
  });
});
