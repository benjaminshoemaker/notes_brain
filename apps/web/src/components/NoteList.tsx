import type { NoteWithAttachments } from "@notesbrain/shared";

import { NoteCard } from "./NoteCard";

type Props = {
  notes: NoteWithAttachments[];
};

export function NoteList({ notes }: Props) {
  if (notes.length === 0) {
    return <p className="muted">No notes yet.</p>;
  }

  return (
    <div className="note-list">
      {notes.map((note) => (
        <NoteCard key={note.id} note={note} />
      ))}
    </div>
  );
}
