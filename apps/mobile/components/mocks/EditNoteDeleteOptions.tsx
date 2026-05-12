import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { colors, getCategoryTint, radii, shadows, spacing, typography } from "../../lib/theme";

const categoryTint = getCategoryTint("ideas");

export default function EditNoteDeleteOptions() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Delete in Edit Flow</Text>
      <Text style={styles.subtitle}>
        Three placement options using the current edit-note surface and Warm Ink tokens.
      </Text>

      <OptionFrame
        eyebrow="Option 1"
        title="Footer action"
        note="Best default: visible, hard to miss, and keeps destructive action away from Save."
      >
        <MockNoteCard variant="footer" />
      </OptionFrame>

      <OptionFrame
        eyebrow="Option 2"
        title="Header icon"
        note="Good when edit mode should stay compact. Needs clear confirmation because the icon is easy to tap."
      >
        <MockNoteCard variant="header" />
      </OptionFrame>

      <OptionFrame
        eyebrow="Option 3"
        title="Danger row"
        note="Safest for accidental taps, but less discoverable. Useful if deletes should feel rare."
      >
        <MockNoteCard variant="danger" />
      </OptionFrame>
    </ScrollView>
  );
}

type OptionFrameProps = {
  eyebrow: string;
  title: string;
  note: string;
  children: React.ReactNode;
};

function OptionFrame({ eyebrow, title, note, children }: OptionFrameProps) {
  return (
    <View style={styles.option}>
      <View style={styles.optionHeader}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.optionTitle}>{title}</Text>
        <Text style={styles.optionNote}>{note}</Text>
      </View>
      {children}
    </View>
  );
}

type MockNoteCardProps = {
  variant: "footer" | "header" | "danger";
};

function MockNoteCard({ variant }: MockNoteCardProps) {
  return (
    <View style={styles.noteCard}>
      <View style={styles.cardHeader}>
        <View style={[styles.badge, { backgroundColor: categoryTint.bg }]}>
          <Text style={[styles.badgeText, { color: categoryTint.text }]}>ideas</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.timestamp}>2h ago</Text>
          {variant === "header" ? (
            <View style={styles.headerDeleteButton}>
              <Ionicons name="trash-outline" size={18} color={colors.error} />
            </View>
          ) : (
            <View style={styles.editIconButton}>
              <Ionicons name="create-outline" size={18} color={colors.textMuted} />
            </View>
          )}
        </View>
      </View>

      <View style={styles.editorInput}>
        <Text style={styles.editorText}>
          Think through a clearer weekly review flow: capture loose notes first, then pull out commitments and
          follow-ups before the summary is generated.
        </Text>
      </View>

      <View style={styles.categoryPicker}>
        {["ideas", "projects", "admin", "health"].map((category) => {
          const tint = getCategoryTint(category);
          const selected = category === "ideas";
          return (
            <View
              key={category}
              style={[
                styles.categoryOption,
                { backgroundColor: selected ? tint.bg : colors.surfaceRaised },
              ]}
            >
              <Text style={[styles.categoryOptionText, { color: selected ? tint.text : colors.textSecondary }]}>
                {category}
              </Text>
            </View>
          );
        })}
      </View>

      {variant === "danger" && (
        <View style={styles.dangerRow}>
          <View style={styles.dangerTextWrap}>
            <Text style={styles.dangerTitle}>Delete note</Text>
            <Text style={styles.dangerCopy}>Removes this note after confirmation.</Text>
          </View>
          <View style={styles.dangerIconButton}>
            <Ionicons name="trash-outline" size={18} color={colors.error} />
          </View>
        </View>
      )}

      <View style={[styles.actionRow, variant === "footer" && styles.actionRowSplit]}>
        {variant === "footer" && (
          <View style={[styles.actionButton, styles.deleteButton]}>
            <Ionicons name="trash-outline" size={16} color={colors.error} />
            <Text style={styles.deleteButtonText}>Delete</Text>
          </View>
        )}
        <View style={styles.rightActions}>
          <View style={[styles.actionButton, styles.secondaryButton]}>
            <Text style={styles.secondaryButtonText}>Cancel</Text>
          </View>
          <View style={[styles.actionButton, styles.primaryButton]}>
            <Text style={styles.primaryButtonText}>Save</Text>
          </View>
        </View>
      </View>

      <View style={styles.confirmSheet}>
        <View style={styles.confirmIcon}>
          <Ionicons name="trash-outline" size={20} color={colors.error} />
        </View>
        <View style={styles.confirmTextWrap}>
          <Text style={styles.confirmTitle}>Delete this note?</Text>
          <Text style={styles.confirmCopy}>This cannot be undone.</Text>
        </View>
        <View style={styles.confirmButton}>
          <Text style={styles.confirmButtonText}>Delete</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  title: {
    ...typography.screenTitle,
    color: colors.text,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  option: {
    gap: spacing.md,
  },
  optionHeader: {
    gap: spacing.xs,
  },
  eyebrow: {
    ...typography.badge,
    color: colors.accent,
    textTransform: "uppercase",
  },
  optionTitle: {
    ...typography.sectionTitle,
    color: colors.text,
  },
  optionNote: {
    ...typography.helper,
    color: colors.textSecondary,
  },
  noteCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
  },
  badge: {
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  badgeText: {
    ...typography.badge,
    textTransform: "capitalize",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  timestamp: {
    fontSize: 12,
    color: colors.textMuted,
  },
  editIconButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceRaised,
  },
  headerDeleteButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.pill,
    backgroundColor: colors.errorLight,
  },
  editorInput: {
    minHeight: 118,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceRaised,
    padding: spacing.md,
  },
  editorText: {
    ...typography.body,
    color: colors.text,
  },
  categoryPicker: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  categoryOption: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
  },
  categoryOptionText: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  dangerRow: {
    minHeight: 56,
    borderRadius: radii.md,
    backgroundColor: colors.errorLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  dangerTextWrap: {
    flex: 1,
  },
  dangerTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.error,
  },
  dangerCopy: {
    ...typography.helper,
    color: colors.textSecondary,
  },
  dangerIconButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  actionRowSplit: {
    justifyContent: "space-between",
  },
  rightActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  actionButton: {
    minHeight: 44,
    minWidth: 84,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  deleteButton: {
    minWidth: 96,
    backgroundColor: colors.errorLight,
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.error,
  },
  secondaryButton: {
    backgroundColor: colors.surfaceRaised,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  primaryButton: {
    backgroundColor: colors.accent,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textInverse,
  },
  confirmSheet: {
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceRaised,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  confirmIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.errorLight,
  },
  confirmTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  confirmTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  confirmCopy: {
    ...typography.helper,
    color: colors.textSecondary,
  },
  confirmButton: {
    minHeight: 40,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.error,
  },
  confirmButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textInverse,
  },
});
