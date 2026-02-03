import { FlatList, View, Text, StyleSheet, RefreshControl } from "react-native";
import type { NoteWithAttachments, Category } from "@notesbrain/shared";

import { LoadingSpinner } from "./LoadingSpinner";
import { MobileNoteCard } from "./MobileNoteCard";

type NotesListProps = {
  notes: NoteWithAttachments[];
  isLoading: boolean;
  isRefetching: boolean;
  onRefresh: () => void;
  selectedCategory: Category | "all";
};

export function NotesList({
  notes,
  isLoading,
  isRefetching,
  onRefresh,
  selectedCategory,
}: NotesListProps) {
  const filteredNotes =
    selectedCategory === "all"
      ? notes
      : notes.filter((note) => note.category === selectedCategory);

  if (isLoading) {
    return (
      <LoadingSpinner label="Loading notes..." />
    );
  }

  if (filteredNotes.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyIcon}>📝</Text>
        <Text style={styles.emptyTitle}>
          {selectedCategory === "all" ? "No notes yet" : `No ${selectedCategory} notes`}
        </Text>
        <Text style={styles.emptySubtitle}>
          {selectedCategory === "all"
            ? "Capture your first thought from the Capture tab"
            : "Try selecting a different category"}
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={filteredNotes}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <MobileNoteCard note={item} />}
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor="#0066cc" />
      }
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#666666",
    textAlign: "center",
    lineHeight: 20,
  },
  listContent: {
    paddingTop: 12,
    paddingBottom: 24,
  },
});
