import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./supabase.js";
import { signIn, signInWithMagicLink, signOut, signUp } from "./auth.js";

type AuthApiOptions = {
  magicLinkRedirectTo?: string;
};

export function createAuthApi(supabase: SupabaseClient<Database>, options: AuthApiOptions = {}) {
  const { magicLinkRedirectTo } = options;

  return {
    signInWithPassword: (email: string, password: string) => signIn(supabase, { email, password }),
    signUpWithPassword: (email: string, password: string) => signUp(supabase, { email, password }),
    sendMagicLink: (email: string, emailRedirectTo?: string) =>
      signInWithMagicLink(supabase, {
        email,
        emailRedirectTo: emailRedirectTo ?? magicLinkRedirectTo,
      }),
    signOutUser: () => signOut(supabase),
  };
}
