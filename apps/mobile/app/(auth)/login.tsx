import { useState } from "react";
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Stack, Link, useRouter } from "expo-router";

import { AuthShell, authStyles } from "../../components/AuthShell";
import { signInWithPassword, sendMagicLink } from "../../lib/authApi";

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
    <>
      <Stack.Screen options={{ title: "Sign In" }} />
      <AuthShell
        title="Sign In"
        subtitle="Welcome back to NotesBrain"
        error={error}
        status={status}
        footer={
          <>
            <Text style={authStyles.footerText}>New here? </Text>
            <Link href="/(auth)/signup" asChild>
              <TouchableOpacity>
                <Text style={authStyles.linkText}>Create an account</Text>
              </TouchableOpacity>
            </Link>
          </>
        }
      >
        <View style={authStyles.inputGroup}>
          <Text style={authStyles.label}>Email</Text>
          <TextInput
            style={authStyles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            editable={!isSubmitting}
          />
        </View>

        <View style={authStyles.inputGroup}>
          <Text style={authStyles.label}>Password</Text>
          <TextInput
            style={authStyles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Your password"
            secureTextEntry
            autoComplete="password"
            editable={!isSubmitting}
          />
        </View>

        <TouchableOpacity
          style={[authStyles.button, authStyles.primaryButton, isSubmitting && authStyles.buttonDisabled]}
          onPress={handleSignIn}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={authStyles.buttonText}>Sign In</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[authStyles.button, authStyles.secondaryButton, isSubmitting && authStyles.buttonDisabled]}
          onPress={handleMagicLink}
          disabled={isSubmitting}
        >
          <Text style={authStyles.secondaryButtonText}>Sign in with magic link</Text>
        </TouchableOpacity>
      </AuthShell>
    </>
  );
}
