import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.0";

import { callOpenAIWhisperTranscription } from "../_shared/openai.ts";
import { createServiceRoleClient } from "../_shared/supabase.ts";
import { createHandler } from "./handler.ts";

function getRequiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

const supabaseUrl = getRequiredEnv("SUPABASE_URL");
const serviceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
const openaiApiKey = getRequiredEnv("OPENAI_API_KEY");
const whisperModel = Deno.env.get("OPENAI_WHISPER_MODEL") ?? "whisper-1";

const supabase = createServiceRoleClient({
  createClient,
  supabaseUrl,
  serviceRoleKey
});

async function triggerClassification(noteId: string) {
  const response = await fetch(`${supabaseUrl}/functions/v1/classify-note`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${serviceRoleKey}`,
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

Deno.serve(
  createHandler({
    logger: console,
    getNoteById: async (noteId) => {
      const { data, error } = await supabase
        .from("notes")
        .select("id,user_id,type")
        .eq("id", noteId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data;
    },
    downloadVoiceFile: async (storagePath) => {
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
    },
    transcribeAudio: async (audio) => {
      return callOpenAIWhisperTranscription({
        fetchFn: fetch,
        apiKey: openaiApiKey,
        audio,
        filename: "voice.m4a",
        model: whisperModel
      });
    },
    updateNoteContent: async (noteId, transcript) => {
      const { error } = await supabase
        .from("notes")
        .update({ content: transcript })
        .eq("id", noteId);

      if (error) {
        throw error;
      }
    },
    triggerClassification,
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
  })
);

