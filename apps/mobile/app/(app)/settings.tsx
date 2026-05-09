import { useEffect, useMemo, useState } from "react";
import { Alert, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { LoadingSpinner } from "../../components/LoadingSpinner";
import { TimezoneSelect } from "../../components/TimezoneSelect";
import { useUserSettings } from "../../hooks/useUserSettings";
import { getDeviceTimezone, getTimezoneOptions } from "../../lib/timezones";
import { signOutUser } from "../../lib/authApi";
import { testIds } from "../../lib/testIds";
import { colors, radii, shadows } from "../../lib/theme";

export default function SettingsScreen() {
  const router = useRouter();
  const { data, isLoading, error, updateTimezone, refetch, isUpdating } = useUserSettings();
  const timezones = useMemo(() => getTimezoneOptions(), []);
  const currentTimezone = data?.timezone ?? getDeviceTimezone();
  const [hasShownError, setHasShownError] = useState(false);

  useEffect(() => {
    if (error && !hasShownError) {
      setHasShownError(true);
      Alert.alert(
        "Connection issue",
        "We couldn't load your settings. Check your connection and try again.",
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
  }, [error, hasShownError]);

  async function handleTimezoneChange(nextTimezone: string) {
    if (nextTimezone === currentTimezone) return;
    await updateTimezone(nextTimezone);
  }

  function handleLogout() {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await signOutUser();
          router.replace("/(auth)/login");
        },
      },
    ]);
  }

  return (
    <View testID={testIds.settings.screen} style={styles.container}>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.iconCircle}>
            <Ionicons name="globe-outline" size={18} color={colors.accent} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.label}>Timezone</Text>
            <Text style={styles.helperText}>
              Lenses are delivered in this timezone.
            </Text>
          </View>
        </View>

        {isLoading ? (
          <LoadingSpinner label="Loading settings..." />
        ) : error ? (
          <Text style={styles.errorText}>Failed to load settings.</Text>
        ) : (
          <TimezoneSelect
            testID={testIds.settings.timezoneSelect}
            value={currentTimezone}
            timezones={timezones}
            onChange={handleTimezoneChange}
            disabled={isUpdating}
          />
        )}
      </View>

      <TouchableOpacity
        testID={testIds.app.signOutButton}
        accessibilityRole="button"
        accessibilityLabel="Sign out"
        style={styles.signOutSection}
        onPress={handleLogout}
      >
        <View style={[styles.iconCircle, { backgroundColor: colors.errorLight }]}>
          <Ionicons name="log-out-outline" size={18} color={colors.error} />
        </View>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
    gap: 16,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: 16,
    ...shadows.sm,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: radii.lg,
    backgroundColor: colors.accentLight,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  helperText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
    flexShrink: 1,
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
  },
  signOutSection: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    ...shadows.sm,
  },
  signOutText: {
    fontSize: 15,
    fontWeight: "500",
    color: colors.error,
  },
});
