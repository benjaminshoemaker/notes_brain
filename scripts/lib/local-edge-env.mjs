import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";

export const LOCAL_CRON_SECRET = "notesbrain-local-cron";

export const EDGE_FUNCTIONS = [
  "classify-note",
  "transcribe-voice",
  "generate-summary",
  "send-push",
  "execute-lens",
  "dispatch-lenses"
];

export const SCHEDULED_LENS_FUNCTIONS = [
  "dispatch-lenses",
  "execute-lens",
  "send-push"
];

const FUNCTIONS_ENV_KEYS = [
  "SECRET_KEY",
  "SERVICE_ROLE_KEY",
  "OPENAI_API_KEY",
  "OPENAI_CLASSIFICATION_MODEL",
  "OPENAI_WHISPER_MODEL",
  "FCM_PROJECT_ID",
  "FCM_SERVICE_ACCOUNT_KEY",
  "CRON_SECRET"
];

function parseEnvValue(rawValue) {
  const trimmed = rawValue.trim();
  if (!trimmed) return "";

  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed.slice(1, -1);
    }
  }

  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

export function loadEnvFile(filePath, { override = false } = {}) {
  if (!existsSync(filePath)) return;

  const text = readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    if (!key || (!override && process.env[key])) continue;

    process.env[key] = parseEnvValue(trimmed.slice(separatorIndex + 1));
  }
}

export function loadLocalEdgeEnv(rootDir = process.cwd()) {
  loadEnvFile(path.join(rootDir, ".env.local"));
  loadEnvFile(path.join(rootDir, "supabase", ".env.functions.local"), { override: true });

  if (!process.env.CRON_SECRET) {
    process.env.CRON_SECRET = LOCAL_CRON_SECRET;
  }

  if (!process.env.SECRET_KEY && !process.env.SERVICE_ROLE_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    process.env.SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  }
}

export function getSupabaseUrl() {
  const url =
    process.env.SUPABASE_URL ??
    process.env.EXPO_PUBLIC_SUPABASE_URL ??
    process.env.VITE_SUPABASE_URL ??
    "http://127.0.0.1:65421";

  return url.endsWith("/") ? url.slice(0, -1) : url;
}

export function getCronSecret() {
  return process.env.CRON_SECRET ?? LOCAL_CRON_SECRET;
}

export function getServiceRoleKey() {
  return (
    process.env.SECRET_KEY ??
    process.env.SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    ""
  );
}

export function getMissingLocalFunctionEnv() {
  const missing = [
    "OPENAI_API_KEY",
    "FCM_PROJECT_ID",
    "FCM_SERVICE_ACCOUNT_KEY",
    "CRON_SECRET"
  ].filter((key) => !process.env[key]);

  const hasServiceRole = Boolean(
    process.env.SECRET_KEY ||
    process.env.SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  if (!hasServiceRole) {
    missing.push("SECRET_KEY|SERVICE_ROLE_KEY|SUPABASE_SERVICE_ROLE_KEY");
  }

  return missing;
}

export function createFunctionsEnvFile() {
  const dir = mkdtempSync(path.join(tmpdir(), "notesbrain-functions-"));
  const filePath = path.join(dir, "functions.env");
  const lines = FUNCTIONS_ENV_KEYS
    .filter((key) => process.env[key])
    .map((key) => `${key}=${JSON.stringify(process.env[key])}`);

  writeFileSync(filePath, `${lines.join("\n")}\n`, { mode: 0o600 });

  return {
    filePath,
    cleanup: () => rmSync(dir, { recursive: true, force: true })
  };
}
