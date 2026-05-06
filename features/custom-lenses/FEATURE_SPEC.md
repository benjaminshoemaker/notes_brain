# Feature Spec: Custom Lenses

**Feature:** Custom Lenses
**Date:** 2026-04-09
**Status:** Draft
**Upstream:** [DISCOVERY_NOTES.md](./DISCOVERY_NOTES.md), [CODEX_PROMPT.md](./CODEX_PROMPT.md)

---

## Problem Statement

Echo's daily summary delivers a fixed AI analysis (top 3 actions, thing you're avoiding, small win) from the last 48 hours of notes at 8 AM. Users capture notes across distinct life domains — work, health, family, ideas — but get a single undifferentiated summary. There is no way to ask different questions of different note categories on different schedules.

Custom Lenses generalizes the daily summary into a user-configurable system: each lens is a prompt + schedule + data filter that runs automatically and delivers AI-generated insights. The daily summary becomes the default lens ("Morning Briefing") that ships with the app.

### Why This Matters Beyond Summaries

This is the architectural inflection point where notes become a data layer. Lenses are the first "compute over notes" primitive. The scheduling engine, prompt execution pipeline, and result delivery system should be generic enough that future features — event-triggered prompts, shared lens templates, third-party integrations — build on the same foundation.

## Users

Existing Echo users on mobile and web. No new user type.

## Core User Experience

### Creating a Lens

1. User taps **"+"** button in the Summary tab header.
2. A creation form appears with these fields:
   - **Name** — free text, e.g., "Weekly Health Check" (required)
   - **Prompt** — free text describing what the lens should analyze, e.g., "Summarize my health notes. Spot trends in sleep, exercise, and mood." (required)
   - **Schedule** — picker with two options:
     - **Daily** at [time picker] (default: 8:00 AM)
     - **Weekly** on [day picker] at [time picker] (default: Monday 9:00 AM)
   - **Categories** — multi-select pill filter (optional, defaults to "All categories")
   - **Lookback window** — how far back to pull notes (default: auto-matched to frequency — 24h for daily, 7 days for weekly; user can override)
3. User taps **Save**. Lens appears in a management list and will fire on its next scheduled time.
4. User can optionally tap **Run Now** to trigger an immediate execution and see the result.

### Viewing Results

1. The **Summary tab** becomes a chronological feed of all lens results, most recent first.
2. Each result is a card showing:
   - Lens name (with a deterministic color derived from the lens name hash — no user-facing color picker)
   - Timestamp (when it ran)
   - Schedule badge (e.g., "Daily · 8 AM" or "Weekly · Mon")
   - Result content rendered as markdown
3. Results are grouped by date.
4. Empty state (no lenses yet): prompt to create first lens, with Morning Briefing suggested.
5. Pull-to-refresh reloads latest results.

### Managing Lenses

1. A **"Manage Lenses"** option (gear icon or menu) in the Summary tab header opens a lens list.
2. Each lens shows: name, schedule, last run time, active/paused status.
3. Actions per lens:
   - **Edit** — modify name, prompt, schedule, filters
   - **Pause/Resume** — toggle execution without deleting
   - **Run Now** — trigger immediate execution
   - **Delete** — remove lens and its result history (cascade delete)
4. The Morning Briefing lens appears here like any other lens. It can be edited, paused, or deleted.

### Receiving Notifications

1. When a lens produces a result, a push notification is sent.
2. Notification shows: lens name as title, first line of result as body.
3. Tapping the notification opens the Summary tab scrolled to that result.

## Default Lens: Morning Briefing

New users get a pre-created "Morning Briefing" lens on signup:

| Field | Value |
|-------|-------|
| Name | Morning Briefing |
| Prompt | "Give me my top 3 action items, one thing I'm avoiding, and one small win." |
| Schedule | Daily at 8:00 AM (user's timezone) |
| Categories | All |
| Lookback | 48 hours |

This lens is **fully editable and deletable** — it is not a system-locked feature. Users who prefer a different default (or no default) have full control.

**Migration:** Existing users who already have daily summaries will have a Morning Briefing lens auto-created. Their existing `daily_summaries` data will be migrated into `lens_results` so history is preserved.

## Data Model

### New: `lenses` table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | |
| user_id | UUID FK → users | Owner |
| name | TEXT | Display name |
| prompt | TEXT | User's natural-language instruction |
| schedule_type | TEXT | `daily` or `weekly` |
| schedule_time | TIME | Time of day (in user's timezone) |
| schedule_day | SMALLINT | Day of week (0=Sun, 6=Sat). NULL for daily. |
| lookback_hours | INTEGER | How many hours of notes to include |
| categories | TEXT[] | Category filter. NULL = all categories. |
| is_active | BOOLEAN | Whether the lens is currently scheduled |
| is_default | BOOLEAN | Whether this is the system-created default lens |
| next_run_at | TIMESTAMPTZ | When the lens should next execute (UTC, computed) |
| last_run_at | TIMESTAMPTZ | When the lens last executed |
| consecutive_failures | SMALLINT | Count of consecutive failed executions (reset on success) |
| last_error | TEXT | Error message from most recent failure (NULL on success) |
| last_error_at | TIMESTAMPTZ | When the most recent failure occurred |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### New: `lens_results` table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | |
| lens_id | UUID FK → lenses | Which lens produced this |
| user_id | UUID FK → users | Denormalized for RLS + queries |
| content | TEXT | Markdown result content |
| notes_analyzed | INTEGER | Count of notes included |
| generated_at | TIMESTAMPTZ | When the LLM produced this |
| sent_at | TIMESTAMPTZ | When push notification was delivered |

### Backwards Compatibility

The existing `daily_summaries` table is kept during migration but deprecated. A one-time migration script creates Morning Briefing lenses for existing users and copies `daily_summaries` rows into `lens_results` (converting the JSON content to markdown). After migration, the `daily_summaries` table is no longer written to.

## Scheduling Architecture

The current pattern is preserved and generalized with a fan-out design to stay within Supabase Edge Function runtime limits (150s free tier / 400s paid).

### Dispatcher + Worker Model

1. **pg_cron** fires every 5 minutes via `cron.schedule()`, calling a lightweight `dispatch-lenses` Edge Function using `net.http_post()`.
2. The **dispatcher** queries `lenses` for all active lenses whose `next_run_at` falls within the current window.
3. For each due lens, the dispatcher makes a separate `net.http_post()` call to an `execute-lens` (singular) Edge Function, passing the lens ID. This fans out execution so each lens runs in its own invocation with its own wall-clock budget.
4. The **worker** (`execute-lens`) handles one lens per invocation:
   - Query notes matching the lens's `categories` and `lookback_hours`
   - Build a prompt from the lens's `prompt` field + the notes content
   - Call OpenAI (gpt-4o-mini) with the prompt
   - Store the result in `lens_results`
   - Update `lenses.next_run_at` to the next scheduled time
   - Trigger push notification via the existing `send-push` function
   - On failure: increment `lenses.consecutive_failures` and store error detail
5. "Run Now" calls `execute-lens` directly, bypassing the dispatcher.

### Invocation + Auth

- The `dispatch-lenses` Edge Function is deployed with `--no-verify-jwt` and guarded by a shared secret header (`X-Cron-Secret`) stored in Supabase Vault.
- The `execute-lens` worker validates the same secret header. It uses the service role key internally for cross-user queries.
- pg_cron invocation: `SELECT cron.schedule('dispatch-lenses', '*/5 * * * *', $$ SELECT net.http_post(url, headers, body) $$)`

### Timezone Handling

Timezone is sourced from the `users.timezone` field (IANA format, already exists in the schema). Lenses do not store their own timezone — they inherit from the user profile. `next_run_at` is stored as `TIMESTAMPTZ` (UTC), computed when the lens is created or after each execution. This makes "due" queries a simple `WHERE next_run_at <= NOW()` without runtime timezone conversion. DST transitions are handled by recomputing `next_run_at` from `schedule_time` + user timezone after each run.

## Result Format

Lens results are **freeform markdown**. The LLM is instructed to format its response as readable markdown (headers, bullets, bold). This is rendered in a card using a safe markdown renderer that strips raw HTML and remote images. The specific renderer library is a technical spec decision — candidates include `react-native-markdown-display` (stable, widely used) or a newer native option if the app uses Expo dev builds with the New Architecture.

**Special case:** The Morning Briefing lens's prompt is designed to produce the familiar structured output (actions list, avoiding, small win). But this is an emergent property of the prompt, not a hard-coded format — if the user edits the prompt, the output format changes accordingly.

## Integration Points

### Modified Components

| Component | Change |
|-----------|--------|
| `summary.tsx` | Evolves from single-summary display to lens results feed |
| `SummaryCard.tsx` | Generalized to render any lens result (markdown), not just `DailySummaryContent` |
| `useDailySummary.ts` | Replaced by `useLensResults.ts` hook |
| `generate-summary/index.ts` | Replaced by `dispatch-lenses` + `execute-lens` Edge Functions |
| `_shared/openai.ts` | Prompt builder generalized to accept user-defined prompts |
| `send-push/index.ts` | Minor: support lens name in notification title |
| `_layout.tsx` | Notification tap handler updated for lens result deep links |
| `packages/shared/types.ts` | New `Lens`, `LensResult` types; `DailySummary` types deprecated |

### New Components

| Component | Purpose |
|-----------|---------|
| `LensResultCard.tsx` | Card component for a single lens result |
| `LensForm.tsx` | Create/edit form for a lens |
| `LensManageScreen.tsx` | List of user's lenses with edit/pause/delete actions |
| `useLenses.ts` | React Query hook for CRUD on lenses |
| `useLensResults.ts` | React Query hook for fetching lens results feed |
| `useRunLensNow.ts` | Mutation hook for manual lens execution |
| `dispatch-lenses/index.ts` | Dispatcher Edge Function — finds due lenses, fans out to worker |
| `execute-lens/index.ts` | Worker Edge Function — executes one lens per invocation |

### No Changes Required

- Note capture flow (Capture tab) — unchanged
- Notes list (Notes tab) — unchanged
- Auth flow — unchanged
- Settings screen — unchanged (lens management is in Summary tab, not Settings)
- Voice recording / file upload — unchanged

## Scope Boundaries

### In Scope (MVP)

- CRUD for lenses (create, read, update, delete)
- Pause/resume toggle
- Daily and weekly schedule frequencies
- Category and lookback-window filters
- Freeform markdown results
- Push notifications per result
- "Run Now" manual trigger
- Default Morning Briefing lens for new users
- Migration of existing daily summaries
- Mobile UI (React Native)

### Out of Scope

| Item | Reason |
|------|--------|
| Monthly / custom cron schedules | V2 — daily + weekly covers 90% of use cases |
| Lens templates / pre-built library | V2 — validate the core authoring experience first |
| Shared lens marketplace | Future — data model supports it but no UI yet |
| Email / webhook / Zapier output actions | Future — action layer designed as interface for extensibility |
| Prompt preview / test run before saving | Nice-to-have — "Run Now" after saving achieves the same goal |
| Web UI for lens management | V2 — mobile-first; web can display results via existing Summary page |
| AI-assisted prompt writing | Future — could suggest prompts based on user's note patterns |
| Lens result history / pagination | V2 — MVP shows recent results; pagination added when volume warrants |
| Cost controls / rate limiting per user | V2 — monitor usage first, then add limits if needed |

## Acceptance Criteria

1. **Create lens:** User can create a new lens with name, prompt, schedule (daily or weekly), optional category filter, and lookback window. Lens appears in management list.
2. **Edit lens:** User can modify any field of an existing lens. Changes take effect on next scheduled run.
3. **Delete lens:** User can delete a lens. Confirmation prompt shown. Result history is removed.
4. **Pause/resume:** User can toggle a lens between active and paused. Paused lenses do not execute on schedule.
5. **Scheduled execution:** Active lenses fire within their scheduled time window (within 5 minutes of target time). Results appear in the feed.
6. **Run Now:** User can manually trigger any lens. Result appears in the feed within 30 seconds.
7. **Results feed:** Summary tab displays all lens results in reverse chronological order, grouped by date. Each card shows lens name, time, and markdown content.
8. **Push notification:** When a lens produces a result, a push notification is sent with the lens name as title.
9. **Default lens:** New users have a Morning Briefing lens auto-created on first login.
10. **Default lens editable:** The Morning Briefing lens can be edited, paused, and deleted like any user-created lens.
11. **Migration:** Existing users' daily summary history is preserved and visible in the new results feed.
12. **Empty state:** Users with no lenses see a prompt to create their first one.

## Guardrails

- **Max lenses per user:** 10 (MVP). Enforced at creation time. Revisit based on usage data.
- **Prompt length:** 20–2000 characters. Enforced in the form with character counter.
- **Max notes per execution:** Cap at 100 most recent matching notes. If a lens's filters match more, take the newest 100. This bounds LLM input token cost.
- **Failure visibility:** If a lens fails 3 consecutive executions, mark it with an error state visible in the management list. User can tap to see "Last 3 runs failed" and retry manually.
- **Result retention:** Keep the most recent 90 days of results per lens. Older results are automatically deleted via a scheduled cleanup job.

## Non-Functional Requirements

- **Latency:** Lens execution (notes query + LLM call + result storage) completes within 30 seconds per lens.
- **Reliability:** Failed lens executions are logged with error detail. The system retries once on transient failure. After 3 consecutive failures, the lens is flagged (see Guardrails).
- **Security:** Users can only see and manage their own lenses and results (Supabase RLS). User-provided prompts are stored in the `lenses` table and passed to OpenAI along with the user's own notes. LLM output is treated as untrusted: the markdown renderer must disallow raw HTML, remote images, and executable links. Notification body text is plain-text only (no markdown rendering on lock screen).
- **Accessibility:** Lens management UI meets WCAG AA. All interactive elements have accessible labels. Markdown results support screen reader navigation.

## Future Enhancements

- Monthly and custom cron schedules
- Lens template library (curated + community)
- Shareable lens marketplace (publish prompt template, others install it)
- Output actions: email digest, webhook, Composio/Zapier integration
- Event-triggered lenses (e.g., "run when I add a note tagged 'urgent'")
- AI-assisted prompt authoring
- Lens analytics (which lenses are most useful, engagement tracking)
- Result pinning and archiving
