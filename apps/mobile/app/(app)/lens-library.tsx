import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Stack, type Href, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useLensLibrary, type LensLibraryItem } from "../../hooks/useLensLibrary";
import { testIds } from "../../lib/testIds";
import { colors, getCategoryTint, radii, shadows, spacing } from "../../lib/theme";

function formatCadence(item: LensLibraryItem): string {
  if (item.template.schedule_type === "weekly") {
    return "Weekly";
  }

  return "Daily";
}

function buildPreviewRoute(templateId: string): Href {
  return {
    pathname: "/(app)/lens-library-preview",
    params: { templateId },
  } as Href;
}

export default function LensLibraryScreen() {
  const router = useRouter();
  const { templates } = useLensLibrary();

  return (
    <View testID={testIds.lens.library.screen} style={styles.container}>
      <Stack.Screen
        options={{
          title: "Lens Library",
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
        }}
      />

      <FlatList
        testID={testIds.lens.library.list}
        data={templates}
        keyExtractor={(item) => item.template.template_id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const categoryTint = getCategoryTint(item.template.category);
          const isInstalled = item.installState === "Installed";

          return (
            <Pressable
              accessibilityRole="button"
              testID={testIds.lens.library.card(item.template.template_id)}
              onPress={() => {
                router.push(buildPreviewRoute(item.template.template_id));
              }}
              style={styles.card}
            >
              <View style={styles.cardHeader}>
                <View style={styles.titleWrap}>
                  <Text style={styles.name}>{item.template.name}</Text>
                  <Text style={styles.description}>{item.template.description}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </View>

              <View style={styles.metaRow}>
                <View style={[styles.badge, { backgroundColor: categoryTint.bg }]}>
                  <Text style={[styles.badgeText, { color: categoryTint.text }]}>
                    {item.template.category}
                  </Text>
                </View>
                <Text style={styles.cadence}>{formatCadence(item)}</Text>
                {isInstalled ? (
                  <View style={[styles.badge, styles.installedBadge]}>
                    <Text style={[styles.badgeText, styles.installedBadgeText]}>Installed</Text>
                  </View>
                ) : null}
              </View>
            </Pressable>
          );
        }}
        showsVerticalScrollIndicator={false}
      />
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
    gap: spacing.md,
  },
  card: {
    gap: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs,
  },
  name: {
    fontSize: 17,
    fontWeight: "600",
    color: colors.text,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing.sm,
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
  cadence: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  installedBadge: {
    backgroundColor: colors.successLight,
  },
  installedBadgeText: {
    color: colors.success,
  },
});
