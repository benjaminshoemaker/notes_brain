// Temporary route to preview design options. Delete after choosing.
import React, { useState } from "react";
import { View, TouchableOpacity, Text, StyleSheet, SafeAreaView } from "react-native";
import { Stack } from "expo-router";

import WarmInkPreview from "../../components/mocks/Option1_WarmInk";
import CoolSlatePreview from "../../components/mocks/Option2_CoolSlate";
import SoftDawnPreview from "../../components/mocks/Option3_SoftDawn";
import EditNoteDeleteOptions from "../../components/mocks/EditNoteDeleteOptions";

const OPTIONS = [
  { key: "warm", label: "Warm Ink", bg: "#FAF8F5", accent: "#4F46E5" },
  { key: "cool", label: "Cool Slate", bg: "#0F172A", accent: "#3B82F6" },
  { key: "soft", label: "Soft Dawn", bg: "#F1F5F9", accent: "#0D9488" },
  { key: "delete", label: "Delete Flow", bg: "#FAF8F5", accent: "#B91C1C" },
] as const;

export default function MocksScreen() {
  const [selected, setSelected] = useState<string>("warm");
  const current = OPTIONS.find((o) => o.key === selected)!;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: current.bg }]}>
      <Stack.Screen options={{ title: "Design Mocks", headerShown: true }} />
      <View style={styles.switcher}>
        {OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.key}
            style={[
              styles.switchBtn,
              selected === opt.key && { backgroundColor: opt.accent },
            ]}
            onPress={() => setSelected(opt.key)}
          >
            <Text
              style={[
                styles.switchText,
                selected === opt.key && styles.switchTextActive,
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {selected === "warm" && <WarmInkPreview />}
      {selected === "cool" && <CoolSlatePreview />}
      {selected === "soft" && <SoftDawnPreview />}
      {selected === "delete" && <EditNoteDeleteOptions />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  switcher: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  switchBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "rgba(128,128,128,0.2)",
  },
  switchText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#888",
  },
  switchTextActive: {
    color: "#FFFFFF",
  },
});
