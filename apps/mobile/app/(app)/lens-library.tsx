import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, type Href, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CATEGORIES, type Category } from "@notesbrain/shared";

import { useLensLibrary, type LensLibraryItem } from "../../hooks/useLensLibrary";
import { useCommunityLenses, type CommunityLensItem } from "../../hooks/useCommunityLenses";
import { testIds } from "../../lib/testIds";
import { colors, getCategoryTint, radii, shadows, spacing } from "../../lib/theme";

function formatCadence(item: LensLibraryItem): string {
  if (item.template.schedule_type === "weekly") {
    return "Weekly";
  }

  return "Daily";
}

function formatCategoryLabel(category: string): string {
  return category.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatInstallCount(count: number): string {
  return `${count} ${count === 1 ? "install" : "installs"}`;
}

function buildPreviewRoute(templateId: string, source: "curated" | "community"): Href {
  if (source === "curated") {
    return {
      pathname: "/(app)/lens-library-preview",
      params: { templateId },
    } as Href;
  }

  return {
    pathname: "/(app)/lens-library-preview",
    params: { templateId, source: "community" },
  } as unknown as Href;
}

export default function LensLibraryScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<"curated" | "community">("curated");
  const curatedLibrary = useLensLibrary();
  const communityLibrary = useCommunityLenses();

  const isCommunityMode = mode === "community";
  const isLoading = isCommunityMode ? communityLibrary.isLoading : curatedLibrary.isLoading;
  const error = isCommunityMode ? communityLibrary.error : curatedLibrary.error;

  const curatedItems = curatedLibrary.templates;
  const communityItems = communityLibrary.templates;
  const categoryFilter = communityLibrary.category;
  const communitySearch = communityLibrary.search;
  const communityCards = useMemo(() => communityItems, [communityItems]);

  function renderCuratedCard(item: LensLibraryItem) {
    const categoryTint = getCategoryTint(item.template.category);
    const isInstalled = item.installState === "Installed";

    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Preview ${item.template.name}`}
        testID={testIds.lens.library.card(item.template.template_id)}
        onPress={() => {
          router.push(buildPreviewRoute(item.template.template_id, "curated"));
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
              {formatCategoryLabel(item.template.category)}
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
  }

  function renderCommunityCard(item: CommunityLensItem) {
    const categoryTint = getCategoryTint(item.template.category);
    const isInstalled = item.installState === "Installed";

    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Preview community lens ${item.template.name}`}
        testID={testIds.lens.library.communityCard(item.template.template_id)}
        onPress={() => {
          router.push(buildPreviewRoute(item.template.template_id, "community"));
        }}
        style={styles.card}
      >
        <View style={styles.cardHeader}>
          <View style={styles.titleWrap}>
            <Text style={styles.name}>{item.template.name}</Text>
            <Text style={styles.description}>{item.template.description}</Text>
            <Text style={styles.authorText}>by {item.row.author_display_name}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </View>

        <View style={styles.metaRow}>
          <View style={[styles.badge, { backgroundColor: categoryTint.bg }]}>
            <Text style={[styles.badgeText, { color: categoryTint.text }]}>
              {formatCategoryLabel(item.template.category)}
            </Text>
          </View>
          <Text style={styles.cadence}>{formatCadence(item)}</Text>
          <Text style={styles.installCount}>{formatInstallCount(item.row.install_count)}</Text>
          {isInstalled ? (
            <View style={[styles.badge, styles.installedBadge]}>
              <Text style={[styles.badgeText, styles.installedBadgeText]}>Installed</Text>
            </View>
          ) : null}
        </View>
      </Pressable>
    );
  }

  return (
    <View testID={testIds.lens.library.screen} style={styles.container}>
      <Stack.Screen
        options={{
          title: "Browse Lens Library",
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
        }}
      />

      <View style={styles.segmentRow}>
        <Pressable
          testID={testIds.lens.library.modeCuratedButton}
          accessibilityRole="button"
          accessibilityLabel="Show curated lenses"
          accessibilityState={{ selected: mode === "curated" }}
          onPress={() => setMode("curated")}
          style={[styles.segmentButton, mode === "curated" && styles.segmentButtonSelected]}
        >
          <Text style={[styles.segmentButtonText, mode === "curated" && styles.segmentButtonTextSelected]}>
            Curated
          </Text>
        </Pressable>
        <Pressable
          testID={testIds.lens.library.modeCommunityButton}
          accessibilityRole="button"
          accessibilityLabel="Show community lenses"
          accessibilityState={{ selected: mode === "community" }}
          onPress={() => setMode("community")}
          style={[styles.segmentButton, mode === "community" && styles.segmentButtonSelected]}
        >
          <Text style={[styles.segmentButtonText, mode === "community" && styles.segmentButtonTextSelected]}>
            Community
          </Text>
        </Pressable>
      </View>

      {isCommunityMode ? (
        <View style={styles.communityToolbar}>
          <TextInput
            testID={testIds.lens.library.communitySearchInput}
            accessibilityLabel="Search community lenses"
            style={styles.searchInput}
            value={communitySearch}
            onChangeText={communityLibrary.setSearch}
            placeholder="Search by name, description, or author"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <View style={styles.categoryRow}>
            <Pressable
              testID={testIds.lens.library.communityCategoryAll}
              accessibilityRole="button"
              accessibilityLabel="Show all community categories"
              accessibilityState={{ selected: categoryFilter === null }}
              onPress={() => communityLibrary.setCategory(null)}
              style={[
                styles.filterPill,
                categoryFilter === null && styles.filterPillSelected,
              ]}
            >
              <Text style={[styles.filterPillText, categoryFilter === null && styles.filterPillTextSelected]}>
                All
              </Text>
            </Pressable>
            {CATEGORIES.map((category) => {
              const selected = categoryFilter === category;
              return (
                <Pressable
                  key={category}
                  testID={testIds.lens.library.communityCategoryOption(category)}
                  accessibilityRole="button"
                  accessibilityLabel={`Filter community lenses by ${formatCategoryLabel(category)}`}
                  accessibilityState={{ selected }}
                  onPress={() => communityLibrary.setCategory(category as Category)}
                  style={[styles.filterPill, selected && styles.filterPillSelected]}
                >
                  <Text style={[styles.filterPillText, selected && styles.filterPillTextSelected]}>
                    {formatCategoryLabel(category)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.sortLabel}>Sorted by most installed</Text>
        </View>
      ) : null}

      {isLoading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={styles.stateText}>
            {isCommunityMode ? "Loading community lenses..." : "Loading curated lenses..."}
          </Text>
        </View>
      ) : error ? (
        <View testID={testIds.lens.library.communityErrorState} style={styles.centerState}>
          <Text style={styles.stateTitle}>Couldn't load lens library</Text>
          <Text style={styles.stateText}>Please try again.</Text>
          {isCommunityMode ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                void communityLibrary.refetch();
              }}
              style={styles.retryButton}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
      <FlatList
        testID={testIds.lens.library.list}
        data={isCommunityMode ? communityCards : curatedItems}
        keyExtractor={(item) => item.template.template_id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) =>
          isCommunityMode
            ? renderCommunityCard(item as CommunityLensItem)
            : renderCuratedCard(item as LensLibraryItem)}
        ListEmptyComponent={
          isCommunityMode ? (
            <View testID={testIds.lens.library.communityEmptyState} style={styles.centerState}>
              <Text style={styles.stateTitle}>No community lenses found</Text>
              <Text style={styles.stateText}>Try a different search or category.</Text>
            </View>
          ) : null
        }
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
  segmentRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  segmentButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  segmentButtonSelected: {
    backgroundColor: colors.accentLight,
  },
  segmentButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  segmentButtonTextSelected: {
    color: colors.accent,
  },
  communityToolbar: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  searchInput: {
    minHeight: 44,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.text,
  },
  categoryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  filterPill: {
    minHeight: 36,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },
  filterPillSelected: {
    backgroundColor: colors.accentLight,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  filterPillTextSelected: {
    color: colors.accent,
  },
  sortLabel: {
    fontSize: 12,
    color: colors.textSecondary,
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
  authorText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing.sm,
  },
  installCount: {
    fontSize: 13,
    color: colors.textSecondary,
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
  centerState: {
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.sm,
  },
  stateTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    textAlign: "center",
  },
  stateText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
  },
  retryButton: {
    minHeight: 40,
    borderRadius: radii.md,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textInverse,
  },
});
