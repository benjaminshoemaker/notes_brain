import { useEffect, useRef } from "react";
import { View, TouchableOpacity, Text, StyleSheet, ActivityIndicator, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { MAX_VOICE_SECONDS } from "@notesbrain/shared";

import { useVoiceRecording } from "../hooks/useVoiceRecording";
import { testIds } from "../lib/testIds";
import { colors, radii, shadows } from "../lib/theme";

type VoiceRecorderProps = {
  onRecordingComplete: (uri: string) => Promise<void>;
  isUploading: boolean;
};

const MAX_DURATION_MS = MAX_VOICE_SECONDS * 1000;

export function VoiceRecorder({ onRecordingComplete, isUploading }: VoiceRecorderProps) {
  const { state, startRecording, stopRecording, cancelRecording, formatDuration } =
    useVoiceRecording();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (state.isRecording) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.3, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [state.isRecording, pulseAnim]);

  async function handleStart() {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // Ignore haptics failures (e.g. simulator/device without haptics).
    }
    await startRecording();
  }

  async function handleStopAndSave() {
    const uri = await stopRecording();
    if (uri) {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        // Ignore haptics failures (e.g. simulator/device without haptics).
      }
      await onRecordingComplete(uri);
    }
  }

  // Calculate progress percentage for the timer
  const progress = Math.min(state.durationMs / MAX_DURATION_MS, 1);
  const remainingSeconds = Math.max(0, MAX_VOICE_SECONDS - Math.floor(state.durationMs / 1000));

  if (state.isRecording) {
    return (
      <View style={styles.recordingContainer} accessibilityLabel={`Recording in progress, ${formatDuration(state.durationMs)}, ${remainingSeconds} seconds remaining`}>
        <View style={styles.timerContainer}>
          <Animated.View style={[styles.recordingIndicator, { opacity: pulseAnim }]} />
          <Text style={styles.timerText}>{formatDuration(state.durationMs)}</Text>
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
            disabled={isUploading}
          >
            <Ionicons name="close" size={18} color={colors.textSecondary} />
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            testID={testIds.capture.voiceStopButton}
            accessibilityRole="button"
            accessibilityLabel="Stop recording and save"
            style={[styles.stopButton, isUploading && styles.buttonDisabled]}
            onPress={handleStopAndSave}
            disabled={isUploading}
          >
            {isUploading ? (
              <ActivityIndicator color={colors.textInverse} size="small" />
            ) : (
              <>
                <Ionicons name="stop" size={16} color={colors.textInverse} />
                <Text style={styles.stopButtonText}>Stop & Save</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {state.error && <Text style={styles.errorText}>{state.error}</Text>}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        testID={testIds.capture.voiceStartButton}
        accessibilityRole="button"
        accessibilityLabel="Record voice note"
        style={[styles.micButton, isUploading && styles.buttonDisabled]}
        onPress={handleStart}
        disabled={isUploading}
      >
        <Ionicons name="mic-outline" size={20} color={colors.textInverse} />
        <Text style={styles.micText}>Record Voice Note</Text>
      </TouchableOpacity>

      <Text style={styles.hintText}>Max {MAX_VOICE_SECONDS / 60} minutes</Text>

      {state.error && <Text style={styles.errorText}>{state.error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    padding: 16,
  },
  micButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.accent,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: radii.md,
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  micText: {
    color: colors.textInverse,
    fontSize: 16,
    fontWeight: "600",
  },
  hintText: {
    marginTop: 8,
    fontSize: 12,
    color: colors.textMuted,
  },
  recordingContainer: {
    padding: 16,
    backgroundColor: colors.accentLight,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  timerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginBottom: 12,
  },
  recordingIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.error,
  },
  timerText: {
    fontSize: 32,
    fontWeight: "bold",
    fontVariant: ["tabular-nums"],
    color: colors.text,
  },
  remainingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 20,
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.accent,
  },
  recordingActions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
  },
  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: "600",
  },
  stopButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: radii.md,
    backgroundColor: colors.error,
  },
  stopButtonText: {
    color: colors.textInverse,
    fontSize: 16,
    fontWeight: "600",
  },
  errorText: {
    marginTop: 12,
    color: colors.error,
    fontSize: 14,
    textAlign: "center",
  },
});
