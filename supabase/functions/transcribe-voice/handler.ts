type Logger = {
  info: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
};

type NoteRecord = {
  id: string;
  user_id: string;
  type: "text" | "voice" | "file";
};

type Dependencies = {
  getNoteById: (noteId: string) => Promise<NoteRecord | null>;
  downloadVoiceFile: (storagePath: string) => Promise<Blob>;
  transcribeAudio: (audio: Blob) => Promise<string>;
  updateNoteContent: (noteId: string, transcript: string) => Promise<void>;
  triggerClassification: (noteId: string) => Promise<void>;
  markNoteFailed: (noteId: string) => Promise<void>;
  logger: Logger;
};

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type"
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "content-type": "application/json"
    }
  });
}

function getNoteIdFromPayload(payload: unknown): string | null {
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

export function createHandler({
  getNoteById,
  downloadVoiceFile,
  transcribeAudio,
  updateNoteContent,
  triggerClassification,
  markNoteFailed,
  logger
}: Dependencies) {
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

    if (note.type !== "voice") {
      return jsonResponse({ success: true, note_id: noteId, skipped: true });
    }

    const storagePath = `${note.user_id}/voice/${noteId}.m4a`;

    try {
      const audio = await downloadVoiceFile(storagePath);
      const transcript = await transcribeAudio(audio);
      await updateNoteContent(noteId, transcript);
      await triggerClassification(noteId);

      return jsonResponse({ success: true, note_id: noteId, transcript });
    } catch (error) {
      logger.error("Transcription failed", { noteId, error });
      try {
        await markNoteFailed(noteId);
      } catch (markError) {
        logger.error("Failed to mark note as failed", { noteId, error: markError });
      }
      return jsonResponse({ error: "Transcription failed", note_id: noteId }, 500);
    }
  };
}

