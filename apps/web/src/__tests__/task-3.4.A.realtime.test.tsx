import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ToastProvider } from "../components/ToastProvider";

const fetchNotesMock = vi.hoisted(() => vi.fn());

vi.mock("../lib/notesApi", () => ({
  fetchNotes: fetchNotesMock
}));

let authState: {
  user: { id: string; email: string } | null;
  session: { user: { id: string; email: string } } | null;
  isLoading: boolean;
} = {
  user: { id: "user_1", email: "me@example.com" },
  session: { user: { id: "user_1", email: "me@example.com" } },
  isLoading: false
};

vi.mock("../hooks/useAuth", () => ({
  useAuth: () => authState
}));

let capturedCallback: ((payload: unknown) => void) | null = null;

const channelMock = vi.hoisted(() => vi.fn());
const removeChannelMock = vi.hoisted(() => vi.fn());

vi.mock("../lib/supabaseClient", () => {
  const channel = {
    on: (_type: string, _filter: unknown, callback: (payload: unknown) => void) => {
      capturedCallback = callback;
      return channel;
    },
    subscribe: () => channel
  };

  channelMock.mockReturnValue(channel);

  return {
    supabase: {
      channel: channelMock,
      removeChannel: removeChannelMock
    }
  };
});

import NotesPage from "../pages/Notes";

function renderNotes() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false }
    }
  });

  const view = render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter>
          <NotesPage />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>
  );

  return { queryClient, ...view };
}

describe("Task 3.4.A (Realtime)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedCallback = null;
    authState = {
      user: { id: "user_1", email: "me@example.com" },
      session: { user: { id: "user_1", email: "me@example.com" } },
      isLoading: false
    };
  });

  it("should update category and highlight the badge when classification completes", async () => {
    fetchNotesMock.mockResolvedValue([
      {
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
      }
    ]);

    const { findByRole } = renderNotes();

    const badgeBefore = await findByRole("button", { name: "uncategorized" });
    expect(badgeBefore).toBeInTheDocument();

    expect(typeof capturedCallback).toBe("function");

    capturedCallback?.({
      eventType: "UPDATE",
      new: {
        id: "note_1",
        user_id: "user_1",
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:05.000Z",
        type: "text",
        content: "hello",
        category: "ideas",
        classification_confidence: 0.9,
        classification_status: "completed"
      }
    });

    const badgeAfter = await findByRole("button", { name: "ideas" });
    await waitFor(() => {
      expect(badgeAfter).toHaveAttribute("data-highlighted", "true");
    });
  });

  it("should clean up the subscription when the user logs out", async () => {
    fetchNotesMock.mockResolvedValue([]);

    const { queryClient, rerender, unmount } = renderNotes();

    expect(channelMock).toHaveBeenCalled();

    authState = { user: null, session: null, isLoading: false };

    rerender(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <MemoryRouter>
            <NotesPage />
          </MemoryRouter>
        </ToastProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(removeChannelMock).toHaveBeenCalled();
    });

    unmount();
  });
});
