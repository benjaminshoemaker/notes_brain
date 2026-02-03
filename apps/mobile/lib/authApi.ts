import { createAuthApi } from "@notesbrain/shared";

import { supabase } from "./supabaseClient";

const authApi = createAuthApi(supabase, {
  magicLinkRedirectTo: "notesbrain://auth/callback",
});

export const { signInWithPassword, signUpWithPassword, sendMagicLink, signOutUser } = authApi;
