import { getE2EEnv } from "./e2eEnv.mjs";

function throwIfError(context, error) {
  if (error) {
    throw new Error(`${context}: ${error.message}`);
  }
}

async function findAuthUserByEmail(adminClient, email) {
  const perPage = 200;

  for (let page = 1; page <= 50; page += 1) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
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

export async function ensureE2EUser(adminClient) {
  const env = getE2EEnv();
  const email = env.testEmail.trim().toLowerCase();
  let authUser = await findAuthUserByEmail(adminClient, email);

  if (!authUser) {
    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password: env.testPassword,
      email_confirm: true
    });

    throwIfError("Failed to create E2E auth user", error);
    authUser = data.user;
  } else {
    const { error } = await adminClient.auth.admin.updateUserById(authUser.id, {
      email,
      password: env.testPassword,
      email_confirm: true
    });
    throwIfError("Failed to update E2E auth user", error);
  }

  const { error: profileError } = await adminClient
    .from("users")
    .upsert(
      {
        id: authUser.id,
        email,
        timezone: env.testTimezone
      },
      { onConflict: "id" }
    );
  throwIfError("Failed to upsert E2E user profile", profileError);

  return {
    id: authUser.id,
    email,
    password: env.testPassword
  };
}

export async function clearE2EUserData(adminClient, userId) {
  const { error: summaryError } = await adminClient
    .from("daily_summaries")
    .delete()
    .eq("user_id", userId);
  throwIfError("Failed to clear daily summaries", summaryError);

  const { error: deviceError } = await adminClient
    .from("devices")
    .delete()
    .eq("user_id", userId);
  throwIfError("Failed to clear devices", deviceError);

  const { error: noteError } = await adminClient
    .from("notes")
    .delete()
    .eq("user_id", userId);
  throwIfError("Failed to clear notes", noteError);
}

export async function seedCategorizedNotes(adminClient, userId) {
  const suffix = Date.now().toString(36);
  const ideasContent = `e2e ideas ${suffix}`;
  const projectsContent = `e2e projects ${suffix}`;

  const { error } = await adminClient.from("notes").insert([
    {
      user_id: userId,
      type: "text",
      content: ideasContent,
      category: "ideas",
      classification_status: "completed",
      classification_confidence: 0.92
    },
    {
      user_id: userId,
      type: "text",
      content: projectsContent,
      category: "projects",
      classification_status: "completed",
      classification_confidence: 0.93
    }
  ]);
  throwIfError("Failed to seed categorized notes", error);

  return { ideasContent, projectsContent };
}

export function todayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function seedDailySummary(adminClient, userId, summaryDate = todayDateString()) {
  const { error } = await adminClient.from("daily_summaries").insert({
    user_id: userId,
    summary_date: summaryDate,
    content: {
      top_actions: [
        "Ship phase-1 E2E suite",
        "Review classification pipeline logs",
        "Triage flaky test cases"
      ],
      avoiding: "Leaving verification gaps around async background jobs.",
      small_win: "You now have deterministic seeded E2E data."
    }
  });
  throwIfError("Failed to seed daily summary", error);
}

