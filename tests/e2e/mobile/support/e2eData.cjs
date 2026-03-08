const { createClient } = require("@supabase/supabase-js");

const { getMobileE2EEnv } = require("./e2eEnv.cjs");

function throwIfError(context, error) {
  if (error) {
    throw new Error(`${context}: ${error.message}`);
  }
}

function createAdminClient() {
  const { supabaseUrl, supabaseAdminKey } = getMobileE2EEnv();
  return createClient(supabaseUrl, supabaseAdminKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  });
}

async function findAuthUserByEmail(client, email) {
  const perPage = 200;

  for (let page = 1; page <= 50; page += 1) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage });
    throwIfError("Failed to list auth users", error);

    const users = data?.users ?? [];
    const user = users.find((entry) => entry.email?.toLowerCase() === email.toLowerCase());
    if (user) {
      return user;
    }

    if (users.length < perPage) {
      break;
    }
  }

  return null;
}

async function ensureE2EUser(client) {
  const { testEmail, testPassword, testTimezone } = getMobileE2EEnv();
  const email = testEmail.trim().toLowerCase();
  let authUser = await findAuthUserByEmail(client, email);

  if (!authUser) {
    const { data, error } = await client.auth.admin.createUser({
      email,
      password: testPassword,
      email_confirm: true
    });
    throwIfError("Failed to create E2E auth user", error);
    authUser = data.user;
  } else {
    const { error } = await client.auth.admin.updateUserById(authUser.id, {
      email,
      password: testPassword,
      email_confirm: true
    });
    throwIfError("Failed to update E2E auth user", error);
  }

  const { error: profileError } = await client
    .from("users")
    .upsert(
      {
        id: authUser.id,
        email,
        timezone: testTimezone
      },
      { onConflict: "id" }
    );
  throwIfError("Failed to upsert E2E user profile", profileError);

  return {
    id: authUser.id,
    email,
    password: testPassword
  };
}

async function clearUserData(client, userId) {
  const { error: summaryError } = await client
    .from("daily_summaries")
    .delete()
    .eq("user_id", userId);
  throwIfError("Failed to clear daily summaries", summaryError);

  const { error: deviceError } = await client
    .from("devices")
    .delete()
    .eq("user_id", userId);
  throwIfError("Failed to clear devices", deviceError);

  const { error: noteError } = await client
    .from("notes")
    .delete()
    .eq("user_id", userId);
  throwIfError("Failed to clear notes", noteError);
}

function todayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function seedDailySummary(client, userId) {
  const summaryDate = todayDateString();

  const { error } = await client.from("daily_summaries").insert({
    user_id: userId,
    summary_date: summaryDate,
    content: {
      top_actions: [
        "Phase 2 mobile flow check",
        "Review daily priorities",
        "Capture one idea now"
      ],
      avoiding: "Deferring mobile end-to-end verification.",
      small_win: "Detox can now verify the core tabs."
    }
  });
  throwIfError("Failed to seed daily summary", error);
}

module.exports = {
  createAdminClient,
  ensureE2EUser,
  clearUserData,
  seedDailySummary
};

