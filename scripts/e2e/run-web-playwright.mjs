import { spawn } from "node:child_process";

import { ensureRequiredE2EEnv } from "../../tests/e2e/utils/e2eEnv.mjs";

ensureRequiredE2EEnv();

const npmExecutable = process.platform === "win32" ? "npm.cmd" : "npm";
const args = ["exec", "--", "playwright", "test", "--config", "tests/e2e/web/playwright.config.mjs"];
const passthrough = process.argv.slice(2);

const child = spawn(npmExecutable, [...args, ...passthrough], {
  stdio: "inherit",
  env: process.env
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
