import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const LOCAL_E2E_ENV_PATH = fileURLToPath(
  new URL("../../../.env.local", import.meta.url)
);
const REQUIRED_E2E_KEYS = [
  "E2E_SUPABASE_URL",
  "E2E_SUPABASE_ANON_KEY",
  "E2E_SUPABASE_SECRET_KEY",
  "E2E_SUPABASE_SERVICE_ROLE_KEY"
];
const LOCAL_ENV_KEYS = new Set([
  ...REQUIRED_E2E_KEYS,
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SERVICE_ROLE_KEY",
  "SECRET_KEY",
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_ANON_KEY",
  "EXPO_PUBLIC_SUPABASE_URL",
  "EXPO_PUBLIC_SUPABASE_ANON_KEY"
]);
let attemptedLocalEnvLoad = false;

function readEnv(name, fallback = "") {
  const value = process.env[name];
  return typeof value === "string" ? value : fallback;
}

function parseEnvValue(rawValue) {
  const value = rawValue.trim();
  if (value.length < 2) {
    return value;
  }

  const quote = value.at(0);
  if ((quote === '"' || quote === "'") && value.at(value.length - 1) === quote) {
    return value.slice(1, -1);
  }

  return value;
}

function loadLocalE2EEnvIfNeeded() {
  if (attemptedLocalEnvLoad) {
    return;
  }
  attemptedLocalEnvLoad = true;

  const hasAnyMissing = REQUIRED_E2E_KEYS.some((key) => !readEnv(key));
  if (!hasAnyMissing || !existsSync(LOCAL_E2E_ENV_PATH)) {
    return;
  }

  const contents = readFileSync(LOCAL_E2E_ENV_PATH, "utf8");
  const lines = contents.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) {
      continue;
    }

    const [, key, rawValue] = match;
    if (!LOCAL_ENV_KEYS.has(key) || readEnv(key)) {
      continue;
    }

    process.env[key] = parseEnvValue(rawValue);
  }
}

function resolveSupabaseUrl() {
  return (
    readEnv("E2E_SUPABASE_URL")
    || readEnv("SUPABASE_URL")
    || readEnv("VITE_SUPABASE_URL")
    || readEnv("EXPO_PUBLIC_SUPABASE_URL")
  );
}

function resolveSupabaseAnonKey() {
  return (
    readEnv("E2E_SUPABASE_ANON_KEY")
    || readEnv("SUPABASE_ANON_KEY")
    || readEnv("VITE_SUPABASE_ANON_KEY")
    || readEnv("EXPO_PUBLIC_SUPABASE_ANON_KEY")
  );
}

function resolveSupabaseAdminKey() {
  return (
    readEnv("E2E_SUPABASE_SECRET_KEY")
    || readEnv("E2E_SUPABASE_SERVICE_ROLE_KEY")
    || readEnv("SUPABASE_SERVICE_ROLE_KEY")
    || readEnv("SERVICE_ROLE_KEY")
    || readEnv("SECRET_KEY")
  );
}

export function getE2EEnv() {
  loadLocalE2EEnvIfNeeded();

  return {
    supabaseUrl: resolveSupabaseUrl(),
    supabaseAnonKey: resolveSupabaseAnonKey(),
    supabaseAdminKey: resolveSupabaseAdminKey(),
    testEmail: readEnv("E2E_TEST_EMAIL", "notesbrain-e2e@example.com"),
    testPassword: readEnv("E2E_TEST_PASSWORD", "NotesBrainE2EPassword123"),
    testTimezone: readEnv("E2E_TEST_TIMEZONE", "America/Los_Angeles")
  };
}

export function ensureRequiredE2EEnv() {
  loadLocalE2EEnvIfNeeded();

  const { supabaseUrl, supabaseAnonKey, supabaseAdminKey } = getE2EEnv();
  const missing = [];
  if (!supabaseUrl) {
    missing.push("E2E_SUPABASE_URL|SUPABASE_URL|VITE_SUPABASE_URL|EXPO_PUBLIC_SUPABASE_URL");
  }
  if (!supabaseAnonKey) {
    missing.push("E2E_SUPABASE_ANON_KEY|SUPABASE_ANON_KEY|VITE_SUPABASE_ANON_KEY|EXPO_PUBLIC_SUPABASE_ANON_KEY");
  }
  if (!supabaseAdminKey) {
    missing.push("E2E_SUPABASE_SECRET_KEY|E2E_SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SERVICE_ROLE_KEY|SERVICE_ROLE_KEY|SECRET_KEY");
  }

  if (missing.length > 0) {
    throw new Error(`Missing required E2E environment variables: ${missing.join(", ")}`);
  }
}
