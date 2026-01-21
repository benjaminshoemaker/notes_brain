import { useMemo, useState } from "react";

import type { Category, NoteWithAttachments } from "@notesbrain/shared";
import { useNavigate } from "react-router-dom";

import { CategoryFilter } from "../components/CategoryFilter";
import { NoteList } from "../components/NoteList";
import { useNotes } from "../hooks/useNotes";
import { signOutUser } from "../lib/authApi";

function sortNotes(notes: NoteWithAttachments[]) {
  return [...notes].sort((a, b) => {
    const aTime = new Date(a.created_at).getTime();
    const bTime = new Date(b.created_at).getTime();
    return bTime - aTime;
  });
}

export default function NotesPage() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  const { data, isLoading, error } = useNotes();

  const notes = useMemo(() => sortNotes(data ?? []), [data]);
  const filteredNotes = useMemo(() => {
    if (!selectedCategory) return notes;
    return notes.filter((note) => note.category === selectedCategory);
  }, [notes, selectedCategory]);

  async function handleLogout() {
    await signOutUser();
    navigate("/login", { replace: true });
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <header style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <h1 style={{ margin: 0 }}>Notes</h1>
        <div style={{ marginLeft: "auto" }}>
          <button type="button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <CategoryFilter selectedCategory={selectedCategory} onSelectCategory={setSelectedCategory} />

      {isLoading ? <p>Loading…</p> : null}
      {error ? <p role="alert">Failed to load notes.</p> : null}
      {!isLoading && !error ? <NoteList notes={filteredNotes} /> : null}
    </div>
  );
}

