import { describe, expect, it } from "vitest";
import type { Lens } from "@notesbrain/shared";

import {
  createLensInputFromTemplate,
  createTemplateSnapshot,
  curatedLensTemplates,
  getLensTemplateById,
  getTemplateInstallState
} from "../../lib/lensLibrary";

const SEED_NAMES = [
  "Morning Briefing",
  "Tomorrow Planner",
  "Weekly Project Pulse",
  "Health Pattern Check",
  "Relationship Reminders",
  "Errands & Admin Sweep",
  "Idea Incubator",
  "Decision Log",
  "Friction Finder",
  "Gratitude & Wins"
];

function createLens(overrides: Partial<Lens>): Lens {
  return {
    id: "lens-1",
    user_id: "user-1",
    name: "Morning Briefing",
    prompt: "Review my recent notes and summarize the useful parts.",
    schedule_type: "daily",
    schedule_time: "08:00",
    schedule_day: null,
    lookback_hours: 48,
    categories: null,
    is_active: true,
    is_default: true,
    next_run_at: null,
    last_run_at: null,
    consecutive_failures: 0,
    last_error: null,
    last_error_at: null,
    source_template_id: null,
    source_template_version: null,
    installed_from_library_at: null,
    template_snapshot: null,
    created_at: "2026-05-09T00:00:00.000Z",
    updated_at: "2026-05-09T00:00:00.000Z",
    ...overrides
  };
}

describe("lens library catalog", () => {
  it("includes the ten initial curated seed templates", () => {
    expect(curatedLensTemplates.map((template) => template.name)).toEqual(SEED_NAMES);
  });

  it("keeps prompt text inside database length constraints", () => {
    for (const template of curatedLensTemplates) {
      expect(template.prompt.length).toBeGreaterThanOrEqual(20);
      expect(template.prompt.length).toBeLessThanOrEqual(2000);
    }
  });

  it("uses unique stable template IDs", () => {
    const templateIds = curatedLensTemplates.map((template) => template.template_id);
    expect(new Set(templateIds).size).toBe(templateIds.length);
    expect(templateIds).toContain("morning-briefing");
  });

  it("looks up templates by ID", () => {
    expect(getLensTemplateById("morning-briefing")?.name).toBe("Morning Briefing");
    expect(getLensTemplateById("missing-template")).toBeNull();
  });

  it("creates install input with copied fields and source metadata", () => {
    const template = curatedLensTemplates[0];
    const input = createLensInputFromTemplate(template);

    expect(input.name).toBe(template.name);
    expect(input.prompt).toBe(template.prompt);
    expect(input.schedule_type).toBe(template.schedule_type);
    expect(input.schedule_time).toBe(template.schedule_time);
    expect(input.schedule_day).toBe(template.schedule_day);
    expect(input.lookback_hours).toBe(template.lookback_hours);
    expect(input.categories).toBe(template.categories);
    expect(input.source_template_id).toBe(template.template_id);
    expect(input.source_template_version).toBe(template.version);
    expect(input.installed_from_library_at).toEqual(expect.any(String));
    expect(input.template_snapshot).toEqual(createTemplateSnapshot(template));
  });

  it("treats Morning Briefing as Installed when source metadata matches the current version", () => {
    const template = curatedLensTemplates[0];
    const lens = createLens({
      source_template_id: "morning-briefing",
      source_template_version: 1
    });

    expect(getTemplateInstallState(template, [lens])).toMatchObject({
      installState: "Installed",
      installedLens: lens
    });
  });

  it("detects an update when installed source metadata is older than the template", () => {
    const template = { ...curatedLensTemplates[0], version: 2 };
    const lens = createLens({
      source_template_id: "morning-briefing",
      source_template_version: 1
    });

    expect(getTemplateInstallState(template, [lens]).installState).toBe("Update available");
  });

  it("treats a template as Installed when any matching copy has the current version", () => {
    const template = { ...curatedLensTemplates[0], version: 2 };
    const olderLens = createLens({
      id: "older-lens",
      source_template_id: "morning-briefing",
      source_template_version: 1
    });
    const currentLens = createLens({
      id: "current-lens",
      source_template_id: "morning-briefing",
      source_template_version: 2
    });

    expect(getTemplateInstallState(template, [olderLens, currentLens])).toMatchObject({
      installState: "Installed",
      installedLens: currentLens
    });
  });
});
