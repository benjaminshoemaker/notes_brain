import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from "react-native";

import { useAuth } from "../../hooks/useAuth";
import { useDailySummary } from "../../hooks/useDailySummary";
import { SummaryCard } from "../../components/SummaryCard";

export default function SummaryScreen() {
  const { user } = useAuth();
  const { data: summary, isLoading, refetch, isRefetching } = useDailySummary(
    user?.id
  );

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0066cc" />
        <Text style={styles.loadingText}>Loading summary...</Text>
      </View>
    );
  }

  if (!summary) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.centered}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
      >
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>📋</Text>
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
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Daily Summary</Text>
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
    backgroundColor: "#fff",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
  },
  headerDate: {
    fontSize: 16,
    color: "#666",
    marginTop: 4,
  },
  emptyState: {
    alignItems: "center",
    gap: 8,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "600",
    color: "#333",
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    maxWidth: 280,
  },
  emptyHint: {
    fontSize: 14,
    color: "#999",
    marginTop: 16,
  },
});
