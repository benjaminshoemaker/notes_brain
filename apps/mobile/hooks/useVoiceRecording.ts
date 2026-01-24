import { useState, useRef, useCallback, useEffect } from "react";
import { Audio } from "expo-av";
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

const MAX_DURATION_MS = MAX_VOICE_SECONDS * 1000;

export function useVoiceRecording(): UseVoiceRecordingResult {
  const [state, setState] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    durationMs: 0,
    uri: null,
    error: null,
  });

  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, error: null }));

      // Request permissions
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        setState((prev) => ({
          ...prev,
          error: "Microphone permission is required to record voice notes.",
        }));
        return;
      }

      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Create and prepare recording
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync({
        android: {
          extension: ".m4a",
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: ".m4a",
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
        },
        web: {
          mimeType: "audio/webm",
          bitsPerSecond: 128000,
        },
      });

      recordingRef.current = recording;
      startTimeRef.current = Date.now();

      await recording.startAsync();

      setState((prev) => ({
        ...prev,
        isRecording: true,
        isPaused: false,
        durationMs: 0,
        uri: null,
      }));

      // Start duration timer
      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;
        setState((prev) => ({ ...prev, durationMs: elapsed }));

        // Auto-stop at max duration
        if (elapsed >= MAX_DURATION_MS) {
          stopRecording();
        }
      }, 100);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to start recording";
      setState((prev) => ({ ...prev, error: message }));
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (!recordingRef.current) {
      return null;
    }

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      // Reset audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

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
  }, []);

  const cancelRecording = useCallback(async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch {
        // Ignore errors during cancel
      }
      recordingRef.current = null;
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
    });

    setState({
      isRecording: false,
      isPaused: false,
      durationMs: 0,
      uri: null,
      error: null,
    });
  }, []);

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
