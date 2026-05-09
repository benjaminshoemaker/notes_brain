#!/usr/bin/env node

import { spawn } from "node:child_process";
import process from "node:process";

import {
  createFunctionsEnvFile,
  getMissingLocalFunctionEnv,
  loadLocalEdgeEnv,
  LOCAL_CRON_SECRET
} from "./lib/local-edge-env.mjs";

loadLocalEdgeEnv();

const missing = getMissingLocalFunctionEnv();
if (missing.length > 0) {
  console.error(`Missing local Edge Function env: ${missing.join(", ")}`);
  console.error("Expected FCM/OpenAI values in .env.local and local service key values in supabase/.env.functions.local.");
  process.exit(1);
}

const tempEnv = createFunctionsEnvFile();
let cleanedUp = false;

function cleanup() {
  if (cleanedUp) return;
  cleanedUp = true;
  tempEnv.cleanup();
}

console.log("Starting local Edge Functions with merged local env.");
if (process.env.CRON_SECRET === LOCAL_CRON_SECRET) {
  console.log(`Using default local CRON_SECRET=${LOCAL_CRON_SECRET}.`);
}

const child = spawn(
  "supabase",
  ["functions", "serve", "--env-file", tempEnv.filePath, "--no-verify-jwt"],
  {
    stdio: "inherit",
    shell: false
  }
);

function shutdown(signal) {
  if (!child.killed) {
    child.kill(signal);
  }
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("exit", cleanup);

child.on("exit", (code, signal) => {
  cleanup();
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
