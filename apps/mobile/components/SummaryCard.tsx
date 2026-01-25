import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useState } from "react";
import type { DailySummaryContent } from "@notesbrain/shared";

type SummaryCardProps = {
  content: DailySummaryContent;
};

export function SummaryCard({ content }: SummaryCardProps) {
  const [checkedActions, setCheckedActions] = useState<Set<number>>(new Set());

  function toggleAction(index: number) {
    setCheckedActions((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  return (
    <View style={styles.container}>
      {/* Top Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today's Top 3</Text>
        {content.top_actions.map((action, index) => (
          <TouchableOpacity
            key={index}
            style={styles.actionRow}
            onPress={() => toggleAction(index)}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.checkbox,
                checkedActions.has(index) && styles.checkboxChecked,
              ]}
            >
              {checkedActions.has(index) && (
                <Text style={styles.checkmark}>✓</Text>
              )}
            </View>
            <Text
              style={[
                styles.actionText,
                checkedActions.has(index) && styles.actionTextChecked,
              ]}
            >
              {action}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Avoiding Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🙈 Maybe Avoiding...</Text>
        <View style={styles.contentBox}>
          <Text style={styles.contentText}>{content.avoiding}</Text>
        </View>
      </View>

      {/* Small Win Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎉 Small Win</Text>
        <View style={[styles.contentBox, styles.winBox]}>
          <Text style={styles.contentText}>{content.small_win}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 24,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#0066cc",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: "#0066cc",
  },
  checkmark: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    lineHeight: 24,
  },
  actionTextChecked: {
    textDecorationLine: "line-through",
    color: "#999",
  },
  contentBox: {
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    padding: 16,
  },
  winBox: {
    backgroundColor: "#e8f5e9",
  },
  contentText: {
    fontSize: 15,
    color: "#555",
    lineHeight: 22,
  },
});
