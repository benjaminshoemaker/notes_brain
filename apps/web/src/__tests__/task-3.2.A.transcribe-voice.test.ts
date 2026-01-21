import { describe, expect, it, vi } from "vitest";

import { createHandler } from "../../../../supabase/functions/transcribe-voice/handler";

describe("Task 3.2.A (transcribe-voice)", () => {
  it("should transcribe audio and trigger classification when a voice note insert occurs", async () => {
    const downloadVoiceFile = vi.fn().mockResolvedValue(
      new Blob(["audio"], { type: "audio/m4a" })
    );
    const transcribeAudio = vi.fn().mockResolvedValue("transcript text");
    const updateNoteContent = vi.fn().mockResolvedValue(undefined);
    const triggerClassification = vi.fn().mockResolvedValue(undefined);
    const markNoteFailed = vi.fn().mockResolvedValue(undefined);
    const getNoteById = vi.fn().mockResolvedValue({
      id: "note_1",
      user_id: "user_1",
      type: "voice"
    });

    const handler = createHandler({
      getNoteById,
      downloadVoiceFile,
      transcribeAudio,
      updateNoteContent,
      triggerClassification,
      markNoteFailed,
      logger: console
    });

    const response = await handler(
      new Request("http://localhost", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ record: { id: "note_1" } })
      })
    );

    expect(response.status).toBe(200);
    expect(downloadVoiceFile).toHaveBeenCalledWith("user_1/voice/note_1.m4a");
    expect(transcribeAudio).toHaveBeenCalled();
    expect(updateNoteContent).toHaveBeenCalledWith("note_1", "transcript text");
    expect(triggerClassification).toHaveBeenCalledWith("note_1");
    expect(markNoteFailed).not.toHaveBeenCalled();
  });

  it("should mark the note failed when transcription fails", async () => {
    const downloadVoiceFile = vi.fn().mockResolvedValue(
      new Blob(["audio"], { type: "audio/m4a" })
    );
    const transcribeAudio = vi.fn().mockRejectedValue(new Error("whisper failed"));
    const updateNoteContent = vi.fn();
    const triggerClassification = vi.fn();
    const markNoteFailed = vi.fn().mockResolvedValue(undefined);
    const getNoteById = vi.fn().mockResolvedValue({
      id: "note_1",
      user_id: "user_1",
      type: "voice"
    });

    const logger = { info: vi.fn(), error: vi.fn() };

    const handler = createHandler({
      getNoteById,
      downloadVoiceFile,
      transcribeAudio,
      updateNoteContent,
      triggerClassification,
      markNoteFailed,
      logger
    });

    const response = await handler(
      new Request("http://localhost", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ record: { id: "note_1" } })
      })
    );

    expect(response.status).toBe(500);
    expect(markNoteFailed).toHaveBeenCalledWith("note_1");
    expect(updateNoteContent).not.toHaveBeenCalled();
    expect(triggerClassification).not.toHaveBeenCalled();
  });
});

