/**
 * OPTION 3: "Soft Dawn"
 *
 * Personality: Warmth & Clarity (Things 3 / Bear / Day One)
 * Foundation: Near-white with blue-gray tint, soft pastels, airy
 * Depth: Layered shadows — premium, dimensional feel
 * Accent: Teal (#0D9488) — fresh, calming, distinctive
 * Radius: 12px cards, 8px buttons, 24px pills — softer, rounder
 * Vibe: A calm morning journal — spacious, breathable, personal
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
  bg: "#F1F5F9",
  surface: "#FFFFFF",
  surfaceRaised: "#F8FAFC",
  border: "#E2E8F0",
  text: "#0F172A",
  textSec: "#475569",
  textMuted: "#94A3B8",
  accent: "#0D9488",
  accentLight: "#F0FDFA",
  accentMed: "#CCFBF1",
  error: "#E11D48",
  errorLight: "#FFF1F2",
  catTask: { bg: "#DBEAFE", text: "#1D4ED8" },
  catIdea: { bg: "#EDE9FE", text: "#6D28D9" },
  catUncat: { bg: "#F1F5F9", text: "#64748B" },
};

const shadow = {
  shadowColor: "#0F172A",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 8,
  elevation: 3,
};

export default function SoftDawnPreview() {
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content}>
      <Text style={s.label}>OPTION 3: SOFT DAWN</Text>
      <Text style={s.desc}>
        Cool slate background, teal accent, layered shadows, rounded surfaces.
        Feels like a calm, personal journal app.
      </Text>

      {/* Capture */}
      <Text style={s.section}>CAPTURE</Text>
      <View style={s.card}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Ionicons name="create" size={18} color={c.accent} />
          <Text style={{ fontSize: 15, fontWeight: "600", color: c.text }}>New Note</Text>
        </View>
        <TextInput
          style={s.input}
          placeholder="What's on your mind?"
          placeholderTextColor={c.textMuted}
          multiline
          editable={false}
        />
        <View style={[s.btn, { backgroundColor: c.border }]}>
          <Text style={{ color: c.textMuted, fontSize: 15, fontWeight: "600" }}>Save</Text>
        </View>
      </View>

      <View style={s.divider}>
        <View style={s.divLine} />
        <Text style={s.divText}>or</Text>
        <View style={s.divLine} />
      </View>

      {/* Voice — circular button */}
      <View style={{ alignItems: "center", padding: 20 }}>
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: c.accentLight, borderWidth: 2, borderColor: c.accentMed, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="mic" size={24} color={c.accent} />
        </View>
        <Text style={{ fontSize: 14, fontWeight: "500", color: c.text, marginTop: 10 }}>Tap to record</Text>
        <Text style={{ fontSize: 12, color: c.textMuted, marginTop: 4 }}>Max 5 minutes</Text>
      </View>

      {/* Notes */}
      <Text style={[s.section, { marginTop: 24 }]}>NOTE CARDS</Text>
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
        <Text style={{ fontSize: 14, fontStyle: "italic", color: c.textMuted, marginBottom: 8 }}>Voice note (transcribing...)</Text>
        <View style={{ height: 3, backgroundColor: c.border, borderRadius: 2, overflow: "hidden" }}>
          <View style={{ width: "60%", height: "100%", backgroundColor: c.accent, borderRadius: 2 }} />
        </View>
      </View>

      {/* Filters */}
      <Text style={[s.section, { marginTop: 32 }]}>CATEGORY FILTER</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={[s.pill, { backgroundColor: c.accent, ...shadow }]}>
          <Text style={[s.pillText, { color: "#FFF", fontWeight: "600" }]}>All</Text>
        </View>
        {["Ideas", "Tasks", "Journal", "Reference"].map((t) => (
          <View key={t} style={[s.pill, { backgroundColor: c.surface, ...shadow }]}>
            <Text style={s.pillText}>{t}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Empty state */}
      <Text style={[s.section, { marginTop: 32 }]}>EMPTY STATE</Text>
      <View style={[s.card, { alignItems: "center", padding: 32 }]}>
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: c.accentLight, alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
          <Ionicons name="clipboard-outline" size={32} color={c.accent} />
        </View>
        <Text style={{ fontSize: 20, fontWeight: "600", color: c.text, marginBottom: 8 }}>No Summary Yet</Text>
        <Text style={{ fontSize: 15, lineHeight: 22, color: c.textSec, textAlign: "center", maxWidth: 260 }}>Your daily summary will appear here around 8:00 AM local time.</Text>
        <Text style={{ fontSize: 13, color: c.textMuted, marginTop: 16 }}>Pull down to refresh</Text>
      </View>

      {/* Recording */}
      <Text style={[s.section, { marginTop: 32 }]}>RECORDING STATE</Text>
      <View style={[s.card, { alignItems: "center", borderWidth: 1.5, borderColor: c.error }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.error }} />
          <Text style={{ fontSize: 36, fontWeight: "700", color: c.text, fontVariant: ["tabular-nums"], letterSpacing: -1 }}>01:24</Text>
        </View>
        <Text style={{ fontSize: 13, color: c.textMuted, marginBottom: 16 }}>3m 36s remaining</Text>
        <View style={{ width: "100%", height: 4, backgroundColor: c.border, borderRadius: 2, overflow: "hidden", marginBottom: 20 }}>
          <View style={{ width: "28%", height: "100%", backgroundColor: c.error, borderRadius: 2 }} />
        </View>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <TouchableOpacity style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 11, paddingHorizontal: 20, borderRadius: 10, borderWidth: 1, borderColor: c.border }}>
            <Ionicons name="close" size={18} color={c.textSec} />
            <Text style={{ color: c.textSec, fontSize: 14, fontWeight: "600" }}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 11, paddingHorizontal: 20, borderRadius: 10, backgroundColor: c.error }}>
            <Ionicons name="stop" size={16} color="#FFF" />
            <Text style={{ color: "#FFF", fontSize: 14, fontWeight: "600" }}>Stop & Save</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Settings */}
      <Text style={[s.section, { marginTop: 32 }]}>SETTINGS</Text>
      <View style={s.noteCard}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: c.accentLight, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="globe-outline" size={18} color={c.accent} />
          </View>
          <View>
            <Text style={{ fontSize: 16, fontWeight: "600", color: c.text }}>Timezone</Text>
            <Text style={{ fontSize: 13, color: c.textSec, marginTop: 1 }}>Summaries delivered at 8:00 AM</Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: c.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: c.surfaceRaised }}>
          <Text style={{ fontSize: 15, color: c.text }}>America/Los_Angeles</Text>
          <Ionicons name="chevron-down" size={16} color={c.textMuted} />
        </View>
      </View>
      <View style={[s.noteCard, { marginTop: 10 }]}>
        <TouchableOpacity style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: c.errorLight, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="log-out-outline" size={18} color={c.error} />
          </View>
          <Text style={{ fontSize: 15, fontWeight: "500", color: c.error }}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Login */}
      <Text style={[s.section, { marginTop: 32 }]}>LOGIN</Text>
      <View style={[s.card, { padding: 24 }]}>
        <Text style={{ fontSize: 24, fontWeight: "700", letterSpacing: -0.5, color: c.text, marginBottom: 4 }}>Welcome back</Text>
        <Text style={{ fontSize: 15, color: c.textSec, marginBottom: 28 }}>Sign in to Echo</Text>

        <Text style={{ fontSize: 13, fontWeight: "600", color: c.textSec, marginBottom: 6 }}>Email</Text>
        <View style={{ flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: c.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, backgroundColor: c.surfaceRaised }}>
          <Ionicons name="mail-outline" size={18} color={c.textMuted} style={{ marginRight: 10 }} />
          <Text style={{ fontSize: 15, color: c.textMuted }}>you@example.com</Text>
        </View>

        <Text style={{ fontSize: 13, fontWeight: "600", color: c.textSec, marginBottom: 6, marginTop: 16 }}>Password</Text>
        <View style={{ flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: c.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, backgroundColor: c.surfaceRaised }}>
          <Ionicons name="lock-closed-outline" size={18} color={c.textMuted} style={{ marginRight: 10 }} />
          <Text style={{ fontSize: 15, color: c.textMuted }}>Your password</Text>
        </View>

        <TouchableOpacity style={{ backgroundColor: c.accent, borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 24 }}>
          <Text style={{ color: "#FFF", fontSize: 16, fontWeight: "600" }}>Sign In</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderColor: c.accent, borderRadius: 10, paddingVertical: 12, marginTop: 10 }}>
          <Ionicons name="sparkles-outline" size={16} color={c.accent} />
          <Text style={{ color: c.accent, fontSize: 15, fontWeight: "600" }}>Sign in with magic link</Text>
        </TouchableOpacity>
        <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 20 }}>
          <Text style={{ fontSize: 14, color: c.textSec }}>New here? </Text>
          <Text style={{ fontSize: 14, fontWeight: "600", color: c.accent }}>Create an account</Text>
        </View>
      </View>

      {/* Tab bar */}
      <Text style={[s.section, { marginTop: 32 }]}>TAB BAR</Text>
      <View style={s.tabBar}>
        {[
          { icon: "create" as const, label: "Capture", active: true },
          { icon: "documents-outline" as const, label: "Notes", active: false },
          { icon: "clipboard-outline" as const, label: "Summary", active: false },
          { icon: "settings-outline" as const, label: "Settings", active: false },
        ].map((t) => (
          <View key={t.label} style={{ alignItems: "center", gap: 3 }}>
            {t.active && <View style={{ width: 20, height: 3, borderRadius: 2, backgroundColor: c.accent, marginBottom: 2 }} />}
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
  card: { backgroundColor: c.surface, borderRadius: 12, padding: 16, ...shadow },
  input: { fontSize: 16, lineHeight: 24, minHeight: 72, textAlignVertical: "top", color: c.text },
  btn: { borderRadius: 10, paddingVertical: 12, paddingHorizontal: 24, alignItems: "center", marginTop: 12 },
  divider: { flexDirection: "row", alignItems: "center", marginVertical: 20 },
  divLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: c.border },
  divText: { marginHorizontal: 16, color: c.textMuted, fontSize: 13 },
  noteCard: { backgroundColor: c.surface, borderRadius: 12, padding: 16, marginBottom: 10, shadowColor: "#0F172A", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1 },
  noteHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  badge: { paddingVertical: 4, paddingHorizontal: 12, borderRadius: 8 },
  badgeText: { fontSize: 12, fontWeight: "600" },
  ts: { fontSize: 12, color: c.textMuted },
  noteBody: { fontSize: 15, lineHeight: 23, color: c.text },
  pill: { paddingVertical: 8, paddingHorizontal: 18, borderRadius: 24, marginRight: 8 },
  pillText: { fontSize: 14, fontWeight: "500", color: c.textSec },
  tabBar: { flexDirection: "row", justifyContent: "space-around", backgroundColor: c.surface, borderRadius: 12, paddingTop: 8, paddingBottom: 10, ...shadow },
});
