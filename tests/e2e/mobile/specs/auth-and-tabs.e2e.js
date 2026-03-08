const { ensureRequiredEnv } = require("../support/e2eEnv.cjs");
const {
  createAdminClient,
  ensureE2EUser,
  clearUserData
} = require("../support/e2eData.cjs");
const { loginWithPassword } = require("../support/mobileFlows.cjs");

describe("mobile e2e: auth and tab navigation", () => {
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

  it("signs in with email/password and opens each primary tab", async () => {
    await loginWithPassword();

    await expect(element(by.id("capture-screen"))).toBeVisible();

    await element(by.id("tab-notes")).tap();
    await expect(element(by.id("notes-screen"))).toBeVisible();

    await element(by.id("tab-summary")).tap();
    await expect(element(by.id("summary-screen"))).toBeVisible();

    await element(by.id("tab-settings")).tap();
    await expect(element(by.id("settings-screen"))).toBeVisible();
    await expect(element(by.id("settings-timezone-select"))).toBeVisible();
  });
});

