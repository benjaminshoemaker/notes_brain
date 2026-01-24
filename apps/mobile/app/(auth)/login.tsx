import { View, Text, StyleSheet } from "react-native";
import { Stack } from "expo-router";

export default function LoginScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Login" }} />
      <Text style={styles.title}>Login</Text>
      <Text style={styles.subtitle}>Authentication will be implemented in Task 4.2.A</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#ffffff",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#666666",
    textAlign: "center",
  },
});
