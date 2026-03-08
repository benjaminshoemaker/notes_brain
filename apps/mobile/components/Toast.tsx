import { useEffect, useRef } from "react";
import { Animated, Text, StyleSheet, View, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, radii } from "../lib/theme";

type ToastProps = {
  message: string;
  type?: "success" | "error";
  visible: boolean;
  onHide: () => void;
  duration?: number;
  testID?: string;
};

const ERROR_DURATION = 5000;

export function Toast({
  message,
  type = "success",
  visible,
  onHide,
  duration = 2000,
  testID,
}: ToastProps) {
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const effectiveDuration = type === "error" ? ERROR_DURATION : duration;

  function dismiss() {
    if (timerRef.current) clearTimeout(timerRef.current);
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
  }

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

      timerRef.current = setTimeout(dismiss, effectiveDuration);

      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    }
  }, [visible, effectiveDuration, onHide, opacity, translateY]);

  if (!visible) return null;

  return (
    <Pressable onPress={dismiss} accessibilityRole="alert">
      <Animated.View
        testID={testID}
        style={[
          styles.container,
          type === "success" ? styles.success : styles.error,
          { top: insets.top + 8, opacity, transform: [{ translateY }] },
        ]}
      >
        <View style={styles.content}>
          <Ionicons
            name={type === "success" ? "checkmark-circle" : "close-circle"}
            size={18}
            color={colors.textInverse}
            style={styles.icon}
          />
          <Text style={styles.message}>{message}</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 20,
    right: 20,
    borderRadius: radii.md,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 1000,
  },
  success: {
    backgroundColor: colors.success,
  },
  error: {
    backgroundColor: colors.error,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
  },
  icon: {
    marginRight: 8,
  },
  message: {
    color: colors.textInverse,
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
});
