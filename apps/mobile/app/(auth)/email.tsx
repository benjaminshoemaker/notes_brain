import { useState } from "react";
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
import { Link, Stack, useRouter } from "expo-router";

import { sendPasswordResetEmail, signInWithPassword } from "../../lib/authApi";
import { testIds } from "../../lib/testIds";
import { colors, radii, spacing, typography, touchTargets } from "../../lib/theme";

export default function EmailSignInScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSignIn() {
    setError(null);
    setStatus(null);

    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }

    setIsSubmitting(true);
    const result = await signInWithPassword(email.trim(), password);
    setIsSubmitting(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    router.replace("/(app)");
  }

  async function handlePasswordReset() {
    setError(null);
    setStatus(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Enter your email to receive password reset instructions.");
      return;
    }

    setIsSubmitting(true);
    const result = await sendPasswordResetEmail(trimmedEmail);
    setIsSubmitting(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    setStatus("Password reset email sent. Check your inbox.");
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
    >
      <Stack.Screen options={{ title: "Email Sign In", headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text }} />
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.formContainer}>
          <Text style={styles.title}>Sign in with email</Text>
          <Text style={styles.subtitle}>Use the email and password attached to your Echo account.</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                testID={testIds.auth.loginEmailInput}
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                editable={!isSubmitting}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                testID={testIds.auth.loginPasswordInput}
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Your password"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                autoComplete="password"
                editable={!isSubmitting}
              />
            </View>
          </View>

          <TouchableOpacity
            testID={testIds.auth.loginForgotPasswordButton}
            accessibilityRole="button"
            accessibilityLabel="Reset password"
            style={styles.forgotPasswordButton}
            onPress={handlePasswordReset}
            disabled={isSubmitting}
          >
            <Text style={styles.forgotPasswordText}>Forgot password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            testID={testIds.auth.loginSubmitButton}
            accessibilityRole="button"
            accessibilityLabel="Sign in"
            style={[styles.button, styles.primaryButton, isSubmitting && styles.buttonDisabled]}
            onPress={handleSignIn}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={colors.textInverse} />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          {error ? (
            <View style={styles.errorContainer}>
              <Text testID={testIds.auth.loginErrorMessage} style={styles.errorText}>
                {error}
              </Text>
            </View>
          ) : null}

          {status ? (
            <View style={styles.statusContainer}>
              <Text testID={testIds.auth.loginStatusMessage} style={styles.statusText}>
                {status}
              </Text>
            </View>
          ) : null}

          <View style={styles.footer}>
            <Text style={styles.footerText}>New here? </Text>
            <Link href="/(auth)/signup" asChild>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Create an account">
                <Text style={styles.linkText}>Create an account</Text>
              </TouchableOpacity>
            </Link>
          </View>
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
    paddingTop: 80,
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
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.text,
  },
  forgotPasswordButton: {
    alignSelf: "flex-end",
    minHeight: touchTargets.min,
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  forgotPasswordText: {
    ...typography.button,
    color: colors.accent,
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
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    ...typography.button,
    color: colors.textInverse,
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
