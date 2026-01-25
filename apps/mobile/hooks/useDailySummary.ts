import { useQuery } from "@tanstack/react-query";
import type { DailySummary } from "@notesbrain/shared";

import { supabase } from "../lib/supabaseClient";

function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function fetchTodaySummary(userId: string): Promise<DailySummary | null> {
  const todayDate = getTodayDateString();

  const { data, error } = await supabase
    .from("daily_summaries")
    .select("*")
    .eq("user_id", userId)
    .eq("summary_date", todayDate)
    .single();

  if (error) {
    // PGRST116 = no rows returned
    if (error.code === "PGRST116") {
      return null;
    }
    throw error;
  }

  return data as DailySummary;
}

export function useDailySummary(userId: string | undefined) {
  return useQuery({
    queryKey: ["daily-summary", userId, getTodayDateString()],
    queryFn: () => {
      if (!userId) {
        return null;
      }
      return fetchTodaySummary(userId);
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
