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
    ? items.map((item, index) =>
      React.createElement(React.Fragment, { key: String(index) }, renderItem({ item, index }))
    )
    : [];
  return React.createElement("FlatList", props, children);
};

const SectionList = ({ sections = [], renderItem, renderSectionHeader, ListEmptyComponent, ...props }: MockComponentProps) => {
  const listSections = Array.isArray(sections) ? sections : [];
  const children = listSections.flatMap((section) => {
    const header = typeof renderSectionHeader === "function"
      ? renderSectionHeader({ section })
      : null;
    const items = Array.isArray(section.data) && typeof renderItem === "function"
      ? section.data.map((item: unknown, index: number) =>
        React.createElement(
          React.Fragment,
          { key: `item-${String(index)}` },
          renderItem({ item, section, index })
        )
      )
      : [];
    return [
      header ? React.createElement(React.Fragment, { key: "header" }, header) : null,
      ...items
    ].filter(Boolean);
  });

  if (children.length === 0 && ListEmptyComponent) {
    const EmptyComponent = ListEmptyComponent as React.ComponentType;
    const emptyContent = typeof ListEmptyComponent === "function"
      ? React.createElement(EmptyComponent)
      : ListEmptyComponent as React.ReactNode;

    children.push(
      React.createElement(
        React.Fragment,
        { key: "empty" },
        emptyContent
      )
    );
  }

  return React.createElement("SectionList", props, children);
};

vi.mock("react-native", () => ({
  View: createComponent("View"),
  Text: createComponent("Text"),
  ScrollView: createComponent("ScrollView"),
  KeyboardAvoidingView: createComponent("KeyboardAvoidingView"),
  Pressable: createComponent("Pressable"),
  TouchableOpacity: createComponent("TouchableOpacity"),
  TextInput: createComponent("TextInput"),
  ActivityIndicator: createComponent("ActivityIndicator"),
  Modal: createComponent("Modal"),
  FlatList,
  SectionList,
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

vi.mock("@expo/vector-icons", () => ({
  Ionicons: createComponent("Ionicons")
}));
