import { createClient } from "@supabase/supabase-js";

import { getE2EEnv } from "./e2eEnv.mjs";

function getBaseOptions() {
  return {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  };
}

export function createAdminClient() {
  const { supabaseUrl, supabaseAdminKey } = getE2EEnv();
  return createClient(supabaseUrl, supabaseAdminKey, getBaseOptions());
}

export function createAnonClient() {
  const { supabaseUrl, supabaseAnonKey } = getE2EEnv();
  return createClient(supabaseUrl, supabaseAnonKey, getBaseOptions());
}
