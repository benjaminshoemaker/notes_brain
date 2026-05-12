import assert from "node:assert/strict";
import { appendFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { ensureRequiredE2EEnv } from "../utils/e2eEnv.mjs";
import { createAdminClient, createAnonClient } from "../utils/e2eSupabase.mjs";

ensureRequiredE2EEnv();

const adminClient = createAdminClient();
const runTag = Date.now().toString(36);
const authorCredentials = {
  email: `notesbrain-community-author-${runTag}@example.com`,
  password: "NotesBrainE2EPassword123!"
};
const installerCredentials = {
  email: `notesbrain-community-installer-${runTag}@example.com`,
  password: "NotesBrainE2EPassword123!"
};
const artifactRoot = path.resolve(process.cwd(), "artifacts/community-lenses/end-to-end");
const artifactRunId = `${new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-")}-${Math.random().toString(36).slice(2, 8)}`;
const backendArtifactDir = path.join(artifactRoot, `run-${artifactRunId}`, "backend");

let authorUser;
let installerUser;

async function writeBackendArtifact(fileName, payload) {
  await mkdir(backendArtifactDir, { recursive: true });
  await writeFile(
    path.join(backendArtifactDir, fileName),
    `${JSON.stringify(payload, null, 2)}\n`,
    "utf8"
  );
}

async function appendBackendLog(message) {
  await mkdir(backendArtifactDir, { recursive: true });
  await appendFile(
    path.join(backendArtifactDir, "backend-output.log"),
    `[${new Date().toISOString()}] ${message}\n`,
    "utf8"
  );
}

function throwIfError(context, error) {
  if (error) {
    throw new Error(`${context}: ${error.message}`);
  }
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

async function ensureAuthUser({ email, password }) {
  const normalizedEmail = email.trim().toLowerCase();
  let authUser = await findAuthUserByEmail(adminClient, normalizedEmail);

  if (!authUser) {
    const { data, error } = await adminClient.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true
    });
    throwIfError("Failed to create auth user", error);
    authUser = data.user;
  } else {
    const { error } = await adminClient.auth.admin.updateUserById(authUser.id, {
      email: normalizedEmail,
      password,
      email_confirm: true
    });
    throwIfError("Failed to update auth user", error);
  }

  const { error: profileError } = await adminClient.from("users").upsert(
    {
      id: authUser.id,
      email: normalizedEmail,
      timezone: "America/Los_Angeles"
    },
    { onConflict: "id" }
  );
  throwIfError("Failed to upsert user profile", profileError);

  return {
    id: authUser.id,
    email: normalizedEmail,
    password
  };
}

async function createAuthenticatedClient(credentials) {
  const client = createAnonClient();
  const { error } = await client.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password
  });
  throwIfError(`Failed to sign in ${credentials.email}`, error);
  return client;
}

async function signOut(client) {
  if (!client) return;
  await client.auth.signOut();
}

async function cleanupCommunityData(userIds) {
  if (userIds.length === 0) return;

  const { data: templates, error: templateSelectError } = await adminClient
    .from("lens_templates")
    .select("id")
    .in("author_user_id", userIds);
  throwIfError("Failed to read templates for cleanup", templateSelectError);
  const templateIds = (templates ?? []).map((entry) => entry.id);

  const reportDelete = adminClient.from("lens_template_reports").delete().in("reporter_user_id", userIds);
  const installsDeleteByUser = adminClient.from("lens_template_installs").delete().in("user_id", userIds);
  const lensesDelete = adminClient.from("lenses").delete().in("user_id", userIds);
  const resultsDelete = adminClient.from("lens_results").delete().in("user_id", userIds);

  throwIfError("Failed to clear reports", (await reportDelete).error);
  throwIfError("Failed to clear installs by user", (await installsDeleteByUser).error);
  throwIfError("Failed to clear lens results", (await resultsDelete).error);

  if (templateIds.length > 0) {
    const installsDeleteByTemplate = adminClient
      .from("lens_template_installs")
      .delete()
      .in("template_id", templateIds);
    throwIfError("Failed to clear installs by template", (await installsDeleteByTemplate).error);
  }

  throwIfError("Failed to clear templates", (await adminClient.from("lens_templates").delete().in("author_user_id", userIds)).error);
  throwIfError("Failed to clear lenses", (await lensesDelete).error);
}

async function createSourceLens(userId, suffix) {
  const { data, error } = await adminClient
    .from("lenses")
    .insert({
      user_id: userId,
      name: `Community Lens ${suffix}`,
      prompt: `Summarize the highest-value notes for community lens ${suffix} with concrete actions and one risk to monitor.`,
      schedule_type: "daily",
      schedule_time: "08:00",
      lookback_hours: 24,
      categories: ["ideas"]
    })
    .select("*")
    .single();
  throwIfError("Failed to create source lens", error);
  return data;
}

async function insertTemplateRowAsAuthor(sourceLens, suffix) {
  const { data, error } = await adminClient
    .from("lens_templates")
    .insert({
      source_lens_id: sourceLens.id,
      author_user_id: authorUser.id,
      author_display_name: "Builder",
      name: sourceLens.name,
      description: `Seeded template ${suffix}`,
      prompt: sourceLens.prompt,
      schedule_type: sourceLens.schedule_type,
      schedule_time: sourceLens.schedule_time,
      schedule_day: sourceLens.schedule_day,
      lookback_hours: sourceLens.lookback_hours,
      categories: sourceLens.categories,
      category: "ideas",
      version: 1,
      status: "public",
      install_count: 0
    })
    .select("*")
    .single();
  throwIfError("Failed to seed template row", error);
  return data;
}

async function publishTemplate(authorClient, lensId, suffix, overrides = {}) {
  const payload = {
    p_lens_id: lensId,
    p_author_display_name: overrides.authorDisplayName ?? "Builder",
    p_description: overrides.description ?? `Community template ${suffix}`,
    p_category: overrides.category ?? "ideas"
  };
  return authorClient.rpc("publish_lens_template", payload);
}

test.before(async () => {
  authorUser = await ensureAuthUser(authorCredentials);
  installerUser = await ensureAuthUser(installerCredentials);
  await appendBackendLog(`Run started for ${authorCredentials.email} and ${installerCredentials.email}`);
});

test.beforeEach(async () => {
  await cleanupCommunityData([authorUser.id, installerUser.id]);
});

test.after(async () => {
  if (!authorUser || !installerUser) return;
  await cleanupCommunityData([authorUser.id, installerUser.id]);
  await appendBackendLog("Cleanup completed");
});

test("publish validates metadata and enforces the 10-new-templates-per-day limit", async () => {
  const authorClient = await createAuthenticatedClient(authorCredentials);

  try {
    const baseLens = await createSourceLens(authorUser.id, "base");
    const { data: published, error: publishError } = await publishTemplate(authorClient, baseLens.id, "base");
    assert.equal(publishError, null, publishError?.message);
    assert.equal(published.author_user_id, authorUser.id);

    const { error: invalidNameError } = await publishTemplate(authorClient, baseLens.id, "invalid-name", {
      authorDisplayName: "author@example.com"
    });
    assert.match(invalidNameError?.message ?? "", /must not contain an email address/i);

    const { error: emptyDescriptionError } = await publishTemplate(authorClient, baseLens.id, "empty-description", {
      description: "   "
    });
    assert.match(emptyDescriptionError?.message ?? "", /description is required/i);

    for (let index = 0; index < 10; index += 1) {
      const seedLens = await createSourceLens(installerUser.id, `limit-seed-${index}`);
      await insertTemplateRowAsAuthor(seedLens, `limit-seed-${index}`);
    }

    const limitLens = await createSourceLens(authorUser.id, "limit-hit");
    const { error: limitError } = await publishTemplate(authorClient, limitLens.id, "limit-hit");
    assert.match(limitError?.message ?? "", /publish limit/i);
  } finally {
    await signOut(authorClient);
  }
});

test("public view and install flow enforce privacy, copy semantics, and publish restrictions", async () => {
  const authorClient = await createAuthenticatedClient(authorCredentials);
  const installerClient = await createAuthenticatedClient(installerCredentials);

  try {
    const sourceLens = await createSourceLens(authorUser.id, "install");
    const { data: template, error: publishError } = await publishTemplate(authorClient, sourceLens.id, "install");
    assert.equal(publishError, null, publishError?.message);
    assert.equal(template.status, "public");

    const { error: selfInstallError } = await authorClient.rpc("install_lens_template", {
      p_template_id: template.id
    });
    assert.match(selfInstallError?.message ?? "", /cannot install their own/i);

    const { data: publicRows, error: publicError } = await installerClient
      .from("community_lens_templates_public")
      .select("*")
      .eq("id", template.id);
    assert.equal(publicError, null, publicError?.message);
    assert.equal(publicRows?.length, 1);
    assert.equal(Object.prototype.hasOwnProperty.call(publicRows[0], "author_user_id"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(publicRows[0], "source_lens_id"), false);

    const { data: installedLens, error: installError } = await installerClient.rpc("install_lens_template", {
      p_template_id: template.id
    });
    assert.equal(installError, null, installError?.message);
    assert.equal(installedLens.user_id, installerUser.id);
    assert.equal(installedLens.source_template_id, template.id);
    assert.equal(installedLens.source_template_version, template.version);
    assert.equal(installedLens.name, template.name);
    assert.equal(installedLens.prompt, template.prompt);
    assert.equal(installedLens.template_snapshot.template_id, template.id);
    assert.equal(installedLens.template_snapshot.version, template.version);
    assert.equal(installedLens.template_snapshot.author_name, "Builder");
    assert.equal(installedLens.template_snapshot.prompt, template.prompt);

    const { data: installs, error: installsError } = await adminClient
      .from("lens_template_installs")
      .select("template_id, template_version, installed_lens_id, user_id")
      .eq("template_id", template.id)
      .eq("user_id", installerUser.id);
    assert.equal(installsError, null, installsError?.message);
    assert.equal(installs?.length, 1);
    assert.equal(installs[0].installed_lens_id, installedLens.id);
    assert.equal(installs[0].template_version, template.version);

    const { data: templateAfterInstall, error: templateAfterInstallError } = await adminClient
      .from("lens_templates")
      .select("install_count")
      .eq("id", template.id)
      .single();
    assert.equal(templateAfterInstallError, null, templateAfterInstallError?.message);
    assert.equal(templateAfterInstall.install_count, 1);

    const { error: duplicateInstallError } = await installerClient.rpc("install_lens_template", {
      p_template_id: template.id
    });
    assert.match(duplicateInstallError?.message ?? "", /already installed/i);

    const { error: installedCopyPublishError } = await publishTemplate(installerClient, installedLens.id, "installed-copy", {
      authorDisplayName: "Installer",
      description: "Attempting to republish installed copy"
    });
    assert.match(installedCopyPublishError?.message ?? "", /Installed library lenses cannot be published/i);

    const { data: templateSnapshot, error: templateSnapshotError } = await adminClient
      .from("lens_templates")
      .select("id, source_lens_id, author_display_name, status, version, install_count, category, created_at, updated_at")
      .eq("id", template.id)
      .single();
    assert.equal(templateSnapshotError, null, templateSnapshotError?.message);

    await writeBackendArtifact("lens_templates.json", {
      template: templateSnapshot
    });
    await writeBackendArtifact("lens_template_installs.json", {
      installs
    });
    await writeBackendArtifact("installer_lens.json", {
      installedLens
    });
    await appendBackendLog(`Install snapshot captured for template ${template.id}`);
  } finally {
    await signOut(authorClient);
    await signOut(installerClient);
  }
});

test("source edits version templates, preserving installed copies and enforcing moderation/provenance guards", async () => {
  const authorClient = await createAuthenticatedClient(authorCredentials);
  const installerClient = await createAuthenticatedClient(installerCredentials);

  try {
    const sourceLens = await createSourceLens(authorUser.id, "versioning");
    const { data: template, error: publishError } = await publishTemplate(authorClient, sourceLens.id, "versioning");
    assert.equal(publishError, null, publishError?.message);

    const { error: spoofErrorBeforeInstall } = await installerClient.from("lenses").insert({
      user_id: installerUser.id,
      name: "Spoofed provenance lens",
      prompt: "This prompt should fail because it tries to set community provenance directly from the client API.",
      schedule_type: "daily",
      schedule_time: "09:00",
      lookback_hours: 24,
      source_template_id: template.id
    });
    assert.match(spoofErrorBeforeInstall?.message ?? "", /provenance can only be set by install_lens_template/i);

    const { data: installedLens, error: installError } = await installerClient.rpc("install_lens_template", {
      p_template_id: template.id
    });
    assert.equal(installError, null, installError?.message);

    const { error: updateSourceError } = await adminClient
      .from("lenses")
      .update({
        name: "Community Lens versioned",
        prompt: "Summarize decisions, blockers, and next steps from the last 72 hours with explicit owner suggestions.",
        schedule_type: "weekly",
        schedule_time: "10:30",
        schedule_day: 2,
        lookback_hours: 72,
        categories: ["projects", "ideas"]
      })
      .eq("id", sourceLens.id);
    assert.equal(updateSourceError, null, updateSourceError?.message);

    const { data: updatedTemplate, error: updatedTemplateError } = await adminClient
      .from("lens_templates")
      .select("id, version, name, prompt, schedule_type, schedule_time, schedule_day, lookback_hours, categories")
      .eq("id", template.id)
      .single();
    assert.equal(updatedTemplateError, null, updatedTemplateError?.message);
    assert.equal(updatedTemplate.version, template.version + 1);
    assert.equal(updatedTemplate.name, "Community Lens versioned");
    assert.equal(updatedTemplate.schedule_type, "weekly");
    assert.equal(updatedTemplate.schedule_day, 2);
    assert.equal(updatedTemplate.lookback_hours, 72);

    const { data: versionRows, error: versionsError } = await adminClient
      .from("lens_template_versions")
      .select("version")
      .eq("template_id", template.id)
      .order("version", { ascending: true });
    assert.equal(versionsError, null, versionsError?.message);
    assert.ok((versionRows?.length ?? 0) >= 2);
    assert.equal(versionRows.at(-1)?.version, template.version + 1);

    const { data: installedLensAfterUpdate, error: installedLensAfterUpdateError } = await adminClient
      .from("lenses")
      .select("name, prompt, source_template_version, template_snapshot")
      .eq("id", installedLens.id)
      .single();
    assert.equal(installedLensAfterUpdateError, null, installedLensAfterUpdateError?.message);
    assert.equal(installedLensAfterUpdate.name, template.name);
    assert.equal(installedLensAfterUpdate.prompt, template.prompt);
    assert.equal(installedLensAfterUpdate.source_template_version, template.version);
    assert.equal(installedLensAfterUpdate.template_snapshot.version, template.version);

    const { error: unpublishError } = await authorClient.rpc("unpublish_lens_template", {
      p_lens_id: sourceLens.id
    });
    assert.equal(unpublishError, null, unpublishError?.message);

    const { data: publicRowsAfterUnpublish, error: publicAfterUnpublishError } = await installerClient
      .from("community_lens_templates_public")
      .select("id")
      .eq("id", template.id);
    assert.equal(publicAfterUnpublishError, null, publicAfterUnpublishError?.message);
    assert.equal(publicRowsAfterUnpublish?.length, 0);

    const { error: installAfterUnpublishError } = await installerClient.rpc("install_lens_template", {
      p_template_id: template.id
    });
    assert.match(installAfterUnpublishError?.message ?? "", /not available/i);

    const { error: republishError } = await publishTemplate(authorClient, sourceLens.id, "republish");
    assert.equal(republishError, null, republishError?.message);

    const { error: delistError } = await adminClient
      .from("lens_templates")
      .update({ status: "delisted" })
      .eq("id", template.id);
    assert.equal(delistError, null, delistError?.message);

    const { error: republishFromDelistedError } = await publishTemplate(authorClient, sourceLens.id, "republish-delisted");
    assert.match(republishFromDelistedError?.message ?? "", /cannot be republished from its moderation state/i);

    const { data: versionsSnapshot, error: versionsSnapshotError } = await adminClient
      .from("lens_template_versions")
      .select("template_id, version, snapshot, created_at")
      .eq("template_id", template.id)
      .order("version", { ascending: true });
    assert.equal(versionsSnapshotError, null, versionsSnapshotError?.message);
    await writeBackendArtifact("lens_template_versions.json", {
      templateId: template.id,
      versions: versionsSnapshot
    });
    await appendBackendLog(`Version snapshot captured for template ${template.id}`);
  } finally {
    await signOut(authorClient);
    await signOut(installerClient);
  }
});

test("report_lens_template returns existing active report without overwriting reason or note", async () => {
  const authorClient = await createAuthenticatedClient(authorCredentials);
  const installerClient = await createAuthenticatedClient(installerCredentials);

  try {
    const sourceLens = await createSourceLens(authorUser.id, "reports");
    const { data: template, error: publishError } = await publishTemplate(authorClient, sourceLens.id, "reports");
    assert.equal(publishError, null, publishError?.message);

    const { data: firstReport, error: firstReportError } = await installerClient.rpc("report_lens_template", {
      p_template_id: template.id,
      p_reason: "spam",
      p_note: "First moderation report"
    });
    assert.equal(firstReportError, null, firstReportError?.message);
    assert.equal(firstReport.reason, "spam");
    assert.equal(firstReport.note, "First moderation report");

    const { data: duplicateReport, error: duplicateReportError } = await installerClient.rpc("report_lens_template", {
      p_template_id: template.id,
      p_reason: "unsafe_prompt",
      p_note: "Second report should not replace first"
    });
    assert.equal(duplicateReportError, null, duplicateReportError?.message);
    assert.equal(duplicateReport.id, firstReport.id);
    assert.equal(duplicateReport.reason, "spam");
    assert.equal(duplicateReport.note, "First moderation report");

    const { data: storedReports, error: storedReportsError } = await adminClient
      .from("lens_template_reports")
      .select("id, reason, note")
      .eq("template_id", template.id)
      .eq("reporter_user_id", installerUser.id)
      .is("resolved_at", null);
    assert.equal(storedReportsError, null, storedReportsError?.message);
    assert.equal(storedReports?.length, 1);
    assert.equal(storedReports[0].reason, "spam");
    assert.equal(storedReports[0].note, "First moderation report");

    await writeBackendArtifact("lens_template_reports.json", {
      templateId: template.id,
      reports: storedReports
    });
    await appendBackendLog(`Report snapshot captured for template ${template.id}`);
  } finally {
    await signOut(authorClient);
    await signOut(installerClient);
  }
});
