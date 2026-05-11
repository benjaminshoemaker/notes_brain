import { useCallback, useEffect, useState } from "react";
import { View, StyleSheet, Alert } from "react-native";
import { useFocusEffect } from "expo-router";
import type { Category } from "@notesbrain/shared";
import type { NoteWithAttachments } from "@notesbrain/shared";

import { NotesList } from "../../components/NotesList";
import { MobileCategoryFilter } from "../../components/MobileCategoryFilter";
import { useNotes } from "../../hooks/useNotes";
import { useRealtimeNotes } from "../../hooks/useRealtimeNotes";
import { useUpdateNote, type UpdateNoteInput } from "../../hooks/useUpdateNote";
import { useDeleteNote, type DeleteNoteInput } from "../../hooks/useDeleteNote";
import { useAuth } from "../../hooks/useAuth";
import { testIds } from "../../lib/testIds";
import { colors } from "../../lib/theme";

export type ActiveEditState = {
  noteId: string;
  baseUpdatedAt: string;
  remoteState: "clean" | "updated" | "deleted";
} | null;

export default function NotesScreen() {
  const { user } = useAuth();
  const { data: notes = [], isLoading, isRefetching, refetch, error } = useNotes();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();
  const [selectedCategory, setSelectedCategory] = useState<Category | "all">("all");
  const [hasShownError, setHasShownError] = useState(false);
  const [activeEdit, setActiveEdit] = useState<ActiveEditState>(null);

  const handleRemoteUpdate = useCallback((noteId: string) => {
    if (activeEdit?.noteId !== noteId) return false;

    setActiveEdit((current) => current && current.noteId === noteId
      ? { ...current, remoteState: "updated" }
      : current
    );
    return true;
  }, [activeEdit?.noteId]);

  const handleRemoteDelete = useCallback((noteId: string) => {
    if (activeEdit?.noteId !== noteId) return false;

    setActiveEdit((current) => current && current.noteId === noteId
      ? { ...current, remoteState: "deleted" }
      : current
    );
    return true;
  }, [activeEdit?.noteId]);

  // Subscribe to realtime updates
  useRealtimeNotes(user?.id, {
    onRemoteUpdate: handleRemoteUpdate,
    onRemoteDelete: handleRemoteDelete,
  });

  useFocusEffect(
    useCallback(() => {
      return () => setActiveEdit(null);
    }, [])
  );

  useEffect(() => {
    if (!user) {
      setActiveEdit(null);
    }
  }, [user]);

  useEffect(() => {
    if (error && !hasShownError) {
      setHasShownError(true);
      Alert.alert(
        "Connection issue",
        "We couldn't load your notes. Check your connection and try again.",
        [
          {
            text: "Retry",
            onPress: () => {
              refetch();
            },
          },
          { text: "Dismiss", style: "cancel" },
        ]
      );
    }

    if (!error && hasShownError) {
      setHasShownError(false);
    }
  }, [error, hasShownError, refetch]);

  function handleStartEdit(note: NoteWithAttachments) {
    setActiveEdit({
      noteId: note.id,
      baseUpdatedAt: note.updated_at,
      remoteState: "clean",
    });
  }

  function handleCancelEdit(noteId: string) {
    const remoteState = activeEdit?.noteId === noteId ? activeEdit.remoteState : "clean";
    setActiveEdit(null);

    if (remoteState === "updated" || remoteState === "deleted") {
      void refetch();
    }
  }

  async function handleSaveEdit(input: UpdateNoteInput) {
    await updateNote.mutateAsync(input);
    setActiveEdit(null);
  }

  async function handleDeleteEdit(input: DeleteNoteInput) {
    await deleteNote.mutateAsync(input);
    setActiveEdit(null);
  }

  return (
    <View testID={testIds.notes.screen} style={styles.container}>
      <MobileCategoryFilter
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        disabled={activeEdit !== null}
      />

      <NotesList
        notes={notes}
        isLoading={isLoading}
        isRefetching={isRefetching}
        onRefresh={refetch}
        selectedCategory={selectedCategory}
        activeEditState={activeEdit}
        onStartEdit={handleStartEdit}
        onCancelEdit={handleCancelEdit}
        onSaveEdit={handleSaveEdit}
        onDeleteEdit={handleDeleteEdit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
