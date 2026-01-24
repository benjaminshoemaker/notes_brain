import { useState, useCallback } from "react";
import { View, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { useFocusEffect } from "expo-router";

import { CaptureInput } from "../../components/CaptureInput";
import { Toast } from "../../components/Toast";
import { useCreateNote } from "../../hooks/useCreateNote";

export default function CaptureScreen() {
  const createNote = useCreateNote();
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [shouldFocus, setShouldFocus] = useState(true);

  // Re-focus input when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      setShouldFocus(true);
      return () => setShouldFocus(false);
    }, [])
  );

  async function handleSubmit(content: string) {
    try {
      await createNote.mutateAsync({ content, type: "text" });
      setToast({ message: "Note saved!", type: "success" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save note";
      setToast({ message, type: "error" });
    }
  }

  function hideToast() {
    setToast(null);
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <View style={styles.content}>
        <CaptureInput
          onSubmit={handleSubmit}
          isSubmitting={createNote.isPending}
          autoFocus={shouldFocus}
        />
      </View>

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
  content: {
    flex: 1,
    padding: 16,
    paddingTop: 24,
  },
});
