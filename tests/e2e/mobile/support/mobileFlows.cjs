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
      await waitFor(element(by.id("login-email-input")))
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

async function loginWithPassword() {
  const { testEmail, testPassword } = getMobileE2EEnv();

  await waitForLoginScreen();

  await element(by.id("login-email-input")).replaceText(testEmail);
  await element(by.id("login-password-input")).replaceText(testPassword);
  await element(by.id("login-submit-button")).tap();

  await waitFor(element(by.id("capture-screen")))
    .toBeVisible()
    .withTimeout(20000);
}

async function requestPasswordReset() {
  const { testEmail } = getMobileE2EEnv();

  await waitForLoginScreen();

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
  requestPasswordReset
};
