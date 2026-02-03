import { createAuthApi } from "@notesbrain/shared";

import { supabase } from "./supabaseClient";

const authApi = createAuthApi(supabase);

export const { signInWithPassword, signUpWithPassword, sendMagicLink, signOutUser } = authApi;
