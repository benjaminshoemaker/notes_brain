function readEnv(name, fallback = "") {
  const value = process.env[name];
  return typeof value === "string" ? value : fallback;
}

export function getE2EEnv() {
  const supabaseAdminKey =
    readEnv("E2E_SUPABASE_SECRET_KEY") || readEnv("E2E_SUPABASE_SERVICE_ROLE_KEY");

  return {
    supabaseUrl: readEnv("E2E_SUPABASE_URL"),
    supabaseAnonKey: readEnv("E2E_SUPABASE_ANON_KEY"),
    supabaseAdminKey,
    testEmail: readEnv("E2E_TEST_EMAIL", "notesbrain-e2e@example.com"),
    testPassword: readEnv("E2E_TEST_PASSWORD", "NotesBrain-E2E-Password-123!"),
    testTimezone: readEnv("E2E_TEST_TIMEZONE", "America/Los_Angeles")
  };
}

export function ensureRequiredE2EEnv() {
  const required = ["E2E_SUPABASE_URL", "E2E_SUPABASE_ANON_KEY"];
  const missing = required.filter((key) => !readEnv(key));
  const hasAdminKey =
    Boolean(readEnv("E2E_SUPABASE_SECRET_KEY")) ||
    Boolean(readEnv("E2E_SUPABASE_SERVICE_ROLE_KEY"));

  if (!hasAdminKey) {
    missing.push("E2E_SUPABASE_SECRET_KEY|E2E_SUPABASE_SERVICE_ROLE_KEY");
  }

  if (missing.length > 0) {
    throw new Error(`Missing required E2E environment variables: ${missing.join(", ")}`);
  }
}
