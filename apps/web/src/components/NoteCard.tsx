import type { NoteWithAttachments } from "@notesbrain/shared";
import { useEffect, useRef, useState } from "react";

import { AttachmentPreview } from "./AttachmentPreview";
import { CategoryEditor } from "./CategoryEditor";

type Props = {
  note: NoteWithAttachments;
};

const PREVIEW_LENGTH = 200;

function formatPreview(content: string | null) {
  if (!content) return "";
  if (content.length <= PREVIEW_LENGTH) return content;
  return `${content.slice(0, PREVIEW_LENGTH)}…`;
}

export function NoteCard({ note }: Props) {
  const preview = formatPreview(note.content);
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [isCategoryHighlighted, setIsCategoryHighlighted] = useState(false);
  const previousStatusRef = useRef(note.classification_status);
  const attachmentCount = note.attachments?.length ?? 0;

  useEffect(() => {
    const previousStatus = previousStatusRef.current;
    previousStatusRef.current = note.classification_status;

    if (note.classification_status === "completed" && previousStatus !== "completed") {
      setIsCategoryHighlighted(true);
      const handle = window.setTimeout(() => {
        setIsCategoryHighlighted(false);
      }, 1500);

      return () => {
        window.clearTimeout(handle);
      };
    }

    return undefined;
  }, [note.classification_status]);

  return (
    <article
      data-testid="note-card"
      style={{
        border: "1px solid #ddd",
        borderRadius: 8,
        padding: 12,
        display: "grid",
        gap: 8
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {isEditingCategory ? (
          <CategoryEditor
            noteId={note.id}
            value={note.category}
            onClose={() => setIsEditingCategory(false)}
          />
        ) : (
          <button
            type="button"
            data-highlighted={isCategoryHighlighted ? "true" : undefined}
            onClick={() => setIsEditingCategory(true)}
            style={{
              fontSize: 12,
              fontWeight: 600,
              border: "1px solid #ddd",
              background: isCategoryHighlighted ? "#fff7cc" : "white",
              transition: "background 200ms ease",
              borderRadius: 999,
              padding: "2px 8px",
              cursor: "pointer"
            }}
          >
            {note.category}
          </button>
        )}
        <time
          data-testid="note-timestamp"
          dateTime={note.created_at}
          style={{ marginLeft: "auto", fontSize: 12, color: "#555" }}
        >
          {new Date(note.created_at).toLocaleString()}
        </time>
        {attachmentCount > 0 ? (
          <span
            data-testid="attachment-count"
            style={{
              fontSize: 12,
              border: "1px solid #ddd",
              borderRadius: 999,
              padding: "2px 8px"
            }}
          >
            {attachmentCount}
          </span>
        ) : null}
      </div>

      <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{preview}</p>

      {attachmentCount > 0 ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {note.attachments.map((attachment) => (
            <AttachmentPreview key={attachment.id} attachment={attachment} />
          ))}
        </div>
      ) : null}
    </article>
  );
}
