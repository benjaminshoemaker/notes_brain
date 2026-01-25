import { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import type { NoteWithAttachments } from "@notesbrain/shared";

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

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    task: "#3b82f6",
    idea: "#8b5cf6",
    journal: "#10b981",
    reference: "#f59e0b",
    uncategorized: "#6b7280",
    pending: "#9ca3af",
  };
  return colors[category] || colors.uncategorized;
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
        Animated.delay(1000),
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
  const displayCategory = isPending ? "classifying..." : note.category;
  const categoryColor = getCategoryColor(isPending ? "pending" : note.category);

  const backgroundColor = highlightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["#ffffff", "#fffbeb"],
  });

  return (
    <Animated.View style={[styles.container, { backgroundColor }]}>
      <View style={styles.header}>
        <View style={[styles.categoryBadge, { backgroundColor: categoryColor }]}>
          <Text style={styles.categoryText}>{displayCategory}</Text>
        </View>

        <View style={styles.headerRight}>
          {note.type === "voice" && <Text style={styles.typeIcon}>🎤</Text>}
          {note.type === "file" && <Text style={styles.typeIcon}>📎</Text>}
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
          {note.type === "voice" ? "Voice note (transcribing...)" : "No content"}
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
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  categoryBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#ffffff",
    textTransform: "capitalize",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  typeIcon: {
    fontSize: 14,
  },
  attachmentCount: {
    fontSize: 12,
    color: "#666666",
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  timestamp: {
    fontSize: 12,
    color: "#999999",
  },
  content: {
    fontSize: 15,
    lineHeight: 22,
    color: "#1a1a1a",
  },
  emptyContent: {
    fontSize: 14,
    fontStyle: "italic",
    color: "#999999",
  },
  pendingIndicator: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  pendingText: {
    fontSize: 12,
    color: "#999999",
    fontStyle: "italic",
  },
});
