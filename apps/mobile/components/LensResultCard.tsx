import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Markdown, { MarkdownIt, type RenderRules } from "react-native-markdown-display";
import type { LensResultWithLens } from "@notesbrain/shared";

import { colors, lensAccentColors, radii, shadows, spacing } from "../lib/theme";

type LensResultCardProps = {
  result: LensResultWithLens;
  testID?: string;
};

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const COLLAPSED_CONTENT_HEIGHT = 132;
const COLLAPSE_CHARACTER_THRESHOLD = 240;
const COLLAPSE_LINE_THRESHOLD = 6;

const markdownParser = new MarkdownIt({
  typographer: true,
  html: false,
  linkify: false,
});

const markdownRules: RenderRules = {
  image: () => null,
  html_block: () => null,
  html_inline: () => null,
  link: (node, children, _parentNodes, styles) => (
    <Text key={node.key} style={styles.text}>
      {children}
    </Text>
  ),
  blocklink: (node, children, _parentNodes) => <View key={node.key}>{children}</View>,
};

function getLensColor(name: string): string {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = ((hash << 5) - hash + name.charCodeAt(index)) | 0;
  }

  return lensAccentColors[Math.abs(hash) % lensAccentColors.length];
}

function formatTime(value: string): string {
  const [rawHours = "0", rawMinutes = "0"] = value.split(":");
  const hours = Number(rawHours);
  const minutes = Number(rawMinutes);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return value;
  }

  return new Date(2000, 0, 1, hours, minutes).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatSchedule(result: LensResultWithLens): string {
  if (result.lens.schedule_type === "weekly") {
    const weekday = result.lens.schedule_day !== null
      ? WEEKDAY_LABELS[result.lens.schedule_day] ?? "Weekly"
      : "Weekly";

    return `Weekly \u00b7 ${weekday}`;
  }

  return `Daily \u00b7 ${formatTime(result.lens.schedule_time)}`;
}

function formatTimestamp(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function childTestID(testID: string | undefined, suffix: string) {
  return testID ? `${testID}-${suffix}` : undefined;
}

function shouldShowCollapseControl(content: string) {
  const lineCount = content.split(/\r?\n/).filter((line) => line.trim().length > 0).length;
  return content.length > COLLAPSE_CHARACTER_THRESHOLD || lineCount > COLLAPSE_LINE_THRESHOLD;
}

export function LensResultCard({ result, testID }: LensResultCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const lensColor = getLensColor(result.lens.name);
  const scheduleLabel = formatSchedule(result);
  const timestampLabel = formatTimestamp(result.generated_at);
  const canCollapse = shouldShowCollapseControl(result.content);
  const isCollapsed = canCollapse && !isExpanded;

  return (
    <View testID={testID} style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View style={styles.lensInfo}>
            <View
              testID={childTestID(testID, "lens-dot")}
              style={[styles.lensDot, { backgroundColor: lensColor }]}
            />
            <Text
              numberOfLines={1}
              testID={childTestID(testID, "lens-name")}
              style={styles.lensName}
            >
              {result.lens.name}
            </Text>
          </View>

          <View
            testID={childTestID(testID, "schedule-badge")}
            style={styles.scheduleBadge}
          >
            <Text numberOfLines={1} style={styles.scheduleText}>
              {scheduleLabel}
            </Text>
          </View>
        </View>

        <Text
          testID={childTestID(testID, "timestamp")}
          style={styles.timestamp}
        >
          {timestampLabel}
        </Text>
      </View>

      <View style={styles.separator} />

      <View
        testID={childTestID(testID, "content")}
        style={[styles.content, isCollapsed && styles.contentCollapsed]}
      >
        <Markdown
          markdownit={markdownParser}
          onLinkPress={() => false}
          rules={markdownRules}
          style={markdownStyles}
        >
          {result.content}
        </Markdown>
      </View>

      {canCollapse && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isExpanded ? "Collapse lens result" : "Expand lens result"}
          onPress={() => setIsExpanded((value) => !value)}
          style={styles.expandButton}
        >
          <Text style={styles.expandText}>{isExpanded ? "Show less" : "Show more"}</Text>
          <Ionicons
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={16}
            color={colors.accent}
          />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.sm,
  },
  header: {
    gap: spacing.sm,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  lensInfo: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  lensDot: {
    width: spacing.md,
    height: spacing.md,
    borderRadius: radii.pill,
    flexShrink: 0,
  },
  lensName: {
    flex: 1,
    minWidth: 0,
    fontSize: spacing.lg,
    fontWeight: "600",
    color: colors.text,
  },
  scheduleBadge: {
    maxWidth: "48%",
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  scheduleText: {
    fontSize: spacing.md,
    color: colors.textMuted,
  },
  timestamp: {
    fontSize: spacing.md,
    color: colors.textSecondary,
  },
  separator: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  content: {
    minWidth: 0,
  },
  contentCollapsed: {
    maxHeight: COLLAPSED_CONTENT_HEIGHT,
    overflow: "hidden",
  },
  expandButton: {
    minHeight: 48,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.accentLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  expandText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.accent,
  },
});

const markdownStyles = StyleSheet.create({
  body: {
    color: colors.textSecondary,
  },
  text: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  paragraph: {
    marginTop: 0,
    marginBottom: spacing.md,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
    justifyContent: "flex-start",
    width: "100%",
  },
  strong: {
    color: colors.text,
    fontWeight: "600",
  },
  em: {
    color: colors.textSecondary,
  },
  s: {
    color: colors.textSecondary,
  },
  bullet_list: {
    marginBottom: spacing.md,
  },
  ordered_list: {
    marginBottom: spacing.md,
  },
  list_item: {
    marginBottom: spacing.xs,
  },
  bullet_list_icon: {
    color: colors.textSecondary,
    marginLeft: 0,
    marginRight: spacing.sm,
  },
  bullet_list_content: {
    flex: 1,
  },
  ordered_list_icon: {
    color: colors.textSecondary,
    marginLeft: 0,
    marginRight: spacing.sm,
  },
  ordered_list_content: {
    flex: 1,
  },
  blockquote: {
    backgroundColor: colors.surfaceRaised,
    borderLeftColor: colors.border,
    borderLeftWidth: spacing.xs,
    borderRadius: radii.md,
    marginLeft: 0,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  code_inline: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.sm,
    color: colors.text,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  code_block: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    color: colors.text,
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  fence: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    color: colors.text,
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  hr: {
    backgroundColor: colors.borderSubtle,
    height: 1,
    marginVertical: spacing.md,
  },
});
