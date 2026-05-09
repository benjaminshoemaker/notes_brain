#!/usr/bin/env node

import { spawn } from "node:child_process";
import process from "node:process";

import { getSupabaseUrl, loadLocalEdgeEnv, SCHEDULED_LENS_FUNCTIONS } from "./lib/local-edge-env.mjs";

const HEALTH_TIMEOUT_MS = 45_000;
const HEALTH_INTERVAL_MS = 1_000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function checkHealth(baseUrl) {
  const results = [];
  for (const fnName of SCHEDULED_LENS_FUNCTIONS) {
    try {
      const response = await fetch(`${baseUrl}/functions/v1/${fnName}`);
      const payload = await response.json().catch(() => null);
      results.push({
        fnName,
        ok: response.ok && payload?.ready === true,
        missingEnv: Array.isArray(payload?.missing_env) ? payload.missing_env : []
      });
    } catch (error) {
      results.push({
        fnName,
        ok: false,
        missingEnv: [error instanceof Error ? error.message : String(error)]
      });
    }
  }
  return results;
}

async function waitForScheduledFunctionHealth(baseUrl, childHasExited) {
  const deadline = Date.now() + HEALTH_TIMEOUT_MS;
  let lastResults = [];

  while (Date.now() < deadline) {
    if (childHasExited()) {
      throw new Error("local Edge Functions process exited before becoming healthy");
    }

    lastResults = await checkHealth(baseUrl);
    if (lastResults.every((result) => result.ok)) {
      return;
    }

    await sleep(HEALTH_INTERVAL_MS);
  }

  const details = lastResults
    .map((result) => `${result.fnName}: ${result.ok ? "ready" : `missing ${result.missingEnv.join(",")}`}`)
    .join("; ");
  throw new Error(`scheduled lens functions did not become healthy: ${details}`);
}

function spawnNodeScript(scriptPath, args = []) {
  return spawn(process.execPath, [scriptPath, ...args], {
    stdio: "inherit",
    shell: false
  });
}

async function main() {
  loadLocalEdgeEnv();
  const baseUrl = getSupabaseUrl();
  const children = [];
  let shuttingDown = false;
  let functionsExited = false;

  function stopChildren(signal = "SIGTERM") {
    if (shuttingDown) return;
    shuttingDown = true;
    for (const child of children) {
      if (!child.killed) child.kill(signal);
    }
  }

  process.on("SIGINT", () => stopChildren("SIGINT"));
  process.on("SIGTERM", () => stopChildren("SIGTERM"));
  process.on("exit", () => stopChildren("SIGTERM"));

  const functions = spawnNodeScript("scripts/dev-edge-functions.mjs");
  children.push(functions);
  functions.on("exit", (code) => {
    functionsExited = true;
    if (!shuttingDown) {
      stopChildren("SIGTERM");
      process.exit(code ?? 1);
    }
  });

  await waitForScheduledFunctionHealth(baseUrl, () => functionsExited);

  const dispatcher = spawnNodeScript(
    "scripts/dev-lens-dispatcher.mjs",
    process.argv.slice(2)
  );
  children.push(dispatcher);
  dispatcher.on("exit", (code) => {
    if (!shuttingDown) {
      stopChildren("SIGTERM");
      process.exit(code ?? 1);
    }
  });
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Scheduled lens dev runtime failed: ${message}`);
  process.exit(1);
});
