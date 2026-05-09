import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.hoisted(() => vi.fn());

vi.stubGlobal("fetch", fetchMock);

describe("local edge function fallback", () => {
  beforeEach(() => {
    vi.resetModules();
    fetchMock.mockReset();
  });

  it("invokes local functions when the mobile app targets local Supabase", async () => {
    vi.stubEnv("EXPO_PUBLIC_SUPABASE_URL", "http://127.0.0.1:65421");
    fetchMock.mockResolvedValue({ ok: true });

    const { invokeLocalEdgeFunction, shouldInvokeLocalEdgeFunction } = await import("../../lib/localEdgeFunctions");

    expect(shouldInvokeLocalEdgeFunction()).toBe(true);

    await invokeLocalEdgeFunction("classify-note", { note_id: "note-1" });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:65421/functions/v1/classify-note",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ note_id: "note-1" }),
      })
    );
  });

  it("does not call functions when the mobile app targets production Supabase", async () => {
    vi.stubEnv("EXPO_PUBLIC_SUPABASE_URL", "https://example.supabase.co");

    const { invokeLocalEdgeFunction, shouldInvokeLocalEdgeFunction } = await import("../../lib/localEdgeFunctions");

    expect(shouldInvokeLocalEdgeFunction()).toBe(false);

    await invokeLocalEdgeFunction("classify-note", { note_id: "note-1" });

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
