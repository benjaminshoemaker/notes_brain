import assert from "node:assert/strict";
import test from "node:test";

import { ensureRequiredE2EEnv } from "../utils/e2eEnv.mjs";
import { createAnonClient } from "../utils/e2eSupabase.mjs";

ensureRequiredE2EEnv();

test("allows mobile deep-link redirect for password reset emails", async () => {
  const client = createAnonClient();
  const email = `notesbrain-password-reset-${Date.now()}@example.com`;

  const { data, error } = await client.auth.resetPasswordForEmail(email, {
    redirectTo: "echo://auth/callback"
  });

  assert.equal(error, null, error?.message ?? "Expected no Supabase auth error");
  assert.deepEqual(data, {});
});
