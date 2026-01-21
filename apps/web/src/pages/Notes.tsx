import { useMemo, useState } from "react";

import type { Category, NoteWithAttachments } from "@notesbrain/shared";
import { useNavigate } from "react-router-dom";

import { CategoryFilter } from "../components/CategoryFilter";
import { NoteList } from "../components/NoteList";
import { SearchInput } from "../components/SearchInput";
import { useNotes } from "../hooks/useNotes";
import { useSearch } from "../hooks/useSearch";
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
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading, error } = useNotes();
  const {
    data: searchResults,
    isLoading: isSearchLoading,
    isFetching: isSearchFetching
  } = useSearch(searchQuery);

  const notes = useMemo(() => sortNotes(data ?? []), [data]);

  const isSearchMode = searchQuery.trim().length > 0;
  const baseNotes = isSearchMode ? sortNotes(searchResults ?? []) : notes;
  const filteredNotes = useMemo(() => {
    if (!selectedCategory) return baseNotes;
    return baseNotes.filter((note) => note.category === selectedCategory);
  }, [baseNotes, selectedCategory]);

  async function handleLogout() {
    await signOutUser();
    navigate("/login", { replace: true });
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <header style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <h1 style={{ margin: 0 }}>Notes</h1>

        <div style={{ flex: 1 }}>
          <SearchInput value={searchQuery} onChange={setSearchQuery} />
        </div>

        <div style={{ marginLeft: "auto" }}>
          <button type="button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <CategoryFilter selectedCategory={selectedCategory} onSelectCategory={setSelectedCategory} />

      {isLoading ? <p>Loading…</p> : null}
      {error ? <p role="alert">Failed to load notes.</p> : null}
      {isSearchMode && (isSearchLoading || isSearchFetching) ? <p>Searching…</p> : null}

      {!isLoading && !error && !isSearchMode ? <NoteList notes={filteredNotes} /> : null}

      {!isLoading && !error && isSearchMode ? (
        filteredNotes.length === 0 && !isSearchLoading ? (
          <p>No matching notes.</p>
        ) : (
          <NoteList notes={filteredNotes} />
        )
      ) : null}
    </div>
  );
}
