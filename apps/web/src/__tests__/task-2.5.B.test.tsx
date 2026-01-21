import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const useAttachmentUrlMock = vi.hoisted(() => vi.fn());
vi.mock("../hooks/useAttachmentUrl", () => ({
  useAttachmentUrl: useAttachmentUrlMock
}));

import { NoteCard } from "../components/NoteCard";

describe("Task 2.5.B", () => {
  it("should show image thumbnails when a note has image attachments", () => {
    useAttachmentUrlMock.mockReturnValue({ data: "https://signed/image", isLoading: false });

    const { getByAltText } = render(
      <NoteCard
        note={{
          id: "note_1",
          user_id: "user_1",
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
          type: "file",
          content: null,
          category: "uncategorized",
          classification_confidence: null,
          classification_status: "manual",
          attachments: [
            {
              id: "att_1",
              note_id: "note_1",
              filename: "image.png",
              mime_type: "image/png",
              storage_path: "user_1/attachments/note_1/image.png",
              size_bytes: 123,
              created_at: "2026-01-01T00:00:00.000Z"
            }
          ]
        }}
      />
    );

    const img = getByAltText("image.png") as HTMLImageElement;
    expect(img.src).toBe("https://signed/image");
  });

  it("should show a PDF label and filename when a note has PDF attachments", () => {
    useAttachmentUrlMock.mockReturnValue({ data: "https://signed/pdf", isLoading: false });

    const { getByText } = render(
      <NoteCard
        note={{
          id: "note_1",
          user_id: "user_1",
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
          type: "file",
          content: null,
          category: "uncategorized",
          classification_confidence: null,
          classification_status: "manual",
          attachments: [
            {
              id: "att_1",
              note_id: "note_1",
              filename: "doc.pdf",
              mime_type: "application/pdf",
              storage_path: "user_1/attachments/note_1/doc.pdf",
              size_bytes: 123,
              created_at: "2026-01-01T00:00:00.000Z"
            }
          ]
        }}
      />
    );

    expect(getByText(/^pdf$/i)).toBeInTheDocument();
    expect(getByText(/doc\.pdf/i)).toBeInTheDocument();
  });

  it("should render attachment links that open in a new tab when a signed URL is available", () => {
    useAttachmentUrlMock.mockReturnValue({ data: "https://signed/pdf", isLoading: false });

    const { getByRole } = render(
      <NoteCard
        note={{
          id: "note_1",
          user_id: "user_1",
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
          type: "file",
          content: null,
          category: "uncategorized",
          classification_confidence: null,
          classification_status: "manual",
          attachments: [
            {
              id: "att_1",
              note_id: "note_1",
              filename: "doc.pdf",
              mime_type: "application/pdf",
              storage_path: "user_1/attachments/note_1/doc.pdf",
              size_bytes: 123,
              created_at: "2026-01-01T00:00:00.000Z"
            }
          ]
        }}
      />
    );

    const link = getByRole("link", { name: /doc\.pdf/i }) as HTMLAnchorElement;
    expect(link.target).toBe("_blank");
    expect(link.href).toBe("https://signed/pdf");
  });

  it("should show an attachment count badge when a note has attachments", () => {
    useAttachmentUrlMock.mockReturnValue({ data: "https://signed/image", isLoading: false });

    const { getByTestId } = render(
      <NoteCard
        note={{
          id: "note_1",
          user_id: "user_1",
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
          type: "file",
          content: null,
          category: "uncategorized",
          classification_confidence: null,
          classification_status: "manual",
          attachments: [
            {
              id: "att_1",
              note_id: "note_1",
              filename: "image.png",
              mime_type: "image/png",
              storage_path: "user_1/attachments/note_1/image.png",
              size_bytes: 123,
              created_at: "2026-01-01T00:00:00.000Z"
            },
            {
              id: "att_2",
              note_id: "note_1",
              filename: "doc.pdf",
              mime_type: "application/pdf",
              storage_path: "user_1/attachments/note_1/doc.pdf",
              size_bytes: 123,
              created_at: "2026-01-01T00:00:00.000Z"
            }
          ]
        }}
      />
    );

    expect(getByTestId("attachment-count")).toHaveTextContent("2");
  });

  it("should show a loading state when the signed URL is being fetched", () => {
    useAttachmentUrlMock.mockReturnValue({ data: undefined, isLoading: true });

    const { getByText } = render(
      <NoteCard
        note={{
          id: "note_1",
          user_id: "user_1",
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
          type: "file",
          content: null,
          category: "uncategorized",
          classification_confidence: null,
          classification_status: "manual",
          attachments: [
            {
              id: "att_1",
              note_id: "note_1",
              filename: "image.png",
              mime_type: "image/png",
              storage_path: "user_1/attachments/note_1/image.png",
              size_bytes: 123,
              created_at: "2026-01-01T00:00:00.000Z"
            }
          ]
        }}
      />
    );

    expect(getByText(/loading/i)).toBeInTheDocument();
  });
});
