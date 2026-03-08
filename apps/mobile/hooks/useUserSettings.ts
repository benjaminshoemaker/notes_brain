import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as SecureStore from "expo-secure-store";
import type { User } from "@notesbrain/shared";

import { supabase } from "../lib/supabaseClient";
import { ensureUserProfile } from "../lib/ensureUserProfile";
import { useAuth } from "./useAuth";
import { getDeviceTimezone } from "../lib/timezones";

const AUTO_DETECT_PREFIX = "notesbrain.timezone-auto-detected";
const SECURESTORE_KEY_SANITIZER = /[^A-Za-z0-9._-]/g;

function getTimezoneAutoDetectStorageKey(userId: string): string {
  const normalizedUserId = userId.replace(SECURESTORE_KEY_SANITIZER, "_");
  return `${AUTO_DETECT_PREFIX}.${normalizedUserId}`;
}

async function fetchUserSettings(userId: string): Promise<User> {
  const { data, error } = await supabase.from("users").select("*").eq("id", userId).single();

  if (error) {
    throw error;
  }

  return data as User;
}

async function upsertUserTimezone(
  userId: string,
  email: string,
  timezone: string
): Promise<User> {
  const { data, error } = await supabase
    .from("users")
    .upsert({ id: userId, email, timezone }, { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as User;
}

export function useUserSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;
  const userEmail = user?.email;

  const settingsQuery = useQuery({
    queryKey: ["user-settings", userId],
    queryFn: async () => {
      await ensureUserProfile({
        id: userId!,
        email: userEmail
      });
      return fetchUserSettings(userId!);
    },
    enabled: Boolean(userId)
  });

  const updateMutation = useMutation({
    mutationFn: (timezone: string) => {
      if (!userEmail) {
        throw new Error("Missing user email");
      }
      return upsertUserTimezone(userId!, userEmail, timezone);
    },
    onSuccess: (updatedSettings) => {
      queryClient.setQueryData(["user-settings", userId], updatedSettings);
    }
  });

  useEffect(() => {
    if (!userId || !userEmail || settingsQuery.isLoading || !settingsQuery.data) {
      return;
    }

    let isActive = true;

    const checkAndSetTimezone = async () => {
      const storageKey = getTimezoneAutoDetectStorageKey(userId);
      const hasAutoDetected = await SecureStore.getItemAsync(storageKey);

      if (!isActive || hasAutoDetected) {
        return;
      }

      const deviceTimezone = getDeviceTimezone();

      if (settingsQuery.data.timezone !== deviceTimezone) {
        await updateMutation.mutateAsync(deviceTimezone);
      }

      await SecureStore.setItemAsync(storageKey, "true");
    };

    void checkAndSetTimezone();

    return () => {
      isActive = false;
    };
  }, [
    userId,
    userEmail,
    settingsQuery.data,
    settingsQuery.isLoading,
    updateMutation.mutateAsync
  ]);

  return {
    data: settingsQuery.data,
    isLoading: settingsQuery.isLoading,
    error: settingsQuery.error,
    updateTimezone: updateMutation.mutateAsync,
    refetch: settingsQuery.refetch,
    isUpdating: updateMutation.isPending
  };
}
