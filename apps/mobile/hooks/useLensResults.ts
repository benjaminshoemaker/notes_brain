import { useQuery } from "@tanstack/react-query";
import type { LensResultWithLens } from "../../../packages/shared/src/types";

import { supabase } from "../lib/supabaseClient";

async function fetchLensResults(userId: string): Promise<LensResultWithLens[]> {
  const { data, error } = await (supabase as any)
    .from("lens_results")
    .select("*, lens:lenses(name, schedule_type, schedule_time, schedule_day)")
    .eq("user_id", userId)
    .order("generated_at", { ascending: false })
    .limit(50);

  if (error) {
    throw error;
  }

  return (data ?? []) as LensResultWithLens[];
}

export function useLensResults(userId: string | undefined) {
  return useQuery({
    queryKey: ["lens-results", userId],
    queryFn: () => {
      if (!userId) {
        return [];
      }

      return fetchLensResults(userId);
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}
