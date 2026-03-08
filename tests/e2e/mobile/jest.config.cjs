module.exports = {
  testEnvironment: "node",
  testMatch: ["<rootDir>/tests/e2e/mobile/specs/**/*.e2e.js"],
  setupFilesAfterEnv: ["<rootDir>/tests/e2e/mobile/setup.cjs"],
  verbose: true,
  maxWorkers: 1
};

