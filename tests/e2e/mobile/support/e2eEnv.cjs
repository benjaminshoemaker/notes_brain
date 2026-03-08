function readEnv(name, fallback = "") {
  const value = process.env[name];
  return typeof value === "string" ? value : fallback;
}

function getAdminKey() {
  return readEnv("E2E_SUPABASE_SECRET_KEY") || readEnv("E2E_SUPABASE_SERVICE_ROLE_KEY");
}

function ensureRequiredEnv() {
  const missing = [];
  if (!readEnv("E2E_SUPABASE_URL")) missing.push("E2E_SUPABASE_URL");
  if (!readEnv("E2E_SUPABASE_ANON_KEY")) missing.push("E2E_SUPABASE_ANON_KEY");
  if (!getAdminKey()) missing.push("E2E_SUPABASE_SECRET_KEY|E2E_SUPABASE_SERVICE_ROLE_KEY");

  if (missing.length > 0) {
    throw new Error(`Missing required E2E environment variables: ${missing.join(", ")}`);
  }
}

function getMobileE2EEnv() {
  return {
    supabaseUrl: readEnv("E2E_SUPABASE_URL"),
    supabaseAnonKey: readEnv("E2E_SUPABASE_ANON_KEY"),
    supabaseAdminKey: getAdminKey(),
    testEmail: readEnv("E2E_TEST_EMAIL", "notesbrain-e2e@example.com"),
    testPassword: readEnv("E2E_TEST_PASSWORD", "NotesBrain-E2E-Password-123!"),
    testTimezone: readEnv("E2E_TEST_TIMEZONE", "America/Los_Angeles")
  };
}

module.exports = {
  ensureRequiredEnv,
  getMobileE2EEnv
};

