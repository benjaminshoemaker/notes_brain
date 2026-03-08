const avdName = process.env.DETOX_AVD_NAME || "Pixel_6_API_34";

module.exports = {
  testRunner: {
    args: {
      $0: "jest",
      config: "tests/e2e/mobile/jest.config.cjs"
    },
    jest: {
      setupTimeout: 180000
    }
  },
  apps: {
    "android.release": {
      type: "android.apk",
      binaryPath: "apps/mobile/android/app/build/outputs/apk/release/app-release.apk",
      testBinaryPath:
        "apps/mobile/android/app/build/outputs/apk/androidTest/release/app-release-androidTest.apk",
      build:
        "cd apps/mobile/android && ./gradlew assembleRelease assembleAndroidTest -DtestBuildType=release"
    }
  },
  devices: {
    emulator: {
      type: "android.emulator",
      device: {
        avdName
      }
    }
  },
  configurations: {
    "android.emu.release": {
      device: "emulator",
      app: "android.release"
    }
  }
};

