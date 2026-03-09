const { execFileSync } = require("node:child_process");

const DIGITAL_WELLBEING_PACKAGE = "com.google.android.apps.wellbeing";

function resolveDeviceSerial() {
  const detoxDevice = globalThis.device;
  if (detoxDevice && typeof detoxDevice.id === "string" && detoxDevice.id.length > 0) {
    return detoxDevice.id;
  }

  if (typeof process.env.ANDROID_SERIAL === "string" && process.env.ANDROID_SERIAL.length > 0) {
    return process.env.ANDROID_SERIAL;
  }

  return "";
}

function runAdb(serial, ...args) {
  const serialArgs = serial ? ["-s", serial] : [];

  try {
    execFileSync("adb", [...serialArgs, ...args], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

beforeEach(() => {
  if (process.env.DETOX_DISABLE_WELLBEING === "0") {
    return;
  }

  const serial = resolveDeviceSerial();

  runAdb(serial, "wait-for-device");
  runAdb(serial, "shell", "pm", "disable-user", "--user", "0", DIGITAL_WELLBEING_PACKAGE);
  runAdb(serial, "shell", "am", "force-stop", DIGITAL_WELLBEING_PACKAGE);
});
