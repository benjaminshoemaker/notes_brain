import { describe, expect, it, vi } from "vitest";

import { retryWithBackoff } from "../../../../supabase/functions/_shared/retry";
import { createHandler } from "../../../../supabase/functions/classify-note/handler";

describe("Task 3.1.B (classification retry)", () => {
  it("should retry up to 3 times with exponential backoff when calls fail", async () => {
    const operation = vi.fn().mockRejectedValue(new Error("fail"));
    const sleep = vi.fn().mockResolvedValue(undefined);
    const onRetry = vi.fn();

    await expect(
      retryWithBackoff(operation, {
        delaysMs: [1000, 2000, 4000],
        sleep,
        onRetry
      })
    ).rejects.toThrow("fail");

    expect(operation).toHaveBeenCalledTimes(4);
    expect(sleep).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenNthCalledWith(1, 1000);
    expect(sleep).toHaveBeenNthCalledWith(2, 2000);
    expect(sleep).toHaveBeenNthCalledWith(3, 4000);
    expect(onRetry).toHaveBeenCalledTimes(3);
  });

  it("should mark the note failed when classification fails after retries", async () => {
    const classifyContent = vi.fn().mockRejectedValue(new Error("boom"));
    const updateNote = vi.fn().mockResolvedValue(undefined);
    const getNoteById = vi.fn().mockResolvedValue({
      id: "note_1",
      user_id: "user_1",
      type: "text",
      content: "hello",
      classification_status: "pending"
    });

    const logger = {
      info: vi.fn(),
      error: vi.fn()
    };

    const sleep = vi.fn().mockResolvedValue(undefined);

    const handler = createHandler({
      getNoteById,
      updateNote,
      classifyContent,
      logger,
      sleep
    });

    const response = await handler(
      new Request("http://localhost", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ note_id: "note_1" })
      })
    );

    expect(classifyContent).toHaveBeenCalledTimes(4);
    expect(logger.error).toHaveBeenCalled();
    expect(updateNote).toHaveBeenCalledWith("note_1", {
      category: "uncategorized",
      classification_confidence: null,
      classification_status: "failed"
    });
    expect(response.status).toBe(500);
  });
});

