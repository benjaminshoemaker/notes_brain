import { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Animated, Pressable, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CATEGORIES, type Category, type NoteWithAttachments } from "@notesbrain/shared";
import type { UpdateNoteInput } from "../hooks/useUpdateNote";

import { testIds } from "../lib/testIds";
import { validateNoteEditDraft } from "../lib/noteEditValidation";
import { colors, radii, shadows, spacing, getCategoryTint } from "../lib/theme";

type MobileNoteCardProps = {
  note: NoteWithAttachments;
  isEditing?: boolean;
  editBaselineUpdatedAt?: string | null;
  isEditDisabled?: boolean;
  remoteState?: "clean" | "updated" | "deleted";
  onStartEdit?: (note: NoteWithAttachments) => void;
  onCancelEdit?: (noteId: string) => void;
  onSaveEdit?: (input: UpdateNoteInput) => Promise<void>;
};

const PREVIEW_LENGTH = 150;

function formatPreview(content: string | null): string {
  if (!content) return "";
  if (content.length <= PREVIEW_LENGTH) return content;
  return `${content.slice(0, PREVIEW_LENGTH)}...`;
}

function formatTimestamp(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

export function MobileNoteCard({
  note,
  isEditing = false,
  editBaselineUpdatedAt = null,
  isEditDisabled = false,
  remoteState = "clean",
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
}: MobileNoteCardProps) {
  const preview = formatPreview(note.content);
  const attachmentCount = note.attachments?.length ?? 0;
  const previousStatusRef = useRef(note.classification_status);
  const highlightAnim = useRef(new Animated.Value(0)).current;
  const [draftContent, setDraftContent] = useState(note.content ?? "");
  const [draftCategory, setDraftCategory] = useState<Category>(note.category);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const wasEditingRef = useRef(false);

  useEffect(() => {
    const previousStatus = previousStatusRef.current;
    previousStatusRef.current = note.classification_status;

    if (note.classification_status === "completed" && previousStatus !== "completed") {
      Animated.sequence([
        Animated.timing(highlightAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: false,
        }),
        Animated.delay(600),
        Animated.timing(highlightAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [note.classification_status, highlightAnim]);

  useEffect(() => {
    if (isEditing && !wasEditingRef.current) {
      setDraftContent(note.content ?? "");
      setDraftCategory(note.category);
      setSaveError(null);
      setIsSaving(false);
    }
    wasEditingRef.current = isEditing;
  }, [isEditing, note.category, note.content]);

  const isPending = note.classification_status === "pending";
  const isFailed = note.classification_status === "failed";
  const displayCategory = isPending ? "classifying..." : note.category;
  const tint = getCategoryTint(isPending ? "pending" : note.category);
  const sourceLabel = note.type === "voice"
    ? "Voice note"
    : note.type === "file"
      ? "File attachment"
      : "Text note";
  const canPressEdit = !isPending && !isEditDisabled && !isEditing;
  const validation = validateNoteEditDraft({
    originalContent: note.content,
    originalCategory: note.category,
    draftContent,
    draftCategory,
  });
  const remoteMessage = remoteState === "updated"
    ? "This note changed elsewhere. Cancel to reload the latest version."
    : remoteState === "deleted"
      ? "This note was deleted elsewhere. Cancel to remove it from this list."
      : null;
  const validationMessage = validation.error === "empty_body"
    ? "Note body cannot be empty."
    : null;
  const saveDisabled = isSaving || remoteState !== "clean" || !validation.canSave;

  async function handleSave() {
    if (!onSaveEdit || saveDisabled) return;

    setSaveError(null);
    setIsSaving(true);

    const input: UpdateNoteInput = {
      id: note.id,
      expectedUpdatedAt: editBaselineUpdatedAt ?? note.updated_at,
    };

    if (validation.bodyChanged) {
      input.content = validation.trimmedContent;
    }

    if (validation.categoryChanged) {
      input.category = draftCategory;
    }

    try {
      await onSaveEdit(input);
    } catch {
      setSaveError("Couldn't save changes. Check your connection and try again.");
    } finally {
      setIsSaving(false);
    }
  }

  const backgroundColor = highlightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.surface, colors.accentLight],
  });

  const accessibilityDesc = [
    displayCategory,
    note.type === "voice" ? "voice note" : note.type === "file" ? "file attachment" : "",
    formatTimestamp(note.created_at),
    preview || (note.type === "voice" ? "Voice note" : "No content"),
  ].filter(Boolean).join(", ");

  return (
    <Animated.View
      testID={testIds.notes.card(note.id)}
      accessibilityLabel={accessibilityDesc}
      style={[styles.container, { backgroundColor }]}
    >
      <View style={styles.header}>
        <View style={[styles.categoryBadge, { backgroundColor: tint.bg }]}>
          <Text style={[styles.categoryText, { color: tint.text }]}>{displayCategory}</Text>
        </View>

        <View style={styles.headerRight}>
          {note.type === "voice" && (
            <Ionicons name="mic" size={14} color={colors.textMuted} accessibilityLabel="Voice note" />
          )}
          {note.type === "file" && (
            <Ionicons name="attach" size={14} color={colors.textMuted} accessibilityLabel="File attachment" />
          )}
          {attachmentCount > 0 && <Text style={styles.attachmentCount}>{attachmentCount}</Text>}
          <Text style={styles.timestamp}>{formatTimestamp(note.created_at)}</Text>
          <Pressable
            testID={testIds.notes.editButton(note.id)}
            accessibilityRole="button"
            accessibilityLabel={isPending ? "Edit unavailable while note is processing" : `Edit ${sourceLabel}`}
            accessibilityState={{ disabled: !canPressEdit }}
            disabled={!canPressEdit}
            onPress={canPressEdit ? () => onStartEdit?.(note) : undefined}
            style={[styles.iconButton, !canPressEdit && styles.iconButtonDisabled]}
            hitSlop={8}
          >
            <Ionicons name="create-outline" size={18} color={canPressEdit ? colors.accent : colors.textMuted} />
          </Pressable>
        </View>
      </View>

      {isEditing ? (
        <View style={styles.editor}>
          {validation.bodyEditable ? (
            <TextInput
              testID={testIds.notes.editInput(note.id)}
              accessibilityLabel={`Edit ${sourceLabel} body`}
              value={draftContent}
              onChangeText={setDraftContent}
              multiline
              style={styles.editorInput}
              textAlignVertical="top"
            />
          ) : (
            <Text style={styles.bodyUnavailable}>Body is unavailable for this note.</Text>
          )}

          <View style={styles.categoryPicker} accessibilityLabel="Choose note category">
            {CATEGORIES.map((category) => {
              const categoryTint = getCategoryTint(category);
              const selected = draftCategory === category;
              return (
                <Pressable
                  key={category}
                  testID={testIds.notes.categoryOption(note.id, category)}
                  accessibilityRole="button"
                  accessibilityLabel={`Set category to ${category}`}
                  accessibilityState={{ selected }}
                  onPress={() => setDraftCategory(category)}
                  style={[
                    styles.categoryOption,
                    { backgroundColor: selected ? categoryTint.bg : colors.surfaceRaised },
                  ]}
                >
                  <Text style={[styles.categoryOptionText, { color: selected ? categoryTint.text : colors.textSecondary }]}>
                    {category}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {validationMessage && (
            <Text
              testID={testIds.notes.editError(note.id)}
              accessibilityRole="alert"
              style={styles.errorText}
            >
              {validationMessage}
            </Text>
          )}
          {saveError && (
            <Text
              testID={testIds.notes.editError(note.id)}
              accessibilityRole="alert"
              style={styles.errorText}
            >
              {saveError}
            </Text>
          )}
          {remoteMessage && (
            <Text
              testID={testIds.notes.editConflict(note.id)}
              accessibilityRole="alert"
              style={styles.warningText}
            >
              {remoteMessage}
            </Text>
          )}

          <View style={styles.editActions}>
            <Pressable
              testID={testIds.notes.cancelButton(note.id)}
              accessibilityRole="button"
              accessibilityLabel="Cancel note edit"
              onPress={() => onCancelEdit?.(note.id)}
              style={[styles.actionButton, styles.secondaryButton]}
            >
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              testID={testIds.notes.saveButton(note.id)}
              accessibilityRole="button"
              accessibilityLabel="Save note edit"
              accessibilityState={{ disabled: saveDisabled }}
              disabled={saveDisabled}
              onPress={saveDisabled ? undefined : handleSave}
              style={[styles.actionButton, styles.primaryButton, saveDisabled && styles.actionButtonDisabled]}
            >
              <Text style={styles.primaryButtonText}>{isSaving ? "Saving..." : "Save"}</Text>
            </Pressable>
          </View>
        </View>
      ) : preview ? (
        <Text style={styles.content} numberOfLines={3}>
          {preview}
        </Text>
      ) : (
        <Text style={styles.emptyContent}>
          {note.type === "voice"
            ? isFailed
              ? "Voice note (transcription failed)"
              : "Voice note (transcribing...)"
            : "No content"}
        </Text>
      )}

      {note.classification_status === "pending" && (
        <View style={styles.pendingIndicator}>
          <Text style={styles.pendingText}>Classifying...</Text>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    ...shadows.sm,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  categoryBadge: {
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.pill,
    backgroundColor: colors.accentLight,
  },
  iconButtonDisabled: {
    opacity: 0.45,
    backgroundColor: colors.surfaceRaised,
  },
  attachmentCount: {
    fontSize: 12,
    color: colors.textSecondary,
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  timestamp: {
    fontSize: 12,
    color: colors.textMuted,
  },
  content: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
  },
  emptyContent: {
    fontSize: 14,
    fontStyle: "italic",
    color: colors.textMuted,
  },
  pendingIndicator: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  pendingText: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: "italic",
  },
  editor: {
    gap: spacing.md,
  },
  editorInput: {
    minHeight: 120,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceRaised,
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
    padding: spacing.md,
  },
  bodyUnavailable: {
    minHeight: 52,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceRaised,
    color: colors.textMuted,
    fontSize: 14,
    padding: spacing.md,
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
  editActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
  },
  actionButton: {
    minHeight: 44,
    minWidth: 84,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
  },
  actionButtonDisabled: {
    opacity: 0.45,
  },
  primaryButton: {
    backgroundColor: colors.accent,
  },
  primaryButtonText: {
    color: colors.textInverse,
    fontSize: 14,
    fontWeight: "700",
  },
  secondaryButton: {
    backgroundColor: colors.surfaceRaised,
  },
  secondaryButtonText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "700",
  },
  errorText: {
    color: colors.error,
    backgroundColor: colors.errorLight,
    borderRadius: radii.md,
    padding: spacing.md,
    fontSize: 13,
  },
  warningText: {
    color: colors.warning,
    backgroundColor: colors.warningLight,
    borderRadius: radii.md,
    padding: spacing.md,
    fontSize: 13,
  },
});
