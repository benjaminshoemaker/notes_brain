# NotesBrain Technical Specification

## Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Mobile** | Expo (React Native) | Unified JS/TS with web, shared types/utilities, good FCM support |
| **Web** | React | Standard, pairs with Expo/RN for code sharing |
| **Backend** | Supabase | Auth, Postgres, Storage, Edge Functions, Realtime - all-in-one |
| **Database** | PostgreSQL (via Supabase) | Built-in full-text search, RLS, triggers |
| **Transcription** | OpenAI Whisper API | Excellent accuracy, simple API, fast server-side processing |
| **Classification** | Claude Haiku API | Cost-optimized, reliable JSON output |
| **Push Notifications** | Firebase Cloud Messaging (FCM) | Industry standard, HTTP v1 API |
| **Background Jobs** | Supabase Edge Functions + pg_cron | Native integration, no external workers |
| **State Management** | React Query (TanStack Query) | Server state caching, background refetch, optimistic updates |
| **Real-time** | Supabase Realtime | Live UI updates when classification completes |

---

## Project Structure

**Monorepo with npm workspaces (or Turborepo):**

```
notes-brain/
├── apps/
│   ├── mobile/                 # Expo React Native app
│   │   ├── app/                # Expo Router screens
│   │   ├── components/
│   │   ├── hooks/
│   │   └── app.json
│   └── web/                    # React web app (Vite)
│       ├── src/
│       │   ├── pages/
│       │   ├── components/
│       │   └── hooks/
│       └── index.html
├── packages/
│   ├── shared/                 # Shared types, constants, utilities
│   │   ├── src/
│   │   │   ├── types.ts        # Note, Category, User types
│   │   │   ├── constants.ts    # Categories, limits
│   │   │   ├── validation.ts   # Zod schemas
│   │   │   └── api-client.ts   # Supabase client wrapper
│   │   └── package.json
│   └── ui/                     # Shared UI components (optional)
├── supabase/
│   ├── migrations/             # SQL migrations
│   ├── functions/              # Edge Functions
│   │   ├── classify-note/
│   │   ├── transcribe-voice/
│   │   ├── generate-summary/
│   │   └── send-push/
│   └── config.toml
├── package.json
└── turbo.json                  # If using Turborepo
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENTS                                  │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐     ┌─────────────┐                            │
│  │   Mobile    │     │     Web     │                            │
│  │   (Expo)    │     │   (React)   │                            │
│  └──────┬──────┘     └──────┬──────┘                            │
│         │                   │                                    │
│         └─────────┬─────────┘                                    │
│                   │                                              │
│         ┌─────────▼─────────┐                                    │
│         │  Supabase Client  │  (supabase-js)                     │
│         │  + React Query    │                                    │
│         └─────────┬─────────┘                                    │
└───────────────────┼─────────────────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────────────────┐
│                        SUPABASE                                  │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │    Auth     │  │   Realtime  │  │   Storage   │              │
│  │  (email/    │  │  (Postgres  │  │   (files)   │              │
│  │  magic link)│  │   Changes)  │  │             │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    PostgreSQL                             │   │
│  │  ┌────────┐  ┌────────┐  ┌─────────────┐  ┌───────────┐  │   │
│  │  │ users  │  │ notes  │  │daily_summaries│ │ devices   │  │   │
│  │  └────────┘  └────────┘  └─────────────┘  └───────────┘  │   │
│  │                                                           │   │
│  │  [tsvector index for full-text search]                   │   │
│  │  [Database Webhooks on notes insert]                     │   │
│  │  [pg_cron for 5-min summary scheduler]                   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   Edge Functions                          │   │
│  │  ┌────────────────┐  ┌──────────────────┐                │   │
│  │  │ classify-note  │  │ transcribe-voice │                │   │
│  │  └────────────────┘  └──────────────────┘                │   │
│  │  ┌────────────────┐  ┌──────────────────┐                │   │
│  │  │generate-summary│  │    send-push     │                │   │
│  │  └────────────────┘  └──────────────────┘                │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                     EXTERNAL SERVICES                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   OpenAI    │  │  Anthropic  │  │     FCM     │              │
│  │ Whisper API │  │ Claude API  │  │  HTTP v1    │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Models

### Database Schema

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- Categories enum
CREATE TYPE note_category AS ENUM (
  'ideas', 'projects', 'family', 'friends', 'health', 'admin', 'uncategorized'
);

-- Note type enum
CREATE TYPE note_type AS ENUM ('text', 'voice', 'file');

-- Classification status enum
CREATE TYPE classification_status AS ENUM ('pending', 'completed', 'failed', 'manual');

-- Device platform enum (MVP targets Android + Web)
CREATE TYPE device_platform AS ENUM ('android', 'web');

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notes table
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  type note_type NOT NULL,
  content TEXT, -- text content or transcript
  category note_category NOT NULL DEFAULT 'uncategorized',
  classification_confidence FLOAT CHECK (classification_confidence >= 0 AND classification_confidence <= 1),
  classification_status classification_status NOT NULL DEFAULT 'pending',
  -- Full-text search vector
  search_vector TSVECTOR GENERATED ALWAYS AS (to_tsvector('english', COALESCE(content, ''))) STORED
);

-- Attachments table (separate for flexibility)
CREATE TABLE attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL, -- path in Supabase Storage
  size_bytes INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Daily summaries table
CREATE TABLE daily_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  summary_date DATE NOT NULL,
  content JSONB NOT NULL, -- { top_actions: string[3], avoiding: string, small_win: string }
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ, -- null until push delivered
  UNIQUE(user_id, summary_date)
);

-- Devices table (push token stored per device/platform)
CREATE TABLE devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform device_platform NOT NULL,
  push_token TEXT, -- FCM token for Android; null for web
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- MVP constraint: one device row per user+platform
  UNIQUE(user_id, platform)
);

-- Indexes
CREATE INDEX idx_notes_user_id ON notes(user_id);
CREATE INDEX idx_notes_category ON notes(category);
CREATE INDEX idx_notes_created_at ON notes(created_at DESC);
CREATE INDEX idx_notes_classification_status ON notes(classification_status);
CREATE INDEX idx_notes_search_vector ON notes USING GIN(search_vector);
CREATE INDEX idx_attachments_note_id ON attachments(note_id);
CREATE INDEX idx_daily_summaries_user_date ON daily_summaries(user_id, summary_date);
CREATE INDEX idx_devices_user_id ON devices(user_id);

-- Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;

-- RLS Policies (user can only access own data)
CREATE POLICY users_policy ON users FOR ALL USING (auth.uid() = id);
CREATE POLICY notes_policy ON notes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY attachments_policy ON attachments FOR ALL
  USING (note_id IN (SELECT id FROM notes WHERE user_id = auth.uid()));
CREATE POLICY daily_summaries_policy ON daily_summaries FOR ALL USING (auth.uid() = user_id);
CREATE POLICY devices_policy ON devices FOR ALL USING (auth.uid() = user_id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER notes_updated_at BEFORE UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER devices_updated_at BEFORE UPDATE ON devices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### TypeScript Types (packages/shared/src/types.ts)

```typescript
export const CATEGORIES = [
  'ideas',
  'projects',
  'family',
  'friends',
  'health',
  'admin',
  'uncategorized'
] as const;

export type Category = typeof CATEGORIES[number];

export type NoteType = 'text' | 'voice' | 'file';

export type ClassificationStatus = 'pending' | 'completed' | 'failed' | 'manual';

export interface User {
  id: string;
  email: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface Note {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  type: NoteType;
  content: string | null;
  category: Category;
  classification_confidence: number | null;
  classification_status: ClassificationStatus;
}

export interface Attachment {
  id: string;
  note_id: string;
  filename: string;
  mime_type: string;
  storage_path: string;
  size_bytes: number;
  created_at: string;
}

export interface NoteWithAttachments extends Note {
  attachments: Attachment[];
}

export interface DailySummary {
  id: string;
  user_id: string;
  summary_date: string;
  content: DailySummaryContent;
  generated_at: string;
  sent_at: string | null;
}

export type DevicePlatform = 'android' | 'web';

export interface Device {
  id: string;
  user_id: string;
  platform: DevicePlatform;
  push_token: string | null;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
}

// API request/response types
export interface CreateNoteRequest {
  type: NoteType;
  content?: string;
  category?: Category; // for manual category selection on file upload
}

export interface ClassificationResult {
  category: Category;
  confidence: number;
}

export interface DailySummaryContent {
  top_actions: string[];
  avoiding: string;
  small_win: string;
}
```

---

## API Contracts

### Supabase Client Operations (Direct)

These use supabase-js directly from the client:

```typescript
// Create note (text)
const { data, error } = await supabase
  .from('notes')
  .insert({
    user_id: userId,
    type: 'text',
    content: 'Note content here',
    classification_status: 'pending'
  })
  .select()
  .single();

// Create note with file attachment
// 1. Create note record (manual category selection; no AI classification for files)
const selectedCategory: Category | undefined = undefined; // or 'ideas' | 'projects' | ...
const { data: fileNote, error: fileNoteError } = await supabase
  .from('notes')
  .insert({
    user_id: userId,
    type: 'file',
    content: null,
    category: selectedCategory ?? 'uncategorized',
    classification_status: 'manual',
    classification_confidence: null
  })
  .select()
  .single();

const noteId = fileNote.id;

// 2. Upload file to storage
const { data: fileData } = await supabase.storage
  .from('attachments')
  .upload(`${userId}/attachments/${noteId}/${filename}`, file);

// 3. Insert attachment record
await supabase.from('attachments').insert({
  note_id: noteId,
  filename,
  mime_type: file.type,
  storage_path: fileData.path,
  size_bytes: file.size
});

// List notes (with pagination)
const { data } = await supabase
  .from('notes')
  .select('*, attachments(*)')
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
  .range(offset, offset + limit - 1);

// Filter by category
const { data } = await supabase
  .from('notes')
  .select('*, attachments(*)')
  .eq('category', 'projects')
  .order('created_at', { ascending: false });

// Full-text search
const { data } = await supabase
  .from('notes')
  .select('*, attachments(*)')
  .textSearch('search_vector', searchQuery)
  .order('created_at', { ascending: false });

// Update category (manual edit)
await supabase
  .from('notes')
  .update({
    category: 'ideas',
    classification_status: 'manual',
    classification_confidence: null
  })
  .eq('id', noteId);

// Register Android device push token (FCM)
await supabase.from('devices').upsert({
  user_id: userId,
  platform: 'android',
  push_token: fcmToken,
  last_seen_at: new Date().toISOString()
}, { onConflict: 'user_id,platform' });

// Subscribe to note changes (Realtime)
supabase
  .channel('notes')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'notes',
    filter: `user_id=eq.${userId}`
  }, (payload) => {
    // Update UI when classification completes
  })
  .subscribe();
```

### Edge Functions

#### POST /functions/v1/transcribe-voice

Called by database webhook when voice note is inserted.

```typescript
// Request (webhook payload)
{
  type: 'INSERT',
  table: 'notes',
  record: {
    id: string,
    type: 'voice',
    // ... other fields
  }
}

// Process:
// 1. Fetch audio file from storage
// 2. Send to Whisper API
// 3. Update note with transcript
// 4. Trigger classification

// Response
{ success: true, transcript: string }
```

#### POST /functions/v1/classify-note

Called by database webhook when note needs classification.

```typescript
// Request (either form)
// A) Direct call (preferred)
{ note_id: string }

// B) Supabase Database Webhook payload (INSERT on notes)
{
  type: 'INSERT',
  table: 'notes',
  record: { id: string /* + other columns */ }
}

// Handler behavior:
// - Derive note_id from either payload shape
// - Fetch note server-side (service role) to avoid payload coupling
// - No-op if classification_status != 'pending' or type = 'file' or content is empty

// LLM Prompt
const prompt = `Classify this note into exactly one category. Return JSON only.

Categories:
- ideas: Shower thoughts, product concepts, things to explore
- projects: Active work tasks, deliverables
- family: Spouse, kids, household
- friends: Social relationships, people to reach out to
- health: Exercise, diet, medical, mental health
- admin: Bills, appointments, errands, life maintenance
- uncategorized: Doesn't fit cleanly

Note content:
"""
${content}
"""

Return: {"category": "<category>", "confidence": <0.0-1.0>}`;

// Response
{
  success: true,
  note_id: string,
  category: Category,
  confidence: number
}

// Error handling: 3 retries with exponential backoff
// On final failure: mark as 'uncategorized' with status 'failed'
```

#### POST /functions/v1/generate-summary

Called by pg_cron every 5 minutes (acts as a scheduler for both summary generation and push delivery).

```typescript
// Request (from pg_cron)
{ trigger: 'cron' }

// Process:
// 1. Fetch users with timezones
// 2. For each user, compute local time (timezone-aware)
// 3. If local time is ~07:55 and today's summary is missing:
//    a. Fetch notes from last 48 hours
//    b. Generate summary via Claude
//    c. Save to daily_summaries table
// 4. If local time is ~08:00 and today's summary exists and sent_at is null:
//    a. Call send-push function
//    b. send-push updates daily_summaries.sent_at on success
//
// MVP clarification: there is no explicit "open/done" task state; summary input is only notes from the last 48 hours.

// LLM Prompt for summary
const prompt = `Based on these notes from the last 48 hours, generate a daily summary.

Notes:
${notes.map(n => `[${n.category}] ${n.content}`).join('\n')}

Generate a JSON response with:
1. top_actions: Exactly 3 concrete, executable actions for today (not vague like "work on project" but specific like "email Sarah about copy deadline")
2. avoiding: One thing the user might be avoiding (pattern detection from what keeps resurfacing)
3. small_win: One small win to notice (something the user captured or progressed on)

Return: {
  "top_actions": ["action1", "action2", "action3"],
  "avoiding": "description",
  "small_win": "description"
}`;

// Response
{ success: true, summaries_generated: number }
```

#### POST /functions/v1/send-push

Called by the generate-summary scheduler when it's time to deliver a daily summary push notification.

```typescript
// Request
{
  user_id: string,
  summary_id: string,
  title: string,
  body: string,
  data?: Record<string, string>
}

// Process:
// 1. Fetch Android devices with non-null push_token for user
// 2. Send to FCM HTTP v1 API
// 3. Update daily_summaries.sent_at for summary_id

// FCM HTTP v1 request
POST https://fcm.googleapis.com/v1/projects/{project_id}/messages:send
Authorization: Bearer {access_token}
{
  "message": {
    "token": "{device_token}",
    "notification": {
      "title": "Your Daily Summary",
      "body": "3 actions for today..."
    },
    "data": {
      "summary_id": "{summary_id}",
      "type": "daily_summary"
    },
    "android": {
      "priority": "high"
    }
  }
}

// Response
{ success: true, tokens_sent: number }
```

---

## Database Webhooks Configuration

```sql
-- Webhook trigger for new text notes (triggers classification)
-- Configured in Supabase Dashboard: Database > Webhooks

-- Trigger: INSERT on notes table
-- Filter: type = 'text' AND classification_status = 'pending'
-- URL: https://<project>.supabase.co/functions/v1/classify-note

-- Trigger: INSERT on notes table
-- Filter: type = 'voice'
-- URL: https://<project>.supabase.co/functions/v1/transcribe-voice
```

---

## pg_cron Configuration

```sql
-- Schedule summary scheduler (runs every 5 minutes to hit ~07:55 generation and ~08:00 push in user local time)
SELECT cron.schedule(
  'generate-daily-summaries',
  '*/5 * * * *', -- Every 5 minutes
  $$
  SELECT net.http_post(
    url := 'https://<project>.supabase.co/functions/v1/generate-summary',
    headers := '{"Authorization": "Bearer <service_role_key>", "Content-Type": "application/json"}'::jsonb,
    body := '{"trigger": "cron"}'::jsonb
  );
  $$
);
```

---

## File Storage Structure

**Bucket:** `attachments` (private)

```
{user_id}/
  attachments/
    {note_id}/
      {original_filename}
  voice/
    {note_id}.m4a
```

**Storage RLS Policy:**
```sql
-- Users can only access their own files
CREATE POLICY storage_policy ON storage.objects FOR ALL
  USING (bucket_id = 'attachments' AND (storage.foldername(name))[1] = auth.uid()::text);
```

---

## Mobile Implementation Details

### Expo Configuration (app.json)

```json
{
  "expo": {
    "name": "NotesBrain",
    "slug": "notes-brain",
    "plugins": [
      "expo-router",
      [
        "expo-av",
        {
          "microphonePermission": "Allow NotesBrain to record voice notes"
        }
      ],
      [
        "expo-build-properties",
        {
          "android": {
            "usesCleartextTraffic": true
          }
        }
      ]
    ],
    "android": {
      "package": "com.notesbrain.app",
      "googleServicesFile": "./google-services.json",
      "intentFilters": [
        {
          "action": "SEND",
          "category": ["DEFAULT"],
          "data": [
            { "mimeType": "text/*" },
            { "mimeType": "image/*" },
            { "mimeType": "application/pdf" }
          ]
        }
      ]
    }
  }
}
```

### Voice Recording (expo-av)

```typescript
import { Audio } from 'expo-av';

const recording = new Audio.Recording();

await recording.prepareToRecordAsync({
  android: {
    extension: '.m4a',
    outputFormat: Audio.AndroidOutputFormat.MPEG_4,
    audioEncoder: Audio.AndroidAudioEncoder.AAC,
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 128000,
  },
  ios: {
    extension: '.m4a',
    audioQuality: Audio.IOSAudioQuality.HIGH,
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 128000,
    outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
  },
  web: {
    mimeType: 'audio/webm',
    bitsPerSecond: 128000,
  },
});

await recording.startAsync();
// ... user records ...
await recording.stopAndUnloadAsync();
const uri = recording.getURI();
// Upload to Supabase Storage
```

**MVP constraint:** enforce a hard stop at 5 minutes (e.g., timer-driven `stopAndUnloadAsync()` + UI countdown).

### Share Sheet Handling

```typescript
// In app entry point, check for shared content
import * as Linking from 'expo-linking';
import * as IntentLauncher from 'expo-intent-launcher';

useEffect(() => {
  const handleShare = async (url: string) => {
    // Parse shared content
    // Create note with shared text/link/file
  };

  Linking.getInitialURL().then(url => {
    if (url) handleShare(url);
  });

  const subscription = Linking.addEventListener('url', ({ url }) => {
    handleShare(url);
  });

  return () => subscription.remove();
}, []);
```

---

## Web Implementation Details

### File Upload Drop Zone

```typescript
import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

const ACCEPTED_TYPES = {
  'application/pdf': ['.pdf'],
  'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'text/plain': ['.txt']
};

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

const onDrop = useCallback(async (acceptedFiles: File[]) => {
  for (const file of acceptedFiles) {
    // 1. Create note record
    // 2. Upload file to storage
    // 3. Create attachment record
  }
}, []);

const { getRootProps, getInputProps, isDragActive } = useDropzone({
  onDrop,
  accept: ACCEPTED_TYPES,
  maxSize: MAX_SIZE
});
```

### React Query Setup

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
    },
  },
});

// Note queries
export function useNotes(category?: Category) {
  return useQuery({
    queryKey: ['notes', category],
    queryFn: () => fetchNotes(category),
  });
}

export function useCreateNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createNote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });
}
```

---

## Authentication Flow

```typescript
// packages/shared/src/auth.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

// Sign up
export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (data.user) {
    // Create user profile with default timezone
    await supabase.from('users').insert({
      id: data.user.id,
      email: data.user.email,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });
  }

  return { data, error };
}

// Magic link
export async function signInWithMagicLink(email: string) {
  return supabase.auth.signInWithOtp({ email });
}

// Sign in
export async function signIn(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}
```

---

## Error Handling

### Classification Retry Logic (Edge Function)

```typescript
async function classifyWithRetry(content: string, maxRetries = 3): Promise<ClassificationResult> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await callClaudeAPI(content);
      return result;
    } catch (error) {
      lastError = error as Error;
      // Exponential backoff: 1s, 2s, 4s
      await sleep(Math.pow(2, attempt) * 1000);
    }
  }

  // All retries failed
  throw lastError;
}

// In main handler
try {
  const result = await classifyWithRetry(note.content);
  await updateNote(noteId, {
    category: result.category,
    classification_confidence: result.confidence,
    classification_status: 'completed'
  });
} catch (error) {
  await updateNote(noteId, {
    category: 'uncategorized',
    classification_status: 'failed'
  });
}
```

---

## Environment Variables

### Client Apps (.env)
```
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### Supabase Edge Functions (secrets)
```
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
FCM_PROJECT_ID=notes-brain-xxx
FCM_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
```

---

## Implementation Sequence

### Phase 1: Foundation
1. Initialize monorepo structure (Turborepo + npm workspaces)
2. Set up Supabase project (database, auth, storage)
3. Create database schema and migrations
4. Set up shared package with types and Supabase client
5. Configure RLS policies

### Phase 2: Web App - Core
6. Initialize React web app (Vite)
7. Implement authentication (sign up, sign in, magic link)
8. Build note list view with category filters
9. Implement text note creation
10. Add file upload with drag-and-drop
11. Implement full-text search
12. Add manual category editing

### Phase 3: Backend - AI Pipeline
13. Create classify-note Edge Function
14. Create transcribe-voice Edge Function
15. Set up database webhooks for note insert triggers
16. Implement retry logic with exponential backoff
17. Add Supabase Realtime subscription for classification updates

### Phase 4: Mobile App - Core
18. Initialize Expo app with Expo Router
19. Implement authentication (shared logic)
20. Build capture screen (text input as default view)
21. Implement voice recording with expo-av
22. Add share sheet intent handling
23. Build note list view (mirror web functionality)

### Phase 5: Daily Summary
24. Create generate-summary Edge Function
25. Create send-push Edge Function
26. Set up pg_cron scheduler (every 5 min)
27. Implement device push token registration on mobile
28. Build summary view screen in mobile app

### Phase 6: Polish & Integration
29. Add timezone settings (auto-detect + manual)
30. Implement optimistic UI updates
31. Add loading states and error handling
32. Test end-to-end flows
33. Configure production builds

---

## Deferred to Post-MVP

- Android home screen widget
- Email fallback for daily summary
- Semantic search
- Transcript editing
- End-to-end encryption
- Offline-first sync
- Custom categories
