import { signIn, signInWithMagicLink, signOut, signUp } from "@notesbrain/shared";

import { getAuthCallbackRedirectUrl } from "./authRedirect";
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

export function signOutUser() {
  return signOut(supabase);
}
