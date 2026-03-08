import { View, Text, StyleSheet, ActivityIndicator } from "react-native";

import { colors } from "../lib/theme";

type LoadingSpinnerProps = {
  label?: string;
};

export function LoadingSpinner({ label = "Loading..." }: LoadingSpinnerProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.accent} />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  label: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
  },
});
