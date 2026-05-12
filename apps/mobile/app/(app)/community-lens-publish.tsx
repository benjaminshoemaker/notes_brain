import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CATEGORIES, type Category, type Lens } from "@notesbrain/shared";

import { LoadingSpinner } from "../../components/LoadingSpinner";
import { useCommunityLenses } from "../../hooks/useCommunityLenses";
import { useLenses } from "../../hooks/useLenses";
import { testIds } from "../../lib/testIds";
import { colors, radii, shadows, spacing, touchTargets, typography } from "../../lib/theme";

const WEEKDAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const RESERVED_DISPLAY_NAMES = new Set([
  "admin",
  "moderator",
  "notes brain",
  "notesbrain",
  "support",
]);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getSingleParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function formatCategoryLabel(category: string): string {
  return category.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isCategory(value: string): value is Category {
  return (CATEGORIES as readonly string[]).includes(value);
}

function formatSchedule(lens: Lens): string {
  if (lens.schedule_type === "weekly") {
    const weekday = lens.schedule_day !== null
      ? WEEKDAY_LABELS[lens.schedule_day] ?? "Weekly"
      : "Weekly";

    return `Weekly on ${weekday} at ${lens.schedule_time}`;
  }

  return `Daily at ${lens.schedule_time}`;
}

function formatLookback(hours: number): string {
  if (hours % 24 === 0) {
    const days = hours / 24;
    return `${days} ${days === 1 ? "day" : "days"}`;
  }

  return `${hours} hours`;
}

function formatCategoryFilters(categories: string[] | null): string {
  if (!categories || categories.length === 0) {
    return "All categories";
  }

  return categories.map(formatCategoryLabel).join(", ");
}

function getDefaultCategory(lens: Lens | undefined): Category {
  const firstCategory = lens?.categories?.find(isCategory);
  return firstCategory ?? "uncategorized";
}

function validateAuthorDisplayName(value: string): string | null {
  const trimmed = value.trim();
  const normalized = trimmed.toLowerCase();

  if (trimmed.length === 0) {
    return "Enter an author display name.";
  }

  if (trimmed.length < 2) {
    return "Author display name must be at least 2 characters.";
  }

  if (EMAIL_PATTERN.test(trimmed)) {
    return "Use a public display name, not an email address.";
  }

  if (RESERVED_DISPLAY_NAMES.has(normalized)) {
    return "Choose a different author display name.";
  }

  return null;
}

function validateDescription(value: string): string | null {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return "Describe what this lens helps people understand.";
  }

  if (trimmed.length > 280) {
    return "Description must be 280 characters or fewer.";
  }

  return null;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Publishing failed. Please try again.";
}

export default function CommunityLensPublishScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ lensId?: string | string[] }>();
  const lensId = getSingleParam(params.lensId);
  const { data: lenses = [], isLoading } = useLenses();
  const { publish } = useCommunityLenses();
  const lens = useMemo(
    () => lenses.find((item) => item.id === lensId),
    [lensId, lenses]
  );
  const [authorDisplayName, setAuthorDisplayName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category>(() => getDefaultCategory(lens));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isPublishing = publish.isPending;
  const canPublishLens = Boolean(lens && !lens.source_template_id);

  useEffect(() => {
    if (lens) {
      setCategory(getDefaultCategory(lens));
    }
  }, [lens?.id]);

  async function handlePublish() {
    if (!lens || !canPublishLens) {
      setErrorMessage("This lens cannot be published.");
      return;
    }

    const displayNameError = validateAuthorDisplayName(authorDisplayName);
    if (displayNameError) {
      setErrorMessage(displayNameError);
      return;
    }

    const descriptionError = validateDescription(description);
    if (descriptionError) {
      setErrorMessage(descriptionError);
      return;
    }

    setErrorMessage(null);

    try {
      // The mutation wraps the publish_lens_template RPC.
      await publish.mutateAsync({
        lensId: lens.id,
        authorDisplayName: authorDisplayName.trim(),
        description: description.trim(),
        category,
      });
      router.back();
    } catch (publishError) {
      setErrorMessage(getErrorMessage(publishError));
    }
  }

  return (
    <View testID={testIds.lens.communityLensPublish.screen} style={styles.container}>
      <Stack.Screen
        options={{
          title: "Publish Lens",
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
        }}
      />

      {isLoading && !lens ? (
        <LoadingSpinner label="Loading lens..." />
      ) : !lens ? (
        <View style={styles.centerState}>
          <View style={styles.stateIconCircle}>
            <Ionicons name="alert-circle-outline" size={30} color={colors.error} />
          </View>
          <Text style={styles.stateTitle}>Lens not found</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancel publishing"
            onPress={() => router.back()}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>Back</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons name="globe-outline" size={22} color={colors.accent} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>Review public details</Text>
              <Text style={styles.subtitle}>{lens.name}</Text>
            </View>
          </View>

          <View
            testID={testIds.lens.communityLensPublish.privacyWarning}
            style={styles.warning}
          >
            <Ionicons name="information-circle-outline" size={20} color={colors.warning} />
            <Text style={styles.warningText}>
              Your prompt and setup details become public. Your notes, generated results, and
              account information stay private.
            </Text>
          </View>

          {!canPublishLens ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>
                Installed library lenses cannot be republished. Create your own lens first.
              </Text>
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Public lens fields</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Prompt</Text>
              <Text style={styles.detailValue}>{lens.prompt}</Text>
            </View>
            <View style={styles.detailGrid}>
              <View style={styles.detailTile}>
                <Text style={styles.detailLabel}>Cadence</Text>
                <Text style={styles.detailValue}>{formatSchedule(lens)}</Text>
              </View>
              <View style={styles.detailTile}>
                <Text style={styles.detailLabel}>Lookback</Text>
                <Text style={styles.detailValue}>{formatLookback(lens.lookback_hours)}</Text>
              </View>
              <View style={styles.detailTile}>
                <Text style={styles.detailLabel}>Category filters</Text>
                <Text style={styles.detailValue}>{formatCategoryFilters(lens.categories)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Listing details</Text>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Author display name</Text>
              <TextInput
                testID={testIds.lens.communityLensPublish.authorDisplayNameInput}
                accessibilityLabel="author display name"
                style={styles.input}
                value={authorDisplayName}
                onChangeText={(value) => {
                  setAuthorDisplayName(value);
                  setErrorMessage(null);
                }}
                placeholder="Ben"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="words"
                editable={!isPublishing && canPublishLens}
                maxLength={40}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput
                testID={testIds.lens.communityLensPublish.descriptionInput}
                accessibilityLabel="Community lens description"
                style={[styles.input, styles.descriptionInput]}
                value={description}
                onChangeText={(value) => {
                  setDescription(value);
                  setErrorMessage(null);
                }}
                placeholder="Explain who this lens helps and what it finds."
                placeholderTextColor={colors.textMuted}
                multiline
                textAlignVertical="top"
                editable={!isPublishing && canPublishLens}
                maxLength={280}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Browse category</Text>
              <View style={styles.pillWrap}>
                {CATEGORIES.map((option) => {
                  const selected = category === option;
                  return (
                    <Pressable
                      key={option}
                      testID={testIds.lens.communityLensPublish.categoryOption(option)}
                      accessibilityRole="button"
                      accessibilityLabel={`Set browse category to ${formatCategoryLabel(option)}`}
                      accessibilityState={{ selected }}
                      disabled={isPublishing || !canPublishLens}
                      onPress={() => setCategory(option)}
                      style={[styles.pill, selected && styles.pillSelected]}
                    >
                      <Text style={[styles.pillText, selected && styles.pillTextSelected]}>
                        {formatCategoryLabel(option)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>

          {errorMessage ? (
            <Text testID={testIds.lens.communityLensPublish.errorMessage} style={styles.formError}>
              {errorMessage}
            </Text>
          ) : null}

          <View style={styles.footer}>
            <Pressable
              testID={testIds.lens.communityLensPublish.cancelButton}
              accessibilityRole="button"
              accessibilityLabel="Cancel publishing"
              disabled={isPublishing}
              onPress={() => router.back()}
              style={[styles.secondaryButton, isPublishing && styles.disabledButton]}
            >
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              testID={testIds.lens.communityLensPublish.confirmButton}
              accessibilityRole="button"
              accessibilityLabel="Publish community lens"
              disabled={isPublishing || !canPublishLens}
              onPress={() => {
                void handlePublish();
              }}
              style={[
                styles.primaryButton,
                (isPublishing || !canPublishLens) && styles.disabledButton,
              ]}
            >
              {isPublishing ? (
                <ActivityIndicator color={colors.textInverse} size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>Publish</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.md,
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
    ...typography.sectionTitle,
    color: colors.text,
    textAlign: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accentLight,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    ...typography.screenTitle,
    color: colors.text,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  warning: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    borderRadius: radii.lg,
    backgroundColor: colors.warningLight,
    padding: spacing.md,
  },
  warningText: {
    flex: 1,
    ...typography.helper,
    color: colors.text,
  },
  errorBox: {
    borderRadius: radii.lg,
    backgroundColor: colors.errorLight,
    padding: spacing.md,
  },
  errorText: {
    ...typography.helper,
    color: colors.error,
  },
  section: {
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.sm,
  },
  sectionTitle: {
    ...typography.sectionTitle,
    color: colors.text,
  },
  detailRow: {
    gap: spacing.xs,
  },
  detailGrid: {
    gap: spacing.sm,
  },
  detailTile: {
    borderRadius: radii.md,
    backgroundColor: colors.surfaceRaised,
    padding: spacing.md,
    gap: spacing.xs,
  },
  detailLabel: {
    ...typography.badge,
    color: colors.textMuted,
    textTransform: "uppercase",
  },
  detailValue: {
    ...typography.body,
    color: colors.text,
  },
  fieldGroup: {
    gap: spacing.sm,
  },
  fieldLabel: {
    ...typography.badge,
    color: colors.textSecondary,
    textTransform: "uppercase",
  },
  input: {
    minHeight: touchTargets.min,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
    color: colors.text,
  },
  descriptionInput: {
    minHeight: 112,
    textAlignVertical: "top",
  },
  pillWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  pill: {
    minHeight: touchTargets.min,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  pillSelected: {
    backgroundColor: colors.accentLight,
  },
  pillText: {
    ...typography.helper,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  pillTextSelected: {
    color: colors.accent,
  },
  formError: {
    ...typography.helper,
    color: colors.error,
  },
  footer: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  primaryButton: {
    flex: 1,
    minHeight: touchTargets.min,
    borderRadius: radii.md,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  primaryButtonText: {
    ...typography.button,
    color: colors.textInverse,
  },
  secondaryButton: {
    flex: 1,
    minHeight: touchTargets.min,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  secondaryButtonText: {
    ...typography.button,
    color: colors.textSecondary,
  },
  disabledButton: {
    opacity: 0.5,
  },
});
