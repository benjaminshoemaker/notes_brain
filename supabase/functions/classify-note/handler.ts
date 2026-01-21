type Logger = {
  info: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
};

type NoteRecord = {
  id: string;
  user_id: string;
  type: "text" | "voice" | "file";
  content: string | null;
  classification_status: "pending" | "completed" | "failed" | "manual";
};

type UpdateNoteInput = {
  category: string;
  classification_confidence: number | null;
  classification_status: NoteRecord["classification_status"];
};

type Dependencies = {
  getNoteById: (noteId: string) => Promise<NoteRecord | null>;
  updateNote: (noteId: string, patch: UpdateNoteInput) => Promise<void>;
  classifyContent: (content: string) => Promise<{ category: string; confidence: number }>;
  logger: Logger;
};

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type"
};

export function getNoteIdFromPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;

  const direct = record["note_id"];
  if (typeof direct === "string" && direct.trim().length > 0) {
    return direct.trim();
  }

  const webhookRecord = record["record"];
  if (webhookRecord && typeof webhookRecord === "object") {
    const id = (webhookRecord as Record<string, unknown>)["id"];
    if (typeof id === "string" && id.trim().length > 0) {
      return id.trim();
    }
  }

  return null;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "content-type": "application/json"
    }
  });
}

export function createHandler({ getNoteById, updateNote, classifyContent, logger }: Dependencies) {
  return async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    let payload: unknown;
    try {
      payload = await req.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    const noteId = getNoteIdFromPayload(payload);
    if (!noteId) {
      return jsonResponse({ error: "Missing note_id" }, 400);
    }

    const note = await getNoteById(noteId);
    if (!note) {
      return jsonResponse({ error: "Note not found", note_id: noteId }, 404);
    }

    const content = note.content?.trim() ?? "";
    const shouldSkip =
      note.type === "file" || note.classification_status !== "pending" || content.length === 0;

    if (shouldSkip) {
      return jsonResponse({ success: true, note_id: noteId, skipped: true });
    }

    try {
      const result = await classifyContent(content);
      await updateNote(noteId, {
        category: result.category,
        classification_confidence: result.confidence,
        classification_status: "completed"
      });

      return jsonResponse({
        success: true,
        note_id: noteId,
        category: result.category,
        confidence: result.confidence
      });
    } catch (error) {
      logger.error("Classification failed", { noteId, error });
      return jsonResponse({ error: "Classification failed", note_id: noteId }, 500);
    }
  };
}

