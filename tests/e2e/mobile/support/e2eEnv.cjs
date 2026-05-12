function readEnv(name, fallback = "") {
  const value = process.env[name];
  return typeof value === "string" ? value : fallback;
}

function getSupabaseUrl() {
  return (
    readEnv("E2E_SUPABASE_URL")
    || readEnv("SUPABASE_URL")
    || readEnv("VITE_SUPABASE_URL")
    || readEnv("EXPO_PUBLIC_SUPABASE_URL")
  );
}

function getSupabaseAnonKey() {
  return (
    readEnv("E2E_SUPABASE_ANON_KEY")
    || readEnv("SUPABASE_ANON_KEY")
    || readEnv("VITE_SUPABASE_ANON_KEY")
    || readEnv("EXPO_PUBLIC_SUPABASE_ANON_KEY")
  );
}

function getAdminKey() {
  return (
    readEnv("E2E_SUPABASE_SECRET_KEY")
    || readEnv("E2E_SUPABASE_SERVICE_ROLE_KEY")
    || readEnv("SUPABASE_SERVICE_ROLE_KEY")
    || readEnv("SERVICE_ROLE_KEY")
    || readEnv("SECRET_KEY")
  );
}

function ensureRequiredEnv() {
  const missing = [];
  if (!getSupabaseUrl()) missing.push("E2E_SUPABASE_URL|SUPABASE_URL|VITE_SUPABASE_URL|EXPO_PUBLIC_SUPABASE_URL");
  if (!getSupabaseAnonKey()) missing.push("E2E_SUPABASE_ANON_KEY|SUPABASE_ANON_KEY|VITE_SUPABASE_ANON_KEY|EXPO_PUBLIC_SUPABASE_ANON_KEY");
  if (!getAdminKey()) missing.push("E2E_SUPABASE_SECRET_KEY|E2E_SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SERVICE_ROLE_KEY|SERVICE_ROLE_KEY|SECRET_KEY");

  if (missing.length > 0) {
    throw new Error(`Missing required E2E environment variables: ${missing.join(", ")}`);
  }
}

function getMobileE2EEnv() {
  return {
    supabaseUrl: getSupabaseUrl(),
    supabaseAnonKey: getSupabaseAnonKey(),
    supabaseAdminKey: getAdminKey(),
    testEmail: readEnv("E2E_TEST_EMAIL", "notesbrain-e2e@example.com"),
    testPassword: readEnv("E2E_TEST_PASSWORD", "NotesBrainE2EPassword123"),
    testTimezone: readEnv("E2E_TEST_TIMEZONE", "America/Los_Angeles")
  };
}

module.exports = {
  ensureRequiredEnv,
  getMobileE2EEnv
};
