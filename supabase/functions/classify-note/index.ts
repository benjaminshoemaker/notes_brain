import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.0";

import { callOpenAIChatJson, buildClassificationPrompt } from "../_shared/openai.ts";
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
const classificationModel = Deno.env.get("OPENAI_CLASSIFICATION_MODEL") ?? "gpt-4o-mini";

const supabase = createServiceRoleClient({
  createClient,
  supabaseUrl,
  serviceRoleKey
});

Deno.serve(
  createHandler({
    logger: console,
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
        apiKey: openaiApiKey,
        model: classificationModel,
        prompt
      });

      return result;
    }
  })
);

