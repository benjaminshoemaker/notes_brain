import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";

// Configure how notifications should be displayed when app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export type NotificationData = {
  summary_id?: string;
  type?: string;
};

export async function requestNotificationPermissions(): Promise<boolean> {
  if (!Device.isDevice) {
    console.log("Push notifications require a physical device");
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("Failed to get push notification permissions");
    return false;
  }

  return true;
}

export async function getExpoPushToken(): Promise<string | null> {
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
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    return tokenData.data;
  } catch (error) {
    console.error("Failed to get Expo push token:", error);
    return null;
  }
}

export async function getFCMToken(): Promise<string | null> {
  if (Platform.OS !== "android") {
    return null;
  }

  if (!Device.isDevice) {
    console.log("FCM tokens require a physical device");
    return null;
  }

  try {
    // Get the native FCM token (for production builds)
    const tokenData = await Notifications.getDevicePushTokenAsync();
    return tokenData.data;
  } catch (error) {
    console.error("Failed to get FCM token:", error);
    return null;
  }
}

export function addNotificationResponseListener(
  handler: (response: Notifications.NotificationResponse) => void
): Notifications.EventSubscription {
  return Notifications.addNotificationResponseReceivedListener(handler);
}

export function addNotificationReceivedListener(
  handler: (notification: Notifications.Notification) => void
): Notifications.EventSubscription {
  return Notifications.addNotificationReceivedListener(handler);
}

export function getLastNotificationResponse(): Promise<Notifications.NotificationResponse | null> {
  return Notifications.getLastNotificationResponseAsync();
}
