import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { createSupabaseClient, signIn, signInWithMagicLink, signOut, signUp } from "../packages/shared/dist/index.js";

test("should export supabase helpers when reading shared dist types", async () => {
  const dts = await readFile("packages/shared/dist/index.d.ts", "utf8");
  for (const exportName of [
    "createSupabaseClient",
    "signUp",
    "signIn",
    "signInWithMagicLink",
    "signOut"
  ]) {
    assert.match(dts, new RegExp(`\\b${exportName}\\b`));
  }
});

test("should create user profile with auto-detected timezone when signUp succeeds", async () => {
  const originalDateTimeFormat = Intl.DateTimeFormat;

  try {
    // @ts-expect-error - test double
    Intl.DateTimeFormat = () => ({
      resolvedOptions: () => ({ timeZone: "America/Chicago" })
    });

    let capturedUpsert;

    const supabase = {
      auth: {
        signUp: async () => ({ data: { user: { id: "user-1" } }, error: null })
      },
      from: (table) => {
        assert.equal(table, "users");
        return {
          upsert: async (payload) => {
            capturedUpsert = payload;
            return { data: null, error: null };
          }
        };
      }
    };

    await signUp(supabase, { email: "a@b.com", password: "password" });

    assert.ok(capturedUpsert);
    assert.equal(capturedUpsert.id, "user-1");
    assert.equal(capturedUpsert.email, "a@b.com");
    assert.equal(capturedUpsert.timezone, "America/Chicago");
  } finally {
    Intl.DateTimeFormat = originalDateTimeFormat;
  }
});

test("should create a typed supabase client when url and anon key are provided", async () => {
  const client = createSupabaseClient("https://example.supabase.co", "anon-key");
  assert.ok(client);
  assert.equal(typeof client.from, "function");
  assert.ok(client.auth);
});

test("should call supabase password auth when signIn is invoked", async () => {
  let calledWith;
  const supabase = {
    auth: {
      signInWithPassword: async (params) => {
        calledWith = params;
        return { data: null, error: null };
      }
    }
  };

  await signIn(supabase, { email: "a@b.com", password: "pw" });
  assert.deepEqual(calledWith, { email: "a@b.com", password: "pw" });
});

test("should call supabase otp auth when signInWithMagicLink is invoked", async () => {
  let calledWith;
  const supabase = {
    auth: {
      signInWithOtp: async (params) => {
        calledWith = params;
        return { data: null, error: null };
      }
    }
  };

  await signInWithMagicLink(supabase, { email: "a@b.com" });
  assert.deepEqual(calledWith, { email: "a@b.com" });
});

test("should call supabase signOut when signOut is invoked", async () => {
  let called = false;
  const supabase = {
    auth: {
      signOut: async () => {
        called = true;
        return { error: null };
      }
    }
  };

  await signOut(supabase);
  assert.equal(called, true);
});

