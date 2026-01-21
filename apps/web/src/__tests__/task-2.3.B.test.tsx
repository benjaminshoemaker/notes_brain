import fs from "node:fs/promises";
import path from "node:path";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ToastProvider } from "../components/ToastProvider";

const fetchNotesMock = vi.hoisted(() => vi.fn());
const searchNotesMock = vi.hoisted(() => vi.fn());

vi.mock("../lib/notesApi", () => ({
  fetchNotes: fetchNotesMock,
  searchNotes: searchNotesMock,
  createTextNote: vi.fn()
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
        retry: false,
        staleTime: 1000 * 60 * 5
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

describe("Task 2.3.B", () => {
  beforeEach(() => {
    fetchNotesMock.mockReset();
    searchNotesMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should render a search input when visiting the notes page", async () => {
    fetchNotesMock.mockResolvedValue([]);
    searchNotesMock.mockResolvedValue([]);

    const { findByLabelText } = renderNotes();
    expect(await findByLabelText(/search/i)).toBeInTheDocument();
  });

  it("should debounce search by 300ms when typing in the search input", async () => {
    vi.useFakeTimers();

    fetchNotesMock.mockResolvedValue([]);
    searchNotesMock.mockResolvedValue([]);

    const { getByLabelText } = renderNotes();

    const input = getByLabelText(/search/i);
    fireEvent.change(input, { target: { value: "hello" } });

    expect(searchNotesMock).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(searchNotesMock).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(searchNotesMock).toHaveBeenCalledWith("hello");
  });

  it("should use Supabase textSearch on search_vector when searching", async () => {
    const webRoot = path.resolve(__dirname, "../..");
    const contents = await fs.readFile(path.join(webRoot, "src/lib/notesApi.ts"), "utf8");

    expect(contents).toMatch(/textSearch\(\s*["']search_vector["']/);
  });

  it("should replace the note list with search results when search is active", async () => {
    fetchNotesMock.mockResolvedValue([
      {
        id: "note_full",
        user_id: "user_1",
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
        type: "text",
        content: "full note",
        category: "projects",
        classification_confidence: null,
        classification_status: "pending",
        attachments: []
      }
    ]);

    searchNotesMock.mockResolvedValue([
      {
        id: "note_search",
        user_id: "user_1",
        created_at: "2026-01-02T00:00:00.000Z",
        updated_at: "2026-01-02T00:00:00.000Z",
        type: "text",
        content: "search note",
        category: "ideas",
        classification_confidence: null,
        classification_status: "pending",
        attachments: []
      }
    ]);

    const user = userEvent.setup();
    const { findByText, findByLabelText, queryByText } = renderNotes();

    await findByText("full note");

    const input = await findByLabelText(/search/i);
    await user.type(input, "search");

    await findByText("search note");

    expect(queryByText("full note")).not.toBeInTheDocument();
  });

  it("should restore the full note list when clearing the search input", async () => {
    fetchNotesMock.mockResolvedValue([
      {
        id: "note_full",
        user_id: "user_1",
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
        type: "text",
        content: "full note",
        category: "projects",
        classification_confidence: null,
        classification_status: "pending",
        attachments: []
      }
    ]);

    searchNotesMock.mockResolvedValue([
      {
        id: "note_search",
        user_id: "user_1",
        created_at: "2026-01-02T00:00:00.000Z",
        updated_at: "2026-01-02T00:00:00.000Z",
        type: "text",
        content: "search note",
        category: "ideas",
        classification_confidence: null,
        classification_status: "pending",
        attachments: []
      }
    ]);

    const user = userEvent.setup();
    const { findByLabelText, findByText, queryByText } = renderNotes();

    await findByText("full note");

    const input = await findByLabelText(/search/i);
    await user.type(input, "search");

    await findByText("search note");
    expect(queryByText("full note")).not.toBeInTheDocument();

    await user.clear(input);
    await findByText("full note");
  });

  it("should show an empty search message when no results are found", async () => {
    fetchNotesMock.mockResolvedValue([
      {
        id: "note_full",
        user_id: "user_1",
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
        type: "text",
        content: "full note",
        category: "projects",
        classification_confidence: null,
        classification_status: "pending",
        attachments: []
      }
    ]);

    searchNotesMock.mockResolvedValue([]);

    const user = userEvent.setup();
    const { findByLabelText, findByText } = renderNotes();

    const input = await findByLabelText(/search/i);
    await user.type(input, "nope");

    await findByText(/no matching notes/i);
  });
});
