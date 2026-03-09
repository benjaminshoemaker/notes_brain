import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

import { ensureRequiredE2EEnv, getE2EEnv } from "../../tests/e2e/utils/e2eEnv.mjs";

const MAC_ANDROID_STUDIO_JAVA_HOME = "/Applications/Android Studio.app/Contents/jbr/Contents/Home";

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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

function runCommandCapture(command, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"],
      env
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} exited with code ${code ?? "unknown"}${stderr ? `\n${stderr}` : ""}`));
    });
  });
}

function normalizeJavaEnv(env) {
  if (env.JAVA_HOME || process.platform !== "darwin") {
    return env;
  }

  if (!existsSync(MAC_ANDROID_STUDIO_JAVA_HOME)) {
    return env;
  }

  const javaBin = `${MAC_ANDROID_STUDIO_JAVA_HOME}/bin`;
  return {
    ...env,
    JAVA_HOME: MAC_ANDROID_STUDIO_JAVA_HOME,
    PATH: `${javaBin}:${env.PATH ?? ""}`
  };
}

function parseEmulatorSerials(adbDevicesOutput) {
  return adbDevicesOutput
    .split(/\r?\n/)
    .map((line) => line.trim())
    .map((line) => line.split(/\s+/))
    .filter(([serial, status]) => /^emulator-\d+$/.test(serial ?? "") && status === "device")
    .map(([serial]) => serial);
}

async function listRunningEmulators(env) {
  const { stdout } = await runCommandCapture("adb", ["devices"], env);
  return parseEmulatorSerials(stdout);
}

async function stopRunningEmulators(env) {
  const keepRunning = env.E2E_KEEP_RUNNING_EMULATORS === "1";
  if (keepRunning) return;

  const running = await listRunningEmulators(env);
  if (running.length === 0) return;

  for (const serial of running) {
    try {
      await runCommand("adb", ["-s", serial, "emu", "kill"], env);
    } catch {
      // Continue cleanup even if one emulator exits unexpectedly.
    }
  }

  for (let attempt = 0; attempt < 40; attempt += 1) {
    const remaining = await listRunningEmulators(env);
    if (remaining.length === 0) return;
    await sleep(500);
  }

  throw new Error("Timed out waiting for running Android emulators to stop.");
}

async function resolveDetoxAvdName(env) {
  if (env.DETOX_AVD_NAME) return env.DETOX_AVD_NAME;

  try {
    const { stdout } = await runCommandCapture("emulator", ["-list-avds"], env);
    const avdNames = stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (avdNames.length === 0) return "";

    return avdNames.find((name) => name === "Pixel_9")
      || avdNames.find((name) => name.toLowerCase().includes("pixel"))
      || avdNames[0];
  } catch {
    return "";
  }
}

async function main() {
  ensureRequiredE2EEnv();

  const { supabaseUrl, supabaseAnonKey } = getE2EEnv();
  const mobileSupabaseUrl = mapHostToAndroidEmulator(supabaseUrl);

  let env = {
    ...process.env,
    EXPO_PUBLIC_SUPABASE_URL: mobileSupabaseUrl,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey,
    EXPO_PUBLIC_E2E: "1"
  };
  env = normalizeJavaEnv(env);

  const resolvedAvdName = await resolveDetoxAvdName(env);
  if (resolvedAvdName && !env.DETOX_AVD_NAME) {
    env.DETOX_AVD_NAME = resolvedAvdName;
  }

  await stopRunningEmulators(env);

  const npmExecutable = process.platform === "win32" ? "npm.cmd" : "npm";
  const passthrough = process.argv.slice(2);
  const detoxConfiguration = process.env.DETOX_CONFIGURATION || "android.emu.detox";

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
      detoxConfiguration
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
      detoxConfiguration,
      ...passthrough
    ],
    env
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
