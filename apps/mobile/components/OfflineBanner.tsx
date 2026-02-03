import { View, Text, StyleSheet } from "react-native";

import { useOnlineStatus } from "../hooks/useOnlineStatus";

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
    backgroundColor: "#fef3c7",
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  text: {
    color: "#92400e",
    textAlign: "center",
    fontSize: 12,
  },
});
