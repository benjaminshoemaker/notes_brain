import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";

import { colors, radii, spacing, typography, touchTargets } from "../lib/theme";

type AuthShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  error?: string | null;
  status?: string | null;
  footer?: ReactNode;
};

export function AuthShell({ title, subtitle, children, error, status, footer }: AuthShellProps) {
  return (
    <KeyboardAvoidingView
      style={authStyles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={authStyles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={authStyles.formContainer}>
          <Text style={authStyles.title}>{title}</Text>
          <Text style={authStyles.subtitle}>{subtitle}</Text>

          {children}

          {error ? (
            <View style={authStyles.errorContainer}>
              <Text style={authStyles.errorText}>{error}</Text>
            </View>
          ) : null}

          {status ? (
            <View style={authStyles.statusContainer}>
              <Text style={authStyles.statusText}>{status}</Text>
            </View>
          ) : null}

          {footer ? <View style={authStyles.footer}>{footer}</View> : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export const authStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  formContainer: {
    padding: spacing.xl,
  },
  title: {
    ...typography.screenTitle,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xxl,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.helper,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  button: {
    borderRadius: radii.md,
    minHeight: touchTargets.min,
    paddingVertical: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.sm,
  },
  primaryButton: {
    backgroundColor: colors.accent,
  },
  secondaryButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.accent,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    ...typography.button,
    color: colors.textInverse,
  },
  secondaryButtonText: {
    ...typography.button,
    color: colors.accent,
  },
  errorContainer: {
    backgroundColor: colors.errorLight,
    padding: spacing.md,
    borderRadius: radii.md,
    marginTop: spacing.lg,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
  },
  statusContainer: {
    backgroundColor: colors.successLight,
    padding: spacing.md,
    borderRadius: radii.md,
    marginTop: spacing.lg,
  },
  statusText: {
    color: colors.success,
    fontSize: 14,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: spacing.xl,
  },
  footerText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  linkText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "600",
  },
});
