import { describe, expect, it } from "vitest";
import type { CommunityLensTemplatePublic, Lens } from "@notesbrain/shared";

import {
  communityTemplateToLensTemplate,
  createLensInputFromTemplate,
  createTemplateSnapshot,
  curatedLensTemplates,
  getTemplateInstallState
} from "../../lib/lensLibrary";

function createCommunityTemplate(
  overrides: Partial<CommunityLensTemplatePublic> = {}
): CommunityLensTemplatePublic {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Project Pulse",
    description: "Finds project momentum and stalled work.",
    prompt: "Review my project notes and summarize what moved, what stalled, and what needs attention next.",
    schedule_type: "weekly",
    schedule_time: "16:00",
    schedule_day: 5,
    lookback_hours: 168,
    categories: ["projects"],
    category: "projects",
    version: 3,
    author_display_name: "Alex Writer",
    install_count: 42,
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
    prompt: "Review my project notes and summarize what moved.",
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

describe("community lens library helpers", () => {
  it("converts public community rows into the UI template shape", () => {
    const row = createCommunityTemplate();
    const template = communityTemplateToLensTemplate(row);

    expect(template).toMatchObject({
      template_id: row.id,
      version: row.version,
      name: row.name,
      description: row.description,
      focus: row.description,
      prompt: row.prompt,
      schedule_type: row.schedule_type,
      schedule_time: row.schedule_time,
      schedule_day: row.schedule_day,
      lookback_hours: row.lookback_hours,
      categories: row.categories,
      category: row.category,
      author_type: "community",
      author_name: row.author_display_name,
      updated_at: row.updated_at
    });
    expect(JSON.stringify(template)).not.toContain("author_user_id");
    expect(JSON.stringify(template)).not.toContain("source_lens_id");
  });

  it("creates community snapshots with prompt, schedule, lookback, categories, author, template id, and version", () => {
    const template = communityTemplateToLensTemplate(createCommunityTemplate());
    const snapshot = createTemplateSnapshot(template);

    expect(snapshot).toEqual({
      template_id: template.template_id,
      version: template.version,
      name: template.name,
      description: template.description,
      category: template.category,
      author_type: "community",
      author_name: template.author_name,
      prompt: template.prompt,
      schedule_type: template.schedule_type,
      schedule_time: template.schedule_time,
      schedule_day: template.schedule_day,
      lookback_hours: template.lookback_hours,
      categories: template.categories
    });
  });

  it("creates install input with community source metadata and snapshot fields", () => {
    const template = communityTemplateToLensTemplate(createCommunityTemplate());
    const input = createLensInputFromTemplate(template);

    expect(input).toMatchObject({
      name: template.name,
      prompt: template.prompt,
      schedule_type: template.schedule_type,
      schedule_time: template.schedule_time,
      schedule_day: template.schedule_day,
      lookback_hours: template.lookback_hours,
      categories: template.categories,
      source_template_id: template.template_id,
      source_template_version: template.version,
      template_snapshot: createTemplateSnapshot(template)
    });
  });

  it("derives install state from community source_template_id and installed version", () => {
    const template = communityTemplateToLensTemplate(createCommunityTemplate({ version: 3 }));
    const currentLens = createLens({
      source_template_id: template.template_id,
      source_template_version: 3
    });
    const olderLens = createLens({
      id: "older-lens",
      source_template_id: template.template_id,
      source_template_version: 2
    });

    expect(getTemplateInstallState(template, [olderLens]).installState).toBe("Update available");
    expect(getTemplateInstallState(template, [olderLens, currentLens])).toMatchObject({
      installState: "Installed",
      installedLens: currentLens
    });
  });

  it("preserves curated template snapshot behavior with the expanded snapshot contract", () => {
    const template = curatedLensTemplates[0];

    expect(createTemplateSnapshot(template)).toMatchObject({
      template_id: template.template_id,
      version: template.version,
      author_type: "curated",
      author_name: "Notes Brain",
      prompt: template.prompt,
      schedule_type: template.schedule_type,
      lookback_hours: template.lookback_hours
    });
  });
});
