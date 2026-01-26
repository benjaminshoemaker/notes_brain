import { useMemo } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";

import { TimezoneSelect } from "../../components/TimezoneSelect";
import { useUserSettings } from "../../hooks/useUserSettings";
import { getDeviceTimezone, getTimezoneOptions } from "../../lib/timezones";

export default function SettingsScreen() {
  const { data, isLoading, error, updateTimezone, isUpdating } = useUserSettings();
  const timezones = useMemo(() => getTimezoneOptions(), []);
  const currentTimezone = data?.timezone ?? getDeviceTimezone();

  async function handleTimezoneChange(nextTimezone: string) {
    if (nextTimezone === currentTimezone) return;
    await updateTimezone(nextTimezone);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.section}>
        <Text style={styles.label}>Timezone</Text>
        <Text style={styles.helperText}>
          Daily summaries are delivered at 8:00 AM in this timezone.
        </Text>

        {isLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color="#0066cc" />
            <Text style={styles.loadingText}>Loading settings…</Text>
          </View>
        ) : error ? (
          <Text style={styles.errorText}>Failed to load settings.</Text>
        ) : (
          <TimezoneSelect
            value={currentTimezone}
            timezones={timezones}
            onChange={handleTimezoneChange}
            disabled={isUpdating}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 20,
    color: "#111827",
  },
  section: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 6,
  },
  helperText: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 12,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
    color: "#6b7280",
  },
  errorText: {
    fontSize: 14,
    color: "#b91c1c",
  },
});
