const { ensureRequiredEnv } = require("../support/e2eEnv.cjs");
const {
  createAdminClient,
  ensureE2EUser,
  clearUserData,
  seedDailySummary
} = require("../support/e2eData.cjs");
const { loginWithPassword } = require("../support/mobileFlows.cjs");

describe("mobile e2e: capture and summary", () => {
  const adminClient = createAdminClient();
  let e2eUser;

  beforeAll(async () => {
    ensureRequiredEnv();
    e2eUser = await ensureE2EUser(adminClient);
  });

  beforeEach(async () => {
    await clearUserData(adminClient, e2eUser.id);
    await device.launchApp({ newInstance: true, delete: true });
  });

  afterAll(async () => {
    if (!e2eUser) return;
    await clearUserData(adminClient, e2eUser.id);
  });

  it("captures a text note and displays it in the notes tab", async () => {
    const noteText = `detox text note ${Date.now().toString(36)}`;

    await loginWithPassword();

    await element(by.id("capture-text-input")).tap();
    await element(by.id("capture-text-input")).replaceText(noteText);
    await element(by.id("capture-submit-button")).tap();

    await element(by.id("tab-notes")).tap();
    await expect(element(by.id("notes-screen"))).toBeVisible();
    await waitFor(element(by.text(noteText)))
      .toBeVisible()
      .withTimeout(20000);
  });

  it("shows a seeded daily summary on the summary tab", async () => {
    await seedDailySummary(adminClient, e2eUser.id);

    await loginWithPassword();

    await element(by.id("tab-summary")).tap();
    await expect(element(by.id("summary-screen"))).toBeVisible();
    await waitFor(element(by.id("summary-card")))
      .toBeVisible()
      .withTimeout(15000);
    await expect(element(by.text("Phase 2 mobile flow check"))).toBeVisible();
  });
});
