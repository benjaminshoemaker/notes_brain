import { useState, useMemo, useCallback, useEffect } from "react";
import {
  RecordingPresets,
  type RecordingStatus,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { MAX_VOICE_SECONDS } from "@notesbrain/shared";

type RecordingState = {
  isRecording: boolean;
  isPaused: boolean;
  durationMs: number;
  uri: string | null;
  error: string | null;
};

type UseVoiceRecordingResult = {
  state: RecordingState;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>;
  cancelRecording: () => Promise<void>;
  formatDuration: (ms: number) => string;
};

export function useVoiceRecording(): UseVoiceRecordingResult {
  const [state, setState] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    durationMs: 0,
    uri: null,
    error: null,
  });

  const recordingOptions = useMemo(
    () => ({
      ...RecordingPresets.HIGH_QUALITY,
      numberOfChannels: 1,
    }),
    []
  );

  const handleStatusUpdate = useCallback((status: RecordingStatus) => {
    if (status.hasError) {
      setState((prev) => ({
        ...prev,
        isRecording: false,
        isPaused: false,
        error: status.error ?? "Recording failed",
      }));
    }

    if (status.isFinished) {
      setState((prev) => ({
        ...prev,
        isRecording: false,
        isPaused: false,
        uri: status.url ?? prev.uri,
      }));
      setAudioModeAsync({ allowsRecording: false }).catch(() => {});
    }
  }, []);

  const recorder = useAudioRecorder(recordingOptions, handleStatusUpdate);

  const recorderState = useAudioRecorderState(recorder, 100);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recorder.isRecording) {
        recorder.stop().catch(() => {});
      }
    };
  }, [recorder]);

  // Keep durationMs synced while recording
  useEffect(() => {
    if (!state.isRecording) return;

    setState((prev) => ({ ...prev, durationMs: recorderState.durationMillis }));
  }, [recorderState.durationMillis, state.isRecording]);

  const startRecording = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, error: null }));

      // Request permissions
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        setState((prev) => ({
          ...prev,
          error: "Microphone permission is required to record voice notes.",
        }));
        return;
      }

      // Configure audio mode
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      // Prepare and start recording
      await recorder.prepareToRecordAsync();
      recorder.record({ forDuration: MAX_VOICE_SECONDS });

      setState((prev) => ({
        ...prev,
        isRecording: true,
        isPaused: false,
        durationMs: 0,
        uri: null,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to start recording";
      setState((prev) => ({ ...prev, error: message }));
    }
  }, [recorder]);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    if (!recorder.isRecording) {
      return null;
    }

    try {
      await recorder.stop();
      const uri = recorder.uri;

      // Reset audio mode
      await setAudioModeAsync({ allowsRecording: false });

      setState((prev) => ({
        ...prev,
        isRecording: false,
        isPaused: false,
        uri,
      }));

      return uri;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to stop recording";
      setState((prev) => ({
        ...prev,
        isRecording: false,
        error: message,
      }));
      return null;
    }
  }, [recorder]);

  const cancelRecording = useCallback(async () => {
    if (recorder.isRecording) {
      try {
        await recorder.stop();
      } catch {
        // Ignore errors during cancel
      }
    }

    await setAudioModeAsync({ allowsRecording: false });

    setState({
      isRecording: false,
      isPaused: false,
      durationMs: 0,
      uri: null,
      error: null,
    });
  }, [recorder]);

  const formatDuration = useCallback((ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }, []);

  return {
    state,
    startRecording,
    stopRecording,
    cancelRecording,
    formatDuration,
  };
}
