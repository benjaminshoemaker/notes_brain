import { useEffect, useMemo, useState } from "react";

import type { Category, NoteWithAttachments } from "@notesbrain/shared";
import { Link, useNavigate } from "react-router-dom";

import { CategoryFilter } from "../components/CategoryFilter";
import { CategorySelect } from "../components/CategorySelect";
import { FileDropZone } from "../components/FileDropZone";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { NoteInput } from "../components/NoteInput";
import { NoteList } from "../components/NoteList";
import { SearchInput } from "../components/SearchInput";
import { useNotes } from "../hooks/useNotes";
import { useRealtimeNotes } from "../hooks/useRealtimeNotes";
import { useSearch } from "../hooks/useSearch";
import { useUploadFile } from "../hooks/useUploadFile";
import { useToast } from "../hooks/useToast";
import { signOutUser } from "../lib/authApi";
import { validateAttachmentFile } from "../lib/fileValidation";

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
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingFileCategory, setPendingFileCategory] = useState<Category | "">("");

  const { data, isLoading, error, refetch: refetchNotes } = useNotes();
  const {
    data: searchResults,
    isLoading: isSearchLoading,
    isFetching: isSearchFetching,
    error: searchError,
    refetch: refetchSearch
  } = useSearch(searchQuery);
  const uploadFile = useUploadFile();
  const { showToast } = useToast();

  useRealtimeNotes();

  const notes = useMemo(() => sortNotes(data ?? []), [data]);

  const isSearchMode = searchQuery.trim().length > 0;
  const baseNotes = isSearchMode ? sortNotes(searchResults ?? []) : notes;
  const filteredNotes = useMemo(() => {
    if (!selectedCategory) return baseNotes;
    return baseNotes.filter((note) => note.category === selectedCategory);
  }, [baseNotes, selectedCategory]);

  useEffect(() => {
    if (error) {
      showToast("Couldn't load notes. Check your connection.", "error", {
        label: "Retry",
        onClick: () => {
          void refetchNotes();
        }
      });
    }
  }, [error, refetchNotes, showToast]);

  useEffect(() => {
    if (searchError) {
      showToast("Search failed. Try again.", "error", {
        label: "Retry",
        onClick: () => {
          void refetchSearch();
        }
      });
    }
  }, [searchError, refetchSearch, showToast]);

  async function handleLogout() {
    await signOutUser();
    navigate("/login", { replace: true });
  }

  function handleFilesDropped(files: File[]) {
    const file = files[0];
    if (!file) return;

    const result = validateAttachmentFile(file);
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }

    setPendingFile(file);
    setPendingFileCategory("");
  }

  async function handleUploadPendingFile() {
    if (!pendingFile) return;

    try {
      await uploadFile.mutateAsync({
        file: pendingFile,
        category: pendingFileCategory || undefined
      });
      setPendingFile(null);
      setPendingFileCategory("");
    } catch {
      // Toast handled in mutation.
    }
  }

  return (
    <FileDropZone onFilesDropped={handleFilesDropped}>
      <div style={{ display: "grid", gap: 16 }}>
        <header style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h1 style={{ margin: 0 }}>Notes</h1>

          <div style={{ flex: 1 }}>
            <SearchInput value={searchQuery} onChange={setSearchQuery} />
          </div>

          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <Link to="/settings">
              <button type="button">Settings</button>
            </Link>
            <button type="button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>

        <NoteInput />

        {pendingFile ? (
          <div
            style={{
              border: "1px solid #ddd",
              borderRadius: 10,
              padding: 12,
              display: "grid",
              gap: 10
            }}
          >
            <div>
              <strong>Upload:</strong> {pendingFile.name}
            </div>

            <CategorySelect value={pendingFileCategory} onChange={setPendingFileCategory} />

            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={handleUploadPendingFile} disabled={uploadFile.isPending}>
                {uploadFile.isPending ? "Uploading..." : "Upload file"}
              </button>
              <button type="button" onClick={() => setPendingFile(null)} disabled={uploadFile.isPending}>
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        <CategoryFilter selectedCategory={selectedCategory} onSelectCategory={setSelectedCategory} />

        {isLoading ? <LoadingSpinner label="Loading notes…" /> : null}
        {error ? <p role="alert">Failed to load notes.</p> : null}
        {isSearchMode && (isSearchLoading || isSearchFetching) ? (
          <LoadingSpinner label="Searching…" />
        ) : null}

        {!isLoading && !error && !isSearchMode ? <NoteList notes={filteredNotes} /> : null}

        {!isLoading && !error && isSearchMode ? (
          filteredNotes.length === 0 && !isSearchLoading ? (
            <p>No matching notes.</p>
          ) : (
            <NoteList notes={filteredNotes} />
          )
        ) : null}
      </div>
    </FileDropZone>
  );
}
