import type { NoteWithAttachments } from "@notesbrain/shared";

import { NoteCard } from "./NoteCard";

type Props = {
  notes: NoteWithAttachments[];
};

export function NoteList({ notes }: Props) {
  if (notes.length === 0) {
    return <p>No notes yet.</p>;
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {notes.map((note) => (
        <NoteCard key={note.id} note={note} />
      ))}
    </div>
  );
}

