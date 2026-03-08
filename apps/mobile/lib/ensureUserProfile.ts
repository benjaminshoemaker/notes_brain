import { supabase } from "./supabaseClient";
import { getDeviceTimezone } from "./timezones";

type EnsureUserProfileInput = {
  id: string;
  email?: string | null;
};

export async function ensureUserProfile(input: EnsureUserProfileInput): Promise<void> {
  const { id, email } = input;
  const timezone = getDeviceTimezone();
  const safeEmail = email ?? `${id}@notesbrain.local`;

  const { error } = await supabase
    .from("users")
    .upsert(
      {
        id,
        email: safeEmail,
        timezone
      },
      { onConflict: "id" }
    );

  if (error) {
    throw error;
  }
}
