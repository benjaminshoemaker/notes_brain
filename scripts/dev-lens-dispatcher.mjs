#!/usr/bin/env node

import process from "node:process";

import { shouldRunLensForLocalInterval, parseLocalIntervalHours } from "./lib/local-lens-interval.mjs";
import {
  getCronSecret,
  getServiceRoleKey,
  getSupabaseUrl,
  loadLocalEdgeEnv
} from "./lib/local-edge-env.mjs";

const DEFAULT_INTERVAL_MS = 60_000;

function parseArgs(argv) {
  const flags = {
    intervalMs: DEFAULT_INTERVAL_MS,
    localIntervalHours: parseLocalIntervalHours(process.env.LOCAL_LENS_INTERVAL_HOURS),
    once: false,
    runImmediately: true
  };

  for (const arg of argv) {
    if (arg === "--once") {
      flags.once = true;
      continue;
    }

    if (arg === "--no-immediate") {
      flags.runImmediately = false;
      continue;
    }

    if (arg.startsWith("--interval-ms=")) {
      const value = Number(arg.slice("--interval-ms=".length));
      if (!Number.isFinite(value) || value < 1_000) {
        throw new Error("--interval-ms must be a number >= 1000");
      }
      flags.intervalMs = value;
    }

    if (arg.startsWith("--local-interval-hours=")) {
      flags.localIntervalHours = parseLocalIntervalHours(
        arg.slice("--local-interval-hours=".length)
      );
    }
  }

  return flags;
}

function formatDispatchResult(payload) {
  if (!payload || typeof payload !== "object") {
    return "no JSON payload";
  }

  const dispatched = payload.dispatched ?? "?";
  const failed = payload.failed ?? "?";
  const requestId = payload.request_id ? ` request_id=${payload.request_id}` : "";
  return `dispatched=${dispatched} failed=${failed}${requestId}`;
}

function buildAuthHeaders(serviceRoleKey) {
  return {
    apikey: serviceRoleKey,
    authorization: `Bearer ${serviceRoleKey}`
  };
}

async function fetchActiveDailyLenses({ baseUrl, serviceRoleKey }) {
  const query = new URLSearchParams({
    select: "id,name,schedule_type,schedule_time,is_active,last_run_at,users(timezone)",
    is_active: "eq.true",
    schedule_type: "eq.daily"
  });

  const response = await fetch(`${baseUrl}/rest/v1/lenses?${query}`, {
    headers: {
      accept: "application/json",
      ...buildAuthHeaders(serviceRoleKey)
    }
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`failed to fetch local lenses: ${response.status} ${text}`.trim());
  }

  return response.json();
}

async function executeLens({ baseUrl, cronSecret, lens }) {
  const response = await fetch(`${baseUrl}/functions/v1/execute-lens`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-cron-secret": cronSecret
    },
    body: JSON.stringify({ lens_id: lens.id, trigger: "cron" })
  });

  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const details = payload ? JSON.stringify(payload) : text;
    throw new Error(`execute-lens failed for ${lens.name}: ${response.status} ${details}`);
  }

  return payload;
}

async function dispatchLocalIntervalOverride({
  baseUrl,
  cronSecret,
  intervalHours,
  serviceRoleKey
}) {
  if (!intervalHours) {
    return { checked: 0, dispatched: 0, failed: 0 };
  }

  if (!serviceRoleKey) {
    throw new Error("local interval override requires SECRET_KEY or service role key");
  }

  const lenses = await fetchActiveDailyLenses({ baseUrl, serviceRoleKey });
  const dueLenses = lenses.filter((lens) =>
    shouldRunLensForLocalInterval({ lens, now: new Date(), intervalHours })
  );

  let failed = 0;
  for (const lens of dueLenses) {
    try {
      const payload = await executeLens({ baseUrl, cronSecret, lens });
      const generated = payload?.generated === true ? "generated" : "no-result";
      console.log(
        `[${new Date().toISOString()}] local interval override executed "${lens.name}" ${generated}`
      );
    } catch (error) {
      failed++;
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[${new Date().toISOString()}] local interval override failed ${message}`);
    }
  }

  return {
    checked: lenses.length,
    dispatched: dueLenses.length - failed,
    failed
  };
}

async function dispatchOnce({ baseUrl, cronSecret, localIntervalHours, serviceRoleKey }) {
  const response = await fetch(`${baseUrl}/functions/v1/dispatch-lenses`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-cron-secret": cronSecret
    },
    body: "{}"
  });

  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }

  const timestamp = new Date().toISOString();
  if (!response.ok) {
    const details = payload ? JSON.stringify(payload) : text;
    console.error(`[${timestamp}] dispatch-lenses failed http=${response.status} ${details}`);
    return false;
  }

  console.log(`[${timestamp}] dispatch-lenses ok ${formatDispatchResult(payload)}`);

  const overrideResult = await dispatchLocalIntervalOverride({
    baseUrl,
    cronSecret,
    intervalHours: localIntervalHours,
    serviceRoleKey
  });

  if (localIntervalHours) {
    console.log(
      `[${new Date().toISOString()}] local interval override ${localIntervalHours}h checked=${overrideResult.checked} dispatched=${overrideResult.dispatched} failed=${overrideResult.failed}`
    );
  }

  return overrideResult.failed === 0;
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  loadLocalEdgeEnv();

  const cronSecret = getCronSecret();
  const baseUrl = getSupabaseUrl();
  const serviceRoleKey = getServiceRoleKey();

  if (!cronSecret) {
    throw new Error("Missing CRON_SECRET");
  }

  let inFlight = false;
  async function dispatchGuarded() {
    if (inFlight) {
      console.warn(`[${new Date().toISOString()}] previous dispatch still running; skipping`);
      return;
    }

    inFlight = true;
    try {
      await dispatchOnce({
        baseUrl,
        cronSecret,
        localIntervalHours: flags.localIntervalHours,
        serviceRoleKey
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[${new Date().toISOString()}] dispatch-lenses error ${message}`);
    } finally {
      inFlight = false;
    }
  }

  if (flags.once) {
    const ok = await dispatchOnce({
      baseUrl,
      cronSecret,
      localIntervalHours: flags.localIntervalHours,
      serviceRoleKey
    });
    process.exit(ok ? 0 : 1);
  }

  console.log(`Polling ${baseUrl}/functions/v1/dispatch-lenses every ${flags.intervalMs}ms.`);
  if (flags.localIntervalHours) {
    console.log(`Local daily-lens interval override enabled: every ${flags.localIntervalHours}h.`);
  }
  if (flags.runImmediately) {
    await dispatchGuarded();
  }

  const timer = setInterval(dispatchGuarded, flags.intervalMs);
  process.on("SIGINT", () => {
    clearInterval(timer);
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    clearInterval(timer);
    process.exit(0);
  });
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Lens dispatcher failed: ${message}`);
  process.exit(1);
});
