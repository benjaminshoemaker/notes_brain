const { getMobileE2EEnv } = require("./e2eEnv.cjs");

async function loginWithPassword() {
  const { testEmail, testPassword } = getMobileE2EEnv();

  await waitFor(element(by.id("login-email-input")))
    .toBeVisible()
    .withTimeout(15000);

  await element(by.id("login-email-input")).replaceText(testEmail);
  await element(by.id("login-password-input")).replaceText(testPassword);
  await element(by.id("login-submit-button")).tap();

  await waitFor(element(by.id("capture-screen")))
    .toBeVisible()
    .withTimeout(20000);
}

module.exports = {
  loginWithPassword
};

