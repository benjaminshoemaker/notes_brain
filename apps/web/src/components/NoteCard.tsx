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
      className="note-card"
    >
      <div className="note-card__header">
        {isEditingCategory ? (
          <CategoryEditor
            noteId={note.id}
            value={note.category}
            onClose={() => setIsEditingCategory(false)}
          />
        ) : (
          <button
            type="button"
            className="badge badge-button"
            data-highlighted={isCategoryHighlighted ? "true" : undefined}
            onClick={() => setIsEditingCategory(true)}
          >
            {note.category}
          </button>
        )}
        <time
          data-testid="note-timestamp"
          dateTime={note.created_at}
          className="note-card__time"
        >
          {new Date(note.created_at).toLocaleString()}
        </time>
        {attachmentCount > 0 ? (
          <span
            data-testid="attachment-count"
            className="badge"
          >
            {attachmentCount}
          </span>
        ) : null}
      </div>

      <p className="note-card__content">{preview}</p>

      {attachmentCount > 0 ? (
        <div className="filter-row">
          {note.attachments.map((attachment) => (
            <AttachmentPreview key={attachment.id} attachment={attachment} />
          ))}
        </div>
      ) : null}
    </article>
  );
}
