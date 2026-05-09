#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

const PREFIX = "editable-notes-flow";
const TEST_EMAIL = process.env.EDITABLE_NOTES_TEST_EMAIL ?? "editable-notes-flow@example.test";
const TEST_PASSWORD = process.env.EDITABLE_NOTES_TEST_PASSWORD ?? "EditableNotesFlow123!";
const BASE_TIME = "2026-05-09T16:00:00.000Z";

const NOTE_IDS = {
  text: "00000000-0000-4000-8000-000000000401",
  voice: "00000000-0000-4000-8000-000000000402",
  file: "00000000-0000-4000-8000-000000000403",
  pending: "00000000-0000-4000-8000-000000000404",
  empty: "00000000-0000-4000-8000-000000000405",
};

const ATTACHMENT_ID = "00000000-0000-4000-8000-000000000451";

const HELP = `
Seed or cleanup deterministic local Supabase data for the editable-notes flow.

Usage:
  node scripts/e2e/seed-editable-notes-flow.mjs --seed
  node scripts/e2e/seed-editable-notes-flow.mjs --cleanup
  node scripts/e2e/seed-editable-notes-flow.mjs --dry-run

Environment:
  SUPABASE_URL or API_URL                  Local Supabase URL. Derived from "npx supabase status -o env" when omitted.
  SUPABASE_SERVICE_ROLE_KEY or SERVICE_ROLE_KEY
  EDITABLE_NOTES_TEST_EMAIL               Defaults to ${TEST_EMAIL}
  EDITABLE_NOTES_TEST_PASSWORD            Defaults to ${TEST_PASSWORD}

Seed data:
  completed text note, completed voice note, completed file note with attachment,
  pending note, and null/empty-content category-only note. Notes use distinct
  created_at values and deterministic IDs/content prefix for stable assertions
  and repeatable cleanup.
`.trim();

function parseArgs(argv) {
  const flags = new Set(argv.slice(2));
  if (flags.has("--help") || flags.has("-h")) return { mode: "help" };
  if (flags.has("--cleanup")) return { mode: "cleanup" };
  if (flags.has("--dry-run")) return { mode: "dry-run" };
  return { mode: "seed" };
}

function parseEnvOutput(output) {
  const env = {};
  for (const line of output.split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)="?(.*?)"?$/);
    if (match) env[match[1]] = match[2];
  }
  return env;
}

function loadSupabaseEnv() {
  const direct = {
    url: process.env.SUPABASE_URL ?? process.env.API_URL,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SERVICE_ROLE_KEY,
  };

  if (direct.url && direct.serviceRoleKey) return direct;

  const output = execFileSync("npx", ["supabase", "status", "-o", "env"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const parsed = parseEnvOutput(output);

  return {
    url: direct.url ?? parsed.API_URL,
    serviceRoleKey: direct.serviceRoleKey ?? parsed.SERVICE_ROLE_KEY,
  };
}

function makeClient() {
  const { url, serviceRoleKey } = loadSupabaseEnv();
  if (!url || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_URL/API_URL or SUPABASE_SERVICE_ROLE_KEY/SERVICE_ROLE_KEY.");
  }
  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function findUserByEmail(supabase, email) {
  let page = 1;
  const perPage = 100;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const found = data.users.find((user) => user.email === email);
    if (found) return found;
    if (data.users.length < perPage) return null;
    page += 1;
  }
}

async function ensureTestUser(supabase) {
  const existing = await findUserByEmail(supabase, TEST_EMAIL);
  if (existing) return existing;

  const { data, error } = await supabase.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
  });
  if (error) throw error;

  return data.user;
}

function timestamp(minutes) {
  return new Date(new Date(BASE_TIME).getTime() + minutes * 60_000).toISOString();
}

function buildNotes(userId) {
  return [
    {
      id: NOTE_IDS.text,
      user_id: userId,
      type: "text",
      content: `${PREFIX}: completed text note`,
      category: "ideas",
      classification_status: "completed",
      classification_confidence: 0.93,
      created_at: timestamp(0),
      updated_at: timestamp(0),
    },
    {
      id: NOTE_IDS.voice,
      user_id: userId,
      type: "voice",
      content: `${PREFIX}: completed voice transcript`,
      category: "projects",
      classification_status: "completed",
      classification_confidence: 0.82,
      created_at: timestamp(1),
      updated_at: timestamp(1),
    },
    {
      id: NOTE_IDS.file,
      user_id: userId,
      type: "file",
      content: `${PREFIX}: completed file note`,
      category: "admin",
      classification_status: "completed",
      classification_confidence: 0.75,
      created_at: timestamp(2),
      updated_at: timestamp(2),
    },
    {
      id: NOTE_IDS.pending,
      user_id: userId,
      type: "text",
      content: `${PREFIX}: pending note should not be clickable`,
      category: "uncategorized",
      classification_status: "pending",
      classification_confidence: null,
      created_at: timestamp(3),
      updated_at: timestamp(3),
    },
    {
      id: NOTE_IDS.empty,
      user_id: userId,
      type: "text",
      content: null,
      category: "family",
      classification_status: "completed",
      classification_confidence: 0.66,
      created_at: timestamp(4),
      updated_at: timestamp(4),
    },
  ];
}

function buildAttachments() {
  return [{
    id: ATTACHMENT_ID,
    note_id: NOTE_IDS.file,
    filename: "editable-notes-flow-attachment.pdf",
    mime_type: "application/pdf",
    storage_path: `${PREFIX}/editable-notes-flow-attachment.pdf`,
    size_bytes: 128,
    created_at: timestamp(2),
  }];
}

async function cleanup(supabase, { deleteUser = false } = {}) {
  const user = await findUserByEmail(supabase, TEST_EMAIL);
  if (!user) return { userDeleted: false, notesDeleted: 0, attachmentsDeleted: 0 };

  const noteIds = Object.values(NOTE_IDS);
  const { data: attachments, error: attachmentError } = await supabase
    .from("attachments")
    .delete()
    .in("note_id", noteIds)
    .select("id");
  if (attachmentError) throw attachmentError;

  const { data: notes, error: notesError } = await supabase
    .from("notes")
    .delete()
    .eq("user_id", user.id)
    .select("id");
  if (notesError) throw notesError;

  if (deleteUser) {
    const { error } = await supabase.auth.admin.deleteUser(user.id);
    if (error) throw error;
  }

  return {
    userDeleted: deleteUser,
    notesDeleted: notes.length,
    attachmentsDeleted: attachments.length,
  };
}

async function seed(supabase) {
  const user = await ensureTestUser(supabase);

  const { error: userError } = await supabase.from("users").upsert({
    id: user.id,
    email: TEST_EMAIL,
    timezone: "America/Los_Angeles",
  });
  if (userError) throw userError;

  await cleanup(supabase);

  const notes = buildNotes(user.id);
  const { error: notesError } = await supabase.from("notes").upsert(notes);
  if (notesError) throw notesError;

  const { error: attachmentError } = await supabase.from("attachments").upsert(buildAttachments());
  if (attachmentError) throw attachmentError;

  return {
    testUser: TEST_EMAIL,
    noteIds: notes.map((note) => note.id),
    attachmentIds: [ATTACHMENT_ID],
  };
}

async function main() {
  const { mode } = parseArgs(process.argv);

  if (mode === "help") {
    console.log(HELP);
    return;
  }

  if (mode === "dry-run") {
    console.log(JSON.stringify({
      mode,
      testUser: TEST_EMAIL,
      notes: buildNotes("00000000-0000-4000-8000-000000000499"),
      attachments: buildAttachments(),
    }, null, 2));
    return;
  }

  const supabase = makeClient();
  const result = mode === "cleanup"
    ? await cleanup(supabase, { deleteUser: true })
    : await seed(supabase);

  console.log(JSON.stringify({ mode, ...result }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
