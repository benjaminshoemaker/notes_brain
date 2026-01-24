import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ShareIntentProvider } from "expo-share-intent";

import { queryClient } from "../lib/queryClient";
import { supabase } from "../lib/supabaseClient";
import { ShareHandler } from "../components/ShareHandler";

export default function RootLayout() {
  useEffect(() => {
    // Set up auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // Handle auth state changes if needed
      console.log("Auth state changed:", event, session?.user?.email);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <ShareIntentProvider>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <Stack
            screenOptions={{
              headerShown: false,
            }}
          />
          <ShareHandler />
          <StatusBar style="auto" />
        </QueryClientProvider>
      </SafeAreaProvider>
    </ShareIntentProvider>
  );
}
