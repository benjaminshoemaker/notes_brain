import { ScrollView, TouchableOpacity, Text, StyleSheet } from "react-native";
import { CATEGORIES, type Category } from "@notesbrain/shared";
import * as Haptics from "expo-haptics";

import { testIds } from "../lib/testIds";
import { colors, radii } from "../lib/theme";

type MobileCategoryFilterProps = {
  selectedCategory: Category | "all";
  onSelectCategory: (category: Category | "all") => void;
  disabled?: boolean;
};

export function MobileCategoryFilter({
  selectedCategory,
  onSelectCategory,
  disabled = false,
}: MobileCategoryFilterProps) {
  function handleSelect(value: Category | "all") {
    if (disabled) return;
    if (value === selectedCategory) return;
    try {
      Haptics.selectionAsync();
    } catch {
      // Ignore haptics failures (e.g. simulator/device without haptics).
    }
    onSelectCategory(value);
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      style={styles.scroll}
    >
      <TouchableOpacity
        testID={testIds.notes.filterAll}
        accessibilityRole="button"
        accessibilityLabel="Filter: All notes"
        accessibilityState={{ selected: selectedCategory === "all", disabled }}
        disabled={disabled}
        style={[
          styles.filterButton,
          selectedCategory === "all" && styles.filterButtonSelected,
          disabled && styles.filterButtonDisabled,
        ]}
        onPress={() => handleSelect("all")}
      >
        <Text
          style={[styles.filterText, selectedCategory === "all" && styles.filterTextSelected]}
        >
          All
        </Text>
      </TouchableOpacity>

      {CATEGORIES.map((category) => (
        <TouchableOpacity
          key={category}
          testID={testIds.notes.filterCategory(category)}
          accessibilityRole="button"
          accessibilityLabel={`Filter: ${formatCategoryLabel(category)} notes`}
          accessibilityState={{ selected: selectedCategory === category, disabled }}
          disabled={disabled}
          style={[
            styles.filterButton,
            selectedCategory === category && styles.filterButtonSelected,
            disabled && styles.filterButtonDisabled,
          ]}
          onPress={() => handleSelect(category)}
        >
          <Text
            style={[
              styles.filterText,
              selectedCategory === category && styles.filterTextSelected,
            ]}
          >
            {formatCategoryLabel(category)}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

function formatCategoryLabel(category: Category): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
  },
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    alignItems: "center",
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    minHeight: 48,
    justifyContent: "center" as const,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceRaised,
  },
  filterButtonSelected: {
    backgroundColor: colors.accentLight,
  },
  filterButtonDisabled: {
    opacity: 0.5,
  },
  filterText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  filterTextSelected: {
    color: colors.accent,
    fontWeight: "600",
  },
});
