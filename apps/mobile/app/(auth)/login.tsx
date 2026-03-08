import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Stack, Link, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { signInWithPassword, sendMagicLink } from "../../lib/authApi";
import { testIds } from "../../lib/testIds";
import { colors, radii, shadows } from "../../lib/theme";

export default function LoginScreen() {
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

  async function handleMagicLink() {
    setError(null);
    setStatus(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Email is required for magic link sign-in.");
      return;
    }

    setIsSubmitting(true);
    const result = await sendMagicLink(trimmedEmail);
    setIsSubmitting(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    setStatus("Magic link sent! Check your email.");
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
    >
      <Stack.Screen options={{ title: "Sign In", headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text }} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formContainer}>
          <Text style={styles.title}>Sign In</Text>
          <Text style={styles.subtitle}>Welcome back to NotesBrain</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
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
              <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
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

          <TouchableOpacity
            testID={testIds.auth.loginMagicLinkButton}
            accessibilityRole="button"
            accessibilityLabel="Sign in with magic link"
            style={[styles.button, styles.secondaryButton, isSubmitting && styles.buttonDisabled]}
            onPress={handleMagicLink}
            disabled={isSubmitting}
          >
            <Ionicons name="sparkles-outline" size={16} color={colors.accent} />
            <Text style={styles.secondaryButtonText}>Sign in with magic link</Text>
          </TouchableOpacity>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {status && (
            <View style={styles.statusContainer}>
              <Text style={styles.statusText}>{status}</Text>
            </View>
          )}

          <View style={styles.footer}>
            <Text style={styles.footerText}>New here? </Text>
            <Link href="/(auth)/signup" asChild>
              <TouchableOpacity>
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
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 32,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  inputIcon: {
    marginLeft: 12,
  },
  input: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
  button: {
    borderRadius: radii.md,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
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
    color: colors.textInverse,
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButtonText: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: "600",
  },
  errorContainer: {
    backgroundColor: colors.errorLight,
    padding: 12,
    borderRadius: radii.md,
    marginTop: 16,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
  },
  statusContainer: {
    backgroundColor: colors.successLight,
    padding: 12,
    borderRadius: radii.md,
    marginTop: 16,
  },
  statusText: {
    color: colors.success,
    fontSize: 14,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
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
