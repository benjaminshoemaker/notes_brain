import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Picker } from "@react-native-picker/picker";
import { Ionicons } from "@expo/vector-icons";
import { CATEGORIES, type Lens, type LensScheduleType } from "@notesbrain/shared";

import { LoadingSpinner } from "../../components/LoadingSpinner";
import { useLenses } from "../../hooks/useLenses";
import { colors, radii, shadows, spacing } from "../../lib/theme";

const lensFormTestIds = {
  screen: "lens-form-screen",
  nameInput: "lens-form-name-input",
  promptInput: "lens-form-prompt-input",
  saveButton: "lens-form-save-button",
} as const;

const DAY_OPTIONS = [
  { label: "Sun", value: 0 },
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
] as const;

const LOOKBACK_OPTIONS = [
  { label: "Last 24 hours", value: 24 },
  { label: "Last 48 hours", value: 48 },
  { label: "Last 7 days", value: 168 },
  { label: "Last 14 days", value: 336 },
  { label: "Last 30 days", value: 720 },
] as const;

function getLensId(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function formatTimeValue(value: string | null | undefined): string {
  if (!value) {
    return "08:00";
  }

  const match = value.match(/^(\d{2}:\d{2})/);
  return match?.[1] ?? value.slice(0, 5);
}

function normalizeTimeInput(value: string): string {
  const clean = value.replace(/[^\d:]/g, "");

  if (clean.includes(":")) {
    return clean.slice(0, 5);
  }

  const digits = clean.slice(0, 4);
  if (digits.length <= 2) {
    return digits;
  }

  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

function isValidTime(value: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

function formatCategoryLabel(category: string): string {
  return category
    .split(/[_-]/g)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function hydrateFromLens(lens: Lens) {
  return {
    name: lens.name,
    prompt: lens.prompt,
    scheduleType: lens.schedule_type,
    scheduleTime: formatTimeValue(lens.schedule_time),
    scheduleDay: lens.schedule_day ?? 1,
    lookbackHours: lens.lookback_hours,
    selectedCategories: lens.categories ?? [],
  };
}

export default function LensFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ lensId?: string | string[] }>();
  const lensId = getLensId(params.lensId);
  const isEditMode = Boolean(lensId);
  const { data: lenses = [], isLoading, error, create, update } = useLenses();

  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [scheduleType, setScheduleType] = useState<LensScheduleType>("daily");
  const [scheduleTime, setScheduleTime] = useState("08:00");
  const [scheduleDay, setScheduleDay] = useState(1);
  const [lookbackHours, setLookbackHours] = useState(24);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [didHydrateEditForm, setDidHydrateEditForm] = useState(false);

  const lens = useMemo(
    () => lenses.find((item) => item.id === lensId) ?? null,
    [lensId, lenses]
  );

  useEffect(() => {
    if (!isEditMode || !lens || didHydrateEditForm) {
      return;
    }

    const nextState = hydrateFromLens(lens);
    setName(nextState.name);
    setPrompt(nextState.prompt);
    setScheduleType(nextState.scheduleType);
    setScheduleTime(nextState.scheduleTime);
    setScheduleDay(nextState.scheduleDay);
    setLookbackHours(nextState.lookbackHours);
    setSelectedCategories(nextState.selectedCategories);
    setDidHydrateEditForm(true);
  }, [didHydrateEditForm, isEditMode, lens]);

  const promptLength = prompt.length;
  const promptIsValid = promptLength >= 20 && promptLength <= 2000;
  const timeIsValid = isValidTime(scheduleTime);
  const isSaving = create.isPending || update.isPending;
  const editLensMissing = isEditMode && !isLoading && !lens;
  const canSave =
    !isSaving &&
    name.trim().length > 0 &&
    promptIsValid &&
    timeIsValid &&
    !editLensMissing;

  function toggleCategory(category: string) {
    setSelectedCategories((current) => {
      if (current.includes(category)) {
        return current.filter((value) => value !== category);
      }

      return [...current, category];
    });
  }

  async function handleSave() {
    if (!canSave) {
      return;
    }

    const payload = {
      name: name.trim(),
      prompt,
      schedule_type: scheduleType,
      schedule_time: scheduleTime,
      schedule_day: scheduleType === "weekly" ? scheduleDay : null,
      lookback_hours: lookbackHours,
      categories: selectedCategories.length > 0 ? selectedCategories : null,
    };

    try {
      if (isEditMode && lensId) {
        await update.mutateAsync({
          id: lensId,
          ...payload,
        });
      } else {
        await create.mutateAsync(payload);
      }

      router.back();
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Please try again.";
      Alert.alert("Couldn't save lens", message);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 24 : 0}
    >
      <Stack.Screen
        options={{
          title: isEditMode ? "Edit Lens" : "New Lens",
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
        }}
      />

      {isEditMode && isLoading && !didHydrateEditForm ? (
        <LoadingSpinner label="Loading lens..." />
      ) : (
        <ScrollView
          testID={lensFormTestIds.screen}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {error ? (
            <View style={[styles.section, styles.statusSection]}>
              <Text style={styles.errorText}>
                We couldn't load your saved lenses right now.
              </Text>
            </View>
          ) : null}

          {editLensMissing ? (
            <View style={[styles.section, styles.statusSection]}>
              <Text style={styles.errorText}>This lens could not be found.</Text>
            </View>
          ) : null}

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.iconCircle}>
                <Ionicons name="create-outline" size={18} color={colors.accent} />
              </View>
              <View style={styles.sectionHeaderText}>
                <Text style={styles.sectionTitle}>Lens Details</Text>
                <Text style={styles.sectionHelper}>
                  Give this lens a clear name and a prompt with enough detail to guide the summary.
                </Text>
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Name</Text>
              <TextInput
                testID={lensFormTestIds.nameInput}
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Weekly Health Check"
                placeholderTextColor={colors.textMuted}
                editable={!isSaving}
                maxLength={120}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Prompt</Text>
              <TextInput
                testID={lensFormTestIds.promptInput}
                style={[styles.input, styles.promptInput]}
                value={prompt}
                onChangeText={setPrompt}
                placeholder="Summarize my health notes. Spot trends in sleep, exercise, and mood."
                placeholderTextColor={colors.textMuted}
                multiline
                textAlignVertical="top"
                editable={!isSaving}
                maxLength={2000}
              />
              <View style={styles.promptMetaRow}>
                <Text style={[styles.helperText, !promptIsValid && styles.errorText]}>
                  Prompt must be between 20 and 2000 characters.
                </Text>
                <Text style={[styles.counterText, !promptIsValid && styles.errorText]}>
                  {promptLength}/2000
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.iconCircle}>
                <Ionicons name="time-outline" size={18} color={colors.accent} />
              </View>
              <View style={styles.sectionHeaderText}>
                <Text style={styles.sectionTitle}>Schedule</Text>
                <Text style={styles.sectionHelper}>
                  Choose a cadence, then set a delivery time for the insight to run.
                </Text>
              </View>
            </View>

            <Text style={styles.fieldLabel}>Frequency</Text>
            <View style={styles.segmentRow}>
              {(["daily", "weekly"] as const).map((option) => {
                const selected = scheduleType === option;
                return (
                  <Pressable
                    key={option}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => {
                      setScheduleType(option);
                    }}
                    style={[styles.segmentButton, selected && styles.segmentButtonSelected]}
                  >
                    <Text
                      style={[
                        styles.segmentButtonText,
                        selected && styles.segmentButtonTextSelected,
                      ]}
                    >
                      {option === "daily" ? "Daily" : "Weekly"}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {scheduleType === "weekly" ? (
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Day</Text>
                <View style={styles.pillWrap}>
                  {DAY_OPTIONS.map((option) => {
                    const selected = scheduleDay === option.value;
                    return (
                      <Pressable
                        key={option.value}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        onPress={() => {
                          setScheduleDay(option.value);
                        }}
                        style={[styles.pill, selected && styles.pillSelected]}
                      >
                        <Text
                          style={[styles.pillText, selected && styles.pillTextSelected]}
                        >
                          {option.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Time</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setShowTimePicker((current) => !current);
                }}
                style={styles.timeDisplay}
              >
                <View style={styles.timeDisplayContent}>
                  <Ionicons name="alarm-outline" size={18} color={colors.textSecondary} />
                  <Text style={styles.timeDisplayText}>
                    {timeIsValid ? scheduleTime : "Enter time"}
                  </Text>
                </View>
                <Ionicons
                  name={showTimePicker ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={colors.textMuted}
                />
              </Pressable>

              {showTimePicker ? (
                <TextInput
                  style={styles.input}
                  value={scheduleTime}
                  onChangeText={(value) => {
                    setScheduleTime(normalizeTimeInput(value));
                  }}
                  onBlur={() => {
                    setShowTimePicker(false);
                  }}
                  placeholder="08:00"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numbers-and-punctuation"
                  autoCapitalize="none"
                  editable={!isSaving}
                  maxLength={5}
                />
              ) : null}

              <Text style={[styles.helperText, !timeIsValid && styles.errorText]}>
                Use 24-hour HH:MM format.
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.iconCircle}>
                <Ionicons name="funnel-outline" size={18} color={colors.accent} />
              </View>
              <View style={styles.sectionHeaderText}>
                <Text style={styles.sectionTitle}>Filters</Text>
                <Text style={styles.sectionHelper}>
                  Narrow the notes this lens should analyze, or leave categories empty for everything.
                </Text>
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Categories</Text>
              <View style={styles.pillWrap}>
                {CATEGORIES.map((category) => {
                  const selected = selectedCategories.includes(category);
                  return (
                    <Pressable
                      key={category}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => {
                        toggleCategory(category);
                      }}
                      style={[styles.pill, selected && styles.pillSelected]}
                    >
                      <Text style={[styles.pillText, selected && styles.pillTextSelected]}>
                        {formatCategoryLabel(category)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={styles.helperText}>
                No categories selected means all categories.
              </Text>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Lookback Window</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  enabled={!isSaving}
                  selectedValue={lookbackHours}
                  onValueChange={(value) => {
                    setLookbackHours(Number(value));
                  }}
                  dropdownIconColor={colors.textSecondary}
                  style={styles.picker}
                >
                  {LOOKBACK_OPTIONS.map((option) => (
                    <Picker.Item
                      key={option.value}
                      label={option.label}
                      value={option.value}
                    />
                  ))}
                </Picker>
              </View>
            </View>
          </View>

          <TouchableOpacity
            testID={lensFormTestIds.saveButton}
            accessibilityRole="button"
            accessibilityLabel={isEditMode ? "Save lens changes" : "Save lens"}
            accessibilityState={{ disabled: !canSave }}
            style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
            onPress={() => {
              void handleSave();
            }}
            disabled={!canSave}
          >
            {isSaving ? (
              <ActivityIndicator color={colors.textInverse} />
            ) : (
              <Text style={styles.saveButtonText}>
                {isEditMode ? "Save Changes" : "Save Lens"}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.sm,
  },
  statusSection: {
    paddingVertical: spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  sectionHeaderText: {
    flex: 1,
    gap: spacing.xs,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: radii.lg,
    backgroundColor: colors.accentLight,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  sectionHelper: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  fieldGroup: {
    gap: spacing.sm,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.text,
  },
  promptInput: {
    minHeight: 160,
    textAlignVertical: "top",
  },
  promptMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
  },
  helperText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  counterText: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.textMuted,
  },
  errorText: {
    color: colors.error,
  },
  segmentRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  segmentButton: {
    flex: 1,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  segmentButtonSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentLight,
  },
  segmentButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  segmentButtonTextSelected: {
    color: colors.accent,
  },
  pillWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  pill: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  pillSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentLight,
  },
  pillText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  pillTextSelected: {
    color: colors.accent,
  },
  timeDisplay: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
  },
  timeDisplayContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  timeDisplayText: {
    fontSize: 16,
    color: colors.text,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    minHeight: Platform.OS === "android" ? 52 : 48,
    justifyContent: "center",
  },
  picker: {
    width: "100%",
    height: Platform.OS === "android" ? 52 : 48,
    color: colors.text,
  },
  saveButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.sm,
  },
  saveButtonDisabled: {
    backgroundColor: colors.border,
  },
  saveButtonText: {
    color: colors.textInverse,
    fontSize: 16,
    fontWeight: "600",
  },
});
