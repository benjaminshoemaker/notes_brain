import { useEffect } from "react";
import { TouchableOpacity, Text, Alert } from "react-native";
import { Tabs, useRouter } from "expo-router";

import { signOutUser } from "../../lib/authApi";
import { useAuth } from "../../hooks/useAuth";
import { usePushToken } from "../../hooks/usePushToken";

export default function AppLayout() {
  const router = useRouter();
  const { user } = useAuth();

  // Register push token when user is authenticated
  const { error: pushError } = usePushToken(user?.id);

  useEffect(() => {
    if (pushError) {
      console.log("Push notification setup:", pushError);
    }
  }, [pushError]);

  async function handleLogout() {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await signOutUser();
          router.replace("/(auth)/login");
        },
      },
    ]);
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: "#0066cc",
        headerRight: () => (
          <TouchableOpacity onPress={handleLogout} style={{ marginRight: 16 }}>
            <Text style={{ color: "#0066cc", fontSize: 16 }}>Sign Out</Text>
          </TouchableOpacity>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Capture",
          tabBarLabel: "Capture",
        }}
      />
      <Tabs.Screen
        name="notes"
        options={{
          title: "Notes",
          tabBarLabel: "Notes",
        }}
      />
    </Tabs>
  );
}
