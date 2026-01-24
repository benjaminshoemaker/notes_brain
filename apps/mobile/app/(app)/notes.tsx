import { useState } from "react";
import { View, StyleSheet } from "react-native";
import type { Category } from "@notesbrain/shared";

import { NotesList } from "../../components/NotesList";
import { MobileCategoryFilter } from "../../components/MobileCategoryFilter";
import { useNotes } from "../../hooks/useNotes";
import { useRealtimeNotes } from "../../hooks/useRealtimeNotes";
import { useAuth } from "../../hooks/useAuth";

export default function NotesScreen() {
  const { user } = useAuth();
  const { data: notes = [], isLoading, isRefetching, refetch } = useNotes();
  const [selectedCategory, setSelectedCategory] = useState<Category | "all">("all");

  // Subscribe to realtime updates
  useRealtimeNotes(user?.id);

  return (
    <View style={styles.container}>
      <MobileCategoryFilter
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      <NotesList
        notes={notes}
        isLoading={isLoading}
        isRefetching={isRefetching}
        onRefresh={refetch}
        selectedCategory={selectedCategory}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
});
