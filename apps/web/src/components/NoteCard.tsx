import type { NoteWithAttachments } from "@notesbrain/shared";

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
        <span style={{ fontSize: 12, fontWeight: 600 }}>{note.category}</span>
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

