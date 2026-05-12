const { execFileSync } = require("node:child_process");
const fs = require("node:fs/promises");
const path = require("node:path");

const { ensureRequiredEnv } = require("../support/e2eEnv.cjs");
const { createAdminClient } = require("../support/e2eData.cjs");
const {
  loginWithPassword,
  openManageLenses,
  openLensLibraryFromSummary,
} = require("../support/mobileFlows.cjs");

const ROOT_DIR = path.resolve(__dirname, "../../../../");
const SEED_SCRIPT = path.join(ROOT_DIR, "scripts/e2e/seed-community-lenses-flow.mjs");

function throwIfError(context, error) {
  if (error) {
    throw new Error(`${context}: ${error.message}`);
  }
}

function runSeedScript(mode) {
  const output = execFileSync(
    "node",
    [SEED_SCRIPT, `--${mode}`, "--json"],
    { cwd: ROOT_DIR, encoding: "utf8" }
  );
  return JSON.parse(output);
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function writeJson(runDir, fileName, payload) {
  await ensureDir(runDir);
  await fs.writeFile(
    path.join(runDir, fileName),
    `${JSON.stringify(payload, null, 2)}\n`,
    "utf8"
  );
}

async function captureScreenshot(runDir, name) {
  await ensureDir(runDir);
  const rawPath = await device.takeScreenshot(name);
  const destination = path.join(runDir, `${name}.png`);

  if (typeof rawPath === "string" && rawPath.length > 0) {
    await fs.copyFile(rawPath, destination);
  }

  return destination;
}

async function tapAlertButtonIfPresent(label, timeoutMs = 2000) {
  try {
    await waitFor(element(by.text(label)))
      .toBeVisible()
      .withTimeout(timeoutMs);
    await element(by.text(label)).tap();
    return true;
  } catch {
    return false;
  }
}

async function getTemplateBySourceLens(adminClient, sourceLensId) {
  const { data, error } = await adminClient
    .from("lens_templates")
    .select("id, status")
    .eq("source_lens_id", sourceLensId)
    .maybeSingle();

  throwIfError("Failed to read author template", error);
  if (!data) {
    throw new Error(`Expected template for source lens ${sourceLensId}.`);
  }
  return data;
}

async function getInstalledLensForTemplate(adminClient, installerUserId, templateId) {
  const { data, error } = await adminClient
    .from("lenses")
    .select("id")
    .eq("user_id", installerUserId)
    .eq("source_template_id", templateId)
    .maybeSingle();

  throwIfError("Failed to read installer copied lens", error);
  if (!data) {
    throw new Error(`Expected installer copied lens for template ${templateId}.`);
  }
  return data;
}

describe("mobile e2e: community author to installer flow", () => {
  const adminClient = createAdminClient();
  let seed;
  let runDir;
  let authorTemplateId = null;

  beforeAll(async () => {
    ensureRequiredEnv();
    seed = runSeedScript("seed");
    runDir = path.join(seed.artifacts.runDir, "mobile");
    await writeJson(runDir, "seed-output.json", seed);
  });

  beforeEach(async () => {
    await device.launchApp({ newInstance: true, delete: true });
  });

  afterAll(async () => {
    if (runDir) {
      await writeJson(runDir, "final-state.json", {
        completedAt: new Date().toISOString(),
        authorTemplateId,
      });
    }
    runSeedScript("cleanup");
  });

  it("verifies publish, community browse/install, and post-unpublish copied-lens stability", async () => {
    const author = seed.users.author;
    const installer = seed.users.installer;
    const authorPublishLensId = seed.seed.authorPublishLensId;
    const authorInstalledCopyLensId = seed.seed.authorInstalledCopyLensId;

    await waitFor(element(by.id("login-email-button")))
      .toBeVisible()
      .withTimeout(15000);
    await captureScreenshot(runDir, "author-login");
    await loginWithPassword({ email: author.email, password: author.password });
    await captureScreenshot(runDir, "author-capture-home");
    await element(by.id("tab-summary")).tap();
    await waitFor(element(by.id("summary-screen")))
      .toBeVisible()
      .withTimeout(10000);
    await captureScreenshot(runDir, "author-summary");
    await openManageLenses();
    await captureScreenshot(runDir, "author-manage-before-publish");

    await expect(
      element(by.id(`lens-manage-card-${authorInstalledCopyLensId}`))
    ).toBeVisible();
    await expect(
      element(by.id(`lens-manage-publish-${authorInstalledCopyLensId}`))
    ).not.toExist();

    await waitFor(element(by.id(`lens-manage-publish-${authorPublishLensId}`)))
      .toBeVisible()
      .withTimeout(15000);
    await element(by.id(`lens-manage-publish-${authorPublishLensId}`)).tap();
    await waitFor(element(by.id("community-lens-publish-screen")))
      .toBeVisible()
      .withTimeout(15000);

    await captureScreenshot(runDir, "publish-review");
    await expect(element(by.id("community-lens-publish-privacy-warning"))).toBeVisible();
    await element(by.id("community-lens-publish-author-display-name")).replaceText("Flow Author");
    await element(by.id("community-lens-publish-description")).replaceText(
      "Daily project and risk scan for team handoffs."
    );
    await element(by.id("community-lens-publish-privacy-warning")).tap();
    await waitFor(element(by.id("community-lens-publish-confirm")))
      .toBeVisible()
      .whileElement(by.id("community-lens-publish-scroll"))
      .scroll(180, "down");
    await element(by.id("community-lens-publish-confirm")).tap();

    await waitFor(element(by.id("lens-manage-screen")))
      .toBeVisible()
      .withTimeout(15000);
    await captureScreenshot(runDir, "author-manage-after-publish");
    await expect(
      element(by.id(`lens-manage-community-status-${authorPublishLensId}`))
    ).toBeVisible();

    const authorTemplate = await getTemplateBySourceLens(adminClient, authorPublishLensId);
    authorTemplateId = authorTemplate.id;
    await writeJson(runDir, "author-template.json", authorTemplate);

    await device.launchApp({ newInstance: true, delete: true });
    await waitFor(element(by.id("login-email-button")))
      .toBeVisible()
      .withTimeout(15000);
    await captureScreenshot(runDir, "installer-login");
    await loginWithPassword({ email: installer.email, password: installer.password });
    await captureScreenshot(runDir, "installer-capture-home");
    await element(by.id("tab-summary")).tap();
    await waitFor(element(by.id("summary-screen")))
      .toBeVisible()
      .withTimeout(10000);
    await captureScreenshot(runDir, "installer-summary");
    await openLensLibraryFromSummary();
    await captureScreenshot(runDir, "installer-lens-create");
    await captureScreenshot(runDir, "installer-library-curated");
    await element(by.id("lens-library-mode-community")).tap();

    await waitFor(element(by.id(`lens-library-community-card-${authorTemplateId}`)))
      .toBeVisible()
      .withTimeout(20000);
    await captureScreenshot(runDir, "community-listing");
    await expect(
      element(by.id(`lens-library-community-author-${authorTemplateId}`))
    ).toBeVisible();
    await expect(
      element(by.id(`lens-library-community-install-count-${authorTemplateId}`))
    ).toBeVisible();

    await element(by.id("lens-library-community-search")).replaceText("Author Publishable");
    await element(by.id("lens-library-community-category-projects")).tap();
    await element(by.id(`lens-library-community-card-${authorTemplateId}`)).tap();

    await waitFor(element(by.id("lens-library-preview-screen")))
      .toBeVisible()
      .withTimeout(15000);
    await captureScreenshot(runDir, "community-preview");
    await expect(element(by.id("lens-library-preview-community-author"))).toBeVisible();
    await expect(element(by.id("lens-library-preview-schedule-value"))).toBeVisible();
    await expect(element(by.id("lens-library-preview-lookback-value"))).toBeVisible();
    await expect(element(by.id("lens-library-preview-category-value"))).toBeVisible();

    await waitFor(element(by.id("lens-library-preview-install-button")))
      .toBeVisible()
      .whileElement(by.id("lens-library-preview-screen"))
      .scroll(220, "down");
    await element(by.id("lens-library-preview-install-button")).tap();
    await tapAlertButtonIfPresent("View", 5000);

    await waitFor(element(by.id("lens-manage-screen")))
      .toBeVisible()
      .withTimeout(15000);
    await captureScreenshot(runDir, "installed-copy");

    const installerLens = await getInstalledLensForTemplate(
      adminClient,
      installer.id,
      authorTemplateId
    );
    await expect(element(by.id(`lens-manage-card-${installerLens.id}`))).toBeVisible();
    await writeJson(runDir, "installer-copied-lens.json", installerLens);

    await device.launchApp({ newInstance: true, delete: true });
    await waitFor(element(by.id("login-email-button")))
      .toBeVisible()
      .withTimeout(15000);
    await captureScreenshot(runDir, "author-second-login");
    await loginWithPassword({ email: author.email, password: author.password });
    await captureScreenshot(runDir, "author-second-capture-home");
    await openManageLenses();
    await captureScreenshot(runDir, "author-manage-before-unpublish");
    await waitFor(element(by.id(`lens-manage-unpublish-${authorPublishLensId}`)))
      .toBeVisible()
      .withTimeout(15000);
    await element(by.id(`lens-manage-unpublish-${authorPublishLensId}`)).tap();
    await tapAlertButtonIfPresent("Unpublish", 5000);
    await device.launchApp({ newInstance: true, delete: true });
    await waitFor(element(by.id("login-email-button")))
      .toBeVisible()
      .withTimeout(15000);
    await captureScreenshot(runDir, "installer-second-login");
    await loginWithPassword({ email: installer.email, password: installer.password });
    await captureScreenshot(runDir, "installer-second-capture-home");
    await openLensLibraryFromSummary();
    await captureScreenshot(runDir, "installer-second-library-curated");
    await element(by.id("lens-library-mode-community")).tap();

    await expect(
      element(by.id(`lens-library-community-card-${authorTemplateId}`))
    ).not.toExist();
    await captureScreenshot(runDir, "post-unpublish");

    await element(by.id("tab-summary")).tap();
    await waitFor(element(by.id("summary-screen")))
      .toBeVisible()
      .withTimeout(10000);
    await captureScreenshot(runDir, "installer-summary-after-unpublish");
    await waitFor(element(by.id("summary-header-manage-lenses-button")))
      .toBeVisible()
      .withTimeout(10000);
    await element(by.id("summary-header-manage-lenses-button")).tap();
    await waitFor(element(by.id("lens-manage-screen")))
      .toBeVisible()
      .withTimeout(15000);
    await captureScreenshot(runDir, "installer-manage-final");
    await expect(element(by.id(`lens-manage-card-${installerLens.id}`))).toBeVisible();
  });
});
