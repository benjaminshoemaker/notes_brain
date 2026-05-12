import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Stack, Link, useRouter } from "expo-router";

import { signInWithGoogle } from "../../lib/authApi";
import { colors, radii, shadows, spacing, typography, touchTargets } from "../../lib/theme";
import { testIds } from "../../lib/testIds";

export default function LoginScreen() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleGoogleSignIn() {
    setError(null);
    setIsSubmitting(true);
    const result = await signInWithGoogle();
    setIsSubmitting(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    router.replace("/(app)");
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Sign In", headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text }} />
      <View style={styles.content}>
        <View style={styles.mark}>
          <Text style={styles.markText}>E</Text>
        </View>

        <Text style={styles.title}>Welcome to Echo</Text>
        <Text style={styles.subtitle}>A private place to capture notes, links, and thoughts.</Text>

        <View style={styles.actions}>
          <TouchableOpacity
            testID={testIds.auth.loginGoogleButton}
            accessibilityRole="button"
            accessibilityLabel="Continue with Google"
            accessibilityState={{ disabled: isSubmitting }}
            style={[styles.button, styles.googleButton, isSubmitting && styles.buttonDisabled]}
            onPress={handleGoogleSignIn}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <>
                <Text style={styles.googleGlyph}>G</Text>
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            testID={testIds.auth.loginEmailButton}
            accessibilityRole="button"
            accessibilityLabel="Continue with email"
            style={[styles.button, styles.emailButton]}
            onPress={() => router.push("/(auth)/email")}
            disabled={isSubmitting}
          >
            <Text style={styles.emailButtonText}>Continue with email</Text>
          </TouchableOpacity>
        </View>

        {error ? (
          <View style={styles.errorContainer}>
            <Text testID={testIds.auth.loginErrorMessage} style={styles.errorText}>
              {error}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    padding: spacing.xl,
  },
  mark: {
    width: 56,
    height: 56,
    borderRadius: radii.lg,
    backgroundColor: colors.accentLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xl,
    ...shadows.sm,
  },
  markText: {
    color: colors.accent,
    fontSize: 24,
    fontWeight: "700",
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
  actions: {
    gap: spacing.md,
  },
  button: {
    minHeight: touchTargets.min,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  googleButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  emailButton: {
    backgroundColor: colors.accentLight,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  googleGlyph: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "700",
  },
  googleButtonText: {
    ...typography.button,
    color: colors.text,
  },
  emailButtonText: {
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
