import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as Linking from "expo-linking";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { parseAuthRedirectUrl } from "../../lib/authRedirect";
import { supabase } from "../../lib/supabaseClient";
import { testIds } from "../../lib/testIds";
import { colors, radii, shadows, spacing } from "../../lib/theme";

type CallbackMode = "loading" | "reset-password" | "signed-in" | "error";

function getLinkErrorMessage(error: string | null, description: string | null) {
  if (description) {
    return description.replace(/\+/g, " ");
  }

  if (error) {
    return error.replace(/_/g, " ");
  }

  return "This sign-in link is invalid or expired. Request a new link from the login screen.";
}

export default function AuthCallbackScreen() {
  const router = useRouter();
  const linkingUrl = Linking.useLinkingURL();
  const handledUrlRef = useRef<string | null>(null);

  const [mode, setMode] = useState<CallbackMode>("loading");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (handledUrlRef.current) {
        return;
      }

      setError(getLinkErrorMessage(null, null));
      setMode("error");
    }, 1200);

    return () => clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    const callbackUrl = linkingUrl ?? Linking.getLinkingURL();

    if (!callbackUrl || handledUrlRef.current === callbackUrl) {
      return;
    }

    handledUrlRef.current = callbackUrl;

    async function completeCallback(url: string) {
      setMode("loading");
      setError(null);

      const params = parseAuthRedirectUrl(url);

      if (params.error || params.errorDescription) {
        setError(getLinkErrorMessage(params.error, params.errorDescription));
        setMode("error");
        return;
      }

      if (params.code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(params.code);

        if (exchangeError) {
          setError(exchangeError.message);
          setMode("error");
          return;
        }
      } else if (params.accessToken && params.refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: params.accessToken,
          refresh_token: params.refreshToken,
        });

        if (sessionError) {
          setError(sessionError.message);
          setMode("error");
          return;
        }
      } else {
        setError(getLinkErrorMessage(null, null));
        setMode("error");
        return;
      }

      if (params.type === "recovery") {
        setMode("reset-password");
        setStatus("Choose a new password to finish signing in.");
        return;
      }

      setMode("signed-in");
      setStatus("Signed in. Opening Echo...");
      router.replace("/(app)");
    }

    void completeCallback(callbackUrl);
  }, [linkingUrl, router]);

  async function handleUpdatePassword() {
    setError(null);
    setStatus(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setIsSubmitting(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setStatus("Password updated. Opening Echo...");
    router.replace("/(app)");
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          title: mode === "reset-password" ? "Reset Password" : "Signing In",
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
        }}
      />
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          {mode === "loading" ? (
            <View style={styles.centered}>
              <ActivityIndicator color={colors.accent} size="large" />
              <Text style={styles.title}>Opening Echo</Text>
              <Text style={styles.subtitle}>Finishing secure sign-in...</Text>
            </View>
          ) : null}

          {mode === "signed-in" ? (
            <View style={styles.centered}>
              <Ionicons name="checkmark-circle-outline" size={32} color={colors.success} />
              <Text style={styles.title}>Signed in</Text>
              {status ? (
                <Text testID={testIds.auth.passwordResetStatusMessage} style={styles.subtitle}>
                  {status}
                </Text>
              ) : null}
            </View>
          ) : null}

          {mode === "error" ? (
            <View style={styles.centered}>
              <Ionicons name="alert-circle-outline" size={32} color={colors.error} />
              <Text style={styles.title}>Link expired</Text>
              {error ? (
                <Text testID={testIds.auth.authCallbackErrorMessage} style={styles.errorText}>
                  {error}
                </Text>
              ) : null}
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Back to sign in"
                style={[styles.button, styles.primaryButton]}
                onPress={() => router.replace("/(auth)/login")}
              >
                <Text style={styles.buttonText}>Back to Sign In</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {mode === "reset-password" ? (
            <View>
              <Ionicons name="key-outline" size={28} color={colors.accent} style={styles.headingIcon} />
              <Text style={styles.title}>Set a new password</Text>
              {status ? (
                <Text testID={testIds.auth.passwordResetStatusMessage} style={styles.subtitle}>
                  {status}
                </Text>
              ) : null}

              <View style={styles.inputGroup}>
                <Text style={styles.label}>New password</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />
                  <TextInput
                    testID={testIds.auth.passwordResetInput}
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="New password"
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry
                    autoComplete="new-password"
                    editable={!isSubmitting}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Confirm password</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />
                  <TextInput
                    testID={testIds.auth.passwordResetConfirmInput}
                    style={styles.input}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Confirm password"
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry
                    autoComplete="new-password"
                    editable={!isSubmitting}
                  />
                </View>
              </View>

              {error ? (
                <View style={styles.messageError}>
                  <Text
                    testID={testIds.auth.authCallbackErrorMessage}
                    style={[styles.errorText, styles.inlineErrorText]}
                  >
                    {error}
                  </Text>
                </View>
              ) : null}

              <TouchableOpacity
                testID={testIds.auth.passwordResetSubmitButton}
                accessibilityRole="button"
                accessibilityLabel="Update password"
                style={[styles.button, styles.primaryButton, isSubmitting && styles.buttonDisabled]}
                onPress={handleUpdatePassword}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={colors.textInverse} />
                ) : (
                  <Text style={styles.buttonText}>Update Password</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: spacing.xl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.xl,
    ...shadows.sm,
  },
  centered: {
    alignItems: "center",
    gap: spacing.md,
  },
  headingIcon: {
    alignSelf: "center",
    marginBottom: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "700",
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 21,
    marginBottom: spacing.lg,
    textAlign: "center",
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
  },
  inputWrapper: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: "row",
    paddingLeft: spacing.md,
  },
  input: {
    color: colors.text,
    flex: 1,
    fontSize: 16,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  button: {
    alignItems: "center",
    borderRadius: radii.md,
    flexDirection: "row",
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  primaryButton: {
    backgroundColor: colors.accent,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.textInverse,
    fontSize: 16,
    fontWeight: "700",
  },
  messageError: {
    backgroundColor: colors.errorLight,
    borderRadius: radii.md,
    marginBottom: spacing.lg,
    padding: spacing.md,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.lg,
    textAlign: "center",
  },
  inlineErrorText: {
    marginBottom: 0,
    textAlign: "left",
  },
});
