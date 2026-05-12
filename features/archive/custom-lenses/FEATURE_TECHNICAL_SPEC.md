# Feature Technical Spec: Custom Lenses

**Feature:** Custom Lenses
**Date:** 2026-04-09
**Status:** Draft
**Upstream:** [FEATURE_SPEC.md](./FEATURE_SPEC.md)

---

## 1. Existing Code Analysis

### 1.1 Similar Functionality Audit

| Existing Code | What It Does | Reuse Strategy |
|---------------|-------------|----------------|
| `supabase/functions/generate-summary/index.ts` | Cron-triggered Edge Function: iterates users, checks timezone windows, fetches notes, calls OpenAI, stores result, triggers push | **Replace** with `dispatch-lenses` + `execute-lens` pair. Port timezone logic and note-fetching pattern. |
| `supabase/functions/_shared/openai.ts` | `callOpenAISummary()` with hardcoded prompt builder, JSON response parsing | **Extend** — add `callOpenAIMarkdown()` that takes a user-defined prompt and returns raw text (no JSON parsing). Keep existing functions for backward compat during migration. |
| `supabase/functions/_shared/retry.ts` | Generic `retryWithBackoff()` with configurable delays | **Reuse as-is** for lens execution retries. |
| `supabase/functions/_shared/logger.ts` | Structured JSON logger with request ID tracking | **Reuse as-is** in new Edge Functions. |
| `supabase/functions/_shared/supabase.ts` | Service role client factory | **Reuse as-is**. |
| `supabase/functions/send-push/index.ts` | Sends FCM push, updates `daily_summaries.sent_at` | **Modify** — generalize to accept `result_id` + `result_table` params instead of hardcoded `summary_id`. |
| `apps/mobile/hooks/useDailySummary.ts` | React Query hook fetching today's summary | **Replace** with `useLensResults.ts`. Follow same query pattern. |
| `apps/mobile/hooks/useCreateNote.ts` | Mutation with optimistic updates, query invalidation | **Follow pattern** for `useLenses` CRUD mutations. |
| `apps/mobile/hooks/useUserSettings.ts` | Reads `users.timezone`, auto-detects device timezone | **Reuse** — timezone source for lens scheduling is already handled here. |
| `apps/mobile/components/SummaryCard.tsx` | Renders structured `DailySummaryContent` with checkboxes | **Replace** with `LensResultCard.tsx` using markdown rendering. |
| `apps/mobile/app/(app)/summary.tsx` | Single-summary screen with empty state, pull-to-refresh | **Rewrite** as lens results feed. Port pull-to-refresh and empty state patterns. |
| `apps/mobile/services/notifications.ts` | Push notification setup, `NotificationData` type | **Extend** — add `lens_result` notification type. |

### 1.2 Pattern Compliance

| Pattern | Convention | Source |
|---------|-----------|--------|
| File organization | `hooks/use*.ts`, `components/*.tsx`, `app/(app)/*.tsx`, `functions/<verb>-<noun>/index.ts` | All existing code |
| React Query keys | `["entity-name", userId, ...params]` | `useDailySummary`, `useNotes`, `useUserSettings` |
| React Query staleTime | 5 minutes for data that updates infrequently | `useDailySummary` |
| Mutations | `useMutation` with `onSuccess` → `invalidateQueries` | `useCreateNote`, `useUserSettings` |
| Supabase queries | Chained `.from().select().eq()`, typed casts | All hooks |
| Edge Function structure | `Deno.serve()`, `getRuntimeConfig()`, `getMissingEnv()`, health GET endpoint, logger | `generate-summary`, `send-push` |
| RLS | `auth.uid() = user_id` on all user-scoped tables | `00001_initial_schema.sql` |
| Shared types | Interfaces in `packages/shared/src/types.ts`, Database type in `supabase.ts` | Existing pattern |
| Migrations | Sequential `00001_` numbering | `supabase/migrations/` |
| Theme | Import `colors`, `radii`, `spacing`, `shadows` from `lib/theme.ts` | All components |
| Icons | Ionicons via `@expo/vector-icons` | All screens |
| Test IDs | `testIds` object from `lib/testIds.ts` | All screens and components |

### 1.3 Integration Point Map

| File | Risk | Test Coverage | Modification Type |
|------|------|---------------|-------------------|
| `apps/mobile/app/(app)/summary.tsx` | High | Smoke test | Rewrite — feed layout |
| `apps/mobile/components/SummaryCard.tsx` | High | None | Deprecate — replaced by `LensResultCard` |
| `supabase/functions/generate-summary/index.ts` | High | None | Deprecate — replaced by new Edge Functions |
| `supabase/functions/_shared/openai.ts` | Med | None | Extend — add `callOpenAIMarkdown` |
| `supabase/functions/send-push/index.ts` | Med | None | Modify — generalize `sent_at` update |
| `apps/mobile/hooks/useDailySummary.ts` | Med | None | Deprecate — replaced by `useLensResults` |
| `apps/mobile/app/(app)/_layout.tsx` | Low | None | Modify — notification handler |
| `packages/shared/src/types.ts` | Low | None | Extend — add types |
| `packages/shared/src/supabase.ts` | Low | None | Extend — add table definitions |
| `apps/mobile/services/notifications.ts` | Low | None | Extend — `NotificationData` type |
| `apps/mobile/lib/testIds.ts` | Low | N/A | Extend — add lens test IDs |

---

## 2. Data Model Changes

### 2.1 New Migration: `00006_custom_lenses.sql`

```sql
-- Lens schedule type
CREATE TYPE lens_schedule_type AS ENUM ('daily', 'weekly');

-- Lenses table
CREATE TABLE lenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  prompt TEXT NOT NULL CHECK (char_length(prompt) BETWEEN 20 AND 2000),
  schedule_type lens_schedule_type NOT NULL DEFAULT 'daily',
  schedule_time TIME NOT NULL DEFAULT '08:00',
  schedule_day SMALLINT CHECK (schedule_day >= 0 AND schedule_day <= 6),
  lookback_hours INTEGER NOT NULL DEFAULT 24 CHECK (lookback_hours > 0 AND lookback_hours <= 720),
  categories TEXT[] DEFAULT NULL,  -- NULL = all categories
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  next_run_at TIMESTAMPTZ,
  last_run_at TIMESTAMPTZ,
  consecutive_failures SMALLINT NOT NULL DEFAULT 0,
  last_error TEXT,
  last_error_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Lens results table
CREATE TABLE lens_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lens_id UUID NOT NULL REFERENCES lenses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  notes_analyzed INTEGER NOT NULL DEFAULT 0,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_lenses_user_id ON lenses(user_id);
CREATE INDEX idx_lenses_next_run ON lenses(next_run_at) WHERE is_active = true;
CREATE INDEX idx_lens_results_user_id ON lens_results(user_id, generated_at DESC);
CREATE INDEX idx_lens_results_lens_id ON lens_results(lens_id, generated_at DESC);

-- RLS
ALTER TABLE lenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE lens_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY lenses_policy ON lenses FOR ALL USING (auth.uid() = user_id);
CREATE POLICY lens_results_policy ON lens_results FOR ALL USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE TRIGGER lenses_updated_at BEFORE UPDATE ON lenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Partial unique index: at most one default lens per user (idempotency guard)
CREATE UNIQUE INDEX idx_lenses_one_default_per_user ON lenses(user_id) WHERE is_default = true;

-- Compute next_run_at on insert or schedule changes
-- This function is the single source of truth for next_run_at computation.
-- It uses the user's timezone from the users table to calculate the next UTC run time.
CREATE OR REPLACE FUNCTION compute_next_run_at()
RETURNS TRIGGER AS $$
DECLARE
  user_tz TEXT;
  target_time TIME;
  local_now TIMESTAMPTZ;
  candidate TIMESTAMPTZ;
BEGIN
  -- Only compute when relevant fields change or on insert
  IF TG_OP = 'INSERT' OR
     OLD.schedule_time IS DISTINCT FROM NEW.schedule_time OR
     OLD.schedule_day IS DISTINCT FROM NEW.schedule_day OR
     OLD.schedule_type IS DISTINCT FROM NEW.schedule_type OR
     (OLD.is_active = false AND NEW.is_active = true) THEN

    SELECT timezone INTO user_tz FROM users WHERE id = NEW.user_id;
    user_tz := COALESCE(user_tz, 'America/New_York');

    -- Compute next run in user's local timezone, then convert to UTC
    local_now := NOW() AT TIME ZONE user_tz;
    candidate := (CURRENT_DATE AT TIME ZONE user_tz) + NEW.schedule_time;

    -- If candidate is in the past, advance to next day
    IF candidate <= local_now THEN
      candidate := candidate + INTERVAL '1 day';
    END IF;

    -- For weekly, advance to the correct day of week
    IF NEW.schedule_type = 'weekly' AND NEW.schedule_day IS NOT NULL THEN
      WHILE EXTRACT(DOW FROM candidate) != NEW.schedule_day LOOP
        candidate := candidate + INTERVAL '1 day';
      END LOOP;
    END IF;

    NEW.next_run_at := candidate AT TIME ZONE user_tz;
  END IF;

  -- When pausing, clear next_run_at
  IF NEW.is_active = false THEN
    NEW.next_run_at := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER lenses_compute_next_run
  BEFORE INSERT OR UPDATE ON lenses
  FOR EACH ROW EXECUTE FUNCTION compute_next_run_at();

-- Auto-create Morning Briefing for new users
CREATE OR REPLACE FUNCTION create_default_lens()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO lenses (user_id, name, prompt, schedule_type, schedule_time, lookback_hours, is_default)
  VALUES (
    NEW.id,
    'Morning Briefing',
    'Give me my top 3 action items, one thing I''m avoiding, and one small win.',
    'daily',
    '08:00',
    48,
    true
  )
  ON CONFLICT DO NOTHING;  -- Idempotent: unique partial index prevents duplicates
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_create_default_lens
  AFTER INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION create_default_lens();

-- Constraint: max 10 lenses per user
CREATE OR REPLACE FUNCTION check_lens_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT count(*) FROM lenses WHERE user_id = NEW.user_id) >= 10 THEN
    RAISE EXCEPTION 'Maximum of 10 lenses per user';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_lens_limit
  BEFORE INSERT ON lenses
  FOR EACH ROW EXECUTE FUNCTION check_lens_limit();

-- Weekly schedule_day constraint
ALTER TABLE lenses ADD CONSTRAINT weekly_requires_day
  CHECK (schedule_type != 'weekly' OR schedule_day IS NOT NULL);
```

### 2.2 Migration Script: `00007_migrate_daily_summaries.sql`

```sql
-- Create Morning Briefing lens for each existing user (idempotent via partial unique index)
INSERT INTO lenses (user_id, name, prompt, schedule_type, schedule_time, lookback_hours, is_default)
SELECT
  id,
  'Morning Briefing',
  'Give me my top 3 action items, one thing I''m avoiding, and one small win.',
  'daily',
  '08:00',
  48,
  true
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM lenses l WHERE l.user_id = u.id AND l.is_default = true
);

-- Migrate daily_summaries → lens_results
-- Convert JSON content to markdown
INSERT INTO lens_results (lens_id, user_id, content, notes_analyzed, generated_at, sent_at)
SELECT
  l.id,
  ds.user_id,
  '## Today''s Top 3' || E'\n' ||
    '1. ' || (ds.content->>'top_actions')::jsonb->>0 || E'\n' ||
    '2. ' || (ds.content->>'top_actions')::jsonb->>1 || E'\n' ||
    '3. ' || (ds.content->>'top_actions')::jsonb->>2 || E'\n\n' ||
  '## Maybe Avoiding...' || E'\n' ||
    (ds.content->>'avoiding') || E'\n\n' ||
  '## Small Win' || E'\n' ||
    (ds.content->>'small_win'),
  0,  -- notes_analyzed not tracked historically
  ds.generated_at,
  ds.sent_at
FROM daily_summaries ds
JOIN lenses l ON l.user_id = ds.user_id AND l.is_default = true;

-- next_run_at is auto-computed by the compute_next_run_at() trigger on INSERT,
-- so no separate computation step is needed.
```

### 2.3 Shared Types: `packages/shared/src/types.ts`

```typescript
// Add to existing file:

export type LensScheduleType = "daily" | "weekly";

export interface Lens {
  id: string;
  user_id: string;
  name: string;
  prompt: string;
  schedule_type: LensScheduleType;
  schedule_time: string;       // HH:MM format
  schedule_day: number | null; // 0=Sun..6=Sat, null for daily
  lookback_hours: number;
  categories: string[] | null; // null = all
  is_active: boolean;
  is_default: boolean;
  next_run_at: string | null;
  last_run_at: string | null;
  consecutive_failures: number;
  last_error: string | null;
  last_error_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LensResult {
  id: string;
  lens_id: string;
  user_id: string;
  content: string;            // markdown
  notes_analyzed: number;
  generated_at: string;
  sent_at: string | null;
}

export interface LensResultWithLens extends LensResult {
  lens: Pick<Lens, "name" | "schedule_type" | "schedule_time" | "schedule_day">;
}
```

### 2.4 Database Types: `packages/shared/src/supabase.ts`

Add `lenses` and `lens_results` table definitions to the `Database` type, following the exact pattern of existing tables (Row/Insert/Update/Relationships).

---

## 3. Edge Function Architecture

### 3.1 New: `dispatch-lenses/index.ts`

**Purpose:** Lightweight dispatcher called by pg_cron every 5 minutes. Finds due lenses and fans out to individual worker invocations.

**Flow:**
1. Validate cron secret header (`X-Cron-Secret` from Supabase Vault)
2. Query: `SELECT id, user_id FROM lenses WHERE is_active = true AND next_run_at <= NOW()`
3. For each due lens, call `execute-lens` via `fetch()` with the lens ID
4. Return count of dispatched lenses

**Key design decisions:**
- Deployed with `--no-verify-jwt` (no user auth context — it's a system job)
- Authenticated via `X-Cron-Secret` header: pg_cron reads the secret from `vault.decrypted_secrets`, Edge Function reads the expected value from `Deno.env.get("CRON_SECRET")` (set via `supabase secrets set CRON_SECRET=<value>`)
- Forwards `X-Cron-Secret` header to `execute-lens` worker calls so the worker can validate dispatcher-originated requests
- Does NOT process lenses itself — only dispatches
- Lightweight: should complete in <5 seconds even with many due lenses
- Logs dispatched count for observability

```typescript
// Pseudocode structure
Deno.serve(async (req) => {
  // Validate X-Cron-Secret
  // Query due lenses
  // For each: fetch(execute-lens URL, { lens_id })
  // Return { dispatched: count }
});
```

### 3.2 New: `execute-lens/index.ts`

**Purpose:** Worker that executes a single lens. One invocation per lens, called by dispatcher or "Run Now."

**Flow:**
1. Validate request (cron secret for dispatched calls, or user JWT for "Run Now")
2. Fetch lens by ID, including `users.timezone` via join
3. Query notes matching lens filters:
   ```sql
   SELECT id, category, content, created_at
   FROM notes
   WHERE user_id = :user_id
     AND created_at >= NOW() - INTERVAL ':lookback_hours hours'
     AND (:categories IS NULL OR category = ANY(:categories))
     AND content IS NOT NULL AND content != ''
   ORDER BY created_at DESC
   LIMIT 100
   ```
4. If no matching notes: skip (no result generated), update `next_run_at`, return
5. Build prompt: lens prompt + formatted notes (same `[category] content` format as existing)
6. Call `callOpenAIMarkdown()` — returns raw string, no JSON parsing
7. Strip HTML tags and remote image URLs from LLM output (sanitization)
8. Insert into `lens_results`
9. Reset `consecutive_failures` to 0, update `last_run_at` and `next_run_at`
10. Call `send-push` with lens name as title, first 100 chars of result as body
11. On failure: increment `consecutive_failures`, store error in `last_error`

**Auth model:**
- When called by dispatcher: validate `X-Cron-Secret` header
- When called by "Run Now": validate user JWT from `Authorization` header, verify user owns the lens

**`next_run_at` computation:**

`next_run_at` is computed in two places:
1. **On create/update/resume:** The `compute_next_run_at()` PostgreSQL trigger (Section 2.1) handles this automatically. No application code needed — any `INSERT` or `UPDATE` that changes schedule fields or `is_active` triggers recomputation.
2. **After execution:** The `execute-lens` worker updates `next_run_at` after a successful run by issuing an `UPDATE lenses SET last_run_at = NOW()` — the trigger detects that `is_active` hasn't changed and no schedule fields changed, so `next_run_at` is NOT recomputed by the trigger. Instead, the worker explicitly sets it:

```typescript
// After successful execution, advance next_run_at
const nextRun = computeNextRunTS(lens, userTimezone);
await supabase.from("lenses").update({
  last_run_at: new Date().toISOString(),
  next_run_at: nextRun.toISOString(),
  consecutive_failures: 0,
  last_error: null,
  last_error_at: null
}).eq("id", lens.id);
```

The `computeNextRunTS` helper uses `Intl.DateTimeFormat` for timezone conversion (same approach as existing `getUserLocalTime` in `generate-summary`).

**Resume semantics:** When a lens is resumed (`is_active: false → true`), the trigger computes the next *future* scheduled time. It does NOT dispatch immediately — the user must use "Run Now" for that.

### 3.3 Modified: `_shared/openai.ts`

Add a new function alongside existing ones:

```typescript
export type OpenAIMarkdownRequest = {
  fetchFn: typeof fetch;
  apiKey: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
};

export async function callOpenAIMarkdown({
  fetchFn, apiKey, model, systemPrompt, userPrompt
}: OpenAIMarkdownRequest): Promise<string> {
  const response = await fetchFn("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ]
    })
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`OpenAI request failed: ${response.status} ${text}`.trim());
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content ?? "";
  if (!content) {
    throw new Error("OpenAI response missing content");
  }

  return content;
}
```

The system prompt instructs the LLM:
```
You are a personal note analyst. Respond in plain markdown (headers, bullets, bold).
Do not include HTML tags, images, or links. Keep responses concise and actionable.
```

The user prompt is: `{lens.prompt}\n\nNotes:\n{formatted notes}`

### 3.4 Modified: `send-push/index.ts`

Change the request body type and `sent_at` update:

```typescript
type RequestBody = {
  user_id: string;
  result_id: string;      // was summary_id
  result_table: string;    // "lens_results" or "daily_summaries" (for backward compat)
  title: string;
  body: string;
  data?: Record<string, string>;
};
```

Update the `sent_at` query to use `result_table` dynamically:
```typescript
await supabase.from(body.result_table).update({ sent_at: ... }).eq("id", body.result_id);
```

### 3.5 Updated pg_cron Schedule

Replace the existing cron job (documented in `00005_cron_schedule.sql`):

```sql
-- Remove old job
SELECT cron.unschedule('generate-daily-summaries');

-- Add new dispatcher job
SELECT cron.schedule(
  'dispatch-lenses',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/dispatch-lenses',
    headers := jsonb_build_object(
      'X-Cron-Secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

### 3.6 Result Retention Cleanup

Add a separate cron job for cleanup (runs daily at 3 AM UTC):

```sql
SELECT cron.schedule(
  'cleanup-old-lens-results',
  '0 3 * * *',
  $$
  DELETE FROM lens_results WHERE generated_at < NOW() - INTERVAL '90 days';
  $$
);
```

---

## 4. Mobile UI Implementation

### 4.1 New Dependency

```bash
cd apps/mobile && npm install react-native-markdown-display@7.0.2
```

No native module required — works with Expo Go and old architecture.

**Maintenance note:** This library is no longer actively maintained. Mitigations:
- Pin to a known-working version (7.0.2)
- Add a smoke test that renders sample markdown to catch compatibility regressions on RN/Expo upgrades
- Fallback path: if compatibility breaks, replace with a custom renderer using `marked` for parsing + RN `Text`/`View` render functions (no new native dep)
- Monitor `react-native-enriched-markdown` as a future replacement when project adopts New Architecture

### 4.2 New Component: `LensResultCard.tsx`

Renders a single lens result in the feed.

```
┌─────────────────────────────────┐
│ ● Lens Name          Daily · 8AM │  ← colored dot (deterministic from name hash), schedule badge
│ 9:42 AM                          │  ← timestamp
│───────────────────────────────── │
│                                   │
│ [Markdown content rendered here]  │  ← react-native-markdown-display
│                                   │
└─────────────────────────────────┘
```

**Color derivation:** Hash the lens name to an index into a fixed palette of 8 warm colors from the theme. No `color` column needed in the database.

```typescript
const LENS_COLORS = [
  colors.accent,        // indigo
  colors.success,       // green
  colors.warning,       // amber
  "#8B5CF6",           // violet
  "#EC4899",           // pink
  "#06B6D4",           // cyan
  "#F97316",           // orange
  "#6366F1",           // blue
];

function getLensColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  }
  return LENS_COLORS[Math.abs(hash) % LENS_COLORS.length];
}
```

**Markdown safety:** Configure `react-native-markdown-display` rules to disable:
- Images (`image: () => null`)
- Links (`link: render as plain text`)
- HTML (`html_block`, `html_inline: () => null`)

### 4.3 Rewritten Screen: `summary.tsx`

The Summary tab becomes a feed of lens results, grouped by date.

**Data flow:**
```
useLensResults(userId) → LensResult[] (with lens name/schedule via join)
                       ↓
FlatList grouped by date
  ├── SectionHeader ("Wednesday, April 9")
  │   ├── LensResultCard
  │   └── LensResultCard
  └── SectionHeader ("Monday, April 7")
      └── LensResultCard
```

**Header actions:**
- "+" button → navigates to lens creation screen
- Gear icon → navigates to lens management screen

**Empty state:** Same pattern as current (centered icon + text), but with message: "Create your first lens to get AI insights from your notes."

**Pull-to-refresh:** Invalidates `["lens-results", userId]` query.

### 4.4 New Screen: `lens-form.tsx`

A new screen for creating/editing lenses. Not a new tab — navigated to from the Summary tab.

**Expo Router:** Add as `apps/mobile/app/(app)/lens-form.tsx`. Pass `lensId` as a search param for edit mode.

**Form fields:**
- Name: `TextInput` with placeholder "e.g., Weekly Health Check"
- Prompt: `TextInput` multiline with character counter (20–2000), placeholder "e.g., Summarize my health notes and spot trends"
- Schedule type: Segmented control (`Daily` | `Weekly`)
- Time: Time picker (native `DateTimePicker` from `@react-native-community/datetimepicker`, already in Expo)
- Day (if weekly): Day-of-week pill selector (Sun–Sat)
- Categories: Multi-select pills using existing category list from `@notesbrain/shared`
- Lookback: Picker with options: 24h, 48h, 7 days, 14 days, 30 days (maps to hours)

**Save action:** Calls `useLenses` create/update mutation. On success, navigates back to Summary tab.

**Run Now button:** Visible after saving. Calls `useRunLensNow` mutation.

### 4.5 New Screen: `lens-manage.tsx`

List of user's lenses with swipe/tap actions.

**Expo Router:** Add as `apps/mobile/app/(app)/lens-manage.tsx`.

**List item:**
```
┌─────────────────────────────────────┐
│ ● Weekly Health Check    Daily · 8AM │
│   Last run: Today 8:02 AM    [Active]│
└─────────────────────────────────────┘
```

Error state display (when `consecutive_failures >= 3`):
```
┌─────────────────────────────────────┐
│ ● Project Pulse        Weekly · Mon  │
│   ⚠ Last 3 runs failed      [Error] │
└─────────────────────────────────────┘
```

**Actions:** Edit (navigate to lens-form), Pause/Resume (toggle mutation), Delete (confirm alert + delete mutation), Run Now.

### 4.6 Hidden Screens from Tab Bar

Both `lens-form` and `lens-manage` are added to the `(app)` layout with `href: null` (like existing `mocks` screen), so they don't appear as tabs.

```typescript
// In _layout.tsx
<Tabs.Screen name="lens-form" options={{ href: null, title: "Lens" }} />
<Tabs.Screen name="lens-manage" options={{ href: null, title: "Manage Lenses" }} />
```

### 4.7 Notification Handler Update

In `_layout.tsx`, update `handleNotificationTap`:

```typescript
function handleNotificationTap(data: NotificationData) {
  if (data?.type === "daily_summary" || data?.type === "lens_result") {
    router.push("/(app)/summary");
  }
}
```

Update `NotificationData` type in `notifications.ts`:
```typescript
export type NotificationData = {
  summary_id?: string;   // deprecated, kept for backward compat
  lens_result_id?: string;
  type?: "daily_summary" | "lens_result";
};
```

---

## 5. React Query Hooks

### 5.1 `useLenses.ts`

```typescript
// Query: fetch user's lenses
queryKey: ["lenses", userId]
queryFn: supabase.from("lenses").select("*").eq("user_id", userId).order("created_at")
staleTime: 5 * 60 * 1000

// Mutations: create, update, delete, toggle active
// Each invalidates ["lenses", userId] on success
// Delete also invalidates ["lens-results", userId]
```

### 5.2 `useLensResults.ts`

```typescript
// Query: fetch recent lens results with lens metadata
queryKey: ["lens-results", userId]
queryFn: supabase
  .from("lens_results")
  .select("*, lens:lenses(name, schedule_type, schedule_time, schedule_day)")
  .eq("user_id", userId)
  .order("generated_at", { ascending: false })
  .limit(50)
staleTime: 2 * 60 * 1000  // 2 min — results arrive on schedule
```

### 5.3 `useRunLensNow.ts`

```typescript
// Mutation: trigger immediate lens execution
mutationFn: async (lensId: string) => {
  const { data: { session } } = await supabase.auth.getSession();
  const response = await fetch(`${SUPABASE_URL}/functions/v1/execute-lens`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ lens_id: lensId, trigger: "manual" })
  });
  if (!response.ok) throw new Error("Lens execution failed");
  return response.json();
}
// On success: invalidate ["lens-results", userId] and ["lenses", userId]
```

---

## 6. Regression Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Summary tab rewrite breaks existing daily summary viewing | High | Migration creates Morning Briefing lens + migrates history before deploying UI changes. Staged rollout: deploy Edge Functions + migration first, then UI. |
| send-push changes break existing push delivery | Med | The `result_table` param defaults to `"daily_summaries"` if omitted, preserving backward compat. |
| pg_cron job swap causes gap in summary delivery | Med | Deploy new cron job immediately after old one is removed. Run test trigger to verify. |
| `react-native-markdown-display` renders unsafe content | Med | Disable HTML, images, and links in markdown rules. LLM system prompt also instructs no HTML/images. |
| Timezone edge cases (DST transitions) cause missed/double runs | Low | `next_run_at` is recomputed after each run using `Intl.DateTimeFormat` which handles DST. Edge case: if a user changes timezone, recompute all their `next_run_at` values. |
| Users delete Morning Briefing lens accidentally | Low | Delete confirmation dialog. No undo, but user can recreate manually. |

---

## 7. Implementation Sequence

Order matters — each phase builds on the previous.

### Phase 1: Database + Shared Types
1. Write + apply `00006_custom_lenses.sql` migration
2. Add `Lens`, `LensResult`, `LensResultWithLens` types to `packages/shared/src/types.ts`
3. Add `lenses`, `lens_results` table types to `packages/shared/src/supabase.ts`
4. Export new types from `packages/shared/src/index.ts`

### Phase 2: Edge Functions
1. Add `callOpenAIMarkdown()` to `supabase/functions/_shared/openai.ts`
2. Create `supabase/functions/execute-lens/index.ts` (the worker)
3. Create `supabase/functions/dispatch-lenses/index.ts` (the dispatcher)
4. Modify `supabase/functions/send-push/index.ts` to accept `result_id` + `result_table`
5. Deploy Edge Functions, add `CRON_SECRET` to Vault
6. Test with manual invocation: `POST /execute-lens { lens_id, trigger: "test" }`

### Phase 3: Migration
1. Write + apply `00007_migrate_daily_summaries.sql`
2. Run `next_run_at` computation for all migrated lenses (via a one-time Edge Function call or SQL script using `users.timezone`)
3. Switch pg_cron from `generate-daily-summaries` to `dispatch-lenses`
4. Verify Morning Briefing lens fires correctly for test user

### Phase 4: Mobile Hooks
1. Create `apps/mobile/hooks/useLenses.ts`
2. Create `apps/mobile/hooks/useLensResults.ts`
3. Create `apps/mobile/hooks/useRunLensNow.ts`

### Phase 5: Mobile UI
1. Install `react-native-markdown-display`
2. Create `LensResultCard.tsx` component
3. Rewrite `summary.tsx` as lens results feed
4. Create `lens-form.tsx` screen
5. Create `lens-manage.tsx` screen
6. Update `_layout.tsx` — register new screens (hidden from tabs), update notification handler
7. Update `notifications.ts` — extend `NotificationData` type
8. Add test IDs to `testIds.ts`

### Phase 6: Cleanup
1. Deprecate `useDailySummary.ts` (can delete after migration confirmed)
2. Deprecate `SummaryCard.tsx`
3. Mark `generate-summary/index.ts` as deprecated (keep deployed briefly for safety, then remove)
4. Update `00005_cron_schedule.sql` documentation

---

## 8. New Dependencies

| Package | Purpose | Native Module? | Expo Go Compatible? |
|---------|---------|----------------|---------------------|
| `react-native-markdown-display` | Render markdown lens results | No | Yes |

No other new dependencies. Time picker uses `@react-native-community/datetimepicker` which is already available in Expo.

---

## 9. Edge Cases

| Edge Case | Handling |
|-----------|----------|
| User creates lens with no notes matching filters | Skip execution, update `next_run_at`. No result generated, no notification sent. |
| LLM returns empty string | Treat as failure, increment `consecutive_failures`. |
| LLM returns HTML despite system prompt instructions | Strip HTML tags before storing in `lens_results`. |
| User changes timezone | Recompute `next_run_at` for all their active lenses. Hook into `useUserSettings.updateTimezone` mutation's `onSuccess`. |
| Two dispatchers run concurrently (cron overlap) | Idempotency: `execute-lens` checks `last_run_at` before processing. If lens was already run in this window, skip. |
| User hits 10-lens limit | Database trigger raises exception. Mobile form shows error: "Maximum of 10 lenses reached." |
| Lens prompt is exactly 20 chars (minimum) | Valid — prompt length check is `BETWEEN 20 AND 2000` inclusive. |
| User deletes account | `ON DELETE CASCADE` removes all lenses and results. |
| "Run Now" while lens is already executing | Second call will find `last_run_at` was very recent, but since it's manual trigger it should still execute. Idempotency check only applies to scheduled runs. |

---

## 10. Migration Risk Checklist

- [x] Data migration required? **Yes — reversible.** `00007_migrate_daily_summaries.sql` copies data to new tables; original `daily_summaries` table is preserved (not dropped).
- [x] Breaking changes to existing APIs? **No.** `send-push` is backward compatible via default `result_table`. New Edge Functions are additive.
- [x] Dependent services affected? **pg_cron job swap.** Coordination: deploy new functions → apply migration → swap cron job → verify → deprecate old function.
- [x] Feature flags needed? **No.** Staged deployment (backend first, then UI) provides equivalent safety.
- [x] Rollback plan? **Re-enable old cron job** (`generate-daily-summaries`), revert mobile app to previous version. `daily_summaries` table is untouched so old code works immediately.

---

## 11. Observability

- **Edge Function logs:** Both `dispatch-lenses` and `execute-lens` use `createFunctionLogger` with structured JSON output. Key fields: `lens_id`, `user_id`, `notes_count`, `duration_ms`, `error` (if any).
- **Cron monitoring:** `SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;`
- **Failure tracking:** Query lenses in error state: `SELECT * FROM lenses WHERE consecutive_failures >= 3;`
- **Result volume:** `SELECT date_trunc('day', generated_at) AS day, count(*) FROM lens_results GROUP BY day ORDER BY day DESC;`
