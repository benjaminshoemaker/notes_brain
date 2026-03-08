/**
 * OPTION 1: "Warm Ink"
 *
 * Personality: Warmth & Approachability (Notion / Apple Notes)
 * Foundation: Warm neutrals — cream background, warm grays, ink-black text
 * Depth: Subtle single shadows + surface color shifts
 * Accent: Indigo (#4f46e5) — calm, trustworthy
 * Radius: 10px cards, 8px buttons, 20px pills
 * Vibe: A leather-bound notebook that happens to be digital
 */

import React from "react";
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const c = {
  bg: "#FAF8F5",
  surface: "#FFFFFF",
  surfaceRaised: "#F5F2EE",
  border: "#E8E4DF",
  text: "#1C1917",
  textSec: "#57534E",
  textMuted: "#A8A29E",
  accent: "#4F46E5",
  error: "#DC2626",
  catTask: { bg: "#EFF6FF", text: "#2563EB" },
  catIdea: { bg: "#F5F3FF", text: "#7C3AED" },
  catJournal: { bg: "#F0FDF4", text: "#16A34A" },
  catUncat: { bg: "#F5F5F4", text: "#78716C" },
};

export default function WarmInkPreview() {
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content}>
      <Text style={s.label}>OPTION 1: WARM INK</Text>
      <Text style={s.desc}>
        Warm cream background, indigo accent, tinted badges, soft shadows.
        Feels like a premium personal notebook.
      </Text>

      {/* Capture */}
      <Text style={s.section}>CAPTURE</Text>
      <View style={s.card}>
        <Text style={{ fontSize: 15, color: c.textSec, marginBottom: 8 }}>Good morning</Text>
        <TextInput
          style={s.input}
          placeholder="What's on your mind?"
          placeholderTextColor={c.textMuted}
          multiline
          editable={false}
        />
        <View style={[s.btn, { backgroundColor: c.border }]}>
          <Text style={s.btnText}>Save</Text>
        </View>
      </View>

      <View style={s.divider}>
        <View style={s.divLine} />
        <Text style={s.divText}>or</Text>
        <View style={s.divLine} />
      </View>

      <TouchableOpacity style={[s.btn, { backgroundColor: c.accent, alignSelf: "center", flexDirection: "row", gap: 8 }]}>
        <Ionicons name="mic-outline" size={20} color="#FFF" />
        <Text style={s.btnText}>Record Voice Note</Text>
      </TouchableOpacity>
      <Text style={s.hint}>Max 5 minutes</Text>

      {/* Notes */}
      <Text style={[s.section, { marginTop: 32 }]}>NOTE CARDS</Text>
      <View style={s.noteCard}>
        <View style={s.noteHead}>
          <View style={[s.badge, { backgroundColor: c.catTask.bg }]}>
            <Text style={[s.badgeText, { color: c.catTask.text }]}>Task</Text>
          </View>
          <Text style={s.ts}>2h ago</Text>
        </View>
        <Text style={s.noteBody}>Review the Q1 planning doc and send feedback to the team by Friday</Text>
      </View>
      <View style={s.noteCard}>
        <View style={s.noteHead}>
          <View style={[s.badge, { backgroundColor: c.catIdea.bg }]}>
            <Text style={[s.badgeText, { color: c.catIdea.text }]}>Idea</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Ionicons name="mic" size={14} color={c.textMuted} />
            <Text style={s.ts}>5h ago</Text>
          </View>
        </View>
        <Text style={s.noteBody}>Build a habit tracker that integrates with the daily summary...</Text>
      </View>
      <View style={s.noteCard}>
        <View style={s.noteHead}>
          <View style={[s.badge, { backgroundColor: c.catUncat.bg }]}>
            <Text style={[s.badgeText, { color: c.catUncat.text }]}>Classifying...</Text>
          </View>
          <Text style={s.ts}>Just now</Text>
        </View>
        <Text style={{ fontSize: 14, fontStyle: "italic", color: c.textMuted }}>Voice note (transcribing...)</Text>
      </View>

      {/* Filters */}
      <Text style={[s.section, { marginTop: 32 }]}>CATEGORY FILTER</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={[s.pill, { backgroundColor: c.accent }]}>
          <Text style={[s.pillText, { color: "#FFF", fontWeight: "600" }]}>All</Text>
        </View>
        {["Ideas", "Tasks", "Journal", "Reference"].map((t) => (
          <View key={t} style={[s.pill, { backgroundColor: c.surfaceRaised }]}>
            <Text style={s.pillText}>{t}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Settings */}
      <Text style={[s.section, { marginTop: 32 }]}>SETTINGS</Text>
      <View style={s.noteCard}>
        <Text style={{ fontSize: 16, fontWeight: "600", color: c.text }}>Timezone</Text>
        <Text style={{ fontSize: 13, color: c.textSec, marginTop: 2, marginBottom: 10 }}>Summaries delivered at 8:00 AM</Text>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: c.border, borderRadius: 8, padding: 10 }}>
          <Text style={{ fontSize: 15, color: c.text }}>America/Los_Angeles</Text>
          <Ionicons name="chevron-down" size={16} color={c.textMuted} />
        </View>
      </View>
      <View style={[s.noteCard, { marginTop: 10 }]}>
        <TouchableOpacity style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Ionicons name="log-out-outline" size={20} color={c.error} />
          <Text style={{ fontSize: 15, fontWeight: "500", color: c.error }}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Tab bar */}
      <Text style={[s.section, { marginTop: 32 }]}>TAB BAR</Text>
      <View style={s.tabBar}>
        {[
          { icon: "create-outline" as const, label: "Capture", active: true },
          { icon: "documents-outline" as const, label: "Notes", active: false },
          { icon: "clipboard-outline" as const, label: "Summary", active: false },
          { icon: "settings-outline" as const, label: "Settings", active: false },
        ].map((t) => (
          <View key={t.label} style={{ alignItems: "center", gap: 3 }}>
            <Ionicons name={t.icon} size={22} color={t.active ? c.accent : c.textMuted} />
            <Text style={{ fontSize: 10, fontWeight: "500", color: t.active ? c.accent : c.textMuted }}>{t.label}</Text>
          </View>
        ))}
      </View>

      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },
  content: { padding: 20, paddingTop: 16 },
  label: { fontSize: 11, fontWeight: "700", letterSpacing: 1.5, color: c.accent, marginBottom: 6 },
  desc: { fontSize: 14, lineHeight: 20, color: c.textSec, marginBottom: 24 },
  section: { fontSize: 12, fontWeight: "600", color: c.textMuted, letterSpacing: 0.5, marginBottom: 12 },
  card: { backgroundColor: c.surface, borderRadius: 10, padding: 16, shadowColor: "#1C1917", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3 },
  input: { fontSize: 16, lineHeight: 24, minHeight: 80, textAlignVertical: "top", color: c.text },
  btn: { borderRadius: 8, paddingVertical: 12, paddingHorizontal: 24, alignItems: "center", marginTop: 12 },
  btnText: { color: "#FFF", fontSize: 15, fontWeight: "600" },
  divider: { flexDirection: "row", alignItems: "center", marginVertical: 20 },
  divLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: c.border },
  divText: { marginHorizontal: 16, color: c.textMuted, fontSize: 13 },
  hint: { textAlign: "center", marginTop: 8, fontSize: 12, color: c.textMuted },
  noteCard: { backgroundColor: c.surface, borderRadius: 10, padding: 16, marginBottom: 10, shadowColor: "#1C1917", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2 },
  noteHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  badge: { paddingVertical: 3, paddingHorizontal: 10, borderRadius: 12 },
  badgeText: { fontSize: 12, fontWeight: "600" },
  ts: { fontSize: 12, color: c.textMuted },
  noteBody: { fontSize: 15, lineHeight: 22, color: c.text },
  pill: { paddingVertical: 7, paddingHorizontal: 16, borderRadius: 20, marginRight: 8 },
  pillText: { fontSize: 14, fontWeight: "500", color: c.textSec },
  tabBar: { flexDirection: "row", justifyContent: "space-around", backgroundColor: c.surface, borderRadius: 10, paddingVertical: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: c.border },
});
