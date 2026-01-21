import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./supabase.js";

type Credentials = { email: string; password: string };

function detectTimezone(): string {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return timezone || "UTC";
}

export async function signUp(
  supabase: SupabaseClient<Database>,
  { email, password }: Credentials
) {
  const timezone = detectTimezone();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return { data, error };
  }

  const userId = data.user?.id;
  if (!userId) {
    return { data, error: null };
  }

  const { error: profileError } = await supabase.from("users").upsert({
    id: userId,
    email,
    timezone
  });

  if (profileError) {
    return { data, error: profileError };
  }

  return { data, error: null };
}

export async function signIn(supabase: SupabaseClient<Database>, { email, password }: Credentials) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signInWithMagicLink(
  supabase: SupabaseClient<Database>,
  { email, emailRedirectTo }: { email: string; emailRedirectTo?: string }
) {
  const options = emailRedirectTo ? { emailRedirectTo } : undefined;
  return options
    ? supabase.auth.signInWithOtp({ email, options })
    : supabase.auth.signInWithOtp({ email });
}

export async function signOut(supabase: SupabaseClient<Database>) {
  return supabase.auth.signOut();
}

