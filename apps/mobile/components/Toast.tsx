import { useEffect, useRef } from "react";
import { Animated, Text, StyleSheet, View } from "react-native";

type ToastProps = {
  message: string;
  type?: "success" | "error";
  visible: boolean;
  onHide: () => void;
  duration?: number;
};

export function Toast({ message, type = "success", visible, onHide, duration = 2000 }: ToastProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: -20,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(() => {
          onHide();
        });
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible, duration, onHide, opacity, translateY]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        type === "success" ? styles.success : styles.error,
        { opacity, transform: [{ translateY }] },
      ]}
    >
      <View style={styles.content}>
        <Text style={styles.icon}>{type === "success" ? "✓" : "✕"}</Text>
        <Text style={styles.message}>{message}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 60,
    left: 20,
    right: 20,
    borderRadius: 8,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 1000,
  },
  success: {
    backgroundColor: "#10b981",
  },
  error: {
    backgroundColor: "#ef4444",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
  },
  icon: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
    marginRight: 8,
  },
  message: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
});
