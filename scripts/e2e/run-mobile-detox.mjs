import { spawn } from "node:child_process";

import { ensureRequiredE2EEnv, getE2EEnv } from "../../tests/e2e/utils/e2eEnv.mjs";

function mapHostToAndroidEmulator(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost") {
      parsed.hostname = "10.0.2.2";
    }
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return url;
  }
}

function runCommand(command, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      env
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} ${args.join(" ")} exited with code ${code ?? "unknown"}`));
    });
  });
}

async function main() {
  ensureRequiredE2EEnv();

  const { supabaseUrl, supabaseAnonKey } = getE2EEnv();
  const mobileSupabaseUrl = mapHostToAndroidEmulator(supabaseUrl);

  const env = {
    ...process.env,
    EXPO_PUBLIC_SUPABASE_URL: mobileSupabaseUrl,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey
  };

  const npmExecutable = process.platform === "win32" ? "npm.cmd" : "npm";
  const passthrough = process.argv.slice(2);

  await runCommand(
    npmExecutable,
    [
      "exec",
      "--",
      "detox",
      "build",
      "--config-path",
      "./tests/e2e/mobile/detox.config.cjs",
      "--configuration",
      "android.emu.release"
    ],
    env
  );

  await runCommand(
    npmExecutable,
    [
      "exec",
      "--",
      "detox",
      "test",
      "--config-path",
      "./tests/e2e/mobile/detox.config.cjs",
      "--configuration",
      "android.emu.release",
      ...passthrough
    ],
    env
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
