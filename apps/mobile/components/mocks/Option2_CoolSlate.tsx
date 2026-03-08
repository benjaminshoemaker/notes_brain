/**
 * OPTION 2: "Cool Slate"
 *
 * Personality: Precision & Boldness (Linear / Vercel / Raycast)
 * Foundation: Cool slate grays, near-black surfaces, high contrast
 * Depth: Borders-only — no shadows
 * Accent: Electric blue (#3B82F6) — confident, modern
 * Radius: 8px everywhere — strict consistency
 * Vibe: A precision instrument for thought capture
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
  bg: "#0F172A",
  surface: "#1E293B",
  raised: "#334155",
  border: "rgba(148,163,184,0.15)",
  text: "#F8FAFC",
  textSec: "#94A3B8",
  textMuted: "#64748B",
  accent: "#3B82F6",
  accentLight: "rgba(59,130,246,0.12)",
  error: "#EF4444",
  catTask: { bg: "rgba(59,130,246,0.12)", text: "#60A5FA" },
  catIdea: { bg: "rgba(139,92,246,0.12)", text: "#A78BFA" },
  catUncat: { bg: "rgba(148,163,184,0.1)", text: "#94A3B8" },
};

export default function CoolSlatePreview() {
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content}>
      <Text style={s.label}>OPTION 2: COOL SLATE</Text>
      <Text style={s.desc}>
        Dark slate foundation, electric blue accent, border-only depth, tight typography.
        Feels like a precision tool.
      </Text>

      {/* Capture */}
      <Text style={s.section}>CAPTURE</Text>
      <View style={s.card}>
        <TextInput
          style={s.input}
          placeholder="What's on your mind?"
          placeholderTextColor={c.textMuted}
          multiline
          editable={false}
        />
        <View style={[s.btn, { backgroundColor: c.raised }]}>
          <Text style={{ color: c.textMuted, fontSize: 14, fontWeight: "600" }}>Save</Text>
        </View>
      </View>

      <View style={s.divider}>
        <View style={s.divLine} />
        <Text style={s.divText}>or</Text>
        <View style={s.divLine} />
      </View>

      <TouchableOpacity style={[s.btn, { backgroundColor: c.accent, alignSelf: "center", flexDirection: "row", gap: 8 }]}>
        <Ionicons name="mic-outline" size={18} color="#FFF" />
        <Text style={{ color: "#FFF", fontSize: 14, fontWeight: "600" }}>Record Voice Note</Text>
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
            <Ionicons name="mic" size={13} color={c.textMuted} />
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
        <Text style={{ fontSize: 13, fontStyle: "italic", color: c.textMuted }}>Voice note (transcribing...)</Text>
      </View>

      {/* Filters */}
      <Text style={[s.section, { marginTop: 32 }]}>CATEGORY FILTER</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={[s.pill, { backgroundColor: c.accentLight, borderWidth: 1, borderColor: c.accent }]}>
          <Text style={[s.pillText, { color: c.accent, fontWeight: "600" }]}>All</Text>
        </View>
        {["Ideas", "Tasks", "Journal", "Reference"].map((t) => (
          <View key={t} style={[s.pill, { backgroundColor: c.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: c.border }]}>
            <Text style={s.pillText}>{t}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Recording state */}
      <Text style={[s.section, { marginTop: 32 }]}>RECORDING STATE</Text>
      <View style={[s.card, { borderColor: "rgba(239,68,68,0.3)", borderWidth: 1 }]}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 12 }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.error }} />
          <Text style={{ fontSize: 28, fontWeight: "700", color: c.text, fontVariant: ["tabular-nums"] }}>01:24</Text>
          <Text style={{ fontSize: 13, color: c.textMuted }}>3m 36s left</Text>
        </View>
        <View style={{ height: 3, backgroundColor: c.raised, borderRadius: 2, overflow: "hidden", marginBottom: 16 }}>
          <View style={{ width: "28%", height: "100%", backgroundColor: c.error }} />
        </View>
        <View style={{ flexDirection: "row", justifyContent: "center", gap: 10 }}>
          <TouchableOpacity style={{ paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: c.border }}>
            <Text style={{ color: c.textSec, fontSize: 14, fontWeight: "600" }}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, backgroundColor: c.error }}>
            <Text style={{ color: "#FFF", fontSize: 14, fontWeight: "600" }}>Stop & Save</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Settings */}
      <Text style={[s.section, { marginTop: 32 }]}>SETTINGS</Text>
      <View style={s.noteCard}>
        <Text style={{ fontSize: 15, fontWeight: "600", color: c.text }}>Timezone</Text>
        <Text style={{ fontSize: 13, color: c.textSec, marginTop: 4, marginBottom: 10 }}>Summaries delivered at 8:00 AM</Text>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: StyleSheet.hairlineWidth, borderColor: c.border, borderRadius: 8, padding: 10, backgroundColor: c.bg }}>
          <Text style={{ fontSize: 14, color: c.text }}>America/Los_Angeles</Text>
          <Ionicons name="chevron-down" size={14} color={c.textMuted} />
        </View>
      </View>
      <View style={[s.noteCard, { marginTop: 8 }]}>
        <TouchableOpacity style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Ionicons name="log-out-outline" size={18} color={c.error} />
          <Text style={{ fontSize: 14, fontWeight: "500", color: c.error }}>Sign Out</Text>
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
            <Ionicons name={t.icon} size={20} color={t.active ? c.accent : c.textMuted} />
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
  desc: { fontSize: 13, lineHeight: 19, color: c.textSec, marginBottom: 24 },
  section: { fontSize: 11, fontWeight: "600", color: c.textMuted, letterSpacing: 0.8, marginBottom: 12 },
  card: { backgroundColor: c.surface, borderRadius: 8, padding: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: c.border },
  input: { fontSize: 15, lineHeight: 22, minHeight: 72, textAlignVertical: "top", color: c.text },
  btn: { borderRadius: 8, paddingVertical: 12, paddingHorizontal: 20, alignItems: "center", marginTop: 12 },
  divider: { flexDirection: "row", alignItems: "center", marginVertical: 20 },
  divLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: c.border },
  divText: { marginHorizontal: 16, color: c.textMuted, fontSize: 13 },
  hint: { textAlign: "center", marginTop: 8, fontSize: 12, color: c.textMuted },
  noteCard: { backgroundColor: c.surface, borderRadius: 8, padding: 14, marginBottom: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: c.border },
  noteHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  badge: { paddingVertical: 3, paddingHorizontal: 10, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: "600" },
  ts: { fontSize: 12, color: c.textMuted, fontVariant: ["tabular-nums"] },
  noteBody: { fontSize: 14, lineHeight: 20, color: c.text },
  pill: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, marginRight: 8 },
  pillText: { fontSize: 13, fontWeight: "500", color: c.textSec },
  tabBar: { flexDirection: "row", justifyContent: "space-around", backgroundColor: c.surface, borderRadius: 8, paddingVertical: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: c.border },
});
