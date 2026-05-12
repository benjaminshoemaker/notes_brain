import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { LensTemplateReportReason } from "@notesbrain/shared";

import { useCommunityLenses } from "../../hooks/useCommunityLenses";
import { useLensLibrary } from "../../hooks/useLensLibrary";
import { getLensTemplateById } from "../../lib/lensLibrary";
import { testIds } from "../../lib/testIds";
import { colors, getCategoryTint, radii, shadows, spacing } from "../../lib/theme";

type PreviewSource = "curated" | "community";

const REPORT_REASONS: Array<{ value: LensTemplateReportReason; label: string }> = [
  { value: "spam", label: "Spam" },
  { value: "unsafe_prompt", label: "Unsafe prompt" },
  { value: "misleading", label: "Misleading" },
  { value: "private_information", label: "Private information" },
  { value: "impersonation", label: "Impersonation" },
  { value: "other", label: "Other" },
];

function getTemplateId(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function getSource(value: string | string[] | undefined): PreviewSource {
  const sourceValue = Array.isArray(value) ? value[0] : value;
  return sourceValue === "community" ? "community" : "curated";
}

function formatLookback(hours: number): string {
  if (hours % 24 === 0) {
    const days = hours / 24;
    return `${days} ${days === 1 ? "day" : "days"}`;
  }

  return `${hours} hours`;
}

export default function LensLibraryPreviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ templateId?: string | string[]; source?: string | string[] }>();
  const templateId = getTemplateId(params.templateId);
  const source = getSource(params.source);
  const curatedTemplate = source === "curated" && templateId ? getLensTemplateById(templateId) : null;
  const { templates, install, installMutation } = useLensLibrary();
  const communityLibrary = useCommunityLenses();
  const [showPrompt, setShowPrompt] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState<LensTemplateReportReason>("spam");
  const [reportNote, setReportNote] = useState("");
  const [reportStatus, setReportStatus] = useState<string | null>(null);
  const [unavailableMessage, setUnavailableMessage] = useState<string | null>(null);

  const curatedItem = templates.find((entry) => entry.template.template_id === templateId) ?? null;
  const communityItem =
    source === "community"
      // Community browse rows originate from community_lens_templates_public via useCommunityLenses.
      ? communityLibrary.templates.find((entry) => entry.template.template_id === templateId) ?? null
      : null;
  const template = source === "community" ? communityItem?.template ?? null : curatedTemplate;
  const installState =
    source === "community"
      ? communityItem?.installState ?? "Not installed"
      : curatedItem?.installState ?? "Not installed";
  const isInstalled = installState === "Installed";
  const categoryTint = template ? getCategoryTint(template.category) : getCategoryTint("uncategorized");
  const communityUnavailable = source === "community" && (templateId === null || !communityItem || unavailableMessage);
  const unavailableText = unavailableMessage ?? "This community lens is not available.";
  const isCommunityInstallPending = communityLibrary.install.isPending;
  const isReportPending = communityLibrary.report.isPending;

  function showInstallSuccessAlert() {
    Alert.alert("Added to My Lenses", "You can edit it anytime.", [
      {
        text: "View",
        onPress: () => {
          router.replace("/(app)/lens-manage");
        },
      },
    ]);
  }

  async function handleInstall() {
    if (!templateId || !template || isInstalled) {
      return;
    }

    try {
      if (source === "community") {
        // Community install mutation wraps the install_lens_template RPC.
        await communityLibrary.install.mutateAsync(templateId);
      } else {
        await install(template);
      }
      showInstallSuccessAlert();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Please try again.";
      if (source === "community" && message.toLowerCase().includes("not available")) {
        setUnavailableMessage("This community lens is no longer available.");
      } else {
        Alert.alert("Couldn't add lens", message);
      }
    }
  }

  async function handleReport() {
    if (!templateId || source !== "community") {
      return;
    }

    try {
      // Community report mutation wraps the report_lens_template RPC.
      await communityLibrary.report.mutateAsync({
        templateId,
        reason: reportReason,
        note: reportNote.trim() || null,
      });
      setReportStatus("Thanks. Your report was submitted.");
      setShowReport(false);
      setReportNote("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Please try again.";
      if (message.toLowerCase().includes("not available")) {
        setUnavailableMessage("This community lens is no longer available.");
      } else {
        setReportStatus(message);
      }
    }
  }

  return (
    <ScrollView
      testID={testIds.lens.preview.screen}
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Stack.Screen
        options={{
          title: "Preview Lens",
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
        }}
      />

      {template && !communityUnavailable ? (
        <>
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons name="sparkles-outline" size={24} color={colors.accent} />
            </View>
            <Text style={styles.title}>{template.name}</Text>
            <Text style={styles.description}>{template.description}</Text>
            {source === "community" && communityItem ? (
              <Text style={styles.authorText}>by {communityItem.row.author_display_name}</Text>
            ) : null}
            {isInstalled ? (
              <View style={[styles.badge, styles.installedBadge]}>
                <Text style={[styles.badgeText, styles.installedBadgeText]}>Installed</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What it looks for</Text>
            <Text style={styles.bodyText}>{template.focus}</Text>
          </View>

          {template.example_output ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Example result</Text>
              <Text style={styles.bodyText}>{template.example_output}</Text>
            </View>
          ) : null}

          <View style={styles.metaGrid}>
            <View style={styles.metaCard}>
              <Text style={styles.metaLabel}>Cadence</Text>
              <Text style={styles.metaValue}>{template.schedule_type}</Text>
            </View>
            <View style={styles.metaCard}>
              <Text style={styles.metaLabel}>Lookback</Text>
              <Text style={styles.metaValue}>{formatLookback(template.lookback_hours)}</Text>
            </View>
            <View style={styles.metaCard}>
              <Text style={styles.metaLabel}>Category</Text>
              <View style={[styles.badge, { backgroundColor: categoryTint.bg }]}>
                <Text style={[styles.badgeText, { color: categoryTint.text }]}>
                  {template.category}
                </Text>
              </View>
            </View>
          </View>

          {template.categories ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Categories</Text>
              <Text style={styles.bodyText}>{template.categories.join(", ")}</Text>
            </View>
          ) : (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Categories</Text>
              <Text style={styles.bodyText}>All categories</Text>
            </View>
          )}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={showPrompt ? "Hide prompt details" : "Show prompt details"}
            accessibilityState={{ expanded: showPrompt }}
            onPress={() => setShowPrompt((current) => !current)}
            style={styles.promptToggle}
          >
            <Text style={styles.promptToggleText}>Prompt details</Text>
            <Ionicons
              name={showPrompt ? "chevron-up" : "chevron-down"}
              size={18}
              color={colors.textSecondary}
            />
          </Pressable>
          {showPrompt ? (
            <View testID={testIds.lens.preview.promptDetails} style={styles.promptBox}>
              <Text style={styles.promptText}>{template.prompt}</Text>
            </View>
          ) : null}

          {source === "community" ? (
            <View style={styles.section}>
              <Pressable
                testID={testIds.lens.preview.reportButton}
                accessibilityRole="button"
                accessibilityLabel={showReport ? "Hide report form" : "Report this community lens"}
                accessibilityState={{ expanded: showReport }}
                onPress={() => setShowReport((current) => !current)}
                style={styles.reportToggle}
              >
                <Text style={styles.reportToggleText}>Report community lens</Text>
                <Ionicons
                  name={showReport ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={colors.textSecondary}
                />
              </Pressable>

              {showReport ? (
                <View style={styles.reportPanel}>
                  <Text style={styles.reportLabel}>Reason</Text>
                  <View style={styles.reasonRow}>
                    {REPORT_REASONS.map((reason) => {
                      const selected = reportReason === reason.value;
                      return (
                        <Pressable
                          key={reason.value}
                          testID={testIds.lens.preview.reportReasonOption(reason.value)}
                          accessibilityRole="button"
                          accessibilityLabel={`Report reason ${reason.label}`}
                          accessibilityState={{ selected }}
                          onPress={() => setReportReason(reason.value)}
                          style={[styles.reasonPill, selected && styles.reasonPillSelected]}
                        >
                          <Text style={[styles.reasonPillText, selected && styles.reasonPillTextSelected]}>
                            {reason.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <Text style={styles.reportLabel}>Optional note</Text>
                  <TextInput
                    testID={testIds.lens.preview.reportNoteInput}
                    accessibilityLabel="Report note"
                    style={styles.reportNoteInput}
                    value={reportNote}
                    onChangeText={setReportNote}
                    placeholder="Explain what should be reviewed."
                    placeholderTextColor={colors.textMuted}
                    multiline
                    textAlignVertical="top"
                    maxLength={280}
                  />
                  <Text style={styles.reportNoteMeta}>{reportNote.length}/280</Text>
                </View>
              ) : null}

              {showReport ? (
                <Pressable
                  testID={testIds.lens.preview.reportSubmitButton}
                  accessibilityRole="button"
                  accessibilityLabel="Submit community lens report"
                  accessibilityState={{ disabled: isReportPending }}
                  disabled={isReportPending}
                  onPress={() => {
                    void handleReport();
                  }}
                  style={[styles.reportSubmitButton, isReportPending && styles.disabledButton]}
                >
                  {isReportPending ? (
                    <ActivityIndicator color={colors.textInverse} size="small" />
                  ) : (
                    <Text style={styles.reportSubmitText}>Submit Report</Text>
                  )}
                </Pressable>
              ) : null}
              <Text style={styles.reportHelpText}>Reports are anonymous to the author.</Text>
              {reportStatus ? <Text style={styles.reportStatus}>{reportStatus}</Text> : null}
            </View>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isInstalled ? "Lens already installed" : `Add ${template.name} to my lenses`}
            accessibilityState={{
              disabled: isInstalled || (source === "community" ? isCommunityInstallPending : installMutation.isPending),
            }}
            disabled={isInstalled || (source === "community" ? isCommunityInstallPending : installMutation.isPending)}
            testID={testIds.lens.preview.installButton}
            onPress={() => {
              void handleInstall();
            }}
            style={[
              styles.installButton,
              (isInstalled || (source === "community" ? isCommunityInstallPending : installMutation.isPending)) &&
                styles.disabledButton,
            ]}
          >
            {(source === "community" ? isCommunityInstallPending : installMutation.isPending) ? (
              <ActivityIndicator color={colors.textInverse} size="small" />
            ) : (
              <Text style={styles.installButtonText}>
                {isInstalled ? "Installed" : "Add to My Lenses"}
              </Text>
            )}
          </Pressable>
        </>
      ) : (
        <View testID={testIds.lens.preview.unavailableState} style={styles.header}>
          <Text style={styles.title}>{source === "community" ? "Community lens unavailable" : "Lens not found"}</Text>
          <Text style={styles.description}>
            {source === "community" ? unavailableText : "This library lens is not available."}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  header: {
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accentLight,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    textAlign: "center",
  },
  authorText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  section: {
    gap: spacing.xs,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    ...shadows.sm,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
  },
  metaGrid: {
    gap: spacing.sm,
  },
  metaCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    ...shadows.sm,
  },
  metaLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    textTransform: "capitalize",
  },
  badge: {
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  installedBadge: {
    backgroundColor: colors.successLight,
  },
  installedBadgeText: {
    color: colors.success,
  },
  promptToggle: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  promptToggleText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  promptBox: {
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
  promptText: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  installButton: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.md,
    backgroundColor: colors.accent,
    ...shadows.sm,
  },
  installButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textInverse,
  },
  disabledButton: {
    opacity: 0.6,
  },
  reportToggle: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: radii.md,
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  reportToggleText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  reportPanel: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  reportLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  reasonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  reasonPill: {
    minHeight: 38,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },
  reasonPillSelected: {
    backgroundColor: colors.accentLight,
  },
  reasonPillText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  reasonPillTextSelected: {
    color: colors.accent,
  },
  reportNoteInput: {
    minHeight: 92,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 13,
    color: colors.textSecondary,
  },
  reportNoteMeta: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: "right",
  },
  reportSubmitButton: {
    minHeight: 46,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accent,
  },
  reportSubmitText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textInverse,
  },
  reportHelpText: {
    marginTop: spacing.sm,
    fontSize: 12,
    color: colors.textSecondary,
  },
  reportStatus: {
    marginTop: spacing.xs,
    fontSize: 13,
    color: colors.textSecondary,
  },
});
