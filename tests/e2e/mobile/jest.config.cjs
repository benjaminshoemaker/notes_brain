module.exports = {
  testMatch: ["<rootDir>/specs/**/*.e2e.js"],
  testTimeout: 180000,
  verbose: true,
  maxWorkers: 1,
  globalSetup: "detox/runners/jest/globalSetup",
  globalTeardown: "detox/runners/jest/globalTeardown",
  setupFilesAfterEnv: ["<rootDir>/support/setupAfterEnv.cjs"],
  reporters: ["detox/runners/jest/reporter"],
  testEnvironment: "detox/runners/jest/testEnvironment"
};
