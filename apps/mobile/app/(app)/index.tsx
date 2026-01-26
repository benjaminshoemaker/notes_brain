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
import { VoiceRecorder } from "../../components/VoiceRecorder";
import { Toast } from "../../components/Toast";
import { useCreateNote } from "../../hooks/useCreateNote";
import { useUploadVoiceNote } from "../../hooks/useUploadVoiceNote";

export default function CaptureScreen() {
  const createNote = useCreateNote();
  const uploadVoiceNote = useUploadVoiceNote();
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [shouldFocus, setShouldFocus] = useState(true);

  // Re-focus input when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      setShouldFocus(true);
      return () => setShouldFocus(false);
    }, [])
  );

  async function handleTextSubmit(content: string) {
    const trimmedContent = content.trim();
    try {
      await createNote.mutateAsync({ content: trimmedContent, type: "text" });
      setToast({ message: "Note saved!", type: "success" });
    } catch (error) {
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
    } catch (error) {
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

  const isSubmitting = createNote.isPending || uploadVoiceNote.isPending;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Text Note</Text>
          <CaptureInput
            onSubmit={handleTextSubmit}
            isSubmitting={isSubmitting}
            autoFocus={shouldFocus}
          />
        </View>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Voice Note</Text>
          <VoiceRecorder
            onRecordingComplete={handleVoiceRecordingComplete}
            isUploading={uploadVoiceNote.isPending}
          />
        </View>
      </ScrollView>

      {toast && (
        <Toast
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
    backgroundColor: "#f5f5f5",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 24,
  },
  section: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666666",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#dddddd",
  },
  dividerText: {
    marginHorizontal: 16,
    color: "#999999",
    fontSize: 14,
  },
});
