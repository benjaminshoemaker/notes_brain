import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useLensLibrary } from "../../hooks/useLensLibrary";
import { getLensTemplateById } from "../../lib/lensLibrary";
import { testIds } from "../../lib/testIds";
import { colors, getCategoryTint, radii, shadows, spacing } from "../../lib/theme";

function getTemplateId(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function formatLookback(hours: number): string {
  if (hours % 24 === 0) {
    const days = hours / 24;
    return `${days} ${days === 1 ? "day" : "days"}`;
  }

  return `${hours} hours`;
}

export default function LensLibraryPreviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ templateId?: string | string[] }>();
  const templateId = getTemplateId(params.templateId);
  const template = templateId ? getLensTemplateById(templateId) : null;
  const { templates, install, installMutation } = useLensLibrary();
  const [showPrompt, setShowPrompt] = useState(false);

  const item = templates.find((entry) => entry.template.template_id === templateId) ?? null;
  const installState = item?.installState ?? "Not installed";
  const isInstalled = installState === "Installed";
  const categoryTint = template ? getCategoryTint(template.category) : getCategoryTint("uncategorized");

  async function handleInstall() {
    if (!template || isInstalled) {
      return;
    }

    try {
      await install(template);
      Alert.alert("Added to My Lenses", "You can edit it anytime.", [
        {
          text: "View",
          onPress: () => {
            router.replace("/(app)/lens-manage");
          },
        },
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Please try again.";
      Alert.alert("Couldn't add lens", message);
    }
  }

  return (
    <ScrollView
      testID={testIds.lens.preview.screen}
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Stack.Screen
        options={{
          title: "Preview Lens",
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
        }}
      />

      {template ? (
        <>
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons name="sparkles-outline" size={24} color={colors.accent} />
            </View>
            <Text style={styles.title}>{template.name}</Text>
            <Text style={styles.description}>{template.description}</Text>
            {isInstalled ? (
              <View style={[styles.badge, styles.installedBadge]}>
                <Text style={[styles.badgeText, styles.installedBadgeText]}>Installed</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What it looks for</Text>
            <Text style={styles.bodyText}>{template.focus}</Text>
          </View>

          {template.example_output ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Example result</Text>
              <Text style={styles.bodyText}>{template.example_output}</Text>
            </View>
          ) : null}

          <View style={styles.metaGrid}>
            <View style={styles.metaCard}>
              <Text style={styles.metaLabel}>Cadence</Text>
              <Text style={styles.metaValue}>{template.schedule_type}</Text>
            </View>
            <View style={styles.metaCard}>
              <Text style={styles.metaLabel}>Lookback</Text>
              <Text style={styles.metaValue}>{formatLookback(template.lookback_hours)}</Text>
            </View>
            <View style={styles.metaCard}>
              <Text style={styles.metaLabel}>Category</Text>
              <View style={[styles.badge, { backgroundColor: categoryTint.bg }]}>
                <Text style={[styles.badgeText, { color: categoryTint.text }]}>
                  {template.category}
                </Text>
              </View>
            </View>
          </View>

          {template.categories ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Categories</Text>
              <Text style={styles.bodyText}>{template.categories.join(", ")}</Text>
            </View>
          ) : (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Categories</Text>
              <Text style={styles.bodyText}>All categories</Text>
            </View>
          )}

          <Pressable
            accessibilityRole="button"
            onPress={() => setShowPrompt((current) => !current)}
            style={styles.promptToggle}
          >
            <Text style={styles.promptToggleText}>Prompt details</Text>
            <Ionicons
              name={showPrompt ? "chevron-up" : "chevron-down"}
              size={18}
              color={colors.textSecondary}
            />
          </Pressable>
          {showPrompt ? (
            <View testID={testIds.lens.preview.promptDetails} style={styles.promptBox}>
              <Text style={styles.promptText}>{template.prompt}</Text>
            </View>
          ) : null}

          <Pressable
            accessibilityRole="button"
            disabled={isInstalled || installMutation.isPending}
            testID={testIds.lens.preview.installButton}
            onPress={() => {
              void handleInstall();
            }}
            style={[styles.installButton, (isInstalled || installMutation.isPending) && styles.disabledButton]}
          >
            {installMutation.isPending ? (
              <ActivityIndicator color={colors.textInverse} size="small" />
            ) : (
              <Text style={styles.installButtonText}>
                {isInstalled ? "Installed" : "Add to My Lenses"}
              </Text>
            )}
          </Pressable>
        </>
      ) : (
        <View style={styles.header}>
          <Text style={styles.title}>Lens not found</Text>
          <Text style={styles.description}>This library lens is not available.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  header: {
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accentLight,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    textAlign: "center",
  },
  section: {
    gap: spacing.xs,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    ...shadows.sm,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
  },
  metaGrid: {
    gap: spacing.sm,
  },
  metaCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    ...shadows.sm,
  },
  metaLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    textTransform: "capitalize",
  },
  badge: {
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  installedBadge: {
    backgroundColor: colors.successLight,
  },
  installedBadgeText: {
    color: colors.success,
  },
  promptToggle: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  promptToggleText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  promptBox: {
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
  promptText: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  installButton: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.md,
    backgroundColor: colors.accent,
    ...shadows.sm,
  },
  installButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textInverse,
  },
  disabledButton: {
    opacity: 0.6,
  },
});
