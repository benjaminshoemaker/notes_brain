import { createClient } from "jsr:@supabase/supabase-js@2";

import { createServiceRoleClient, getServiceRoleKeyFromEnv } from "../_shared/supabase.ts";
import { createFunctionLogger } from "../_shared/logger.ts";
import { callOpenAISummary, type DailySummaryContent } from "../_shared/openai.ts";

type RuntimeConfig = {
  supabaseUrl: string;
  serviceRoleKey: string;
  openaiApiKey: string;
};

const REQUIRED_ENV_KEYS = [
  "SUPABASE_URL",
  "OPENAI_API_KEY"
];

type User = {
  id: string;
  email: string;
  timezone: string;
};

type Note = {
  id: string;
  category: string;
  content: string | null;
  created_at: string;
};

type RequestBody = {
  trigger?: "cron" | "test";
  user_id?: string; // For testing specific user
};

// Time windows for summary generation and push delivery
const GENERATION_HOUR = 7;
const GENERATION_MINUTE = 55;
const PUSH_HOUR = 8;
const PUSH_MINUTE = 0;
const TIME_WINDOW_MINUTES = 5;

function isWithinTimeWindow(
  localTime: Date,
  targetHour: number,
  targetMinute: number,
  windowMinutes: number
): boolean {
  const hours = localTime.getHours();
  const minutes = localTime.getMinutes();
  const totalMinutes = hours * 60 + minutes;
  const targetTotalMinutes = targetHour * 60 + targetMinute;

  const diff = Math.abs(totalMinutes - targetTotalMinutes);
  return diff <= windowMinutes;
}

function getUserLocalTime(utcDate: Date, timezone: string): Date {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    });

    const parts = formatter.formatToParts(utcDate);
    const getPart = (type: string) => parts.find(p => p.type === type)?.value ?? "0";

    return new Date(
      parseInt(getPart("year")),
      parseInt(getPart("month")) - 1,
      parseInt(getPart("day")),
      parseInt(getPart("hour")),
      parseInt(getPart("minute")),
      parseInt(getPart("second"))
    );
  } catch {
    // Fall back to UTC if timezone is invalid
    return utcDate;
  }
}

function getLocalDateString(localTime: Date): string {
  const year = localTime.getFullYear();
  const month = String(localTime.getMonth() + 1).padStart(2, "0");
  const day = String(localTime.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getRuntimeConfig(): RuntimeConfig {
  return {
    supabaseUrl: Deno.env.get("SUPABASE_URL") ?? "",
    serviceRoleKey: getServiceRoleKeyFromEnv(),
    openaiApiKey: Deno.env.get("OPENAI_API_KEY") ?? ""
  };
}

function getMissingEnv(config: RuntimeConfig) {
  const missing = REQUIRED_ENV_KEYS.filter((key) => !Deno.env.get(key));
  if (!config.serviceRoleKey) {
    missing.push("SERVICE_ROLE_KEY|SUPABASE_SERVICE_ROLE_KEY");
  }
  return missing;
}

function healthResponse(config: RuntimeConfig) {
  const missingEnv = getMissingEnv(config);
  return new Response(
    JSON.stringify({
      status: "ok",
      function: "generate-summary",
      ready: missingEnv.length === 0,
      missing_env: missingEnv
    }),
    {
      status: 200,
      headers: { "content-type": "application/json" }
    }
  );
}

Deno.serve(async (req) => {
  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();
  const logger = createFunctionLogger("generate-summary", requestId);
  const config = getRuntimeConfig();

  if (req.method === "GET") {
    return healthResponse(config);
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }

  const missingEnv = getMissingEnv(config);
  if (missingEnv.length > 0) {
    logger.error("Missing required environment variables", { missingEnv });
    return new Response(
      JSON.stringify({
        error: "Missing required environment variables",
        missing_env: missingEnv,
        request_id: requestId
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }

  let body: RequestBody = {};
  try {
    body = await req.json();
  } catch {
    // Empty body is fine for cron triggers
  }

  // Verify this is a valid trigger
  const isTestMode = body.trigger === "test";
  if (body.trigger !== "cron" && body.trigger !== "test") {
    return new Response(
      JSON.stringify({ error: "Invalid trigger. Use 'cron' or 'test'" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const supabase = createServiceRoleClient({
    createClient,
    supabaseUrl: config.supabaseUrl,
    serviceRoleKey: config.serviceRoleKey
  });

  const now = new Date();
  let summariesGenerated = 0;
  let pushesScheduled = 0;

  // Fetch users (optionally filter by user_id for testing)
  let usersQuery = supabase.from("users").select("id, email, timezone");
  if (isTestMode && body.user_id) {
    usersQuery = usersQuery.eq("id", body.user_id);
  }

  const { data: users, error: usersError } = await usersQuery;

  if (usersError) {
    logger.error("Failed to fetch users", usersError);
    return new Response(
      JSON.stringify({ error: "Failed to fetch users" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  for (const user of (users as User[]) ?? []) {
    const localTime = getUserLocalTime(now, user.timezone);
    const todayDate = getLocalDateString(localTime);

    // Check if it's time to generate summary (~07:55) - bypass in test mode
    const shouldGenerate = isTestMode || isWithinTimeWindow(localTime, GENERATION_HOUR, GENERATION_MINUTE, TIME_WINDOW_MINUTES);
    if (shouldGenerate) {
      // Check if summary already exists for today
      const { data: existingSummary } = await supabase
        .from("daily_summaries")
        .select("id")
        .eq("user_id", user.id)
        .eq("summary_date", todayDate)
        .single();

      if (!existingSummary) {
        // Fetch notes from last 48 hours
        const cutoffTime = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();

        const { data: notes, error: notesError } = await supabase
          .from("notes")
          .select("id, category, content, created_at")
          .eq("user_id", user.id)
          .gte("created_at", cutoffTime)
          .order("created_at", { ascending: false });

        if (notesError) {
          logger.error("Failed to fetch notes for user", { userId: user.id, notesError });
          continue;
        }

        const validNotes = ((notes as Note[]) ?? []).filter(n => n.content && n.content.trim());

        if (validNotes.length === 0) {
          logger.info("No notes to summarize for user", { userId: user.id });
          continue;
        }

        try {
          const summaryContent = await callOpenAISummary({
            fetchFn: fetch,
            apiKey: config.openaiApiKey,
            model: "gpt-4o-mini",
            notes: validNotes.map(n => ({ category: n.category, content: n.content! }))
          });

          // Save summary to database
          const { error: insertError } = await supabase.from("daily_summaries").insert({
            user_id: user.id,
            summary_date: todayDate,
            content: summaryContent
          });

          if (insertError) {
            logger.error("Failed to save summary for user", { userId: user.id, insertError });
            continue;
          }

          summariesGenerated++;
          logger.info("Generated summary for user", { userId: user.id });
        } catch (error) {
          logger.error("Failed to generate summary for user", { userId: user.id, error });
        }
      }
    }

    // Check if it's time to send push notification (~08:00) - bypass in test mode
    const shouldPush = isTestMode || isWithinTimeWindow(localTime, PUSH_HOUR, PUSH_MINUTE, TIME_WINDOW_MINUTES);
    if (shouldPush) {
      // Find today's summary that hasn't been sent yet
      const { data: unsentSummary, error: summaryError } = await supabase
        .from("daily_summaries")
        .select("id, content")
        .eq("user_id", user.id)
        .eq("summary_date", todayDate)
        .is("sent_at", null)
        .single();

      if (summaryError && summaryError.code !== "PGRST116") {
        logger.error("Failed to fetch summary for user", { userId: user.id, summaryError });
        continue;
      }

      if (unsentSummary) {
        const content = unsentSummary.content as DailySummaryContent;
        const actionPreview = content.top_actions[0] || "Check your daily summary";

        // Call send-push function
        try {
          const pushResponse = await fetch(
            `${config.supabaseUrl}/functions/v1/send-push`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${config.serviceRoleKey}`
              },
              body: JSON.stringify({
                user_id: user.id,
                summary_id: unsentSummary.id,
                title: "Your Daily Summary",
                body: `1. ${actionPreview}`,
                data: {
                  summary_id: unsentSummary.id,
                  type: "daily_summary"
                }
              })
            }
          );

          if (pushResponse.ok) {
            pushesScheduled++;
            logger.info("Scheduled push for user", { userId: user.id });
          } else {
            const errorText = await pushResponse.text();
            logger.error("Failed to send push for user", { userId: user.id, errorText });
          }
        } catch (error) {
          logger.error("Failed to call send-push for user", { userId: user.id, error });
        }
      }
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      summaries_generated: summariesGenerated,
      pushes_scheduled: pushesScheduled
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
