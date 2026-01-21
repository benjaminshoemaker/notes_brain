import { signIn, signInWithMagicLink, signOut, signUp } from "@notesbrain/shared";

import { supabase } from "./supabaseClient";

export function signInWithPassword(email: string, password: string) {
  return signIn(supabase, { email, password });
}

export function signUpWithPassword(email: string, password: string) {
  return signUp(supabase, { email, password });
}

export function sendMagicLink(email: string, emailRedirectTo: string) {
  return signInWithMagicLink(supabase, { email, emailRedirectTo });
}

export function signOutUser() {
  return signOut(supabase);
}

