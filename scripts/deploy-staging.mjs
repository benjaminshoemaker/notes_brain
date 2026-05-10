#!/usr/bin/env node

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const EDGE_FUNCTIONS = [
  "classify-note",
  "transcribe-voice",
  "generate-summary",
  "send-push",
  "execute-lens",
  "dispatch-lenses"
];

const CRON_CALLABLE_FUNCTIONS = new Set(["execute-lens", "dispatch-lenses"]);

function parseFlags(argv) {
  return {
    dryRun: argv.includes("--dry-run"),
    skipDb: argv.includes("--skip-db"),
    skipHealthcheck: argv.includes("--skip-healthcheck")
  };
}

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;

  const text = readFileSync(filePath, "utf8");
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    if (!key || process.env[key]) continue;

    process.env[key] = rawValue.replace(/^["']|["']$/g, "");
  }
}

function bootstrapEnv() {
  const rootDir = process.cwd();
  loadEnvFile(path.join(rootDir, ".env.production.local"));
  loadEnvFile(path.join(rootDir, ".env.production"));
  loadEnvFile(path.join(rootDir, ".env.local"));
  loadEnvFile(path.join(rootDir, ".env.verification"));
}

function getMissingEnv() {
  const required = [
    "SUPABASE_URL",
    "OPENAI_API_KEY",
    "FCM_PROJECT_ID",
    "FCM_SERVICE_ACCOUNT_KEY",
    "CRON_SECRET"
  ];
  const missing = required.filter((key) => !process.env[key]);
  const hasServiceRole = Boolean(
    process.env.SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  if (!hasServiceRole) {
    missing.push("SERVICE_ROLE_KEY|SUPABASE_SERVICE_ROLE_KEY");
  }

  return missing;
}

function runCommand(command, args, { dryRun }) {
  const label = `${command} ${args.join(" ")}`;
  if (dryRun) {
    console.log(`[dry-run] ${label}`);
    return;
  }

  console.log(`\n$ ${label}`);
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: false
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function ensureSupabaseCli({ dryRun }) {
  runCommand("supabase", ["--version"], { dryRun });
}

function deployFunctions({ dryRun }) {
  for (const fn of EDGE_FUNCTIONS) {
    const args = ["functions", "deploy", fn];
    if (CRON_CALLABLE_FUNCTIONS.has(fn)) {
      args.push("--no-verify-jwt");
    }
    runCommand("supabase", args, { dryRun });
  }
}

function runHealthcheck({ dryRun }) {
  runCommand("node", ["scripts/healthcheck-edge-functions.mjs"], { dryRun });
}

function main() {
  const flags = parseFlags(process.argv.slice(2));
  bootstrapEnv();

  const missing = getMissingEnv();
  if (missing.length > 0) {
    console.error(`Missing required env vars: ${missing.join(", ")}`);
    process.exit(1);
  }

  ensureSupabaseCli(flags);

  if (!flags.skipDb) {
    runCommand("supabase", ["db", "push"], flags);
  }

  deployFunctions(flags);

  if (!flags.skipHealthcheck) {
    runHealthcheck(flags);
  }

  console.log("\nStaging deployment workflow complete.");
}

main();
