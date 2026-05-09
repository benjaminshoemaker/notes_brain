import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.0";

import { callOpenAIWhisperTranscription } from "../_shared/openai.ts";
import { retryWithBackoff } from "../_shared/retry.ts";
import { createServiceRoleClient, getServiceRoleKeyFromEnv } from "../_shared/supabase.ts";
import { createFunctionLogger } from "../_shared/logger.ts";
import { createHandler } from "./handler.ts";

type RuntimeConfig = {
  supabaseUrl: string;
  serviceRoleKey: string;
  openaiApiKey: string;
  whisperModel: string;
};

const REQUIRED_ENV_KEYS = [
  "SUPABASE_URL",
  "OPENAI_API_KEY"
];

function getRuntimeConfig(): RuntimeConfig {
  return {
    supabaseUrl: Deno.env.get("SUPABASE_URL") ?? "",
    serviceRoleKey: getServiceRoleKeyFromEnv(),
    openaiApiKey: Deno.env.get("OPENAI_API_KEY") ?? "",
    whisperModel: Deno.env.get("OPENAI_WHISPER_MODEL") ?? "whisper-1"
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
      function: "transcribe-voice",
      ready: missingEnv.length === 0,
      missing_env: missingEnv
    }),
    {
      status: 200,
      headers: { "content-type": "application/json" }
    }
  );
}

async function triggerClassification(noteId: string, config: RuntimeConfig) {
  const response = await fetch(`${config.supabaseUrl}/functions/v1/classify-note`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${config.serviceRoleKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({ note_id: noteId })
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `Failed to trigger classify-note: ${response.status} ${text}`.trim()
    );
  }
}

Deno.serve(async (req) => {
  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();
  const logger = createFunctionLogger("transcribe-voice", requestId);
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
        .select("id,user_id,type,content")
        .eq("id", noteId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data;
    },
    downloadVoiceFile: async (storagePath) => {
      const attemptDownload = async () => {
        const { data, error } = await supabase.storage
          .from("attachments")
          .download(storagePath);

        if (error) {
          throw error;
        }

        if (!data) {
          throw new Error("Missing audio file");
        }

        return data;
      };

      return retryWithBackoff(attemptDownload, {
        delaysMs: [500, 1000, 2000, 4000, 8000],
        onRetry: (error, retryNumber) => {
          logger.error("Retrying voice download", { storagePath, retryNumber, error });
        }
      });
    },
    transcribeAudio: async (audio) => {
      return callOpenAIWhisperTranscription({
        fetchFn: fetch,
        apiKey: config.openaiApiKey,
        audio,
        filename: "voice.m4a",
        model: config.whisperModel
      });
    },
    updateNoteContent: async (noteId, transcript) => {
      const { error } = await supabase
        .from("notes")
        .update({
          content: transcript,
          classification_status: "pending",
          classification_confidence: null
        })
        .eq("id", noteId);

      if (error) {
        throw error;
      }
    },
    triggerClassification: async (noteId) => triggerClassification(noteId, config),
    markNoteFailed: async (noteId) => {
      const { error } = await supabase
        .from("notes")
        .update({
          category: "uncategorized",
          classification_status: "failed",
          classification_confidence: null
        })
        .eq("id", noteId);

      if (error) {
        throw error;
      }
    }
  });

  return handler(req);
});
