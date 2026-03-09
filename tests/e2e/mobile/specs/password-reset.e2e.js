const { requestPasswordReset } = require("../support/mobileFlows.cjs");

describe("mobile e2e: password reset", () => {
  beforeEach(async () => {
    await device.launchApp({ newInstance: true, delete: true });
  });

  it("requests a password reset email from the login screen", async () => {
    await requestPasswordReset();
  });
});
