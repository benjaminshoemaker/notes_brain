import { createClient } from "jsr:@supabase/supabase-js@2";

import { createFunctionLogger } from "../_shared/logger.ts";
import { createServiceRoleClient } from "../_shared/supabase.ts";

type RuntimeConfig = {
  supabaseUrl: string;
  serviceRoleKey: string;
  cronSecret: string;
};

type DueLens = {
  id: string;
  user_id: string;
};

const REQUIRED_ENV_KEYS = ["SUPABASE_URL", "CRON_SECRET"];

function getRuntimeConfig(): RuntimeConfig {
  return {
    supabaseUrl: Deno.env.get("SUPABASE_URL") ?? "",
    serviceRoleKey:
      Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
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

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function healthResponse(config: RuntimeConfig) {
  const missingEnv = getMissingEnv(config);
  return json({
    status: "ok",
    function: "dispatch-lenses",
    ready: missingEnv.length === 0,
    missing_env: missingEnv
  });
}

async function dispatchLens(config: RuntimeConfig, lens: DueLens) {
  const response = await fetch(`${config.supabaseUrl}/functions/v1/execute-lens`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Cron-Secret": config.cronSecret
    },
    body: JSON.stringify({ lens_id: lens.id, trigger: "cron" })
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`execute-lens returned ${response.status}${details ? `: ${details}` : ""}`);
  }
}

Deno.serve(async (req) => {
  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();
  const logger = createFunctionLogger("dispatch-lenses", requestId);
  const config = getRuntimeConfig();

  if (req.method === "GET") {
    return healthResponse(config);
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const missingEnv = getMissingEnv(config);
  if (missingEnv.length > 0) {
    logger.error("Missing required environment variables", { missingEnv });
    return json({
      error: "Missing required environment variables",
      missing_env: missingEnv,
      request_id: requestId
    }, 500);
  }

  const cronHeader = req.headers.get("x-cron-secret");
  if (!cronHeader || cronHeader !== config.cronSecret) {
    return json({ error: "Invalid X-Cron-Secret header", request_id: requestId }, 401);
  }

  const supabase = createServiceRoleClient({
    createClient,
    supabaseUrl: config.supabaseUrl,
    serviceRoleKey: config.serviceRoleKey
  });

  const { data: lenses, error } = await supabase
    .from("lenses")
    .select("id, user_id")
    .eq("is_active", true)
    .lte("next_run_at", new Date().toISOString());

  if (error) {
    logger.error("Failed to fetch due lenses", error);
    return json({ error: "Failed to fetch due lenses", request_id: requestId }, 500);
  }

  const dueLenses = (lenses as DueLens[] | null) ?? [];
  const results = await Promise.allSettled(dueLenses.map((lens) => dispatchLens(config, lens)));
  let failed = 0;

  results.forEach((result, index) => {
    if (result.status !== "rejected") {
      return;
    }

    failed++;
    logger.error("Failed to dispatch lens", {
      lensId: dueLenses[index]?.id,
      error: result.reason
    });
  });

  logger.info("Dispatch complete", {
    dueCount: dueLenses.length,
    dispatched: dueLenses.length - failed,
    failed
  });

  return json({
    success: true,
    dispatched: dueLenses.length - failed,
    failed,
    request_id: requestId
  });
});
