#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ensureRequiredE2EEnv, getE2EEnv } from "../../tests/e2e/utils/e2eEnv.mjs";

const AUTHOR_EMAIL_DEFAULT = "notesbrain-community-author@example.test";
const AUTHOR_PASSWORD_DEFAULT = "NotesBrainCommunityAuthor123!";
const INSTALLER_EMAIL_DEFAULT = "notesbrain-community-installer@example.test";
const INSTALLER_PASSWORD_DEFAULT = "NotesBrainCommunityInstaller123!";
const AUTHOR_TEMPLATE_DESCRIPTION = "Author-published community template for mobile E2E flow verification.";
const INSTALLER_TEMPLATE_DESCRIPTION = "Installer-owned template used to seed an installed-copy lens for author path checks.";
const AUTHOR_DISPLAY_NAME = "Community Author";
const INSTALLER_DISPLAY_NAME = "Community Installer";
const HELP = `
Seed or cleanup deterministic local Supabase data for the community-lenses mobile flow.

Usage:
  node scripts/e2e/seed-community-lenses-flow.mjs --seed
  node scripts/e2e/seed-community-lenses-flow.mjs --cleanup
  node scripts/e2e/seed-community-lenses-flow.mjs --dry-run
  node scripts/e2e/seed-community-lenses-flow.mjs --seed --json

Environment (optional overrides):
  COMMUNITY_LENSES_AUTHOR_EMAIL
  COMMUNITY_LENSES_AUTHOR_PASSWORD
  COMMUNITY_LENSES_INSTALLER_EMAIL
  COMMUNITY_LENSES_INSTALLER_PASSWORD
`.trim();

function parseArgs(argv) {
  const flags = new Set(argv.slice(2));
  if (flags.has("--help") || flags.has("-h")) {
    return { mode: "help", json: false };
  }
  if (flags.has("--cleanup")) {
    return { mode: "cleanup", json: flags.has("--json") };
  }
  if (flags.has("--dry-run")) {
    return { mode: "dry-run", json: flags.has("--json") };
  }
  return { mode: "seed", json: flags.has("--json") };
}

function throwIfError(context, error) {
  if (error) {
    throw new Error(`${context}: ${error.message}`);
  }
}

function getCredentials() {
  const authorEmail = (process.env.COMMUNITY_LENSES_AUTHOR_EMAIL ?? AUTHOR_EMAIL_DEFAULT).trim().toLowerCase();
  const installerEmail = (process.env.COMMUNITY_LENSES_INSTALLER_EMAIL ?? INSTALLER_EMAIL_DEFAULT).trim().toLowerCase();
  const authorPassword = process.env.COMMUNITY_LENSES_AUTHOR_PASSWORD ?? AUTHOR_PASSWORD_DEFAULT;
  const installerPassword = process.env.COMMUNITY_LENSES_INSTALLER_PASSWORD ?? INSTALLER_PASSWORD_DEFAULT;

  if (!authorEmail || !installerEmail) {
    throw new Error("Community flow seed requires non-empty author and installer emails.");
  }
  if (authorEmail === installerEmail) {
    throw new Error("Author and installer emails must be different.");
  }
  if (!authorPassword || !installerPassword) {
    throw new Error("Community flow seed requires non-empty author and installer passwords.");
  }

  return {
    author: {
      email: authorEmail,
      password: authorPassword,
      displayName: AUTHOR_DISPLAY_NAME,
    },
    installer: {
      email: installerEmail,
      password: installerPassword,
      displayName: INSTALLER_DISPLAY_NAME,
    },
  };
}

function makeRunTag() {
  const timestamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${timestamp}-${suffix}`;
}

function artifactPaths() {
  const rootDir = fileURLToPath(new URL("../../", import.meta.url));
  const artifactRoot = path.resolve(rootDir, "artifacts/community-lenses/end-to-end");
  const runTag = makeRunTag();
  const runDir = path.join(artifactRoot, `run-${runTag}`);
  const seedDir = path.join(runDir, "seed");
  return { artifactRoot, runTag, runDir, seedDir };
}

function createAdminClient() {
  ensureRequiredE2EEnv();
  const env = getE2EEnv();
  return createClient(env.supabaseUrl, env.supabaseAdminKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

async function findAuthUserByEmail(adminClient, email) {
  const perPage = 200;

  for (let page = 1; page <= 50; page += 1) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
    throwIfError("Failed to list auth users", error);

    const users = data?.users ?? [];
    const match = users.find((entry) => entry.email?.toLowerCase() === email.toLowerCase());
    if (match) {
      return match;
    }

    if (users.length < perPage) {
      break;
    }
  }

  return null;
}

async function ensureAuthUser(adminClient, credentials) {
  let user = await findAuthUserByEmail(adminClient, credentials.email);

  if (!user) {
    const { data, error } = await adminClient.auth.admin.createUser({
      email: credentials.email,
      password: credentials.password,
      email_confirm: true,
    });
    throwIfError(`Failed to create auth user ${credentials.email}`, error);
    user = data.user;
  } else {
    const { error } = await adminClient.auth.admin.updateUserById(user.id, {
      email: credentials.email,
      password: credentials.password,
      email_confirm: true,
    });
    throwIfError(`Failed to update auth user ${credentials.email}`, error);
  }

  const { error: profileError } = await adminClient.from("users").upsert(
    {
      id: user.id,
      email: credentials.email,
      timezone: "America/Los_Angeles",
    },
    { onConflict: "id" }
  );
  throwIfError(`Failed to upsert profile ${credentials.email}`, profileError);

  return {
    id: user.id,
    email: credentials.email,
    password: credentials.password,
    displayName: credentials.displayName,
  };
}

function buildLensPayload(userId, name, prompt, scheduleType = "daily", categories = ["projects"]) {
  return {
    user_id: userId,
    name,
    prompt,
    schedule_type: scheduleType,
    schedule_time: "08:30",
    schedule_day: scheduleType === "weekly" ? 2 : null,
    lookback_hours: scheduleType === "weekly" ? 168 : 48,
    categories,
  };
}

async function cleanupCommunityFlowData(adminClient, userIds) {
  if (userIds.length === 0) {
    return {
      deletedReports: 0,
      deletedInstalls: 0,
      deletedTemplates: 0,
      deletedLensResults: 0,
      deletedLenses: 0,
    };
  }

  const { data: templates, error: templateReadError } = await adminClient
    .from("lens_templates")
    .select("id")
    .in("author_user_id", userIds);
  throwIfError("Failed to read templates for cleanup", templateReadError);

  const templateIds = (templates ?? []).map((entry) => entry.id);

  const { data: reportsByUser, error: reportsByUserError } = await adminClient
    .from("lens_template_reports")
    .delete()
    .in("reporter_user_id", userIds)
    .select("id");
  throwIfError("Failed to delete user-scoped reports", reportsByUserError);

  let reportsByTemplateCount = 0;
  if (templateIds.length > 0) {
    const { data: reportsByTemplate, error: reportsByTemplateError } = await adminClient
      .from("lens_template_reports")
      .delete()
      .in("template_id", templateIds)
      .select("id");
    throwIfError("Failed to delete template-scoped reports", reportsByTemplateError);
    reportsByTemplateCount = reportsByTemplate?.length ?? 0;
  }

  const { data: installsByUser, error: installsByUserError } = await adminClient
    .from("lens_template_installs")
    .delete()
    .in("user_id", userIds)
    .select("id");
  throwIfError("Failed to delete user-scoped installs", installsByUserError);

  let installsByTemplateCount = 0;
  if (templateIds.length > 0) {
    const { data: installsByTemplate, error: installsByTemplateError } = await adminClient
      .from("lens_template_installs")
      .delete()
      .in("template_id", templateIds)
      .select("id");
    throwIfError("Failed to delete template-scoped installs", installsByTemplateError);
    installsByTemplateCount = installsByTemplate?.length ?? 0;
  }

  const { data: lensResults, error: lensResultsError } = await adminClient
    .from("lens_results")
    .delete()
    .in("user_id", userIds)
    .select("id");
  throwIfError("Failed to delete lens results", lensResultsError);

  const { data: lenses, error: lensesError } = await adminClient
    .from("lenses")
    .delete()
    .in("user_id", userIds)
    .select("id");
  throwIfError("Failed to delete lenses", lensesError);

  const { data: templatesDeleted, error: templateDeleteError } = await adminClient
    .from("lens_templates")
    .delete()
    .in("author_user_id", userIds)
    .select("id");
  throwIfError("Failed to delete templates", templateDeleteError);

  return {
    deletedReports: (reportsByUser?.length ?? 0) + reportsByTemplateCount,
    deletedInstalls: (installsByUser?.length ?? 0) + installsByTemplateCount,
    deletedTemplates: templatesDeleted?.length ?? 0,
    deletedLensResults: lensResults?.length ?? 0,
    deletedLenses: lenses?.length ?? 0,
  };
}

async function createAuthenticatedClient(env, credentials) {
  const client = createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  const { error } = await client.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password,
  });
  throwIfError(`Failed to sign in ${credentials.email}`, error);

  return client;
}

async function writeArtifact(seedDir, fileName, payload) {
  await mkdir(seedDir, { recursive: true });
  await writeFile(path.join(seedDir, fileName), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function seedCommunityFlow(adminClient, env, credentials, paths) {
  const author = await ensureAuthUser(adminClient, credentials.author);
  const installer = await ensureAuthUser(adminClient, credentials.installer);

  const cleanup = await cleanupCommunityFlowData(adminClient, [author.id, installer.id]);

  const { data: authorPublishLens, error: authorPublishLensError } = await adminClient
    .from("lenses")
    .insert(
      buildLensPayload(
        author.id,
        "Author Publishable Lens",
        "Summarize project movement with owners, blockers, and one concrete next step."
      )
    )
    .select("*")
    .single();
  throwIfError("Failed to seed author publishable lens", authorPublishLensError);

  const { data: installerSourceLens, error: installerSourceLensError } = await adminClient
    .from("lenses")
    .insert(
      buildLensPayload(
        installer.id,
        "Installer Seed Lens",
        "Summarize installer-owned notes for risk and follow-up opportunities."
      )
    )
    .select("*")
    .single();
  throwIfError("Failed to seed installer source lens", installerSourceLensError);

  const installerClient = await createAuthenticatedClient(env, installer);
  const { data: installerTemplate, error: installerTemplateError } = await installerClient.rpc("publish_lens_template", {
    p_lens_id: installerSourceLens.id,
    p_author_display_name: INSTALLER_DISPLAY_NAME,
    p_description: INSTALLER_TEMPLATE_DESCRIPTION,
    p_category: "projects",
  });
  throwIfError("Failed to publish installer seed template", installerTemplateError);
  await installerClient.auth.signOut();

  const authorClient = await createAuthenticatedClient(env, author);
  const { data: authorInstalledLens, error: authorInstalledLensError } = await authorClient.rpc("install_lens_template", {
    p_template_id: installerTemplate.id,
  });
  throwIfError("Failed to install seed template as author", authorInstalledLensError);
  await authorClient.auth.signOut();

  const output = {
    seededAt: new Date().toISOString(),
    runTag: paths.runTag,
    artifacts: {
      root: paths.artifactRoot,
      runDir: paths.runDir,
      seedDir: paths.seedDir,
    },
    users: {
      author: {
        id: author.id,
        email: author.email,
        password: author.password,
      },
      installer: {
        id: installer.id,
        email: installer.email,
        password: installer.password,
      },
    },
    seed: {
      authorPublishLensId: authorPublishLens.id,
      authorInstalledCopyLensId: authorInstalledLens.id,
      installerTemplateId: installerTemplate.id,
      installerSourceLensId: installerSourceLens.id,
    },
    cleanup,
  };

  await writeArtifact(paths.seedDir, "seed-output.json", output);

  return output;
}

async function cleanupMode(adminClient, credentials, paths) {
  const author = await ensureAuthUser(adminClient, credentials.author);
  const installer = await ensureAuthUser(adminClient, credentials.installer);
  const cleanup = await cleanupCommunityFlowData(adminClient, [author.id, installer.id]);

  const output = {
    cleanedAt: new Date().toISOString(),
    runTag: paths.runTag,
    artifacts: {
      root: paths.artifactRoot,
      runDir: paths.runDir,
      seedDir: paths.seedDir,
    },
    users: {
      author: {
        id: author.id,
        email: author.email,
      },
      installer: {
        id: installer.id,
        email: installer.email,
      },
    },
    cleanup,
  };

  await writeArtifact(paths.seedDir, "cleanup-output.json", output);
  return output;
}

async function main() {
  const args = parseArgs(process.argv);
  const credentials = getCredentials();
  const paths = artifactPaths();

  if (args.mode === "help") {
    console.log(HELP);
    return;
  }

  const adminClient = createAdminClient();
  const env = getE2EEnv();

  if (args.mode === "dry-run") {
    const output = {
      mode: "dry-run",
      seededAt: new Date().toISOString(),
      runTag: paths.runTag,
      artifacts: {
        root: paths.artifactRoot,
        runDir: paths.runDir,
        seedDir: paths.seedDir,
      },
      users: {
        author: {
          email: credentials.author.email,
          password: credentials.author.password,
        },
        installer: {
          email: credentials.installer.email,
          password: credentials.installer.password,
        },
      },
    };
    if (args.json) {
      process.stdout.write(JSON.stringify(output));
      return;
    }
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  const result = args.mode === "cleanup"
    ? await cleanupMode(adminClient, credentials, paths)
    : await seedCommunityFlow(adminClient, env, credentials, paths);

  if (args.json) {
    process.stdout.write(JSON.stringify(result));
    return;
  }

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
