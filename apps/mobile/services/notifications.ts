import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import type {
  EventSubscription,
  Notification,
  NotificationResponse,
} from "expo-notifications";

type NotificationsModule = typeof import("expo-notifications");

let notificationsModule: NotificationsModule | null | undefined;
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

  if (!notifications) {
    console.log("Push notifications are unavailable on this build");
    return false;
  }

  if (!Device.isDevice) {
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

  if (!notifications) {
    return null;
  }

  if (!Device.isDevice) {
    console.log("Push tokens require a physical device");
    return null;
  }

  // For Expo Go, we use the Expo push token
  // For standalone builds, we would use FCM tokens directly
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

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

  if (!notifications) {
    return null;
  }

  if (Platform.OS !== "android") {
    return null;
  }

  if (!Device.isDevice) {
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
