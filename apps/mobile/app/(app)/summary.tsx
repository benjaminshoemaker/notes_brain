import { useEffect, useState } from "react";
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "../../hooks/useAuth";
import { useDailySummary } from "../../hooks/useDailySummary";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { SummaryCard } from "../../components/SummaryCard";
import { colors } from "../../lib/theme";

export default function SummaryScreen() {
  const { user } = useAuth();
  const { data: summary, isLoading, refetch, isRefetching, error } = useDailySummary(
    user?.id
  );
  const [hasShownError, setHasShownError] = useState(false);

  useEffect(() => {
    if (error && !hasShownError) {
      setHasShownError(true);
      Alert.alert(
        "Connection issue",
        "We couldn't load the summary. Check your connection and try again.",
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

  if (isLoading) {
    return <LoadingSpinner label="Loading summary..." />;
  }

  if (!summary) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.centered}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.accent} />
        }
      >
        <View style={styles.emptyState}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="clipboard-outline" size={36} color={colors.accent} />
          </View>
          <Text style={styles.emptyTitle}>No Summary Yet</Text>
          <Text style={styles.emptyText}>
            Your daily summary will appear here around 8:00 AM local time.
          </Text>
          <Text style={styles.emptyHint}>Pull down to refresh</Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.accent} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.headerDate}>
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </Text>
      </View>

      <SummaryCard content={summary.content} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  header: {
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerDate: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  emptyState: {
    alignItems: "center",
    gap: 8,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.accentLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "600",
    color: colors.text,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
    maxWidth: 280,
  },
  emptyHint: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 16,
  },
});
