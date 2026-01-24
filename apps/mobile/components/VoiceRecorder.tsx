import { View, TouchableOpacity, Text, StyleSheet, ActivityIndicator } from "react-native";
import { MAX_VOICE_SECONDS } from "@notesbrain/shared";

import { useVoiceRecording } from "../hooks/useVoiceRecording";

type VoiceRecorderProps = {
  onRecordingComplete: (uri: string) => Promise<void>;
  isUploading: boolean;
};

const MAX_DURATION_MS = MAX_VOICE_SECONDS * 1000;

export function VoiceRecorder({ onRecordingComplete, isUploading }: VoiceRecorderProps) {
  const { state, startRecording, stopRecording, cancelRecording, formatDuration } =
    useVoiceRecording();

  async function handleStopAndSave() {
    const uri = await stopRecording();
    if (uri) {
      await onRecordingComplete(uri);
    }
  }

  // Calculate progress percentage for the timer
  const progress = Math.min(state.durationMs / MAX_DURATION_MS, 1);
  const remainingSeconds = Math.max(0, MAX_VOICE_SECONDS - Math.floor(state.durationMs / 1000));

  if (state.isRecording) {
    return (
      <View style={styles.recordingContainer}>
        <View style={styles.timerContainer}>
          <View style={styles.recordingIndicator} />
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
            style={styles.cancelButton}
            onPress={cancelRecording}
            disabled={isUploading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.stopButton, isUploading && styles.buttonDisabled]}
            onPress={handleStopAndSave}
            disabled={isUploading}
          >
            {isUploading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.stopButtonText}>Stop & Save</Text>
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
        style={[styles.micButton, isUploading && styles.buttonDisabled]}
        onPress={startRecording}
        disabled={isUploading}
      >
        <Text style={styles.micIcon}>🎤</Text>
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
    backgroundColor: "#0066cc",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 30,
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  micIcon: {
    fontSize: 20,
  },
  micText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  hintText: {
    marginTop: 8,
    fontSize: 12,
    color: "#666666",
  },
  recordingContainer: {
    padding: 16,
    backgroundColor: "#fff5f5",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ffcccc",
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
    backgroundColor: "#ef4444",
  },
  timerText: {
    fontSize: 32,
    fontWeight: "bold",
    fontVariant: ["tabular-nums"],
    color: "#1a1a1a",
  },
  remainingText: {
    fontSize: 14,
    color: "#666666",
  },
  progressBar: {
    height: 4,
    backgroundColor: "#e5e5e5",
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 16,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#ef4444",
  },
  recordingActions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cccccc",
    backgroundColor: "#ffffff",
  },
  cancelButtonText: {
    color: "#666666",
    fontSize: 16,
    fontWeight: "600",
  },
  stopButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: "#ef4444",
  },
  stopButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  errorText: {
    marginTop: 12,
    color: "#ef4444",
    fontSize: 14,
    textAlign: "center",
  },
});
