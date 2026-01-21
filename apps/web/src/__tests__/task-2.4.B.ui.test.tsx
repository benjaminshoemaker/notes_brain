import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { ToastProvider } from "../components/ToastProvider";
import { ACCEPTED_ATTACHMENT_EXTENSIONS, isAcceptedAttachmentFile } from "../lib/fileValidation";

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

function dispatchDragEvent(type: string, files: File[]) {
  const event = new Event(type, { bubbles: true, cancelable: true }) as Event & {
    dataTransfer?: { types: string[]; files: File[] };
  };

  Object.defineProperty(event, "dataTransfer", {
    value: { types: ["Files"], files },
    configurable: true
  });

  window.dispatchEvent(event);
}

describe("Task 2.4.B (UI)", () => {
  it("should activate the drop zone overlay when files are dragged over the page", async () => {
    fetchNotesMock.mockResolvedValue([]);
    searchNotesMock.mockResolvedValue([]);

    const { findByTestId } = renderNotes();

    const file = new File(["hello"], "test.pdf", { type: "application/pdf" });
    act(() => {
      dispatchDragEvent("dragenter", [file]);
    });

    expect(await findByTestId("file-drop-overlay")).toBeInTheDocument();
  });

  it("should accept the configured attachment file types when validating files", () => {
    for (const ext of ACCEPTED_ATTACHMENT_EXTENSIONS) {
      const file = new File(["hello"], `test.${ext}`, { type: "application/octet-stream" });
      expect(isAcceptedAttachmentFile(file)).toBe(true);
    }
  });

  it("should reject files larger than 10MB with an error message when dropped", async () => {
    fetchNotesMock.mockResolvedValue([]);
    searchNotesMock.mockResolvedValue([]);

    const { findByText } = renderNotes();

    const file = new File(["hello"], "big.pdf", { type: "application/pdf" });
    Object.defineProperty(file, "size", { value: 11 * 1024 * 1024 });

    act(() => {
      dispatchDragEvent("drop", [file]);
    });

    expect(await findByText(/max size is 10mb/i)).toBeInTheDocument();
  });

  it("should show a category dropdown after dropping a valid file", async () => {
    fetchNotesMock.mockResolvedValue([]);
    searchNotesMock.mockResolvedValue([]);

    const { findByLabelText } = renderNotes();

    const file = new File(["hello"], "test.pdf", { type: "application/pdf" });
    act(() => {
      dispatchDragEvent("drop", [file]);
    });

    expect(await findByLabelText(/category/i)).toBeInTheDocument();
  });
});
