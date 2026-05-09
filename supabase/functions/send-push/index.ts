import { createClient } from "jsr:@supabase/supabase-js@2";

import { createServiceRoleClient, getServiceRoleKeyFromEnv } from "../_shared/supabase.ts";
import { createFunctionLogger } from "../_shared/logger.ts";
import { getAccessToken, sendFCMMessage } from "../_shared/fcm.ts";

type RuntimeConfig = {
  supabaseUrl: string;
  serviceRoleKey: string;
  fcmProjectId: string;
  fcmServiceAccountKey: string;
};

const REQUIRED_ENV_KEYS = [
  "SUPABASE_URL",
  "FCM_PROJECT_ID",
  "FCM_SERVICE_ACCOUNT_KEY"
];

const ALLOWED_TABLES = ["daily_summaries", "lens_results"];

type RequestBody = {
  user_id: string;
  result_id?: string;
  result_table?: string; // "daily_summaries" | "lens_results", defaults to "daily_summaries"
  summary_id?: string; // deprecated, kept for backward compat
  title: string;
  body: string;
  data?: Record<string, string>;
};

type Device = {
  id: string;
  push_token: string | null;
  platform: string;
};

function getRuntimeConfig(): RuntimeConfig {
  return {
    supabaseUrl: Deno.env.get("SUPABASE_URL") ?? "",
    serviceRoleKey: getServiceRoleKeyFromEnv(),
    fcmProjectId: Deno.env.get("FCM_PROJECT_ID") ?? "",
    fcmServiceAccountKey: Deno.env.get("FCM_SERVICE_ACCOUNT_KEY") ?? ""
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
      function: "send-push",
      ready: missingEnv.length === 0,
      missing_env: missingEnv
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" }
    }
  );
}

// INTERNAL-ONLY: This function is called exclusively by other Edge Functions
// (e.g. execute-lens, generate-summary) using the service role key. It must
// NOT be exposed to client-side calls. The caller is trusted, so user_id and
// result_id are accepted without additional ownership verification.
Deno.serve(async (req) => {
  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();
  const logger = createFunctionLogger("send-push", requestId);
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
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { user_id, title, body: messageBody, data } = body;
  const resultTable = body.result_table ?? "daily_summaries";
  const resultId = body.result_id ?? body.summary_id;

  if (!resultId) {
    return new Response(
      JSON.stringify({ error: "Missing result_id" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!ALLOWED_TABLES.includes(resultTable)) {
    return new Response(
      JSON.stringify({ error: "Invalid result_table" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!user_id || !title || !messageBody) {
    return new Response(
      JSON.stringify({ error: "Missing required fields: user_id, result_id, title, body" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const supabase = createServiceRoleClient({
    createClient,
    supabaseUrl: config.supabaseUrl,
    serviceRoleKey: config.serviceRoleKey
  });

  // Fetch Android devices with push tokens for this user
  const { data: devices, error: devicesError } = await supabase
    .from("devices")
    .select("id, push_token, platform")
    .eq("user_id", user_id)
    .eq("platform", "android")
    .not("push_token", "is", null);

  if (devicesError) {
    logger.error("Failed to fetch devices", devicesError);
    return new Response(
      JSON.stringify({ error: "Failed to fetch devices" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const validDevices = ((devices as Device[]) ?? []).filter(d => d.push_token);

  if (validDevices.length === 0) {
    logger.info("No Android devices with push tokens for user", { userId: user_id });
    return new Response(
      JSON.stringify({ success: true, tokens_sent: 0, message: "No devices to notify" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  // Get FCM access token
  let accessToken: string;
  try {
    accessToken = await getAccessToken(fetch, config.fcmServiceAccountKey);
  } catch (error) {
    logger.error("Failed to get FCM access token", error);
    return new Response(
      JSON.stringify({ error: "Failed to authenticate with FCM" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  let tokensSent = 0;
  const errors: string[] = [];

  // Send push to each device
  for (const device of validDevices) {
    const result = await sendFCMMessage({
      fetchFn: fetch,
      projectId: config.fcmProjectId,
      accessToken,
      message: {
        token: device.push_token!,
        notification: {
          title,
          body: messageBody
        },
        data: data ?? {},
        android: {
          priority: "high"
        }
      }
    });

    if (result.success) {
      tokensSent++;
      logger.info("Push sent to device", { deviceId: device.id, messageId: result.messageId });
    } else {
      logger.error("Failed to send push to device", { deviceId: device.id, error: result.error });
      errors.push(result.error ?? "Unknown error");
    }
  }

  // Update sent_at if at least one push was sent successfully
  if (tokensSent > 0) {
    const { error: updateError } = await supabase
      .from(resultTable)
      .update({ sent_at: new Date().toISOString() })
      .eq("id", resultId);

    if (updateError) {
      logger.error("Failed to update sent_at", updateError);
    }
  }

  return new Response(
    JSON.stringify({
      success: tokensSent > 0,
      tokens_sent: tokensSent,
      total_devices: validDevices.length,
      errors: errors.length > 0 ? errors : undefined
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
