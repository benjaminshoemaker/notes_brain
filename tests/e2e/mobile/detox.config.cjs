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
    "android.debug": {
      type: "android.apk",
      binaryPath: "apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk",
      testBinaryPath:
        "apps/mobile/android/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk",
      build:
        "cd apps/mobile/android && ./gradlew --no-daemon assembleDebug assembleAndroidTest -DtestBuildType=debug"
    },
    "android.detox": {
      type: "android.apk",
      binaryPath: "apps/mobile/android/app/build/outputs/apk/detox/app-detox.apk",
      testBinaryPath:
        "apps/mobile/android/app/build/outputs/apk/androidTest/detox/app-detox-androidTest.apk",
      build:
        "cd apps/mobile/android && ./gradlew --no-daemon -Dorg.gradle.jvmargs='-Xmx4096m -XX:MaxMetaspaceSize=1024m' :app:createBundleDetoxJsAndAssets --rerun-tasks -PreactNativeArchitectures=arm64-v8a,x86_64 && ./gradlew --no-daemon -Dorg.gradle.jvmargs='-Xmx4096m -XX:MaxMetaspaceSize=1024m' assembleDetox assembleAndroidTest -DtestBuildType=detox -x lint -x test -PreactNativeArchitectures=arm64-v8a,x86_64"
    },
    "android.release": {
      type: "android.apk",
      binaryPath: "apps/mobile/android/app/build/outputs/apk/release/app-release.apk",
      testBinaryPath:
        "apps/mobile/android/app/build/outputs/apk/androidTest/release/app-release-androidTest.apk",
      build:
        "cd apps/mobile/android && ./gradlew --no-daemon -Dorg.gradle.jvmargs='-Xmx4096m -XX:MaxMetaspaceSize=1024m' :app:createBundleReleaseJsAndAssets --rerun-tasks -PreactNativeArchitectures=arm64-v8a,x86_64 && ./gradlew --no-daemon -Dorg.gradle.jvmargs='-Xmx4096m -XX:MaxMetaspaceSize=1024m' assembleRelease assembleAndroidTest -DtestBuildType=release -x lint -x test -PreactNativeArchitectures=arm64-v8a,x86_64"
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
    "android.emu.debug": {
      device: "emulator",
      app: "android.debug"
    },
    "android.emu.detox": {
      device: "emulator",
      app: "android.detox"
    },
    "android.emu.release": {
      device: "emulator",
      app: "android.release"
    }
  }
};
