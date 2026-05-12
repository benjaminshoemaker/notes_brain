import { useCallback, useEffect } from "react";
import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "../../hooks/useAuth";
import { usePushToken } from "../../hooks/usePushToken";
import {
  addNotificationResponseListener,
  getLastNotificationResponse,
  type NotificationData,
} from "../../services/notifications";
import { testIds } from "../../lib/testIds";
import { colors } from "../../lib/theme";

export default function AppLayout() {
  const router = useRouter();
  const { user } = useAuth();

  // Register push token when user is authenticated
  const { error: pushError } = usePushToken(user?.id);

  const handleNotificationTap = useCallback((data: NotificationData) => {
    if (data?.type === "lens_result") {
      router.push("/(app)/summary");
    }
  }, [router]);

  useEffect(() => {
    if (pushError) {
      console.log("Push notification setup:", pushError);
    }
  }, [pushError]);

  // Handle notification taps
  useEffect(() => {
    // Check if app was opened from a notification
    getLastNotificationResponse().then((response) => {
      if (response) {
        handleNotificationTap(response.notification.request.content.data);
      }
    });

    // Listen for notification taps while app is running
    const subscription = addNotificationResponseListener((response) => {
      handleNotificationTap(response.notification.request.content.data);
    });

    return () => {
      subscription.remove();
    };
  }, [handleNotificationTap]);

  return (
    <Tabs
      backBehavior="history"
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Capture",
          tabBarLabel: "Capture",
          tabBarButtonTestID: testIds.app.tabCapture,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "add-circle" : "add-circle-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="notes"
        options={{
          title: "Notes",
          tabBarLabel: "Notes",
          tabBarButtonTestID: testIds.app.tabNotes,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "documents" : "documents-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="summary"
        options={{
          title: "Insights",
          tabBarLabel: "Insights",
          tabBarButtonTestID: testIds.app.tabSummary,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "sparkles" : "sparkles-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarLabel: "Settings",
          tabBarButtonTestID: testIds.app.tabSettings,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "settings" : "settings-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="mocks"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      <Tabs.Screen
        name="lens-form"
        options={{ href: null, title: "Lens" }}
      />
      <Tabs.Screen
        name="lens-manage"
        options={{ href: null, title: "Manage Lenses" }}
      />
      <Tabs.Screen
        name="lens-create"
        options={{ href: null, title: "New Lens" }}
      />
      <Tabs.Screen
        name="lens-library"
        options={{ href: null, title: "Lens Library" }}
      />
      <Tabs.Screen
        name="lens-library-preview"
        options={{ href: null, title: "Preview Lens" }}
      />
      <Tabs.Screen
        name="community-lens-publish"
        options={{ href: null, title: "Publish Lens" }}
      />
    </Tabs>
  );
}
