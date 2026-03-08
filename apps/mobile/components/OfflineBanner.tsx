import { View, Text, StyleSheet } from "react-native";

import { useOnlineStatus } from "../hooks/useOnlineStatus";
import { colors } from "../lib/theme";

export function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.text}>You're offline. We'll sync when you're back online.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.warningLight,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  text: {
    color: colors.warning,
    textAlign: "center",
    fontSize: 12,
  },
});
