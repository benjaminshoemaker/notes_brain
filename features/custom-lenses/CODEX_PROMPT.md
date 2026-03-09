# Custom Lenses — Technical Design Prompt

You are designing the technical implementation for a new feature called **Custom Lenses** in NotesBrain, a frictionless note capture app with AI-powered classification and daily summaries.

## What You're Designing

Custom Lenses generalize NotesBrain's existing hardcoded daily summary into a user-configurable system where users can create their own "prompt + schedule + data filter" combinations that run automatically and deliver AI-generated insights via push notification.

### The Core Insight

The existing daily summary is already this pattern:
- **Prompt:** "Give me top 3 actions, thing I'm avoiding, small win"
- **Schedule:** Daily at 8:00 AM user's timezone
- **Data filter:** All notes from the last 48 hours

Custom Lenses makes each of those three dimensions configurable by the user.

### Example Lenses

| Lens Name | Prompt | Schedule | Data Scope |
|---|---|---|---|
| Morning Briefing (default) | Top 3 actions, thing avoiding, small win | Daily 8 AM | Last 24h, all categories |
| Weekly Health Check | Summarize health notes, spot trends | Weekly Mon 7 AM | Last 7 days, health category |
| Project Pulse | What's stalled? What moved forward? | Weekly Fri 5 PM | Last 7 days, projects category |
| Family Reminders | Anything about family I haven't acted on? | Weekly Sun 9 AM | Last 14 days, family category |
| Idea Incubator | Which ideas recur? Which faded? | Monthly 1st | Last 30 days, ideas category |

### Long-Term Vision (NOT in scope for this design, but inform your architecture)

Eventually, lens templates will be shareable in a marketplace. Users publish their prompt template (not their data); others install it and it runs against their own notes. Design the data model so this is possible later without migration pain.

---

## Existing Codebase Context

### Tech Stack
- **Frontend:** React (web), React Native / Expo (mobile)
- **Backend:** Supabase (Auth, PostgreSQL, Storage, Edge Functions)
- **State Management:** React Query
- **AI:** OpenAI `gpt-4o-mini` (classification + summaries)
- **Push Notifications:** Firebase Cloud Messaging (FCM), Android only currently
- **Scheduling:** pg_cron calling Edge Functions every 5 minutes

### Project Structure
```
apps/
  web/src/          — React SPA (Vite)
  mobile/app/       — Expo Router (file-based routing)
    (app)/          — Authenticated screens: index.tsx (Capture), notes.tsx, summary.tsx, settings.tsx
    (auth)/         — Login, Signup
  mobile/components/ — SummaryCard.tsx, CaptureInput.tsx, etc.
  mobile/hooks/     — useDailySummary.ts, useCreateNote.ts, etc.
packages/
  shared/src/       — types.ts, constants.ts, supabase.ts (shared between web + mobile)
supabase/
  functions/
    generate-summary/index.ts  — Edge Function: generates daily summaries
    send-push/index.ts         — Edge Function: sends FCM push notifications
    _shared/openai.ts          — OpenAI helper (prompt building, API call, response parsing)
    _shared/fcm.ts             — FCM auth + message sending
  migrations/
    00001_initial_schema.sql   — Core tables
    00005_cron_schedule.sql    — pg_cron setup
```

### Current Database Schema (Relevant Tables)

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  timezone TEXT DEFAULT 'America/New_York',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('text', 'voice', 'file')),
  content TEXT,
  category TEXT CHECK (category IN ('ideas','projects','family','friends','health','admin','uncategorized')),
  classification_status TEXT DEFAULT 'pending',
  classification_confidence REAL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE daily_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  summary_date DATE NOT NULL,
  content JSONB NOT NULL,  -- { top_actions: string[], avoiding: string, small_win: string }
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  UNIQUE(user_id, summary_date)
);

CREATE TABLE devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('android', 'web')),
  push_token TEXT NOT NULL,
  last_seen_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Categories (Hardcoded)
`ideas`, `projects`, `family`, `friends`, `health`, `admin`, `uncategorized`

### Current Daily Summary Implementation

**Edge Function: `generate-summary/index.ts`**
- Triggered by pg_cron every 5 minutes with `{"trigger": "cron"}`
- Two-phase: generation at ~7:55 AM user timezone, push at ~8:00 AM
- Fetches notes from last 48 hours for each user
- Calls OpenAI `gpt-4o-mini` with JSON mode
- Stores result in `daily_summaries` table
- Calls `send-push` function for FCM delivery
- Has test mode: `POST {"trigger": "test", "user_id": "..."}`

**Edge Function: `send-push/index.ts`**
- Receives summary_id + user_id
- Looks up device push tokens
- Authenticates with FCM via service account JWT
- Sends high-priority Android notification
- Updates `daily_summaries.sent_at`

**Shared: `_shared/openai.ts`**
- Builds prompt from categorized notes
- Calls OpenAI with `response_format: { type: "json_object" }`
- Validates response structure (exactly 3 top_actions, avoiding, small_win)

**pg_cron: runs every 5 minutes**
- Calls generate-summary Edge Function
- Function checks timezone windows internally to decide if it should generate/push

**Mobile: `useDailySummary.ts` hook**
- React Query with key `["daily-summary", userId, dateString]`
- 5-minute stale time
- Returns null if no summary yet (pre-8 AM)

**Mobile: `SummaryCard.tsx`**
- Renders top_actions as checkable items (local state, not persisted)
- Renders avoiding section with gray background
- Renders small_win section with green background

**Mobile: `summary.tsx` screen**
- Empty state before 8 AM
- Pull-to-refresh
- Error handling with retry

### TypeScript Types (packages/shared/src/types.ts)

```typescript
export interface DailySummaryContent {
  top_actions: string[];
  avoiding: string;
  small_win: string;
}

export interface DailySummary {
  id: string;
  user_id: string;
  summary_date: string;
  content: DailySummaryContent;
  generated_at: string;
  sent_at: string | null;
}
```

---

## What You Need to Produce

Design the full technical implementation covering:

### 1. Data Model
- New tables (lenses, lens_results, etc.)
- How the existing `daily_summaries` table relates (migrated into lenses? kept separate? both?)
- RLS policies
- Indexes

### 2. Edge Function Architecture
- How lens generation works (new function? extend existing?)
- How the pg_cron trigger changes to support multiple lenses with different schedules
- How to efficiently batch-process lenses across users
- Push notification changes for per-lens notifications

### 3. API / Data Access Layer
- Supabase queries for CRUD on lenses
- Queries for fetching lens results (with pagination for the feed)

### 4. Shared Types
- TypeScript interfaces for Lens, LensResult, LensSchedule, LensFilter

### 5. Mobile UI Changes
- How the Summary tab evolves into a lens results feed
- Lens creation/editing UX
- Notification handling for different lens types

### 6. Web UI Changes
- Equivalent web experience

### 7. Migration Strategy
- How to migrate existing daily summary users to the lens system without breaking anything
- Whether the default "Morning Briefing" lens is auto-created for existing users

### Design Constraints
- **MVP bias:** Prefer simplicity. Ship the smallest thing that validates the hypothesis.
- **Backward compatible:** Existing daily summary must keep working during migration.
- **Follow existing patterns:** Match the codebase's conventions (React Query hooks, Supabase Edge Functions, shared types package).
- **Schedule options for MVP:** Daily at time, Weekly on day+time, Monthly on date+time, and On-demand (manual trigger).
- **Free tier consideration:** Free users get the default Morning Briefing only. Pro users can create custom lenses (suggest a reasonable limit).
- **Marketplace-ready data model:** The lens template should be separable from user data so templates can be shared later.
