import { View, Text, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useOnlineStatus } from "../hooks/useOnlineStatus";
import { colors, spacing } from "../lib/theme";

export function OfflineBanner() {
  const isOnline = useOnlineStatus();
  const insets = useSafeAreaInsets();

  if (isOnline) {
    return null;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
      <Text style={styles.text}>You're offline. We'll sync when you're back online.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.warningLight,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  text: {
    color: colors.warning,
    textAlign: "center",
    fontSize: 12,
  },
});
