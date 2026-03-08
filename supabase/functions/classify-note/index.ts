import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.0";

import { callOpenAIChatJson, buildClassificationPrompt } from "../_shared/openai.ts";
import { createServiceRoleClient } from "../_shared/supabase.ts";
import { createFunctionLogger } from "../_shared/logger.ts";
import { createHandler } from "./handler.ts";

type RuntimeConfig = {
  supabaseUrl: string;
  serviceRoleKey: string;
  openaiApiKey: string;
  classificationModel: string;
};

const REQUIRED_ENV_KEYS = [
  "SUPABASE_URL",
  "OPENAI_API_KEY"
];

function getRuntimeConfig(): RuntimeConfig {
  return {
    supabaseUrl: Deno.env.get("SUPABASE_URL") ?? "",
    // Use custom secret name because system-injected SUPABASE_SERVICE_ROLE_KEY can be out of sync.
    serviceRoleKey:
      Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    openaiApiKey: Deno.env.get("OPENAI_API_KEY") ?? "",
    classificationModel: Deno.env.get("OPENAI_CLASSIFICATION_MODEL") ?? "gpt-4o-mini"
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
      function: "classify-note",
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
  const logger = createFunctionLogger("classify-note", requestId);
  const config = getRuntimeConfig();
  if (req.method === "GET") {
    return healthResponse(config);
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
        headers: { "content-type": "application/json" }
      }
    );
  }

  const supabase = createServiceRoleClient({
    createClient,
    supabaseUrl: config.supabaseUrl,
    serviceRoleKey: config.serviceRoleKey
  });

  const handler = createHandler({
    logger,
    getNoteById: async (noteId) => {
      const { data, error } = await supabase
        .from("notes")
        .select("id,user_id,type,content,classification_status")
        .eq("id", noteId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data;
    },
    updateNote: async (noteId, patch) => {
      const { error } = await supabase
        .from("notes")
        .update(patch)
        .eq("id", noteId);

      if (error) {
        throw error;
      }
    },
    classifyContent: async (content) => {
      const prompt = buildClassificationPrompt(content);
      const result = await callOpenAIChatJson({
        fetchFn: fetch,
        apiKey: config.openaiApiKey,
        model: config.classificationModel,
        prompt
      });

      return result;
    }
  });

  return handler(req);
});
