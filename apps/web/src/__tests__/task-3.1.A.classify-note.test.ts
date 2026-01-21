import { describe, expect, it, vi } from "vitest";

import { createServiceRoleClient } from "../../../../supabase/functions/_shared/supabase";
import {
  buildClassificationPrompt,
  callOpenAIChatJson,
  parseClassificationResult
} from "../../../../supabase/functions/_shared/openai";
import { createHandler, getNoteIdFromPayload } from "../../../../supabase/functions/classify-note/handler";

describe("Task 3.1.A (classify-note)", () => {
  it("should accept direct call payloads when note_id is provided", () => {
    const noteId = getNoteIdFromPayload({ note_id: "note_123" });
    expect(noteId).toBe("note_123");
  });

  it("should accept webhook payloads when record id is provided", () => {
    const noteId = getNoteIdFromPayload({
      type: "INSERT",
      table: "notes",
      record: { id: "note_456" }
    });
    expect(noteId).toBe("note_456");
  });

  it("should create a service role Supabase client when service role key is provided", () => {
    const createClient = vi.fn();
    createServiceRoleClient({
      createClient,
      supabaseUrl: "https://example.supabase.co",
      serviceRoleKey: "service_role_key"
    });

    expect(createClient).toHaveBeenCalledWith("https://example.supabase.co", "service_role_key", {
      auth: { persistSession: false }
    });
  });

  it("should skip classification when note type is file", async () => {
    const classifyContent = vi.fn();
    const updateNote = vi.fn();
    const getNoteById = vi.fn().mockResolvedValue({
      id: "note_1",
      user_id: "user_1",
      type: "file",
      content: "ignored",
      classification_status: "pending"
    });

    const handler = createHandler({
      getNoteById,
      updateNote,
      classifyContent,
      logger: console
    });

    const response = await handler(
      new Request("http://localhost", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ note_id: "note_1" })
      })
    );

    expect(response.status).toBe(200);
    expect(classifyContent).not.toHaveBeenCalled();
    expect(updateNote).not.toHaveBeenCalled();
  });

  it("should skip classification when classification_status is not pending", async () => {
    const classifyContent = vi.fn();
    const updateNote = vi.fn();
    const getNoteById = vi.fn().mockResolvedValue({
      id: "note_1",
      user_id: "user_1",
      type: "text",
      content: "ignored",
      classification_status: "manual"
    });

    const handler = createHandler({
      getNoteById,
      updateNote,
      classifyContent,
      logger: console
    });

    const response = await handler(
      new Request("http://localhost", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ note_id: "note_1" })
      })
    );

    expect(response.status).toBe(200);
    expect(classifyContent).not.toHaveBeenCalled();
    expect(updateNote).not.toHaveBeenCalled();
  });

  it("should skip classification when note content is empty", async () => {
    const classifyContent = vi.fn();
    const updateNote = vi.fn();
    const getNoteById = vi.fn().mockResolvedValue({
      id: "note_1",
      user_id: "user_1",
      type: "text",
      content: "   ",
      classification_status: "pending"
    });

    const handler = createHandler({
      getNoteById,
      updateNote,
      classifyContent,
      logger: console
    });

    const response = await handler(
      new Request("http://localhost", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ note_id: "note_1" })
      })
    );

    expect(response.status).toBe(200);
    expect(classifyContent).not.toHaveBeenCalled();
    expect(updateNote).not.toHaveBeenCalled();
  });

  it("should call OpenAI with the exact classification prompt when classifying content", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify({ category: "ideas", confidence: 0.87 }) } }]
      })
    });

    await callOpenAIChatJson({
      fetchFn: fetchMock,
      apiKey: "sk-test",
      model: "gpt-4o-mini",
      prompt: buildClassificationPrompt("hello world")
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.openai.com/v1/chat/completions");
    expect(init.method).toBe("POST");

    const body = JSON.parse(String(init.body));
    expect(body.messages?.at(-1)?.content).toBe(buildClassificationPrompt("hello world"));
  });

  it("should parse JSON classification responses when category and confidence are present", () => {
    const result = parseClassificationResult(JSON.stringify({ category: "projects", confidence: 0.33 }));
    expect(result).toEqual({ category: "projects", confidence: 0.33 });
  });

  it("should update the note when classification succeeds", async () => {
    const classifyContent = vi.fn().mockResolvedValue({ category: "health", confidence: 0.5 });
    const updateNote = vi.fn();
    const getNoteById = vi.fn().mockResolvedValue({
      id: "note_1",
      user_id: "user_1",
      type: "text",
      content: "work out today",
      classification_status: "pending"
    });

    const handler = createHandler({
      getNoteById,
      updateNote,
      classifyContent,
      logger: console
    });

    const response = await handler(
      new Request("http://localhost", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ note_id: "note_1" })
      })
    );

    expect(response.status).toBe(200);
    expect(updateNote).toHaveBeenCalledWith("note_1", {
      category: "health",
      classification_confidence: 0.5,
      classification_status: "completed"
    });
  });
});

