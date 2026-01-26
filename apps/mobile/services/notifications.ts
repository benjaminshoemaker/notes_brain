import { Platform } from "react-native";
import type {
  EventSubscription,
  Notification,
  NotificationResponse,
} from "expo-notifications";

type NotificationsModule = typeof import("expo-notifications");
type DeviceModule = typeof import("expo-device");
type ConstantsModule = typeof import("expo-constants");
type ConstantsLike = {
  expoConfig?: {
    extra?: {
      eas?: {
        projectId?: string;
      };
    };
  };
  easConfig?: {
    projectId?: string;
  };
};

let notificationsModule: NotificationsModule | null | undefined;
let deviceModule: DeviceModule | null | undefined;
let constantsModule: ConstantsModule | null | undefined;
let handlerConfigured = false;
let warnedUnavailable = false;

export type NotificationData = {
  summary_id?: string;
  type?: string;
};

function loadNotificationsModule(): NotificationsModule | null {
  if (notificationsModule !== undefined) {
    return notificationsModule;
  }

  try {
    notificationsModule = require("expo-notifications") as NotificationsModule;
  } catch (error) {
    notificationsModule = null;
    if (!warnedUnavailable) {
      warnedUnavailable = true;
      const message = error instanceof Error ? error.message : String(error);
      console.warn("expo-notifications unavailable:", message);
    }
  }

  return notificationsModule;
}

function loadDeviceModule(): DeviceModule | null {
  if (deviceModule !== undefined) {
    return deviceModule;
  }

  try {
    deviceModule = require("expo-device") as DeviceModule;
  } catch (error) {
    deviceModule = null;
    const message = error instanceof Error ? error.message : String(error);
    console.warn("expo-device unavailable:", message);
  }

  return deviceModule;
}

function loadConstantsModule(): ConstantsModule | null {
  if (constantsModule !== undefined) {
    return constantsModule;
  }

  try {
    constantsModule = require("expo-constants") as ConstantsModule;
  } catch (error) {
    constantsModule = null;
    const message = error instanceof Error ? error.message : String(error);
    console.warn("expo-constants unavailable:", message);
  }

  return constantsModule;
}

function ensureNotificationHandler(notifications: NotificationsModule) {
  if (handlerConfigured) {
    return;
  }

  notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  handlerConfigured = true;
}

export function areNotificationsAvailable(): boolean {
  return loadNotificationsModule() !== null;
}

export async function requestNotificationPermissions(): Promise<boolean> {
  const notifications = loadNotificationsModule();
  const device = loadDeviceModule();

  if (!notifications || !device) {
    console.log("Push notifications are unavailable on this build");
    return false;
  }

  if (!device.isDevice) {
    console.log("Push notifications require a physical device");
    return false;
  }

  ensureNotificationHandler(notifications);

  const { status: existingStatus } = await notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("Failed to get push notification permissions");
    return false;
  }

  return true;
}

export async function getExpoPushToken(): Promise<string | null> {
  const notifications = loadNotificationsModule();
  const device = loadDeviceModule();
  const constantsModule = loadConstantsModule();
  const constantsValue = constantsModule as
    | (ConstantsLike & { default?: ConstantsLike })
    | null
    | undefined;
  const constants = constantsValue?.default ?? constantsValue;

  if (!notifications || !device || !constants) {
    return null;
  }

  if (!device.isDevice) {
    console.log("Push tokens require a physical device");
    return null;
  }

  // For Expo Go, we use the Expo push token
  // For standalone builds, we would use FCM tokens directly
  const projectId =
    constants.expoConfig?.extra?.eas?.projectId ?? constants.easConfig?.projectId;

  if (!projectId) {
    console.log("No project ID found for push notifications");
    return null;
  }

  try {
    const tokenData = await notifications.getExpoPushTokenAsync({
      projectId,
    });
    return tokenData.data;
  } catch (error) {
    console.error("Failed to get Expo push token:", error);
    return null;
  }
}

export async function getFCMToken(): Promise<string | null> {
  const notifications = loadNotificationsModule();
  const device = loadDeviceModule();

  if (!notifications || !device) {
    return null;
  }

  if (Platform.OS !== "android") {
    return null;
  }

  if (!device.isDevice) {
    console.log("FCM tokens require a physical device");
    return null;
  }

  try {
    // Get the native FCM token (for production builds)
    const tokenData = await notifications.getDevicePushTokenAsync();
    return tokenData.data;
  } catch (error) {
    console.error("Failed to get FCM token:", error);
    return null;
  }
}

export function addNotificationResponseListener(
  handler: (response: NotificationResponse) => void
): EventSubscription {
  const notifications = loadNotificationsModule();

  if (!notifications) {
    return { remove: () => {} } as EventSubscription;
  }

  ensureNotificationHandler(notifications);

  return notifications.addNotificationResponseReceivedListener(handler);
}

export function addNotificationReceivedListener(
  handler: (notification: Notification) => void
): EventSubscription {
  const notifications = loadNotificationsModule();

  if (!notifications) {
    return { remove: () => {} } as EventSubscription;
  }

  ensureNotificationHandler(notifications);

  return notifications.addNotificationReceivedListener(handler);
}

export function getLastNotificationResponse(): Promise<NotificationResponse | null> {
  const notifications = loadNotificationsModule();

  if (!notifications) {
    return Promise.resolve(null);
  }

  ensureNotificationHandler(notifications);

  return notifications.getLastNotificationResponseAsync();
}
