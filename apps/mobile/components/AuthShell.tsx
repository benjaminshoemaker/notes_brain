import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";

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
    backgroundColor: "#ffffff",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  formContainer: {
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666666",
    marginBottom: 32,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333333",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#dddddd",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "#fafafa",
  },
  button: {
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  primaryButton: {
    backgroundColor: "#0066cc",
  },
  secondaryButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#0066cc",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButtonText: {
    color: "#0066cc",
    fontSize: 16,
    fontWeight: "600",
  },
  errorContainer: {
    backgroundColor: "#fff0f0",
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  errorText: {
    color: "#cc0000",
    fontSize: 14,
  },
  statusContainer: {
    backgroundColor: "#f0fff0",
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  statusText: {
    color: "#006600",
    fontSize: 14,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
  footerText: {
    color: "#666666",
    fontSize: 14,
  },
  linkText: {
    color: "#0066cc",
    fontSize: 14,
    fontWeight: "600",
  },
});
