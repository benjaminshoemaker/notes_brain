import { Tabs } from "expo-router";

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: "#0066cc",
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
