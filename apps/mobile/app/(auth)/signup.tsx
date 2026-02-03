import { useState } from "react";
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Stack, Link, useRouter } from "expo-router";

import { AuthShell, authStyles } from "../../components/AuthShell";
import { signUpWithPassword } from "../../lib/authApi";

export default function SignupScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSignUp() {
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError("Email and password are required.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setIsSubmitting(true);
    const result = await signUpWithPassword(trimmedEmail, password);
    setIsSubmitting(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    // After successful signup, navigate to the app
    router.replace("/(app)");
  }

  return (
    <>
      <Stack.Screen options={{ title: "Create Account" }} />
      <AuthShell
        title="Create Account"
        subtitle="Start capturing your thoughts"
        error={error}
        footer={
          <>
            <Text style={authStyles.footerText}>Already have an account? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text style={authStyles.linkText}>Sign in</Text>
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
            placeholder="At least 6 characters"
            secureTextEntry
            autoComplete="new-password"
            editable={!isSubmitting}
          />
        </View>

        <View style={authStyles.inputGroup}>
          <Text style={authStyles.label}>Confirm Password</Text>
          <TextInput
            style={authStyles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm your password"
            secureTextEntry
            autoComplete="new-password"
            editable={!isSubmitting}
          />
        </View>

        <TouchableOpacity
          style={[authStyles.button, authStyles.primaryButton, isSubmitting && authStyles.buttonDisabled]}
          onPress={handleSignUp}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={authStyles.buttonText}>Create Account</Text>
          )}
        </TouchableOpacity>
      </AuthShell>
    </>
  );
}
