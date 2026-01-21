import type { NoteWithAttachments } from "@notesbrain/shared";
import { useState } from "react";

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
            onClick={() => setIsEditingCategory(true)}
            style={{
              fontSize: 12,
              fontWeight: 600,
              border: "1px solid #ddd",
              background: "white",
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
      </div>

      <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{preview}</p>
    </article>
  );
}
