# Discovery Notes

Generated: 2026-04-08
Source: /discover conversation

## Idea Summary

Echo's daily summary is the seed of something bigger: a platform where users define their own "lenses" — scheduled AI prompts that run against their notes and deliver personalized intelligence. The daily summary becomes the default lens that ships with the app, but users can create unlimited custom lenses like "Weekly health trends," "Monthly idea incubator," or "Friday project pulse."

The motivation isn't just "better summaries" — it's architectural. Notes become a data layer, and lenses become the first "compute over notes" primitive. The scheduled prompt system should be designed as a general-purpose engine that future features (event-triggered prompts, shared lens templates, Zapier/Composio integrations) can build on top of.

## Key Decisions

- **Problem:** The daily summary is valuable but one-size-fits-all. Users capture notes across very different life domains (work, health, family, ideas) and want different AI analysis for each, on different schedules.
- **Audience:** Existing Echo users. Same app, new capability.
- **Platform:** Mobile (React Native/Expo) + Web (React), Supabase backend — existing stack.
- **Stack preferences:** None new — extend current stack. Supabase Edge Functions, pg_cron, OpenAI.
- **MVP scope:** CRUD for scheduled prompts. User creates a lens (name, prompt, schedule, category filter + time window), it fires on schedule, result shows in-app with push notification. No templates, no prompt library — just the raw authoring + execution loop.
- **Exciting part:** The architecture. Getting the platform layer right so lenses are just the first consumer. The MVP UI can be simple, but the engine underneath should be designed for extensibility.

## Open Questions

- **Free vs. Pro boundary:** The existing CODEX_PROMPT.md suggests free users get only the default Morning Briefing, Pro users get custom lenses. Is this still the plan? What's the lens limit for Pro?
- **Daily summary migration:** Should the existing `daily_summaries` table be migrated into the lens system, or kept as a parallel path during MVP? The CODEX_PROMPT.md explored both.
- **Output format:** The current summary has a structured format (`top_actions`, `avoiding`, `small_win`). Custom lenses will produce freeform content. Should there be structured output templates, or just freeform text/markdown?
- **Prompt guardrails:** Any constraints on what prompts users can write? Length limits? Content filtering? Cost caps (each lens execution = an OpenAI API call)?
- **Test run before scheduling:** Should users be able to "preview" a lens result before committing to a schedule? (Not in MVP per the user, but worth noting for architecture.)
- **Notification density:** If a user creates 5 daily lenses, that's 5 push notifications per day. Any batching or digest strategy?
- **Action extensibility model:** V1 is notify + display. The user mentioned Composio/Zapier for future integrations. Should the action layer be a simple enum (`notify`, `email`, `webhook`) or a plugin interface?

## Existing Solutions & Tools

### Use Directly
None found that solve the full problem within Echo's stack and mobile-first context.

### Leverage

- **Supabase Cron (pg_cron + pg_net)** — Already in the stack. Best approach: keep the single high-frequency cron job (every 5 min) that polls a `scheduled_prompts` table for due lenses, rather than creating dynamic per-user cron jobs. pg_cron recommends max 8 concurrent jobs.
- **Trigger.dev** — TypeScript-native background jobs with cron scheduling, retries, and observability. Natural upgrade path if pg_cron's limits are hit. Already has an MCP integration in this repo. Would replace pg_cron, not the whole feature.
- **Langfuse Prompt Management** — Open-source prompt templating and versioning with TS SDK. Study its template variable model (`{{notes}}`, `{{date_range}}`, `{{category}}`). Likely overkill to adopt directly for MVP, but useful if prompt sharing/versioning becomes a feature.

### Take Inspiration From

- **Khoj AI Automations** (~34k GitHub stars) — Closest open-source analog. Users write natural-language queries, attach a cron schedule and timezone, and Khoj runs them against indexed content with email delivery. Architecture maps almost 1:1 to what Echo needs. Key patterns: plain-text query + schedule + knowledge retrieval + delivery.
- **Mem.ai Daily Digest** — Commercial AI notes app. Its digest is fully automated (no user config), which is both its strength and limitation. Echo's opportunity is offering what Mem doesn't: user-defined lenses. UX benchmark for the "zero-config default that just works."
- **Reflection.app Reviews** — AI journaling app with weekly/monthly/annual reviews at increasing abstraction levels. Key insight: the lookback window should vary with cadence (weekly = summarize, monthly = find patterns, annual = identify themes). Suggests lenses need a "lookback window" parameter, not just a schedule.
- **Granola "Recipes"** — AI meeting notepad where users apply different prompt templates as "lenses" over content. The "recipe = name + prompt template + output format" model maps directly to Echo's lens concept. Strong UX reference for prompt creation.

## Raw Context

- "The prompt should do the heavy lifting in most cases" — when asked about note targeting, the user emphasized that category + time window are structural filters, but the natural-language prompt is the real query language. This suggests the filter UI should be lightweight, not a complex query builder.
- The CODEX_PROMPT.md in `features/custom-lenses/` already contains a detailed technical design brief including DB schema sketches, Edge Function architecture, migration strategy, and marketplace-ready data model considerations. This discovery validates and refines that earlier thinking.
- The user sees this as "notes as a platform" — not just a feature addition but an architectural inflection point. The scheduling engine should be generic enough that non-scheduled use cases (manual trigger, event-triggered) can use the same pipeline.
- Prior art naming: the CODEX_PROMPT.md calls these "Custom Lenses" with "Morning Briefing" as the default. The user's framing in this conversation was "scheduled prompts" / "scheduled jobs." Either name works; "Lenses" has more product personality.
- Composio and Zapier were mentioned as future integration targets for output actions. Design the action layer with an interface, not a hardcoded enum.
