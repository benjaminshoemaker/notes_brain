#!/usr/bin/env node

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const EDGE_FUNCTIONS = [
  "classify-note",
  "transcribe-voice",
  "generate-summary",
  "send-push",
  "execute-lens",
  "dispatch-lenses"
];

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

    const value = rawValue.replace(/^["']|["']$/g, "");
    process.env[key] = value;
  }
}

function bootstrapEnv() {
  const rootDir = process.cwd();
  loadEnvFile(path.join(rootDir, ".env.production.local"));
  loadEnvFile(path.join(rootDir, ".env.production"));
  loadEnvFile(path.join(rootDir, ".env.local"));
  loadEnvFile(path.join(rootDir, ".env.verification"));
}

function getSupabaseUrl() {
  const url =
    process.env.SUPABASE_URL ??
    process.env.VITE_SUPABASE_URL ??
    process.env.EXPO_PUBLIC_SUPABASE_URL;

  if (!url) {
    throw new Error(
      "Missing Supabase URL. Set SUPABASE_URL (or VITE_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_URL)."
    );
  }

  return url.endsWith("/") ? url.slice(0, -1) : url;
}

function getAuthToken() {
  return (
    process.env.SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    process.env.VITE_SUPABASE_ANON_KEY ??
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
    ""
  );
}

function buildHeaders(token) {
  const headers = {
    accept: "application/json"
  };

  if (!token) return headers;

  return {
    ...headers,
    authorization: `Bearer ${token}`,
    apikey: token
  };
}

async function checkFunctionHealth(baseUrl, headers, fnName) {
  const url = `${baseUrl}/functions/v1/${fnName}`;
  const response = await fetch(url, {
    method: "GET",
    headers
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    // Keep null payload when JSON parsing fails.
  }

  const status = payload?.status === "ok" ? "ok" : "error";
  const missingEnv = Array.isArray(payload?.missing_env) ? payload.missing_env : [];
  const ready = payload?.ready === true;

  return {
    fnName,
    httpStatus: response.status,
    status,
    ready,
    missingEnv,
    payload
  };
}

function printResult(result) {
  const marker = result.status === "ok" && result.httpStatus < 400 ? "PASS" : "FAIL";
  const suffix = result.missingEnv.length
    ? ` missing_env=${result.missingEnv.join(",")}`
    : "";
  const readyText = ` ready=${result.ready ? "true" : "false"}`;
  console.log(
    `${marker} ${result.fnName} http=${result.httpStatus} status=${result.status}${readyText}${suffix}`
  );
}

async function main() {
  bootstrapEnv();

  const baseUrl = getSupabaseUrl();
  const token = getAuthToken();
  const headers = buildHeaders(token);

  const results = [];
  for (const fnName of EDGE_FUNCTIONS) {
    try {
      const result = await checkFunctionHealth(baseUrl, headers, fnName);
      results.push(result);
      printResult(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`FAIL ${fnName} error=${message}`);
      results.push({
        fnName,
        httpStatus: 0,
        status: "error",
        ready: false,
        missingEnv: [],
        payload: null
      });
    }
  }

  const failing = results.filter(
    (result) =>
      result.status !== "ok" ||
      result.httpStatus >= 400 ||
      result.ready === false ||
      result.missingEnv.length > 0
  );

  if (failing.length > 0) {
    process.exit(1);
  }

  console.log("Edge function healthcheck passed.");
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Healthcheck failed: ${message}`);
  process.exit(1);
});
