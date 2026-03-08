import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import type { DailySummaryContent } from "@notesbrain/shared";

import { colors, radii } from "../lib/theme";

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
        <Text style={styles.ephemeralHint}>Tap to check off — resets each visit</Text>
        {content.top_actions.map((action, index) => (
          <TouchableOpacity
            key={index}
            style={styles.actionRow}
            onPress={() => toggleAction(index)}
            activeOpacity={0.7}
          >
            <View
              accessibilityRole="checkbox"
              accessibilityState={{ checked: checkedActions.has(index) }}
              style={[
                styles.checkbox,
                checkedActions.has(index) && styles.checkboxChecked,
              ]}
            >
              {checkedActions.has(index) && (
                <Ionicons name="checkmark" size={16} color={colors.textInverse} />
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
        <View style={styles.sectionTitleRow}>
          <Ionicons name="eye-off-outline" size={18} color={colors.textSecondary} />
          <Text style={styles.sectionTitle}>Maybe Avoiding...</Text>
        </View>
        <View style={styles.contentBox}>
          <Text style={styles.contentText}>{content.avoiding}</Text>
        </View>
      </View>

      {/* Small Win Section */}
      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="trophy-outline" size={18} color={colors.success} />
          <Text style={styles.sectionTitle}>Small Win</Text>
        </View>
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
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
  },
  ephemeralHint: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
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
    borderRadius: radii.sm,
    borderWidth: 2,
    borderColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: colors.accent,
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
  },
  actionTextChecked: {
    textDecorationLine: "line-through",
    color: colors.textMuted,
  },
  contentBox: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.lg,
    padding: 16,
  },
  winBox: {
    backgroundColor: colors.successLight,
  },
  contentText: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
  },
});
