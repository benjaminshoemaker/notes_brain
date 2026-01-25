import { useEffect, useState } from "react";

import { supabase } from "../lib/supabaseClient";
import {
  requestNotificationPermissions,
  getExpoPushToken,
  getFCMToken,
} from "../services/notifications";

type PushTokenState = {
  token: string | null;
  isLoading: boolean;
  error: string | null;
  permissionGranted: boolean;
};

export function usePushToken(userId: string | undefined) {
  const [state, setState] = useState<PushTokenState>({
    token: null,
    isLoading: true,
    error: null,
    permissionGranted: false,
  });

  useEffect(() => {
    if (!userId) {
      setState((prev) => ({ ...prev, isLoading: false }));
      return;
    }

    let isMounted = true;

    async function registerToken() {
      try {
        // Request permissions
        const granted = await requestNotificationPermissions();

        if (!isMounted) return;

        if (!granted) {
          setState({
            token: null,
            isLoading: false,
            error: "Notification permissions not granted",
            permissionGranted: false,
          });
          return;
        }

        setState((prev) => ({ ...prev, permissionGranted: true }));

        // Get push token (try FCM first for Android, fall back to Expo token)
        let token = await getFCMToken();

        // Fall back to Expo push token if FCM not available (e.g., in Expo Go)
        if (!token) {
          token = await getExpoPushToken();
        }

        if (!isMounted) return;

        if (!token) {
          setState({
            token: null,
            isLoading: false,
            error: "Failed to get push token",
            permissionGranted: true,
          });
          return;
        }

        // Register/update token in database
        const { error: upsertError } = await supabase.from("devices").upsert(
          {
            user_id: userId!,
            platform: "android" as const,
            push_token: token,
            last_seen_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id,platform",
          }
        );

        if (!isMounted) return;

        if (upsertError) {
          console.error("Failed to save push token:", upsertError);
          setState({
            token,
            isLoading: false,
            error: "Failed to save push token",
            permissionGranted: true,
          });
          return;
        }

        setState({
          token,
          isLoading: false,
          error: null,
          permissionGranted: true,
        });

        console.log("Push token registered successfully");
      } catch (err) {
        if (!isMounted) return;

        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("Push token registration failed:", message);
        setState({
          token: null,
          isLoading: false,
          error: message,
          permissionGranted: false,
        });
      }
    }

    registerToken();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  // Update last_seen_at on subsequent app opens
  useEffect(() => {
    if (!userId || !state.token) return;

    async function updateLastSeen() {
      await supabase
        .from("devices")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("user_id", userId!)
        .eq("platform", "android");
    }

    updateLastSeen();
  }, [userId, state.token]);

  return state;
}
