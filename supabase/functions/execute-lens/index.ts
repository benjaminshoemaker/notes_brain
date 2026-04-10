import { createClient } from "jsr:@supabase/supabase-js@2";

import { createServiceRoleClient } from "../_shared/supabase.ts";
import { createFunctionLogger } from "../_shared/logger.ts";
import { callOpenAIMarkdown } from "../_shared/openai.ts";
import { retryWithBackoff } from "../_shared/retry.ts";

type RuntimeConfig = {
  supabaseUrl: string;
  serviceRoleKey: string;
  openaiApiKey: string;
  cronSecret: string;
};

const REQUIRED_ENV_KEYS = [
  "SUPABASE_URL",
  "OPENAI_API_KEY",
  "CRON_SECRET"
];

const OPENAI_MODEL = "gpt-4o-mini";
const MAX_NOTES = 100;
const PUSH_PREVIEW_LENGTH = 100;
const DEFAULT_TIMEZONE = "America/New_York";
const SYSTEM_PROMPT =
  "You are a personal note analyst. Respond in plain markdown (headers, bullets, bold). Do not include HTML tags, images, or links. Keep responses concise and actionable.";

type RequestBody = {
  lens_id?: string;
  trigger?: "cron" | "manual" | "test";
};

type AuthContext = {
  cronAuthorized: boolean;
  authenticatedUserId: string | null;
};

type LensRow = {
  id: string;
  user_id: string;
  name: string;
  prompt: string;
  schedule_type: "daily" | "weekly";
  schedule_time: string;
  schedule_day: number | null;
  lookback_hours: number;
  categories: string[] | null;
  is_active: boolean;
  consecutive_failures: number;
  users: { timezone: string } | Array<{ timezone: string }> | null;
};

type Lens = Omit<LensRow, "users"> & {
  timezone: string;
};

type Note = {
  id: string;
  category: string;
  content: string | null;
  created_at: string;
};

function getRuntimeConfig(): RuntimeConfig {
  return {
    supabaseUrl: Deno.env.get("SUPABASE_URL") ?? "",
    serviceRoleKey:
      Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    openaiApiKey: Deno.env.get("OPENAI_API_KEY") ?? "",
    cronSecret: Deno.env.get("CRON_SECRET") ?? ""
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
      function: "execute-lens",
      ready: missingEnv.length === 0,
      missing_env: missingEnv
    }),
    {
      status: 200,
      headers: { "content-type": "application/json" }
    }
  );
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
    const getPart = (type: string) => parts.find((part) => part.type === type)?.value ?? "0";

    return new Date(
      parseInt(getPart("year"), 10),
      parseInt(getPart("month"), 10) - 1,
      parseInt(getPart("day"), 10),
      parseInt(getPart("hour"), 10),
      parseInt(getPart("minute"), 10),
      parseInt(getPart("second"), 10)
    );
  } catch {
    return utcDate;
  }
}

function extractTimezone(users: LensRow["users"]) {
  if (Array.isArray(users)) {
    return users[0]?.timezone ?? DEFAULT_TIMEZONE;
  }
  return users?.timezone ?? DEFAULT_TIMEZONE;
}

function parseScheduleTime(scheduleTime: string) {
  const [hoursPart = "0", minutesPart = "0", secondsPart = "0"] = scheduleTime.split(":");
  const secondsValue = secondsPart.split(".")[0] ?? "0";

  return {
    hours: parseInt(hoursPart, 10),
    minutes: parseInt(minutesPart, 10),
    seconds: parseInt(secondsValue, 10)
  };
}

function parseOffsetMinutes(offsetName: string) {
  if (offsetName === "GMT" || offsetName === "UTC") {
    return 0;
  }

  const match = offsetName.match(/(?:GMT|UTC)([+-])(\d{1,2})(?::?(\d{2}))?$/i);
  if (!match) {
    throw new Error(`Unsupported time zone offset format: ${offsetName}`);
  }

  const sign = match[1] === "-" ? -1 : 1;
  const hours = parseInt(match[2] ?? "0", 10);
  const minutes = parseInt(match[3] ?? "0", 10);

  return sign * (hours * 60 + minutes);
}

function getTimeZoneOffsetMinutes(date: Date, timezone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    timeZoneName: "shortOffset",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });

  const offsetName = formatter.formatToParts(date).find((part) => part.type === "timeZoneName")?.value ?? "GMT";
  return parseOffsetMinutes(offsetName);
}

function localDateInTimeZoneToUtc(localDate: Date, timezone: string) {
  const utcGuess = new Date(Date.UTC(
    localDate.getFullYear(),
    localDate.getMonth(),
    localDate.getDate(),
    localDate.getHours(),
    localDate.getMinutes(),
    localDate.getSeconds()
  ));

  let offsetMinutes = getTimeZoneOffsetMinutes(utcGuess, timezone);
  let candidate = new Date(utcGuess.getTime() - offsetMinutes * 60_000);
  const adjustedOffsetMinutes = getTimeZoneOffsetMinutes(candidate, timezone);

  if (adjustedOffsetMinutes !== offsetMinutes) {
    offsetMinutes = adjustedOffsetMinutes;
    candidate = new Date(utcGuess.getTime() - offsetMinutes * 60_000);
  }

  return candidate;
}

function computeNextRunAt(now: Date, lens: Lens) {
  if (!lens.is_active) {
    return null;
  }

  const localNow = getUserLocalTime(now, lens.timezone);
  const { hours, minutes, seconds } = parseScheduleTime(lens.schedule_time);
  const candidate = new Date(
    localNow.getFullYear(),
    localNow.getMonth(),
    localNow.getDate(),
    hours,
    minutes,
    seconds
  );

  if (candidate.getTime() <= localNow.getTime()) {
    candidate.setDate(candidate.getDate() + 1);
  }

  if (lens.schedule_type === "weekly" && lens.schedule_day !== null) {
    while (candidate.getDay() !== lens.schedule_day) {
      candidate.setDate(candidate.getDate() + 1);
    }
  }

  return localDateInTimeZoneToUtc(candidate, lens.timezone).toISOString();
}

function sanitizeMarkdown(markdown: string) {
  return markdown.replace(/<[^>]*>/g, "").trim();
}

function normalizeNoteContent(content: string) {
  return content.replace(/\s+/g, " ").trim();
}

function buildFormattedNotes(notes: Note[]) {
  return notes
    .map((note) => `[${note.category}] ${normalizeNoteContent(note.content ?? "")}`)
    .join("\n");
}

function buildPushPreview(content: string) {
  return content.replace(/\s+/g, " ").trim().slice(0, PUSH_PREVIEW_LENGTH);
}

async function authenticateRequest(
  req: Request,
  supabase: ReturnType<typeof createClient>,
  logger: ReturnType<typeof createFunctionLogger>,
  config: RuntimeConfig
): Promise<AuthContext> {
  const cronHeader = req.headers.get("x-cron-secret");
  const cronAuthorized = !!cronHeader && cronHeader === config.cronSecret;

  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return {
      cronAuthorized,
      authenticatedUserId: null
    };
  }

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    logger.warn("Authorization header was not a bearer token");
    return {
      cronAuthorized,
      authenticatedUserId: null
    };
  }

  const accessToken = match[1]?.trim();
  if (!accessToken) {
    return {
      cronAuthorized,
      authenticatedUserId: null
    };
  }

  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) {
    logger.warn("Failed to validate user JWT", { error });
    return {
      cronAuthorized,
      authenticatedUserId: null
    };
  }

  return {
    cronAuthorized,
    authenticatedUserId: data.user.id
  };
}

async function fetchLens(
  supabase: ReturnType<typeof createClient>,
  lensId: string
): Promise<Lens | null> {
  const { data, error } = await supabase
    .from("lenses")
    .select("id, user_id, name, prompt, schedule_type, schedule_time, schedule_day, lookback_hours, categories, is_active, consecutive_failures, users!inner(timezone)")
    .eq("id", lensId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const row = data as LensRow;
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    prompt: row.prompt,
    schedule_type: row.schedule_type,
    schedule_time: row.schedule_time,
    schedule_day: row.schedule_day,
    lookback_hours: row.lookback_hours,
    categories: row.categories,
    is_active: row.is_active,
    consecutive_failures: row.consecutive_failures,
    timezone: extractTimezone(row.users)
  };
}

async function fetchMatchingNotes(
  supabase: ReturnType<typeof createClient>,
  lens: Lens,
  now: Date
) {
  const cutoffTime = new Date(now.getTime() - lens.lookback_hours * 60 * 60 * 1000).toISOString();

  if (Array.isArray(lens.categories) && lens.categories.length === 0) {
    return [] as Note[];
  }

  let query = supabase
    .from("notes")
    .select("id, category, content, created_at")
    .eq("user_id", lens.user_id)
    .gte("created_at", cutoffTime)
    .not("content", "is", null)
    .neq("content", "")
    .order("created_at", { ascending: false })
    .limit(MAX_NOTES);

  if (Array.isArray(lens.categories)) {
    query = query.in("category", lens.categories);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return ((data as Note[]) ?? []).filter((note) => !!note.content?.trim());
}

async function updateLensSuccessState(
  supabase: ReturnType<typeof createClient>,
  lens: Lens,
  now: Date
) {
  const { error } = await supabase
    .from("lenses")
    .update({
      next_run_at: computeNextRunAt(now, lens),
      last_run_at: now.toISOString(),
      consecutive_failures: 0,
      last_error: null,
      last_error_at: null
    })
    .eq("id", lens.id);

  if (error) {
    throw error;
  }
}

async function updateLensFailureState(
  supabase: ReturnType<typeof createClient>,
  lens: Lens,
  errorMessage: string,
  logger: ReturnType<typeof createFunctionLogger>
) {
  const { error } = await supabase
    .from("lenses")
    .update({
      consecutive_failures: (lens.consecutive_failures ?? 0) + 1,
      last_error: errorMessage,
      last_error_at: new Date().toISOString()
    })
    .eq("id", lens.id);

  if (error) {
    logger.error("Failed to update lens failure state", { lensId: lens.id, error });
  }
}

async function triggerPushNotification(
  config: RuntimeConfig,
  lens: Lens,
  resultId: string,
  resultContent: string,
  logger: ReturnType<typeof createFunctionLogger>
) {
  const response = await fetch(`${config.supabaseUrl}/functions/v1/send-push`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${config.serviceRoleKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      user_id: lens.user_id,
      result_id: resultId,
      result_table: "lens_results",
      title: lens.name,
      body: buildPushPreview(resultContent),
      data: {
        result_id: resultId,
        result_table: "lens_results",
        type: "lens_result"
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    logger.error("Failed to trigger send-push", {
      lensId: lens.id,
      status: response.status,
      errorText
    });
    return;
  }

  logger.info("Triggered send-push for lens result", { lensId: lens.id, resultId });
}

Deno.serve(async (req) => {
  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();
  const logger = createFunctionLogger("execute-lens", requestId);
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

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body", request_id: requestId }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!body.lens_id) {
    return new Response(
      JSON.stringify({ error: "Missing required field: lens_id", request_id: requestId }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (body.trigger !== "cron" && body.trigger !== "manual" && body.trigger !== "test") {
    return new Response(
      JSON.stringify({ error: "Invalid trigger. Use 'cron', 'manual', or 'test'", request_id: requestId }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const supabase = createServiceRoleClient({
    createClient,
    supabaseUrl: config.supabaseUrl,
    serviceRoleKey: config.serviceRoleKey
  });

  const auth = await authenticateRequest(req, supabase, logger, config);

  if (body.trigger === "cron" && !auth.cronAuthorized) {
    return new Response(
      JSON.stringify({ error: "Invalid X-Cron-Secret header", request_id: requestId }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  if (body.trigger === "manual" && !auth.authenticatedUserId) {
    return new Response(
      JSON.stringify({ error: "Authorization bearer token required for manual runs", request_id: requestId }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  if (body.trigger === "test" && !auth.cronAuthorized && !auth.authenticatedUserId) {
    return new Response(
      JSON.stringify({ error: "Either X-Cron-Secret or Authorization bearer token is required", request_id: requestId }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  let lens: Lens | null;
  try {
    lens = await fetchLens(supabase, body.lens_id);
  } catch (error) {
    logger.error("Failed to fetch lens", { lensId: body.lens_id, error });
    return new Response(
      JSON.stringify({ error: "Failed to fetch lens", request_id: requestId }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!lens) {
    return new Response(
      JSON.stringify({ error: "Lens not found", request_id: requestId }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  const requiresUserOwnership =
    body.trigger === "manual" || (body.trigger === "test" && !auth.cronAuthorized);

  if (requiresUserOwnership && auth.authenticatedUserId !== lens.user_id) {
    return new Response(
      JSON.stringify({ error: "You do not have access to this lens", request_id: requestId }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  if (body.trigger === "cron" && !lens.is_active) {
    return new Response(
      JSON.stringify({ error: "Inactive lenses cannot be executed by cron", request_id: requestId }),
      { status: 409, headers: { "Content-Type": "application/json" } }
    );
  }

  const now = new Date();
  logger.info("Executing lens", {
    lensId: lens.id,
    trigger: body.trigger,
    userId: lens.user_id
  });

  try {
    const notes = await fetchMatchingNotes(supabase, lens, now);

    if (notes.length === 0) {
      await updateLensSuccessState(supabase, lens, now);
      logger.info("No matching notes for lens execution", { lensId: lens.id });

      return new Response(
        JSON.stringify({
          success: true,
          generated: false,
          lens_id: lens.id,
          notes_analyzed: 0,
          request_id: requestId
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    const userPrompt = `${lens.prompt}\n\nNotes from the last ${lens.lookback_hours} hours:\n${buildFormattedNotes(notes)}`;

    const rawContent = await retryWithBackoff(
      () => callOpenAIMarkdown({
        fetchFn: fetch,
        apiKey: config.openaiApiKey,
        model: OPENAI_MODEL,
        systemPrompt: SYSTEM_PROMPT,
        userPrompt
      }),
      {
        delaysMs: [2000, 5000],
        onRetry: (error, retryNumber) => {
          logger.warn("Retrying OpenAI lens execution", {
            lensId: lens.id,
            retryNumber,
            error
          });
        }
      }
    );

    const content = sanitizeMarkdown(rawContent);
    if (!content) {
      throw new Error("OpenAI returned empty content after HTML sanitization");
    }

    const { data: result, error: insertError } = await supabase
      .from("lens_results")
      .insert({
        lens_id: lens.id,
        user_id: lens.user_id,
        content,
        notes_analyzed: notes.length
      })
      .select("id")
      .single();

    if (insertError) {
      throw insertError;
    }

    await updateLensSuccessState(supabase, lens, now);
    await triggerPushNotification(config, lens, result.id as string, content, logger);

    logger.info("Lens executed successfully", {
      lensId: lens.id,
      resultId: result.id,
      notesAnalyzed: notes.length
    });

    return new Response(
      JSON.stringify({
        success: true,
        generated: true,
        lens_id: lens.id,
        result_id: result.id,
        notes_analyzed: notes.length,
        request_id: requestId
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Lens execution failed", { lensId: lens.id, error });
    await updateLensFailureState(supabase, lens, errorMessage, logger);

    return new Response(
      JSON.stringify({
        error: "Lens execution failed",
        details: errorMessage,
        lens_id: lens.id,
        request_id: requestId
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
