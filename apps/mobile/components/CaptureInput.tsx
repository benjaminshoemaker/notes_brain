import { useState, useRef, useEffect } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Keyboard,
  ActivityIndicator,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { MAX_VOICE_SECONDS } from "@notesbrain/shared";

import { testIds } from "../lib/testIds";
import { colors, radii, shadows, spacing } from "../lib/theme";
import { useVoiceRecording } from "../hooks/useVoiceRecording";

type CaptureInputProps = {
  onSubmit: (content: string) => Promise<void>;
  onVoiceRecordingComplete: (uri: string) => Promise<void>;
  isSubmitting: boolean;
  isVoiceUploading?: boolean;
  autoFocus?: boolean;
};

const MAX_DURATION_MS = MAX_VOICE_SECONDS * 1000;

export function CaptureInput({
  onSubmit,
  onVoiceRecordingComplete,
  isSubmitting,
  isVoiceUploading = false,
  autoFocus = true,
}: CaptureInputProps) {
  const [content, setContent] = useState("");
  const inputRef = useRef<TextInput>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const { state, startRecording, stopRecording, cancelRecording, formatDuration } =
    useVoiceRecording();

  useEffect(() => {
    if (autoFocus) {
      // Small delay to ensure the component is mounted
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [autoFocus]);

  useEffect(() => {
    if (!state.isRecording) {
      pulseAnim.setValue(1);
      return undefined;
    }

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim, state.isRecording]);

  async function handleSubmit() {
    const trimmedContent = content.trim();
    if (!trimmedContent || isSubmitting) return;

    await onSubmit(trimmedContent);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Haptics can fail on unsupported devices; submission should still succeed.
    }
    setContent("");
    Keyboard.dismiss();
  }

  function handleSubmitEditing() {
    handleSubmit();
  }

  async function handleStartRecording() {
    if (isSubmitting || isVoiceUploading || state.isRecording) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // Haptics can fail on unsupported devices; recording should still start.
    }
    Keyboard.dismiss();
    await startRecording();
  }

  async function handleStopAndSave() {
    if (isVoiceUploading) return;

    const uri = await stopRecording();
    if (!uri) return;

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Haptics can fail on unsupported devices; upload should still continue.
    }
    await onVoiceRecordingComplete(uri);
  }

  const isBusy = isSubmitting || isVoiceUploading;
  const canSubmit = content.trim().length > 0 && !isBusy;
  const progress = Math.min(state.durationMs / MAX_DURATION_MS, 1);
  const remainingSeconds = Math.max(0, MAX_VOICE_SECONDS - Math.floor(state.durationMs / 1000));

  return (
    <View style={styles.container}>
      {state.isRecording ? (
        <View
          style={styles.recordingPanel}
          accessibilityLabel={`Recording in progress, ${formatDuration(state.durationMs)}, ${remainingSeconds} seconds remaining`}
        >
          <View style={styles.recordingHeader}>
            <View style={styles.timerRow}>
              <Animated.View style={[styles.recordingIndicator, { opacity: pulseAnim }]} />
              <Text style={styles.timerText}>{formatDuration(state.durationMs)}</Text>
            </View>
            <Text style={styles.remainingText}>
              {remainingSeconds < 60 ? `${remainingSeconds}s left` : ""}
            </Text>
          </View>

          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>

          <View style={styles.recordingActions}>
            <TouchableOpacity
              testID={testIds.capture.voiceCancelButton}
              accessibilityRole="button"
              accessibilityLabel="Cancel recording"
              style={styles.cancelButton}
              onPress={cancelRecording}
              disabled={isVoiceUploading}
            >
              <Ionicons name="close" size={18} color={colors.textSecondary} />
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              testID={testIds.capture.voiceStopButton}
              accessibilityRole="button"
              accessibilityLabel="Stop recording and save"
              style={[styles.stopButton, isVoiceUploading && styles.buttonDisabled]}
              onPress={handleStopAndSave}
              disabled={isVoiceUploading}
            >
              {isVoiceUploading ? (
                <ActivityIndicator color={colors.textInverse} size="small" />
              ) : (
                <>
                  <Ionicons name="stop" size={16} color={colors.textInverse} />
                  <Text style={styles.stopButtonText}>Stop & Save</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <>
          <View style={styles.composerHeader}>
            <Ionicons name="create-outline" size={18} color={colors.accent} />
            <Text style={styles.composerTitle}>Quick capture</Text>
          </View>
          <TextInput
            ref={inputRef}
            testID={testIds.capture.textInput}
            style={styles.input}
            value={content}
            onChangeText={setContent}
            placeholder="Type a thought, task, link, or idea..."
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={5000}
            editable={!isBusy}
            onSubmitEditing={handleSubmitEditing}
            blurOnSubmit={false}
            returnKeyType="send"
          />
          <View style={styles.actionRow}>
            <TouchableOpacity
              testID={testIds.capture.voiceStartButton}
              accessibilityRole="button"
              accessibilityLabel="Record voice note"
              accessibilityState={{ disabled: isBusy }}
              style={[styles.micButton, isBusy && styles.buttonDisabled]}
              onPress={handleStartRecording}
              disabled={isBusy}
            >
              <Ionicons name="mic-outline" size={20} color={colors.accent} />
            </TouchableOpacity>

            <TouchableOpacity
              testID={testIds.capture.submitButton}
              accessibilityRole="button"
              accessibilityLabel="Save note"
              accessibilityState={{ disabled: !canSubmit }}
              style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={!canSubmit}
            >
              {isSubmitting ? (
                <ActivityIndicator color={colors.textInverse} size="small" />
              ) : (
                <Text
                  style={[styles.submitButtonText, !canSubmit && styles.submitButtonTextDisabled]}
                >
                  Save
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}

      {state.error && <Text style={styles.errorText}>{state.error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: 12,
    ...shadows.md,
  },
  composerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  composerTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  input: {
    fontSize: 16,
    lineHeight: 23,
    minHeight: 92,
    maxHeight: 200,
    textAlignVertical: "top",
    color: colors.text,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  micButton: {
    width: 48,
    height: 48,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accentLight,
  },
  submitButton: {
    minWidth: 88,
    minHeight: 48,
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonDisabled: {
    backgroundColor: colors.surfaceRaised,
  },
  submitButtonText: {
    color: colors.textInverse,
    fontSize: 14,
    fontWeight: "600",
  },
  submitButtonTextDisabled: {
    color: colors.textMuted,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  recordingPanel: {
    padding: 14,
    backgroundColor: colors.accentLight,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  recordingHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  timerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  recordingIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.error,
  },
  timerText: {
    fontSize: 26,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    color: colors.text,
  },
  remainingText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  progressBar: {
    height: 5,
    backgroundColor: colors.border,
    borderRadius: radii.sm,
    overflow: "hidden",
    marginBottom: 14,
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.accent,
  },
  recordingActions: {
    flexDirection: "row",
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },
  stopButton: {
    flex: 1,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.error,
  },
  stopButtonText: {
    color: colors.textInverse,
    fontSize: 14,
    fontWeight: "600",
  },
  errorText: {
    marginTop: 10,
    color: colors.error,
    fontSize: 13,
    lineHeight: 18,
  },
});
