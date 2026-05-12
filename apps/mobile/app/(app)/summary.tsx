import { useEffect, useLayoutEffect, useState } from "react";
import {
  Alert,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { type Href, useRouter } from "expo-router";
import type { LensResultWithLens } from "@notesbrain/shared";

import { LensResultCard } from "../../components/LensResultCard";
import { useAuth } from "../../hooks/useAuth";
import { useLensResults } from "../../hooks/useLensResults";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { testIds } from "../../lib/testIds";
import { colors, radii, shadows, spacing } from "../../lib/theme";

type LensResultSection = {
  title: string;
  data: LensResultWithLens[];
};

const LENS_MANAGE_ROUTE = "/(app)/lens-manage" as Href;

function groupResultsByDate(results: LensResultWithLens[]): LensResultSection[] {
  const groups: Map<string, LensResultWithLens[]> = new Map();

  for (const result of results) {
    const dateKey = new Date(result.generated_at).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    const existing = groups.get(dateKey) ?? [];
    existing.push(result);
    groups.set(dateKey, existing);
  }

  return Array.from(groups.entries()).map(([title, data]) => ({ title, data }));
}

export default function SummaryScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: results = [], isLoading, isRefetching, refetch, error } = useLensResults(user?.id);
  const [hasShownError, setHasShownError] = useState(false);
  const sections = groupResultsByDate(results);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerActions}>
          <Pressable
            testID={testIds.summary.headerCreateButton}
            accessibilityLabel="Create lens"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => {
              router.push("/(app)/lens-create" as Href);
            }}
            style={styles.headerButton}
          >
            <Ionicons name="add-circle-outline" size={22} color={colors.text} />
          </Pressable>
          <Pressable
            testID={testIds.summary.headerManageButton}
            accessibilityLabel="Manage lenses"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => {
              router.push(LENS_MANAGE_ROUTE);
            }}
            style={styles.headerButton}
          >
            <Ionicons name="settings-outline" size={20} color={colors.text} />
          </Pressable>
        </View>
      ),
    });
  }, [navigation, router]);

  async function handleRefresh() {
    if (!user?.id) {
      return;
    }

    await queryClient.invalidateQueries({ queryKey: ["lens-results", user.id] });
  }

  useEffect(() => {
    if (error && !hasShownError) {
      setHasShownError(true);
      Alert.alert(
        "Connection issue",
        "We couldn't load your insights. Check your connection and try again.",
        [
          {
            text: "Retry",
            onPress: () => {
              refetch();
            },
          },
          { text: "Dismiss", style: "cancel" },
        ]
      );
    }

    if (!error && hasShownError) {
      setHasShownError(false);
    }
  }, [error, hasShownError, refetch]);

  return (
    <View testID={testIds.summary.screen} style={styles.container}>
      {isLoading ? (
        <LoadingSpinner label="Loading insights..." />
      ) : (
        <SectionList
          style={styles.list}
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={({ item, section, index }) => {
            const isFirstCard = sections[0]?.title === section.title && index === 0;

            return (
              <View style={styles.cardWrap}>
                <LensResultCard
                  result={item}
                  testID={isFirstCard ? testIds.summary.card : undefined}
                />
              </View>
            );
          }}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
          )}
          ListEmptyComponent={
            <View testID={testIds.summary.emptyState} style={styles.emptyState}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="sparkles-outline" size={36} color={colors.accent} />
              </View>
              <Text style={styles.emptyTitle}>No Insights Yet</Text>
              <Text style={styles.emptyText}>
                Create your first lens to get AI insights from your notes.
              </Text>
              <Pressable
                accessibilityRole="button"
                testID={testIds.summary.createButton}
                onPress={() => {
                  router.push("/(app)/lens-create" as Href);
                }}
                style={styles.emptyButton}
              >
                <Text style={styles.emptyButtonText}>Create Lens</Text>
                {/* lens-create route */}
              </Pressable>
            </View>
          }
          contentContainerStyle={[
            styles.listContent,
            sections.length === 0 && styles.emptyListContent,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => {
                void handleRefresh();
              }}
              tintColor={colors.accent}
            />
          }
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
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
  list: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  headerButton: {
    width: 48,
    height: 48,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceRaised,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  sectionHeader: {
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  cardWrap: {
    marginBottom: spacing.md,
  },
  emptyState: {
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.accentLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "600",
    color: colors.text,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
    maxWidth: 280,
    lineHeight: 22,
  },
  emptyButton: {
    marginTop: spacing.lg,
    minWidth: 148,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.sm,
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textInverse,
  },
});
