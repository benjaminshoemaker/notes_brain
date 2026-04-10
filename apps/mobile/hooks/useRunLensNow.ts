import { useMutation, useQueryClient } from "@tanstack/react-query";

import { supabase } from "../lib/supabaseClient";
import { useAuth } from "./useAuth";

type RunLensNowResult = {
  success: boolean;
};

async function runLensNow(lensId: string): Promise<RunLensNowResult> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("Not authenticated");
  }

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL");
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/execute-lens`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ lens_id: lensId, trigger: "manual" }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Lens execution failed: ${response.status} ${text}`.trim());
  }

  return response.json();
}

export function useRunLensNow() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id;

  return useMutation({
    mutationFn: runLensNow,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["lens-results", userId] });
      await queryClient.invalidateQueries({ queryKey: ["lenses", userId] });
    },
  });
}
