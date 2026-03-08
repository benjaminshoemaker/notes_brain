import { FlatList, View, Text, StyleSheet, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NoteWithAttachments, Category } from "@notesbrain/shared";

import { LoadingSpinner } from "./LoadingSpinner";
import { MobileNoteCard } from "./MobileNoteCard";
import { testIds } from "../lib/testIds";
import { colors } from "../lib/theme";

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
      <View testID={testIds.notes.emptyState} accessibilityLabel="No notes found" style={styles.centerContainer}>
        <View style={styles.emptyIconCircle}>
          <Ionicons name="document-text-outline" size={36} color={colors.accent} />
        </View>
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
      testID={testIds.notes.list}
      data={filteredNotes}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <MobileNoteCard note={item} />}
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={colors.accent} />
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
    gap: 8,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.accentLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
    marginTop: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  listContent: {
    paddingTop: 12,
    paddingBottom: 24,
  },
});
