import { View, Text, StyleSheet } from "react-native";

export default function CaptureScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Capture</Text>
      <Text style={styles.subtitle}>Text capture will be implemented in Task 4.3.A</Text>
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
