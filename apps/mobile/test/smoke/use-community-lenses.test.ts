import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CommunityLensTemplatePublic, Lens, LensTemplateReport } from "@notesbrain/shared";

vi.mock("../../lib/supabaseClient", () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn()
  }
}));

import { supabase } from "../../lib/supabaseClient";
import {
  createCommunityLensItems,
  fetchCommunityTemplates,
  installCommunityLens,
  invalidateCommunityLensQueries,
  publishCommunityLens,
  reportCommunityLens,
  unpublishCommunityLens
} from "../../hooks/useCommunityLenses";

function createTemplate(overrides: Partial<CommunityLensTemplatePublic> = {}): CommunityLensTemplatePublic {
  return {
    id: "template-1",
    name: "Project Pulse",
    description: "Find project movement.",
    prompt: "Review my project notes and summarize what moved and what stalled this week.",
    schedule_type: "weekly",
    schedule_time: "16:00",
    schedule_day: 5,
    lookback_hours: 168,
    categories: ["projects"],
    category: "projects",
    version: 2,
    author_display_name: "Alex",
    install_count: 12,
    created_at: "2026-05-12T00:00:00.000Z",
    updated_at: "2026-05-12T01:00:00.000Z",
    ...overrides
  };
}

function createLens(overrides: Partial<Lens>): Lens {
  return {
    id: "lens-1",
    user_id: "user-1",
    name: "Project Pulse",
    prompt: "Review project notes.",
    schedule_type: "weekly",
    schedule_time: "16:00",
    schedule_day: 5,
    lookback_hours: 168,
    categories: ["projects"],
    is_active: true,
    is_default: false,
    next_run_at: null,
    last_run_at: null,
    consecutive_failures: 0,
    last_error: null,
    last_error_at: null,
    source_template_id: null,
    source_template_version: null,
    installed_from_library_at: null,
    template_snapshot: null,
    created_at: "2026-05-12T00:00:00.000Z",
    updated_at: "2026-05-12T00:00:00.000Z",
    ...overrides
  };
}

function createQueryBuilder(result: { data: unknown; error: unknown }) {
  const builder = {
    select: vi.fn(() => builder),
    order: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    or: vi.fn(() => builder),
    limit: vi.fn(() => Promise.resolve(result))
  };
  return builder;
}

describe("useCommunityLenses data helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches public templates sorted by installs with search, category, and a 100-row limit", async () => {
    const row = createTemplate();
    const builder = createQueryBuilder({ data: [row], error: null });
    vi.mocked(supabase.from).mockReturnValue(builder as never);

    await expect(fetchCommunityTemplates({ search: "pulse", category: "projects" })).resolves.toEqual([row]);

    expect(supabase.from).toHaveBeenCalledWith("community_lens_templates_public");
    expect(builder.order).toHaveBeenCalledWith("install_count", { ascending: false });
    expect(builder.order).toHaveBeenCalledWith("updated_at", { ascending: false });
    expect(builder.eq).toHaveBeenCalledWith("category", "projects");
    expect(builder.or).toHaveBeenCalledWith(
      "name.ilike.%pulse%,description.ilike.%pulse%,author_display_name.ilike.%pulse%"
    );
    expect(builder.limit).toHaveBeenCalledWith(100);
  });

  it("derives install state from currently installed lenses", () => {
    const row = createTemplate({ id: "template-1", version: 2 });
    const lens = createLens({
      source_template_id: "template-1",
      source_template_version: 1
    });

    expect(createCommunityLensItems([row], [lens])[0]).toMatchObject({
      row,
      installState: "Update available",
      installedLens: lens
    });
  });

  it("calls community RPCs for publish, unpublish, install, and report", async () => {
    const report: LensTemplateReport = {
      id: "report-1",
      template_id: "template-1",
      reporter_user_id: "user-1",
      reason: "spam",
      note: "duplicate",
      resolved_at: null,
      created_at: "2026-05-12T00:00:00.000Z"
    };
    vi.mocked(supabase.rpc).mockResolvedValue({ data: report, error: null } as never);

    await publishCommunityLens({
      lensId: "lens-1",
      authorDisplayName: "Alex",
      description: "Useful",
      category: "projects"
    });
    await unpublishCommunityLens("lens-1");
    await installCommunityLens("template-1");
    await expect(
      reportCommunityLens({ templateId: "template-1", reason: "spam", note: "duplicate" })
    ).resolves.toBe(report);

    expect(supabase.rpc).toHaveBeenCalledWith("publish_lens_template", {
      p_lens_id: "lens-1",
      p_author_display_name: "Alex",
      p_description: "Useful",
      p_category: "projects"
    });
    expect(supabase.rpc).toHaveBeenCalledWith("unpublish_lens_template", { p_lens_id: "lens-1" });
    expect(supabase.rpc).toHaveBeenCalledWith("install_lens_template", { p_template_id: "template-1" });
    expect(supabase.rpc).toHaveBeenCalledWith("report_lens_template", {
      p_template_id: "template-1",
      p_reason: "spam",
      p_note: "duplicate"
    });
  });

  it("invalidates public, authored, and lens queries after community mutations", async () => {
    const queryClient = {
      invalidateQueries: vi.fn(() => Promise.resolve())
    };

    await invalidateCommunityLensQueries(queryClient as never, "user-1");

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["community-lens-templates"]
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["authored-community-lens-templates", "user-1"]
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["lenses", "user-1"]
    });
  });

  it("returns duplicate active report responses without changing reason or note", async () => {
    const existingReport = {
      id: "report-1",
      reason: "misleading",
      note: "original note"
    };
    vi.mocked(supabase.rpc).mockResolvedValue({ data: existingReport, error: null } as never);

    await expect(
      reportCommunityLens({ templateId: "template-1", reason: "spam", note: "new note" })
    ).resolves.toBe(existingReport);
  });

  it("surfaces unavailable template errors from RPCs", async () => {
    const error = new Error("Community lens template is not available");
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error } as never);

    await expect(installCommunityLens("template-1")).rejects.toThrow(
      "Community lens template is not available"
    );
  });
});
