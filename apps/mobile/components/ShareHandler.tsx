import { View, Text, StyleSheet, Modal, ActivityIndicator, TouchableOpacity } from "react-native";

import { useShareIntent } from "../hooks/useShareIntent";
import { colors, radii, shadows, spacing, typography, touchTargets } from "../lib/theme";

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
              <ActivityIndicator size="large" color={colors.accent} />
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
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Cancel shared content"
                  style={styles.cancelButton}
                  onPress={resetShareIntent}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Save shared content"
                  style={styles.saveButton}
                  onPress={processShareIntent}
                >
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
    backgroundColor: "rgba(28, 25, 23, 0.36)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  modal: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.xl,
    width: "100%",
    maxWidth: 320,
    alignItems: "center",
    ...shadows.md,
  },
  title: {
    ...typography.sectionTitle,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  processingText: {
    marginTop: spacing.lg,
    ...typography.helper,
    color: colors.textSecondary,
  },
  fileList: {
    width: "100%",
    marginBottom: spacing.lg,
  },
  fileItem: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  fileName: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.text,
  },
  fileType: {
    ...typography.badge,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    marginBottom: spacing.lg,
    textAlign: "center",
  },
  actions: {
    flexDirection: "row",
    gap: spacing.md,
    width: "100%",
  },
  cancelButton: {
    flex: 1,
    minHeight: touchTargets.min,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    ...typography.button,
    color: colors.textSecondary,
  },
  saveButton: {
    flex: 1,
    minHeight: touchTargets.min,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonText: {
    ...typography.button,
    color: colors.textInverse,
  },
});
