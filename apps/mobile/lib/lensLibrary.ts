import type { CommunityLensTemplatePublic, Lens, LensTemplate, LensTemplateSnapshot } from "@notesbrain/shared";

import type { CreateLensInput } from "../hooks/useLenses";

export type LensLibraryInstallState = "Not installed" | "Installed" | "Update available";

export const curatedLensTemplates: LensTemplate[] = [
  {
    template_id: "morning-briefing",
    version: 1,
    name: "Morning Briefing",
    description: "Top actions, avoidance, and one small win.",
    focus: "Finds the most useful next actions and one positive signal from recent notes.",
    prompt: "Review my recent notes and give me my top 3 action items, one thing I may be avoiding, and one small win worth noticing.",
    schedule_type: "daily",
    schedule_time: "08:00",
    schedule_day: null,
    lookback_hours: 48,
    categories: null,
    category: "planning",
    author_type: "curated",
    author_name: "Notes Brain",
    updated_at: "2026-05-09",
    changelog: ["Initial curated template."],
    example_output: "Top actions, avoidance, and a small win."
  },
  {
    template_id: "tomorrow-planner",
    version: 1,
    name: "Tomorrow Planner",
    description: "Turns loose notes into a short plan for tomorrow.",
    focus: "Looks for unfinished tasks, time-sensitive items, and practical next steps.",
    prompt: "Review today's notes and turn any loose tasks, reminders, and open loops into a short plan for tomorrow with no more than five prioritized items.",
    schedule_type: "daily",
    schedule_time: "19:00",
    schedule_day: null,
    lookback_hours: 24,
    categories: null,
    category: "planning",
    author_type: "curated",
    author_name: "Notes Brain",
    updated_at: "2026-05-09",
    changelog: ["Initial curated template."]
  },
  {
    template_id: "weekly-project-pulse",
    version: 1,
    name: "Weekly Project Pulse",
    description: "Summarizes what moved, stalled, and needs a next step.",
    focus: "Highlights project momentum and unresolved blockers across the week.",
    prompt: "Review this week's notes and summarize which projects moved forward, which projects stalled, and the clearest next step for each active project.",
    schedule_type: "weekly",
    schedule_time: "16:00",
    schedule_day: 5,
    lookback_hours: 168,
    categories: null,
    category: "work",
    author_type: "curated",
    author_name: "Notes Brain",
    updated_at: "2026-05-09",
    changelog: ["Initial curated template."]
  },
  {
    template_id: "health-pattern-check",
    version: 1,
    name: "Health Pattern Check",
    description: "Finds patterns in sleep, exercise, mood, diet, and symptoms.",
    focus: "Looks for repeated health signals without making medical claims.",
    prompt: "Review my recent health-related notes and identify recurring patterns in sleep, exercise, mood, diet, symptoms, or energy. Keep it observational and practical.",
    schedule_type: "weekly",
    schedule_time: "18:00",
    schedule_day: 0,
    lookback_hours: 168,
    categories: ["health"],
    category: "health",
    author_type: "curated",
    author_name: "Notes Brain",
    updated_at: "2026-05-09",
    changelog: ["Initial curated template."]
  },
  {
    template_id: "relationship-reminders",
    version: 1,
    name: "Relationship Reminders",
    description: "Finds people to follow up with and promises to close.",
    focus: "Looks for names, commitments, social open loops, and follow-up opportunities.",
    prompt: "Review my recent notes and list people I should follow up with, promises I made, and relationship open loops that would benefit from a small next action.",
    schedule_type: "weekly",
    schedule_time: "10:00",
    schedule_day: 1,
    lookback_hours: 168,
    categories: null,
    category: "relationships",
    author_type: "curated",
    author_name: "Notes Brain",
    updated_at: "2026-05-09",
    changelog: ["Initial curated template."]
  },
  {
    template_id: "errands-admin-sweep",
    version: 1,
    name: "Errands & Admin Sweep",
    description: "Collects bills, appointments, purchases, and logistics.",
    focus: "Turns scattered admin notes into a compact checklist.",
    prompt: "Review my recent notes and extract errands, bills, appointments, purchases, paperwork, and household logistics into a practical checklist.",
    schedule_type: "daily",
    schedule_time: "17:00",
    schedule_day: null,
    lookback_hours: 72,
    categories: null,
    category: "admin",
    author_type: "curated",
    author_name: "Notes Brain",
    updated_at: "2026-05-09",
    changelog: ["Initial curated template."]
  },
  {
    template_id: "idea-incubator",
    version: 1,
    name: "Idea Incubator",
    description: "Surfaces repeated ideas and concepts worth revisiting.",
    focus: "Finds promising ideas, repeated themes, and ideas to drop.",
    prompt: "Review my recent notes and identify repeated ideas, promising new concepts, and ideas that seem less useful now. Suggest one small way to develop the strongest idea.",
    schedule_type: "weekly",
    schedule_time: "14:00",
    schedule_day: 6,
    lookback_hours: 168,
    categories: null,
    category: "ideas",
    author_type: "curated",
    author_name: "Notes Brain",
    updated_at: "2026-05-09",
    changelog: ["Initial curated template."]
  },
  {
    template_id: "decision-log",
    version: 1,
    name: "Decision Log",
    description: "Tracks decisions made, pending, and missing information.",
    focus: "Separates clear decisions from unresolved choices.",
    prompt: "Review my recent notes and summarize decisions I made, decisions still pending, and any missing information that is blocking a decision.",
    schedule_type: "weekly",
    schedule_time: "15:00",
    schedule_day: 5,
    lookback_hours: 168,
    categories: null,
    category: "decisions",
    author_type: "curated",
    author_name: "Notes Brain",
    updated_at: "2026-05-09",
    changelog: ["Initial curated template."]
  },
  {
    template_id: "friction-finder",
    version: 1,
    name: "Friction Finder",
    description: "Finds recurring annoyances, blockers, and repeated complaints.",
    focus: "Looks for repeated friction that may be worth fixing.",
    prompt: "Review my recent notes and identify recurring annoyances, blockers, delays, or complaints. Group repeated friction and suggest one practical fix for the biggest pattern.",
    schedule_type: "weekly",
    schedule_time: "11:00",
    schedule_day: 0,
    lookback_hours: 168,
    categories: null,
    category: "reflection",
    author_type: "curated",
    author_name: "Notes Brain",
    updated_at: "2026-05-09",
    changelog: ["Initial curated template."]
  },
  {
    template_id: "gratitude-wins",
    version: 1,
    name: "Gratitude & Wins",
    description: "Collects wins, good moments, and progress worth noticing.",
    focus: "Highlights positive moments without turning them into generic affirmations.",
    prompt: "Review my recent notes and summarize wins, good moments, meaningful progress, and things I seemed grateful for. Keep it specific to what I actually wrote.",
    schedule_type: "weekly",
    schedule_time: "18:00",
    schedule_day: 6,
    lookback_hours: 168,
    categories: null,
    category: "reflection",
    author_type: "curated",
    author_name: "Notes Brain",
    updated_at: "2026-05-09",
    changelog: ["Initial curated template."]
  }
];

export function getLensTemplateById(templateId: string): LensTemplate | null {
  return curatedLensTemplates.find((template) => template.template_id === templateId) ?? null;
}

export function communityTemplateToLensTemplate(row: CommunityLensTemplatePublic): LensTemplate {
  return {
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
    updated_at: row.updated_at,
    changelog: [`Community version ${row.version}`]
  };
}

export function createTemplateSnapshot(template: LensTemplate): LensTemplateSnapshot {
  return {
    template_id: template.template_id,
    version: template.version,
    name: template.name,
    description: template.description,
    category: template.category,
    author_type: template.author_type,
    author_name: template.author_name,
    prompt: template.prompt,
    schedule_type: template.schedule_type,
    schedule_time: template.schedule_time,
    schedule_day: template.schedule_day,
    lookback_hours: template.lookback_hours,
    categories: template.categories
  };
}

export function createLensInputFromTemplate(template: LensTemplate): CreateLensInput {
  return {
    name: template.name,
    prompt: template.prompt,
    schedule_type: template.schedule_type,
    schedule_time: template.schedule_time,
    schedule_day: template.schedule_day,
    lookback_hours: template.lookback_hours,
    categories: template.categories,
    source_template_id: template.template_id,
    source_template_version: template.version,
    installed_from_library_at: new Date().toISOString(),
    template_snapshot: createTemplateSnapshot(template)
  };
}

export function getTemplateInstallState(
  template: LensTemplate,
  lenses: Lens[]
): { installState: LensLibraryInstallState; installedLens: Lens | null } {
  const installedLenses = lenses.filter((lens) => lens.source_template_id === template.template_id);

  if (installedLenses.length === 0) {
    return { installState: "Not installed", installedLens: null };
  }

  const currentVersionLens =
    installedLenses.find((lens) => (lens.source_template_version ?? 0) >= template.version) ?? null;

  if (currentVersionLens) {
    return { installState: "Installed", installedLens: currentVersionLens };
  }

  return { installState: "Update available", installedLens: installedLenses[0] };
}
