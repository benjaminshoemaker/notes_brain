import { signIn, signInWithMagicLink, signOut, signUp } from "@notesbrain/shared";

import { getAuthCallbackRedirectUrl, parseAuthRedirectUrl } from "./authRedirect";
import { supabase } from "./supabaseClient";

export function signInWithPassword(email: string, password: string) {
  return signIn(supabase, { email, password });
}

export function signUpWithPassword(email: string, password: string) {
  return signUp(supabase, { email, password });
}

export function sendMagicLink(email: string) {
  const emailRedirectTo = getAuthCallbackRedirectUrl();
  return signInWithMagicLink(supabase, { email, emailRedirectTo });
}

export function sendPasswordResetEmail(email: string) {
  const redirectTo = getAuthCallbackRedirectUrl();
  return supabase.auth.resetPasswordForEmail(email, { redirectTo });
}

export async function signInWithGoogle() {
  const WebBrowser = await import("expo-web-browser");
  WebBrowser.maybeCompleteAuthSession();

  const redirectTo = getAuthCallbackRedirectUrl();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) {
    return { data, error };
  }

  if (!data.url) {
    return { data, error: new Error("Google sign-in could not be started.") };
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== "success") {
    return { data, error: new Error("Google sign-in was cancelled.") };
  }

  const params = parseAuthRedirectUrl(result.url);
  if (params.error || params.errorDescription) {
    return {
      data,
      error: new Error(params.errorDescription ?? params.error ?? "Google sign-in failed."),
    };
  }

  if (params.code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(params.code);
    return { data, error: exchangeError };
  }

  if (params.accessToken && params.refreshToken) {
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: params.accessToken,
      refresh_token: params.refreshToken,
    });
    return { data, error: sessionError };
  }

  return { data, error: new Error("Google sign-in returned an invalid callback.") };
}

export function signOutUser() {
  return signOut(supabase);
}
