#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const contents = fs.readFileSync(filePath, "utf8");
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const withoutExport = line.startsWith("export ") ? line.slice(7) : line;
    const separatorIndex = withoutExport.indexOf("=");
    if (separatorIndex === -1) continue;
    const key = withoutExport.slice(0, separatorIndex).trim();
    let value = withoutExport.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

const cwd = process.cwd();
loadEnvFile(path.join(cwd, ".env.local"));
loadEnvFile(path.join(cwd, ".env"));

const args = process.argv.slice(2);
if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
  console.log(
    [
      "Usage:",
      "  node scripts/retrigger-transcribe-voice.mjs <note_id> [note_id ...]",
      "",
      "Environment (one of each is required):",
      "  SUPABASE_URL | VITE_SUPABASE_URL | EXPO_PUBLIC_SUPABASE_URL",
      "  SUPABASE_SERVICE_ROLE_KEY | SERVICE_ROLE_KEY | SUPABASE_ANON_KEY | VITE_SUPABASE_ANON_KEY | EXPO_PUBLIC_SUPABASE_ANON_KEY"
    ].join("\n")
  );
  process.exit(args.length === 0 ? 1 : 0);
}

const noteIds = args.filter((arg) => !arg.startsWith("-"));
if (noteIds.length === 0) {
  console.error("No note IDs provided.");
  process.exit(1);
}

const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  process.env.EXPO_PUBLIC_SUPABASE_URL;

const apiKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !apiKey) {
  console.error("Missing SUPABASE_URL and/or API key environment variables.");
  process.exit(1);
}

const baseUrl = supabaseUrl.replace(/\/$/, "");

async function trigger(noteId) {
  const response = await fetch(`${baseUrl}/functions/v1/transcribe-voice`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      apikey: apiKey,
      "content-type": "application/json"
    },
    body: JSON.stringify({ note_id: noteId })
  });

  const text = await response.text();
  if (!response.ok) {
    console.error(`❌ ${noteId}: ${response.status} ${text}`);
    return;
  }

  try {
    const json = JSON.parse(text);
    if (json?.success) {
      console.log(`✅ ${noteId}: ${json.reason ?? "triggered"}`);
    } else {
      console.log(`⚠️ ${noteId}: ${text}`);
    }
  } catch {
    console.log(`✅ ${noteId}: ${text}`);
  }
}

for (const noteId of noteIds) {
  await trigger(noteId);
}
