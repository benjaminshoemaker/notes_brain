import { createClient } from "jsr:@supabase/supabase-js@2";

import { createServiceRoleClient } from "../_shared/supabase.ts";
import { getAccessToken, sendFCMMessage } from "../_shared/fcm.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const FCM_PROJECT_ID = Deno.env.get("FCM_PROJECT_ID") ?? "";
const FCM_SERVICE_ACCOUNT_KEY = Deno.env.get("FCM_SERVICE_ACCOUNT_KEY") ?? "";

type RequestBody = {
  user_id: string;
  summary_id: string;
  title: string;
  body: string;
  data?: Record<string, string>;
};

type Device = {
  id: string;
  push_token: string | null;
  platform: string;
};

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
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

  const { user_id, summary_id, title, body: messageBody, data } = body;

  if (!user_id || !summary_id || !title || !messageBody) {
    return new Response(
      JSON.stringify({ error: "Missing required fields: user_id, summary_id, title, body" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!FCM_PROJECT_ID || !FCM_SERVICE_ACCOUNT_KEY) {
    console.error("FCM credentials not configured");
    return new Response(
      JSON.stringify({ error: "FCM not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const supabase = createServiceRoleClient({
    createClient,
    supabaseUrl: SUPABASE_URL,
    serviceRoleKey: SUPABASE_SERVICE_ROLE_KEY
  });

  // Fetch Android devices with push tokens for this user
  const { data: devices, error: devicesError } = await supabase
    .from("devices")
    .select("id, push_token, platform")
    .eq("user_id", user_id)
    .eq("platform", "android")
    .not("push_token", "is", null);

  if (devicesError) {
    console.error("Failed to fetch devices:", devicesError);
    return new Response(
      JSON.stringify({ error: "Failed to fetch devices" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const validDevices = ((devices as Device[]) ?? []).filter(d => d.push_token);

  if (validDevices.length === 0) {
    console.log(`No Android devices with push tokens for user ${user_id}`);
    return new Response(
      JSON.stringify({ success: true, tokens_sent: 0, message: "No devices to notify" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  // Get FCM access token
  let accessToken: string;
  try {
    accessToken = await getAccessToken(fetch, FCM_SERVICE_ACCOUNT_KEY);
  } catch (error) {
    console.error("Failed to get FCM access token:", error);
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
      projectId: FCM_PROJECT_ID,
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
      console.log(`Push sent to device ${device.id}: ${result.messageId}`);
    } else {
      console.error(`Failed to send push to device ${device.id}: ${result.error}`);
      errors.push(result.error ?? "Unknown error");
    }
  }

  // Update sent_at if at least one push was sent successfully
  if (tokensSent > 0) {
    const { error: updateError } = await supabase
      .from("daily_summaries")
      .update({ sent_at: new Date().toISOString() })
      .eq("id", summary_id);

    if (updateError) {
      console.error("Failed to update sent_at:", updateError);
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
