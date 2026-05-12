const { getMobileE2EEnv } = require("./e2eEnv.cjs");

async function dismissSystemCloseAppDialogIfPresent() {
  try {
    await waitFor(element(by.text("Close app")))
      .toBeVisible()
      .withTimeout(1000);
    await element(by.text("Close app")).tap();
    await device.launchApp({ newInstance: false });
  } catch {
    // No blocking Android system crash/ANR dialog.
  }
}

async function waitForLoginScreen() {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await dismissSystemCloseAppDialogIfPresent();

    try {
      await waitFor(element(by.id("login-email-button")))
        .toBeVisible()
        .withTimeout(6000);
      return;
    } catch (error) {
      if (attempt === 2) {
        throw error;
      }

      await device.launchApp({ newInstance: false });
    }
  }
}

async function loginWithPassword(options = {}) {
  const { testEmail, testPassword } = getMobileE2EEnv();
  const email = options.email ?? testEmail;
  const password = options.password ?? testPassword;

  await waitForLoginScreen();

  await element(by.id("login-email-button")).tap();
  await waitFor(element(by.id("login-email-input")))
    .toBeVisible()
    .withTimeout(6000);
  await element(by.id("login-email-input")).replaceText(email);
  await element(by.id("login-password-input")).replaceText(password);
  await element(by.id("login-submit-button")).tap();

  await waitFor(element(by.id("capture-screen")))
    .toBeVisible()
    .withTimeout(20000);
}

async function openManageLenses() {
  await element(by.id("tab-summary")).tap();
  await waitFor(element(by.id("summary-screen")))
    .toBeVisible()
    .withTimeout(10000);
  await waitFor(element(by.id("summary-header-manage-lenses-button")))
    .toBeVisible()
    .withTimeout(10000);
  await element(by.id("summary-header-manage-lenses-button")).tap();
  await waitFor(element(by.id("lens-manage-screen")))
    .toBeVisible()
    .withTimeout(15000);
}

async function openLensLibraryFromSummary() {
  await element(by.id("tab-summary")).tap();
  await waitFor(element(by.id("summary-screen")))
    .toBeVisible()
    .withTimeout(10000);
  await waitFor(element(by.id("summary-header-create-lens-button")))
    .toBeVisible()
    .withTimeout(10000);
  await element(by.id("summary-header-create-lens-button")).tap();
  await waitFor(element(by.id("lens-create-screen")))
    .toBeVisible()
    .withTimeout(10000);
  await element(by.id("lens-create-library-button")).tap();
  await waitFor(element(by.id("lens-library-screen")))
    .toBeVisible()
    .withTimeout(15000);
}

async function tapTextIfPresent(label, timeoutMs = 2000) {
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

async function signOutFromSettings() {
  await element(by.id("tab-settings")).tap();
  await waitFor(element(by.id("settings-screen")))
    .toBeVisible()
    .withTimeout(10000);
  await waitFor(element(by.id("app-signout-button")))
    .toBeVisible()
    .withTimeout(10000);
  await element(by.id("app-signout-button")).tap();
  await tapTextIfPresent("Sign Out", 4000);
  await waitFor(element(by.id("login-email-button")))
    .toBeVisible()
    .withTimeout(20000);
}

async function requestPasswordReset() {
  const { testEmail } = getMobileE2EEnv();

  await waitForLoginScreen();

  await element(by.id("login-email-button")).tap();
  await waitFor(element(by.id("login-email-input")))
    .toBeVisible()
    .withTimeout(6000);
  await element(by.id("login-email-input")).replaceText(testEmail);
  await element(by.id("login-forgot-password-button")).tap();

  try {
    await waitFor(element(by.id("login-status-message")))
      .toBeVisible()
      .withTimeout(20000);
    return;
  } catch {
    await waitFor(element(by.id("login-error-message")))
      .toBeVisible()
      .withTimeout(20000);
  }
}

module.exports = {
  loginWithPassword,
  requestPasswordReset,
  openManageLenses,
  openLensLibraryFromSummary,
  signOutFromSettings
};
