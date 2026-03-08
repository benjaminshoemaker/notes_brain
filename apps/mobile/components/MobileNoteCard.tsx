import { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NoteWithAttachments } from "@notesbrain/shared";

import { testIds } from "../lib/testIds";
import { colors, radii, shadows, getCategoryTint } from "../lib/theme";

type MobileNoteCardProps = {
  note: NoteWithAttachments;
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

export function MobileNoteCard({ note }: MobileNoteCardProps) {
  const preview = formatPreview(note.content);
  const attachmentCount = note.attachments?.length ?? 0;
  const previousStatusRef = useRef(note.classification_status);
  const highlightAnim = useRef(new Animated.Value(0)).current;
  const [isHighlighted, setIsHighlighted] = useState(false);

  useEffect(() => {
    const previousStatus = previousStatusRef.current;
    previousStatusRef.current = note.classification_status;

    if (note.classification_status === "completed" && previousStatus !== "completed") {
      setIsHighlighted(true);

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
      ]).start(() => {
        setIsHighlighted(false);
      });
    }
  }, [note.classification_status, highlightAnim]);

  const isPending = note.classification_status === "pending";
  const isFailed = note.classification_status === "failed";
  const displayCategory = isPending ? "classifying..." : note.category;
  const tint = getCategoryTint(isPending ? "pending" : note.category);

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
        </View>
      </View>

      {preview ? (
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
});
