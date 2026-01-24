import { View, Text, StyleSheet, Modal, ActivityIndicator, TouchableOpacity } from "react-native";

import { useShareIntent } from "../hooks/useShareIntent";

export function ShareHandler() {
  const { state, hasShareIntent, shareIntent, processShareIntent, resetShareIntent } =
    useShareIntent();

  // Only show modal for file shares that need user confirmation
  const needsConfirmation =
    hasShareIntent && shareIntent?.files && shareIntent.files.length > 0 && !state.isProcessing;

  if (!needsConfirmation && !state.isProcessing) {
    return null;
  }

  return (
    <Modal transparent animationType="fade" visible={needsConfirmation || state.isProcessing}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {state.isProcessing ? (
            <>
              <ActivityIndicator size="large" color="#0066cc" />
              <Text style={styles.processingText}>Processing shared content...</Text>
            </>
          ) : (
            <>
              <Text style={styles.title}>Save Shared Content?</Text>

              {shareIntent?.files && shareIntent.files.length > 0 && (
                <View style={styles.fileList}>
                  {shareIntent.files.map((file, index) => (
                    <View key={index} style={styles.fileItem}>
                      <Text style={styles.fileName} numberOfLines={1}>
                        {file.fileName || "Unknown file"}
                      </Text>
                      <Text style={styles.fileType}>{file.mimeType}</Text>
                    </View>
                  ))}
                </View>
              )}

              {state.error && <Text style={styles.errorText}>{state.error}</Text>}

              <View style={styles.actions}>
                <TouchableOpacity style={styles.cancelButton} onPress={resetShareIntent}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.saveButton} onPress={processShareIntent}>
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modal: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 320,
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 16,
  },
  processingText: {
    marginTop: 16,
    fontSize: 14,
    color: "#666666",
  },
  fileList: {
    width: "100%",
    marginBottom: 16,
  },
  fileItem: {
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  fileName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1a1a1a",
  },
  fileType: {
    fontSize: 12,
    color: "#666666",
    marginTop: 4,
  },
  errorText: {
    color: "#ef4444",
    fontSize: 14,
    marginBottom: 16,
    textAlign: "center",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cccccc",
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666666",
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#0066cc",
    alignItems: "center",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
  },
});
