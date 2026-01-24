import { ScrollView, TouchableOpacity, Text, StyleSheet } from "react-native";
import { CATEGORIES, type Category } from "@notesbrain/shared";

type MobileCategoryFilterProps = {
  selectedCategory: Category | "all";
  onSelectCategory: (category: Category | "all") => void;
};

export function MobileCategoryFilter({
  selectedCategory,
  onSelectCategory,
}: MobileCategoryFilterProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      <TouchableOpacity
        style={[styles.filterButton, selectedCategory === "all" && styles.filterButtonSelected]}
        onPress={() => onSelectCategory("all")}
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
          style={[
            styles.filterButton,
            selectedCategory === category && styles.filterButtonSelected,
          ]}
          onPress={() => onSelectCategory(category)}
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
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    borderWidth: 1,
    borderColor: "transparent",
  },
  filterButtonSelected: {
    backgroundColor: "#0066cc",
    borderColor: "#0066cc",
  },
  filterText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666666",
  },
  filterTextSelected: {
    color: "#ffffff",
  },
});
