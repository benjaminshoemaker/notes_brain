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
        style={styles.input}
        value={content}
        onChangeText={setContent}
        placeholder="What's on your mind?"
        placeholderTextColor="#999999"
        multiline
        maxLength={5000}
        editable={!isSubmitting}
        onSubmitEditing={handleSubmitEditing}
        blurOnSubmit={false}
        returnKeyType="send"
      />
      <TouchableOpacity
        style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={!canSubmit}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#ffffff" size="small" />
        ) : (
          <Text style={styles.submitButtonText}>Save</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  input: {
    fontSize: 16,
    lineHeight: 24,
    minHeight: 100,
    maxHeight: 200,
    textAlignVertical: "top",
    color: "#1a1a1a",
  },
  submitButton: {
    backgroundColor: "#0066cc",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: "center",
    marginTop: 12,
  },
  submitButtonDisabled: {
    backgroundColor: "#cccccc",
  },
  submitButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});
