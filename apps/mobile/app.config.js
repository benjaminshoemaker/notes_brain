export default {
  expo: {
    name: "NotesBrain",
    slug: "notes-brain",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    scheme: "notesbrain",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.notesbrain.app"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      package: "com.notesbrain.app",
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON || "./google-services.json",
      permissions: [
        "android.permission.RECORD_AUDIO",
        "android.permission.MODIFY_AUDIO_SETTINGS"
      ]
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/favicon.png"
    },
    plugins: [
      [
        "expo-router",
        {
          root: "./app"
        }
      ],
      "expo-secure-store",
      [
        "expo-notifications",
        {
          icon: "./assets/icon.png",
          color: "#0066cc"
        }
      ],
      [
        "expo-share-intent",
        {
          androidIntentFilters: [
            "text/*",
            "image/*",
            "application/pdf"
          ],
          androidMultiIntentFilters: [
            "image/*"
          ]
        }
      ],
      [
        "expo-audio",
        {
          microphonePermission: "Allow NotesBrain to record voice notes"
        }
      ]
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      router: {
        root: "./app"
      },
      eas: {
        projectId: "58aa2745-5850-4a30-8a23-bde713c1fae7"
      }
    }
  }
};
