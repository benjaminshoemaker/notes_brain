import { useState, useRef, useEffect } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Keyboard,
  ActivityIndicator,
} from "react-native";
import * as Haptics from "expo-haptics";

import { testIds } from "../lib/testIds";
import { colors, radii, shadows } from "../lib/theme";

type CaptureInputProps = {
  onSubmit: (content: string) => Promise<void>;
  isSubmitting: boolean;
  autoFocus?: boolean;
};

export function CaptureInput({ onSubmit, isSubmitting, autoFocus = true }: CaptureInputProps) {
  const [content, setContent] = useState("");
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (autoFocus) {
      // Small delay to ensure the component is mounted
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [autoFocus]);

  async function handleSubmit() {
    const trimmedContent = content.trim();
    if (!trimmedContent || isSubmitting) return;

    await onSubmit(trimmedContent);
    try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
    setContent("");
    Keyboard.dismiss();
  }

  function handleSubmitEditing() {
    handleSubmit();
  }

  const canSubmit = content.trim().length > 0 && !isSubmitting;

  return (
    <View style={styles.container}>
      <TextInput
        ref={inputRef}
        testID={testIds.capture.textInput}
        style={styles.input}
        value={content}
        onChangeText={setContent}
        placeholder="What's on your mind?"
        placeholderTextColor={colors.textMuted}
        multiline
        maxLength={5000}
        editable={!isSubmitting}
        onSubmitEditing={handleSubmitEditing}
        blurOnSubmit={false}
        returnKeyType="send"
      />
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
          <Text style={[styles.submitButtonText, !canSubmit && styles.submitButtonTextDisabled]}>
            Save
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: 16,
    ...shadows.md,
  },
  input: {
    fontSize: 16,
    lineHeight: 24,
    minHeight: 100,
    maxHeight: 200,
    textAlignVertical: "top",
    color: colors.text,
  },
  submitButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: "center",
    marginTop: 12,
  },
  submitButtonDisabled: {
    backgroundColor: colors.border,
  },
  submitButtonText: {
    color: colors.textInverse,
    fontSize: 16,
    fontWeight: "600",
  },
  submitButtonTextDisabled: {
    color: colors.textMuted,
  },
});
