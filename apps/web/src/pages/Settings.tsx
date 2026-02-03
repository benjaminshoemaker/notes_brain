import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { supabase } from "../lib/supabaseClient";
import { getDeviceTimezone, getTimezoneOptions } from "../lib/timezones";

type UserSettings = {
  id: string;
  email: string;
  timezone: string;
};

async function fetchUserSettings(userId: string): Promise<UserSettings> {
  const { data, error } = await supabase
    .from("users")
    .select("id, email, timezone")
    .eq("id", userId)
    .single();

  if (error) {
    throw error;
  }

  return data as UserSettings;
}

async function upsertUserTimezone(
  userId: string,
  email: string,
  timezone: string
): Promise<UserSettings> {
  const { data, error } = await supabase
    .from("users")
    .upsert({ id: userId, email, timezone }, { onConflict: "id" })
    .select("id, email, timezone")
    .single();

  if (error) {
    throw error;
  }

  return data as UserSettings;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const timezones = useMemo(() => getTimezoneOptions(), []);
  const deviceTimezone = getDeviceTimezone();

  const { data, isLoading, error } = useQuery({
    queryKey: ["user-settings", user?.id],
    queryFn: () => fetchUserSettings(user!.id),
    enabled: Boolean(user?.id)
  });

  const [selectedTimezone, setSelectedTimezone] = useState(deviceTimezone);

  useEffect(() => {
    if (data?.timezone) {
      setSelectedTimezone(data.timezone);
    }
  }, [data?.timezone]);

  const updateTimezone = useMutation({
    mutationFn: async (timezone: string) => {
      if (!user?.id || !user.email) {
        throw new Error("Missing user profile");
      }
      return upsertUserTimezone(user.id, user.email, timezone);
    },
    onSuccess: (updatedSettings) => {
      queryClient.setQueryData(["user-settings", user?.id], updatedSettings);
      showToast("Timezone updated.", "success");
    },
    onError: () => {
      showToast("Failed to update timezone.", "error");
    }
  });

  function handleTimezoneChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const nextTimezone = event.target.value;
    setSelectedTimezone(nextTimezone);
    updateTimezone.mutate(nextTimezone);
  }

  return (
    <div style={{ display: "grid", gap: 16, maxWidth: 520 }}>
      <header>
        <h1 style={{ marginBottom: 4 }}>Settings</h1>
        <p style={{ margin: 0, color: "#4b5563" }}>
          Daily summaries are delivered at 8:00 AM in your selected timezone.
        </p>
      </header>

      {isLoading ? <LoadingSpinner label="Loading settings…" /> : null}
      {error ? <p role="alert">Failed to load settings.</p> : null}

      {!isLoading && !error ? (
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 600 }}>Timezone</span>
          <select
            value={selectedTimezone}
            onChange={handleTimezoneChange}
            disabled={updateTimezone.isPending}
            style={{ padding: "8px 10px", borderRadius: 6, borderColor: "#d1d5db" }}
          >
            {timezones.map((timezone) => (
              <option key={timezone} value={timezone}>
                {timezone}
              </option>
            ))}
          </select>
          {updateTimezone.isPending ? (
            <span style={{ fontSize: 12, color: "#6b7280" }}>Saving...</span>
          ) : null}
        </label>
      ) : null}
    </div>
  );
}
