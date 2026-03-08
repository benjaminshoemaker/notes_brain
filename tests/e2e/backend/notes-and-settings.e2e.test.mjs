import assert from "node:assert/strict";
import test from "node:test";

import { getE2EEnv, ensureRequiredE2EEnv } from "../utils/e2eEnv.mjs";
import { createAdminClient, createAnonClient } from "../utils/e2eSupabase.mjs";
import {
  clearE2EUserData,
  ensureE2EUser,
  seedDailySummary,
  todayDateString
} from "../utils/e2eData.mjs";

ensureRequiredE2EEnv();

const adminClient = createAdminClient();
let e2eUser = null;

async function createAuthenticatedClient() {
  const { testEmail, testPassword } = getE2EEnv();
  const client = createAnonClient();
  const { error } = await client.auth.signInWithPassword({
    email: testEmail,
    password: testPassword
  });

  if (error) {
    throw new Error(`Failed to sign in E2E user: ${error.message}`);
  }

  return client;
}

test.before(async () => {
  e2eUser = await ensureE2EUser(adminClient);
});

test.beforeEach(async () => {
  await clearE2EUserData(adminClient, e2eUser.id);
});

test.after(async () => {
  if (!e2eUser) return;
  await clearE2EUserData(adminClient, e2eUser.id);
});

test("creates a text note with pending + uncategorized defaults", async () => {
  const client = await createAuthenticatedClient();
  const content = `backend e2e note ${Date.now()}`;

  const { data, error } = await client
    .from("notes")
    .insert({
      user_id: e2eUser.id,
      type: "text",
      content
    })
    .select("user_id, type, content, category, classification_status")
    .single();

  assert.equal(error, null);
  assert.equal(data.user_id, e2eUser.id);
  assert.equal(data.type, "text");
  assert.equal(data.content, content);
  assert.equal(data.category, "uncategorized");
  assert.equal(data.classification_status, "pending");

  await client.auth.signOut();
});

test("updates and persists timezone for the authenticated user profile", async () => {
  const client = await createAuthenticatedClient();
  const timezone = "UTC";

  const { error: updateError } = await client
    .from("users")
    .upsert(
      {
        id: e2eUser.id,
        email: e2eUser.email,
        timezone
      },
      { onConflict: "id" }
    );

  assert.equal(updateError, null);

  const { data, error } = await client
    .from("users")
    .select("timezone")
    .eq("id", e2eUser.id)
    .single();

  assert.equal(error, null);
  assert.equal(data.timezone, timezone);

  await client.auth.signOut();
});

test("returns today's daily summary for the authenticated user", async () => {
  await seedDailySummary(adminClient, e2eUser.id);

  const client = await createAuthenticatedClient();
  const today = todayDateString();
  const { data, error } = await client
    .from("daily_summaries")
    .select("summary_date, content")
    .eq("summary_date", today)
    .single();

  assert.equal(error, null);
  assert.equal(data.summary_date, today);
  assert.equal(Array.isArray(data.content.top_actions), true);
  assert.equal(data.content.top_actions.length, 3);
  assert.equal(typeof data.content.avoiding, "string");
  assert.equal(typeof data.content.small_win, "string");

  await client.auth.signOut();
});
