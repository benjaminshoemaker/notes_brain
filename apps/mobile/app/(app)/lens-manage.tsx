import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, type Href, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { CommunityLensTemplate, Lens } from "@notesbrain/shared";

import { LoadingSpinner } from "../../components/LoadingSpinner";
import { useCommunityLenses } from "../../hooks/useCommunityLenses";
import { useLenses } from "../../hooks/useLenses";
import { useRunLensNow } from "../../hooks/useRunLensNow";
import { testIds } from "../../lib/testIds";
import { colors, lensAccentColors, radii, shadows, spacing } from "../../lib/theme";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type PendingAction =
  | {
      lensId: string;
      action: "delete" | "run" | "toggle" | "unpublish";
    }
  | null;

type CommunityLensState = {
  label: string | null;
  description: string | null;
  tone: "neutral" | "success" | "warning" | "error";
  canPublish: boolean;
  canUnpublish: boolean;
  publishLabel: string;
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

function formatSchedule(lens: Lens): string {
  if (lens.schedule_type === "weekly") {
    const weekday = lens.schedule_day !== null
      ? WEEKDAY_LABELS[lens.schedule_day] ?? "Weekly"
      : "Weekly";

    return `Weekly · ${weekday}`;
  }

  return `Daily · ${formatTime(lens.schedule_time)}`;
}

function formatLastRun(value: string | null): string {
  if (!value) {
    return "Last run: Not yet";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return `Last run: ${value}`;
  }

  const now = new Date();
  const timeLabel = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (isToday) {
    return `Last run: Today ${timeLabel}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate();

  if (isYesterday) {
    return `Last run: Yesterday ${timeLabel}`;
  }

  const dateLabel = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return `Last run: ${dateLabel} ${timeLabel}`;
}

function getFailureMessage(count: number): string {
  return `Last ${Math.max(count, 3)} runs failed`;
}

function getStatusBadge(lens: Lens) {
  if (lens.consecutive_failures >= 3) {
    return {
      backgroundColor: colors.errorLight,
      color: colors.error,
      label: "Error",
    };
  }

  if (lens.is_active) {
    return {
      backgroundColor: colors.successLight,
      color: colors.success,
      label: "Active",
    };
  }

  return {
    backgroundColor: colors.surfaceRaised,
    color: colors.textSecondary,
    label: "Paused",
  };
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function getCommunityLensState(
  lens: Lens,
  authoredTemplate: CommunityLensTemplate | undefined
): CommunityLensState {
  if (lens.source_template_id) {
    return {
      label: "From Library",
      description: "Installed copies cannot be published to the community.",
      tone: "neutral",
      canPublish: false,
      canUnpublish: false,
      publishLabel: "Publish",
    };
  }

  if (!authoredTemplate) {
    return {
      label: null,
      description: null,
      tone: "neutral",
      canPublish: true,
      canUnpublish: false,
      publishLabel: "Publish",
    };
  }

  if (authoredTemplate.status === "public") {
    return {
      label: "Community: Public",
      description: "Visible in the community lens library.",
      tone: "success",
      canPublish: false,
      canUnpublish: true,
      publishLabel: "Publish",
    };
  }

  if (authoredTemplate.status === "unpublished") {
    return {
      label: "Community: Unpublished",
      description: "Not visible in the community library.",
      tone: "warning",
      canPublish: true,
      canUnpublish: false,
      publishLabel: "Publish Again",
    };
  }

  return {
    label: "Community: Not public",
    description: "This lens cannot be republished from the app.",
    tone: "error",
    canPublish: false,
    canUnpublish: false,
    publishLabel: "Publish",
  };
}

function getCommunityStatusStyle(tone: CommunityLensState["tone"]) {
  if (tone === "success") {
    return {
      backgroundColor: colors.successLight,
      color: colors.success,
    };
  }

  if (tone === "warning") {
    return {
      backgroundColor: colors.warningLight,
      color: colors.warning,
    };
  }

  if (tone === "error") {
    return {
      backgroundColor: colors.errorLight,
      color: colors.error,
    };
  }

  return {
    backgroundColor: colors.surfaceRaised,
    color: colors.textSecondary,
  };
}

export default function LensManageScreen() {
  const router = useRouter();
  const { data: lenses = [], isLoading, error, refetch, remove, toggleActive } = useLenses();
  const runNow = useRunLensNow();
  const { authoredTemplates, unpublish } = useCommunityLenses();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const authoredTemplateByLensId = useMemo(() => {
    const templates = new Map<string, CommunityLensTemplate>();

    authoredTemplates.forEach((template) => {
      templates.set(template.source_lens_id, template);
    });

    return templates;
  }, [authoredTemplates]);

  const hasInitialError = Boolean(error) && lenses.length === 0;
  const hasAnyPendingAction = pendingAction !== null;

  async function handleRefresh() {
    setIsRefreshing(true);

    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleToggleActive(lens: Lens) {
    setPendingAction({ lensId: lens.id, action: "toggle" });

    try {
      await toggleActive.mutateAsync({
        id: lens.id,
        is_active: !lens.is_active,
      });
    } catch (toggleError) {
      Alert.alert(
        "Couldn't update lens",
        getErrorMessage(toggleError, "Please try again.")
      );
    } finally {
      setPendingAction(null);
    }
  }

  async function handleRunNow(lens: Lens) {
    setPendingAction({ lensId: lens.id, action: "run" });

    try {
      await runNow.mutateAsync(lens.id);
    } catch (runError) {
      Alert.alert(
        "Couldn't run lens",
        getErrorMessage(runError, "Please try again.")
      );
    } finally {
      setPendingAction(null);
    }
  }

  async function handleDelete(lens: Lens) {
    setPendingAction({ lensId: lens.id, action: "delete" });

    try {
      await remove.mutateAsync(lens.id);
    } catch (deleteError) {
      Alert.alert(
        "Couldn't delete lens",
        getErrorMessage(deleteError, "Please try again.")
      );
    } finally {
      setPendingAction(null);
    }
  }

  async function handleUnpublish(lens: Lens) {
    setPendingAction({ lensId: lens.id, action: "unpublish" });

    try {
      // The mutation wraps the unpublish_lens_template RPC.
      await unpublish.mutateAsync(lens.id);
    } catch (unpublishError) {
      Alert.alert(
        "Couldn't unpublish lens",
        getErrorMessage(unpublishError, "Please try again.")
      );
    } finally {
      setPendingAction(null);
    }
  }

  function confirmDelete(lens: Lens) {
    Alert.alert(
      "Delete Lens?",
      "This will remove this lens and its result history.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void handleDelete(lens);
          },
        },
      ]
    );
  }

  function confirmUnpublish(lens: Lens) {
    Alert.alert(
      "Unpublish Lens?",
      "This removes the public listing but keeps your lens and existing installs.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unpublish",
          style: "destructive",
          onPress: () => {
            void handleUnpublish(lens);
          },
        },
      ]
    );
  }

  function renderActionLabel(lens: Lens) {
    return lens.is_active ? "Pause" : "Resume";
  }

  function renderActionIcon(lens: Lens) {
    return lens.is_active ? "pause-outline" : "play-outline";
  }

  function buildLensFormRoute(lensId: string): Href {
    return {
      pathname: "/(app)/lens-form",
      params: { lensId },
    } as Href;
  }

  function buildCommunityPublishRoute(lensId: string): Href {
    return {
      pathname: "/(app)/community-lens-publish",
      params: { lensId },
    } as unknown as Href;
  }

  return (
    <View testID={testIds.lens.manage.screen} style={styles.container}>
      <Stack.Screen
        options={{
          title: "Manage Lenses",
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
        }}
      />

      {isLoading && lenses.length === 0 ? (
        <LoadingSpinner label="Loading lenses..." />
      ) : hasInitialError ? (
        <View style={styles.centerState}>
          <View style={styles.stateIconCircle}>
            <Ionicons name="cloud-offline-outline" size={30} color={colors.error} />
          </View>
          <Text style={styles.stateTitle}>We couldn't load your lenses</Text>
          <Text style={styles.stateText}>
            Check your connection and try again.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void handleRefresh();
            }}
            style={[styles.primaryButton, isRefreshing && styles.disabledButton]}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <ActivityIndicator color={colors.textInverse} size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>Retry</Text>
            )}
          </Pressable>
        </View>
      ) : (
        <FlatList
          testID={testIds.lens.manage.list}
          data={lenses}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const isErrorState = item.consecutive_failures >= 3;
            const isRowPending = pendingAction?.lensId === item.id;
            const statusBadge = getStatusBadge(item);
            const lensColor = getLensColor(item.name);
            const communityState = getCommunityLensState(
              item,
              authoredTemplateByLensId.get(item.id)
            );
            const communityStatusStyle = getCommunityStatusStyle(communityState.tone);

            return (
              <View testID={testIds.lens.manage.card(item.id)} style={styles.card}>
                <View style={styles.headerRow}>
                  <View style={styles.nameWrap}>
                    <View style={[styles.lensDot, { backgroundColor: lensColor }]} />
                    <Text numberOfLines={1} style={styles.name}>
                      {item.name}
                    </Text>
                  </View>
                  <Text numberOfLines={1} style={styles.schedule}>
                    {formatSchedule(item)}
                  </Text>
                </View>

                <View style={styles.metaRow}>
                  <View style={styles.metaTextWrap}>
                    {isErrorState ? (
                      <View style={styles.errorInline}>
                        <Ionicons
                          name="warning-outline"
                          size={16}
                          color={colors.error}
                        />
                        <Text style={styles.errorText}>
                          {getFailureMessage(item.consecutive_failures)}
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.metaText}>{formatLastRun(item.last_run_at)}</Text>
                    )}
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: statusBadge.backgroundColor },
                    ]}
                  >
                    <Text style={[styles.statusBadgeText, { color: statusBadge.color }]}>
                      {statusBadge.label}
                    </Text>
                  </View>
                </View>

                {communityState.label ? (
                  <View
                    testID={testIds.lens.manage.communityStatus(item.id)}
                    style={styles.communityRow}
                  >
                    <View
                      style={[
                        styles.communityBadge,
                        { backgroundColor: communityStatusStyle.backgroundColor },
                      ]}
                    >
                      <Text
                        style={[
                          styles.communityBadgeText,
                          { color: communityStatusStyle.color },
                        ]}
                      >
                        {communityState.label}
                      </Text>
                    </View>
                    {communityState.description ? (
                      <Text style={styles.communityDescription}>
                        {communityState.description}
                      </Text>
                    ) : null}
                  </View>
                ) : null}

                <View style={styles.actionRow}>
                  {communityState.canPublish ? (
                    <Pressable
                      testID={testIds.lens.manage.publishButton(item.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`${communityState.publishLabel} ${item.name} to community`}
                      disabled={hasAnyPendingAction}
                      onPress={() => {
                        router.push(buildCommunityPublishRoute(item.id));
                      }}
                      style={[
                        styles.actionButton,
                        styles.accentActionButton,
                        hasAnyPendingAction && styles.disabledButton,
                      ]}
                    >
                      <Ionicons name="globe-outline" size={16} color={colors.accent} />
                      <Text style={[styles.actionText, styles.accentActionText]}>
                        {communityState.publishLabel}
                      </Text>
                    </Pressable>
                  ) : null}

                  {communityState.canUnpublish ? (
                    <Pressable
                      testID={testIds.lens.manage.unpublishButton(item.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Unpublish ${item.name} from community`}
                      disabled={hasAnyPendingAction}
                      onPress={() => {
                        confirmUnpublish(item);
                      }}
                      style={[
                        styles.actionButton,
                        styles.warningActionButton,
                        hasAnyPendingAction && styles.disabledButton,
                      ]}
                    >
                      {isRowPending && pendingAction?.action === "unpublish" ? (
                        <ActivityIndicator color={colors.warning} size="small" />
                      ) : (
                        <Ionicons name="cloud-offline-outline" size={16} color={colors.warning} />
                      )}
                      <Text style={[styles.actionText, styles.warningActionText]}>
                        Unpublish
                      </Text>
                    </Pressable>
                  ) : null}

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Edit ${item.name}`}
                    disabled={hasAnyPendingAction}
                    onPress={() => {
                      router.push(buildLensFormRoute(item.id));
                    }}
                    style={[
                      styles.actionButton,
                      styles.neutralActionButton,
                      hasAnyPendingAction && styles.disabledButton,
                    ]}
                  >
                    <Ionicons name="create-outline" size={16} color={colors.textSecondary} />
                    <Text style={styles.neutralActionText}>Edit</Text>
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${renderActionLabel(item)} ${item.name}`}
                    disabled={hasAnyPendingAction}
                    onPress={() => {
                      void handleToggleActive(item);
                    }}
                    style={[
                      styles.actionButton,
                      item.is_active ? styles.warningActionButton : styles.successActionButton,
                      hasAnyPendingAction && styles.disabledButton,
                    ]}
                  >
                    {isRowPending && pendingAction?.action === "toggle" ? (
                      <ActivityIndicator
                        color={item.is_active ? colors.warning : colors.success}
                        size="small"
                      />
                    ) : (
                      <Ionicons
                        name={renderActionIcon(item)}
                        size={16}
                        color={item.is_active ? colors.warning : colors.success}
                      />
                    )}
                    <Text
                      style={[
                        styles.actionText,
                        { color: item.is_active ? colors.warning : colors.success },
                      ]}
                    >
                      {renderActionLabel(item)}
                    </Text>
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Run ${item.name} now`}
                    disabled={hasAnyPendingAction}
                    onPress={() => {
                      void handleRunNow(item);
                    }}
                    style={[
                      styles.actionButton,
                      styles.accentActionButton,
                      hasAnyPendingAction && styles.disabledButton,
                    ]}
                  >
                    {isRowPending && pendingAction?.action === "run" ? (
                      <ActivityIndicator color={colors.accent} size="small" />
                    ) : (
                      <Ionicons name="flash-outline" size={16} color={colors.accent} />
                    )}
                    <Text style={[styles.actionText, styles.accentActionText]}>Run Now</Text>
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Delete ${item.name}`}
                    disabled={hasAnyPendingAction}
                    onPress={() => {
                      confirmDelete(item);
                    }}
                    style={[
                      styles.actionButton,
                      styles.deleteActionButton,
                      hasAnyPendingAction && styles.disabledButton,
                    ]}
                  >
                    {isRowPending && pendingAction?.action === "delete" ? (
                      <ActivityIndicator color={colors.error} size="small" />
                    ) : (
                      <Ionicons name="trash-outline" size={16} color={colors.error} />
                    )}
                    <Text style={[styles.actionText, styles.deleteActionText]}>Delete</Text>
                  </Pressable>
                </View>
              </View>
            );
          }}
          ListHeaderComponent={
            error ? (
              <View style={styles.inlineErrorCard}>
                <Text style={styles.inlineErrorTitle}>Some lens data may be out of date.</Text>
                <Text style={styles.inlineErrorText}>
                  Pull to refresh or try again when your connection is back.
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.centerState}>
              <View style={styles.stateIconCircle}>
                <Ionicons name="sparkles-outline" size={30} color={colors.accent} />
              </View>
              <Text style={styles.stateTitle}>No lenses yet</Text>
              <Text style={styles.stateText}>
                Create one from the Insights tab.
              </Text>
            </View>
          }
          contentContainerStyle={[
            styles.listContent,
            lenses.length === 0 && styles.emptyListContent,
          ]}
          onRefresh={() => {
            void handleRefresh();
          }}
          refreshing={isRefreshing}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  stateIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.sm,
  },
  stateTitle: {
    fontSize: 22,
    fontWeight: "600",
    color: colors.text,
    textAlign: "center",
  },
  stateText: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    textAlign: "center",
    maxWidth: 280,
  },
  primaryButton: {
    marginTop: spacing.lg,
    minWidth: 120,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accent,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textInverse,
  },
  inlineErrorCard: {
    backgroundColor: colors.errorLight,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  inlineErrorTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.error,
  },
  inlineErrorText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.sm,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  nameWrap: {
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
  name: {
    flex: 1,
    minWidth: 0,
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  schedule: {
    maxWidth: "42%",
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "right",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  metaTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  metaText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  errorInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  errorText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.error,
  },
  statusBadge: {
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  communityRow: {
    gap: spacing.xs,
  },
  communityBadge: {
    alignSelf: "flex-start",
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  communityBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  communityDescription: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  actionButton: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minWidth: 88,
  },
  neutralActionButton: {
    backgroundColor: colors.surfaceRaised,
  },
  warningActionButton: {
    backgroundColor: colors.warningLight,
  },
  successActionButton: {
    backgroundColor: colors.successLight,
  },
  accentActionButton: {
    backgroundColor: colors.accentLight,
  },
  deleteActionButton: {
    backgroundColor: colors.errorLight,
  },
  actionText: {
    fontSize: 13,
    fontWeight: "600",
  },
  neutralActionText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  accentActionText: {
    color: colors.accent,
  },
  warningActionText: {
    color: colors.warning,
  },
  deleteActionText: {
    color: colors.error,
  },
  disabledButton: {
    opacity: 0.6,
  },
});
