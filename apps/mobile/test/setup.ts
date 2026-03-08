import React from "react";
import { vi } from "vitest";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type MockComponentProps = {
  children?: React.ReactNode;
  [key: string]: unknown;
};

function createComponent(name: string) {
  function Component({ children, ...props }: MockComponentProps) {
    return React.createElement(name, props, children);
  }

  Component.displayName = name;
  return Component;
}

const FlatList = ({ data = [], renderItem, ...props }: MockComponentProps) => {
  const items = Array.isArray(data) ? data : [];
  const children = typeof renderItem === "function"
    ? items.map((item, index) => renderItem({ item, index }))
    : [];
  return React.createElement("FlatList", props, children);
};

vi.mock("react-native", () => ({
  View: createComponent("View"),
  Text: createComponent("Text"),
  ScrollView: createComponent("ScrollView"),
  KeyboardAvoidingView: createComponent("KeyboardAvoidingView"),
  TouchableOpacity: createComponent("TouchableOpacity"),
  TextInput: createComponent("TextInput"),
  ActivityIndicator: createComponent("ActivityIndicator"),
  Modal: createComponent("Modal"),
  FlatList,
  RefreshControl: createComponent("RefreshControl"),
  StyleSheet: {
    create: <T,>(styles: T) => styles
  },
  Alert: {
    alert: vi.fn()
  },
  Platform: {
    OS: "ios",
    select: (options: { ios?: unknown; android?: unknown; default?: unknown }) =>
      options.ios ?? options.default
  },
  Animated: {
    Value: class MockAnimatedValue {
      constructor(_initialValue: number) {}

      interpolate() {
        return "#ffffff";
      }
    },
    timing: () => ({
      start: (callback?: () => void) => callback?.()
    }),
    delay: () => ({
      start: (callback?: () => void) => callback?.()
    }),
    sequence: () => ({
      start: (callback?: () => void) => callback?.()
    })
  }
}));
