import assert from "node:assert/strict";
import test from "node:test";

import { createAnonClient } from "../utils/e2eSupabase.mjs";

function readEnv(name, fallback = "") {
  const value = process.env[name];
  return typeof value === "string" ? value : fallback;
}

function ensureAnonE2EEnv() {
  const required = ["E2E_SUPABASE_URL", "E2E_SUPABASE_ANON_KEY"];
  const missing = required.filter((key) => !readEnv(key));
  if (missing.length > 0) {
    throw new Error(`Missing required E2E environment variables: ${missing.join(", ")}`);
  }
}

ensureAnonE2EEnv();

test("allows mobile deep-link redirect for password reset emails", async () => {
  const client = createAnonClient();
  const email = `notesbrain-password-reset-${Date.now()}@example.com`;

  const { data, error } = await client.auth.resetPasswordForEmail(email, {
    redirectTo: "echo://auth/callback"
  });

  assert.equal(error, null, error?.message ?? "Expected no Supabase auth error");
  assert.deepEqual(data, {});
});
