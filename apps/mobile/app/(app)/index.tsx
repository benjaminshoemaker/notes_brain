import { useState, useCallback } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";

import { CaptureInput } from "../../components/CaptureInput";
import { Toast } from "../../components/Toast";
import { useCreateNote } from "../../hooks/useCreateNote";
import { useUploadVoiceNote } from "../../hooks/useUploadVoiceNote";
import { testIds } from "../../lib/testIds";
import { colors, spacing } from "../../lib/theme";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function CaptureScreen() {
  const isE2E = process.env.EXPO_PUBLIC_E2E === "1";
  const createNote = useCreateNote();
  const uploadVoiceNote = useUploadVoiceNote();
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [shouldFocus, setShouldFocus] = useState(!isE2E);

  // Re-focus input when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (isE2E) {
        setShouldFocus(false);
        return undefined;
      }
      setShouldFocus(true);
      return () => setShouldFocus(false);
    }, [isE2E])
  );

  async function handleTextSubmit(content: string) {
    const trimmedContent = content.trim();
    try {
      await createNote.mutateAsync({ content: trimmedContent, type: "text" });
      setToast({ message: "Note saved!", type: "success" });
    } catch {
      const message = "Couldn't save your note. Check your connection and try again.";
      setToast({ message, type: "error" });
      Alert.alert("Save failed", message, [
        {
          text: "Retry",
          onPress: () => {
            void handleTextSubmit(trimmedContent);
          },
        },
        { text: "Dismiss", style: "cancel" },
      ]);
    }
  }

  async function handleVoiceRecordingComplete(uri: string) {
    try {
      await uploadVoiceNote.mutateAsync({ uri });
      setToast({ message: "Voice note saved!", type: "success" });
    } catch {
      const message = "Couldn't save your voice note. Check your connection and try again.";
      setToast({ message, type: "error" });
      Alert.alert("Upload failed", message, [
        {
          text: "Retry",
          onPress: () => {
            void handleVoiceRecordingComplete(uri);
          },
        },
        { text: "Dismiss", style: "cancel" },
      ]);
    }
  }

  function hideToast() {
    setToast(null);
  }

  return (
    <KeyboardAvoidingView
      testID={testIds.capture.screen}
      style={styles.container}
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 24}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.prompt}>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.title}>What should Echo remember?</Text>
          <Text style={styles.subtitle}>
            Type a thought or tap the microphone to capture it out loud.
          </Text>
        </View>

        <View style={styles.composerSection}>
          <CaptureInput
            onSubmit={handleTextSubmit}
            onVoiceRecordingComplete={handleVoiceRecordingComplete}
            isSubmitting={createNote.isPending}
            isVoiceUploading={uploadVoiceNote.isPending}
            autoFocus={shouldFocus}
          />
        </View>
      </ScrollView>

      {toast && (
        <Toast
          testID={testIds.capture.toast}
          message={toast.message}
          type={toast.type}
          visible={!!toast}
          onHide={hideToast}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "flex-start",
    padding: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: 96,
  },
  prompt: {
    marginBottom: spacing.md,
  },
  greeting: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 26,
    lineHeight: 30,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  composerSection: {
    marginBottom: spacing.md,
  },
});
