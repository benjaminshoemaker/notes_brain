# Execution Plan: NotesBrain

## Overview

| Metric | Value |
|--------|-------|
| Phases | 6 |
| Steps  | 18 |
| Tasks  | 33 |

## Phase Flow

```
Phase 1: Foundation
    ↓
Phase 2: Web App - Core
    ↓
Phase 3: Backend - AI Pipeline
    ↓
Phase 4: Mobile App - Core
    ↓
Phase 5: Daily Summary
    ↓
Phase 6: Polish & Integration
```

---

## Phase 1: Foundation

**Goal:** Set up monorepo structure, Supabase project, database schema, and shared packages.

### Pre-Phase Setup

Human must complete before agents begin:

- [x] Create Supabase project at https://supabase.com/dashboard
- [x] Note the project URL and anon key from Settings > API
- [x] Create Firebase project at https://console.firebase.google.com (for FCM)
- [x] Download `google-services.json` from Firebase (Android app)
- [x] Create `.env` file with `SUPABASE_URL` and `SUPABASE_ANON_KEY`

---

### Step 1.1: Monorepo Setup

#### Task 1.1.A: Initialize Monorepo Structure

**What:** Create the monorepo with Turborepo and npm workspaces, including apps and packages directories.

**Acceptance Criteria:**
- [x] Root `package.json` exists with `workspaces` configured for `apps/*` and `packages/*`
- [x] `turbo.json` exists with pipeline configuration for `build`, `test`, `lint`, `typecheck`
- [x] Directory structure matches: `apps/mobile/`, `apps/web/`, `packages/shared/`, `supabase/`
- [x] Running `npm install` at root succeeds without errors
- [x] `.gitignore` includes `node_modules`, `.env*`, `.turbo`, `dist`

**Files:**
- Create: `package.json` — root workspace configuration
- Create: `turbo.json` — Turborepo pipeline config
- Create: `.gitignore` — ignore patterns
- Create: `apps/.gitkeep` — placeholder
- Create: `packages/.gitkeep` — placeholder
- Create: `supabase/.gitkeep` — placeholder

**Depends On:** None

**Spec Reference:** TECHNICAL_SPEC.md > Project Structure

---

### Step 1.2: Shared Package

#### Task 1.2.A: Create Shared Types Package

**What:** Set up the shared package with TypeScript types, constants, and Zod validation schemas.

**Acceptance Criteria:**
- [x] `packages/shared/package.json` exists with name `@notesbrain/shared`
- [x] TypeScript compiles without errors (`npm run build` in shared package)
- [x] All types from TECHNICAL_SPEC.md are exported: `User`, `Note`, `Attachment`, `NoteWithAttachments`, `DailySummary`, `Device`, `Category`, `NoteType`, `ClassificationStatus`, `DevicePlatform`
- [x] `CATEGORIES` constant array is exported
- [x] Zod schemas exist for `CreateNoteRequest` and `ClassificationResult`

**Files:**
- Create: `packages/shared/package.json` — package config
- Create: `packages/shared/tsconfig.json` — TypeScript config
- Create: `packages/shared/src/types.ts` — all TypeScript types
- Create: `packages/shared/src/constants.ts` — CATEGORIES and limits
- Create: `packages/shared/src/validation.ts` — Zod schemas
- Create: `packages/shared/src/index.ts` — barrel export

**Depends On:** 1.1.A

**Spec Reference:** TECHNICAL_SPEC.md > TypeScript Types

---

#### Task 1.2.B: Create Supabase Client Wrapper

**What:** Create the Supabase client initialization and auth helper functions in the shared package.

**Acceptance Criteria:**
- [x] `createSupabaseClient` function exists and accepts URL and anon key
- [x] Auth functions exported: `signUp`, `signIn`, `signInWithMagicLink`, `signOut`
- [x] `signUp` creates user profile in `users` table with auto-detected timezone
- [x] Client types are properly typed with database schema types
- [x] Package exports client from `@notesbrain/shared`

**Files:**
- Create: `packages/shared/src/supabase.ts` — client factory
- Create: `packages/shared/src/auth.ts` — auth helper functions
- Modify: `packages/shared/src/index.ts` — add exports

**Depends On:** 1.2.A

**Spec Reference:** TECHNICAL_SPEC.md > Authentication Flow

---

### Step 1.3: Database Schema

#### Task 1.3.A: Create Supabase Migrations

**What:** Create SQL migration files for all database tables, types, indexes, RLS policies, and triggers.

**Acceptance Criteria:**
- [x] Migration creates all enums: `note_category`, `note_type`, `classification_status`, `device_platform`
- [x] Migration creates all tables: `users`, `notes`, `attachments`, `daily_summaries`, `devices`
- [x] All indexes from TECHNICAL_SPEC.md are created
- [x] RLS is enabled on all tables with correct policies
- [x] `update_updated_at()` trigger function and triggers exist
- [x] Migration runs successfully via `supabase db push` or `supabase migration up`

**Files:**
- Create: `supabase/migrations/00001_initial_schema.sql` — complete schema
- Create: `supabase/config.toml` — Supabase CLI config

**Depends On:** 1.1.A

**Spec Reference:** TECHNICAL_SPEC.md > Database Schema

---

#### Task 1.3.B: Configure Storage Bucket

**What:** Create Supabase storage bucket configuration for file attachments.

**Acceptance Criteria:**
- [x] Migration creates `attachments` bucket (private)
- [x] Storage RLS policy allows users to access only their own files
- [x] Policy uses `(storage.foldername(name))[1] = auth.uid()::text` pattern

**Files:**
- Create: `supabase/migrations/00002_storage_bucket.sql` — storage config

**Depends On:** 1.3.A

**Spec Reference:** TECHNICAL_SPEC.md > File Storage Structure

---

### Phase 1 Checkpoint

**Automated:**
- [x] `npm install` succeeds at monorepo root
- [x] `npm run build` succeeds (builds shared package)
- [x] TypeScript compilation has no errors
- [x] Supabase migrations apply successfully

**Manual Verification:**
- [x] Supabase dashboard shows all tables: users, notes, attachments, daily_summaries, devices
- [x] Storage bucket `attachments` exists and is private
- [x] RLS policies are visible in Supabase dashboard

---

## Phase 2: Web App - Core

**Goal:** Build the React web application with authentication, note creation, list view, and category management.

### Pre-Phase Setup

Human must complete before agents begin:

- [x] Ensure `.env` has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

---

### Step 2.1: Web App Initialization

#### Task 2.1.A: Initialize React Web App

**What:** Create the Vite React app with TypeScript, React Query, and basic routing.

**Acceptance Criteria:**
- [x] `apps/web/package.json` exists with dependencies: `react`, `react-dom`, `@tanstack/react-query`, `@supabase/supabase-js`, `react-router-dom`
- [x] Vite config uses `@notesbrain/shared` from workspace
- [x] App renders without errors on `npm run dev`
- [x] React Query provider wraps the app with configured client
- [x] Environment variables are loaded for Supabase URL and anon key

**Files:**
- Create: `apps/web/package.json` — dependencies
- Create: `apps/web/vite.config.ts` — Vite config
- Create: `apps/web/tsconfig.json` — TypeScript config
- Create: `apps/web/index.html` — HTML entry
- Create: `apps/web/src/main.tsx` — app entry with providers
- Create: `apps/web/src/App.tsx` — root component with router

**Depends On:** 1.2.B

**Spec Reference:** TECHNICAL_SPEC.md > Tech Stack

---

### Step 2.2: Authentication

#### Task 2.2.A: Implement Auth UI

**What:** Build login and signup pages with email/password and magic link options.

**Acceptance Criteria:**
- [x] `/login` route renders login form with email and password fields
- [x] `/signup` route renders signup form with email and password fields
- [x] "Sign in with magic link" button sends OTP email via Supabase
- [x] Successful login redirects to `/` (notes list)
- [x] Auth state persists across page refreshes (Supabase session)
- [x] Logout button signs out and redirects to `/login`

**Files:**
- Create: `apps/web/src/pages/Login.tsx` — login page
- Create: `apps/web/src/pages/Signup.tsx` — signup page
- Create: `apps/web/src/hooks/useAuth.ts` — auth state hook
- Create: `apps/web/src/components/AuthGuard.tsx` — protected route wrapper
- Modify: `apps/web/src/App.tsx` — add auth routes

**Depends On:** 2.1.A

**Spec Reference:** TECHNICAL_SPEC.md > Authentication Flow

---

### Step 2.3: Note List View

#### Task 2.3.A: Build Note List Component

**What:** Create the main note list view with reverse-chronological display and category filters.

**Acceptance Criteria:**
- [x] Notes display in reverse chronological order (newest first)
- [x] Each note shows: content preview (truncated), category badge, timestamp
- [x] Category filter buttons allow filtering by single category
- [x] "All" filter shows all notes
- [x] Empty state displays when no notes exist
- [x] React Query handles caching and background refetch

**Files:**
- Create: `apps/web/src/pages/Notes.tsx` — main notes page
- Create: `apps/web/src/components/NoteList.tsx` — list component
- Create: `apps/web/src/components/NoteCard.tsx` — single note display
- Create: `apps/web/src/components/CategoryFilter.tsx` — filter buttons
- Create: `apps/web/src/hooks/useNotes.ts` — React Query hook for notes

**Depends On:** 2.2.A

**Spec Reference:** PRODUCT_SPEC.md > View & Organize (Web)

---

#### Task 2.3.B: Implement Full-Text Search

**What:** Add search functionality using Postgres tsvector full-text search.

**Acceptance Criteria:**
- [x] Search input field exists in the notes page header
- [x] Typing triggers search after 300ms debounce
- [x] Search uses Supabase `textSearch` on `search_vector` column
- [x] Search results replace the note list while query is active
- [x] Clearing search input restores full note list
- [x] Empty search results show appropriate message

**Files:**
- Create: `apps/web/src/components/SearchInput.tsx` — search field
- Create: `apps/web/src/hooks/useSearch.ts` — search query hook
- Modify: `apps/web/src/pages/Notes.tsx` — integrate search

**Depends On:** 2.3.A

**Spec Reference:** TECHNICAL_SPEC.md > API Contracts > Full-text search

---

### Step 2.4: Note Creation

#### Task 2.4.A: Implement Text Note Creation

**What:** Add text note creation with immediate save and pending classification status.

**Acceptance Criteria:**
- [x] Text input area is visible and focused by default
- [x] Pressing Enter (or button) creates note with `type: 'text'`, `classification_status: 'pending'`
- [x] New note appears immediately in list (optimistic update)
- [x] Note saves to database with `category: 'uncategorized'` initially
- [x] Input clears after successful creation
- [x] Error toast displays if creation fails

**Files:**
- Create: `apps/web/src/components/NoteInput.tsx` — text input component
- Create: `apps/web/src/hooks/useCreateNote.ts` — mutation hook
- Modify: `apps/web/src/pages/Notes.tsx` — add input above list

**Depends On:** 2.3.A

**Spec Reference:** PRODUCT_SPEC.md > Capture (Web) > Text input

---

#### Task 2.4.B: Implement File Upload with Drag-and-Drop

**What:** Add file upload via drag-and-drop with optional category selection.

**Acceptance Criteria:**
- [x] Drag-and-drop zone activates when files dragged over page
- [x] Accepted file types: PDF, PNG, JPG, JPEG, GIF, WEBP, DOC, DOCX, TXT
- [x] Files over 10MB are rejected with error message
- [x] Category selection dropdown appears after file drop (optional)
- [x] File uploads to Supabase storage at `{user_id}/attachments/{note_id}/{filename}`
- [x] Note created with `type: 'file'`, `classification_status: 'manual'`

**Files:**
- Create: `apps/web/src/components/FileDropZone.tsx` — drag-drop component
- Create: `apps/web/src/components/CategorySelect.tsx` — category dropdown
- Create: `apps/web/src/hooks/useUploadFile.ts` — file upload mutation
- Modify: `apps/web/src/pages/Notes.tsx` — integrate drop zone

**Depends On:** 2.4.A

**Spec Reference:** TECHNICAL_SPEC.md > Web Implementation Details > File Upload Drop Zone

---

### Step 2.5: Note Management

#### Task 2.5.A: Implement Manual Category Editing

**What:** Allow users to change a note's category with a single interaction.

**Acceptance Criteria:**
- [x] Clicking category badge on note card opens category selector
- [x] Selecting new category updates note immediately (optimistic)
- [x] Category change sets `classification_status: 'manual'`, `classification_confidence: null`
- [x] Selector closes after selection
- [x] Updated category persists on page refresh

**Files:**
- Create: `apps/web/src/components/CategoryEditor.tsx` — inline category editor
- Create: `apps/web/src/hooks/useUpdateCategory.ts` — update mutation
- Modify: `apps/web/src/components/NoteCard.tsx` — add category click handler

**Depends On:** 2.4.B

**Spec Reference:** PRODUCT_SPEC.md > View & Organize (Web) > Manual category editing

---

#### Task 2.5.B: Implement Attachment Preview

**What:** Show inline previews for note attachments (images, PDFs).

**Acceptance Criteria:**
- [x] Image attachments (PNG, JPG, GIF, WEBP) show thumbnail preview
- [x] PDF attachments show PDF icon with filename
- [x] Clicking attachment opens in new tab (signed URL from Supabase Storage)
- [x] Attachment count badge shows on notes with files
- [x] Loading state displays while fetching signed URL

**Files:**
- Create: `apps/web/src/components/AttachmentPreview.tsx` — preview component
- Create: `apps/web/src/hooks/useAttachmentUrl.ts` — signed URL hook
- Modify: `apps/web/src/components/NoteCard.tsx` — show attachments

**Depends On:** 2.5.A

**Spec Reference:** PRODUCT_SPEC.md > View & Organize (Web) > Inline preview for attachments

---

### Phase 2 Checkpoint

**Automated:**
- [x] `npm run build` succeeds for web app
- [x] `npm run typecheck` passes
- [x] `npm run lint` passes
- [x] All tests pass

**Manual Verification:**
- [x] Can sign up with email/password
- [x] Can sign in with magic link
- [x] Can create text notes
- [x] Can upload files with drag-and-drop
- [x] Can filter notes by category
- [x] Can search notes
- [x] Can change note category
- [x] Attachment previews work

---

## Phase 3: Backend - AI Pipeline

**Goal:** Create Edge Functions for classification and transcription, set up database webhooks and realtime subscriptions.

### Pre-Phase Setup

Human must complete before agents begin:

- [ ] Add `OPENAI_API_KEY` to Supabase Edge Function secrets
- [ ] Verify Supabase project has Edge Functions enabled

---

### Step 3.1: Classification Function

#### Task 3.1.A: Create classify-note Edge Function

**What:** Build the Edge Function that classifies notes using OpenAI Chat Completions API.

**Acceptance Criteria:**
- [x] Function accepts both direct call `{note_id}` and webhook payload formats
- [x] Function fetches note content using service role key
- [x] Function skips classification if `type = 'file'` or `classification_status != 'pending'` or `content` is empty
- [x] OpenAI API called with exact prompt from TECHNICAL_SPEC.md
- [x] Response parsed as JSON with `category` and `confidence`
- [x] Note updated with category, confidence, `classification_status: 'completed'`

**Files:**
- Create: `supabase/functions/classify-note/index.ts` — main handler
- Create: `supabase/functions/_shared/supabase.ts` — service client helper
- Create: `supabase/functions/_shared/openai.ts` — OpenAI API helper

**Depends On:** 1.3.A

**Spec Reference:** TECHNICAL_SPEC.md > Edge Functions > classify-note

---

#### Task 3.1.B: Implement Classification Retry Logic

**What:** Add exponential backoff retry logic for classification failures.

**Acceptance Criteria:**
- [x] Failed API calls retry up to 3 times
- [x] Backoff delays are 1s, 2s, 4s (exponential)
- [x] After all retries fail, note updated with `category: 'uncategorized'`, `classification_status: 'failed'`
- [x] Errors are logged with note ID and attempt number
- [x] Function returns appropriate error response on final failure

**Files:**
- Modify: `supabase/functions/classify-note/index.ts` — add retry logic
- Create: `supabase/functions/_shared/retry.ts` — retry helper

**Depends On:** 3.1.A

**Spec Reference:** TECHNICAL_SPEC.md > Error Handling > Classification Retry Logic

---

### Step 3.2: Transcription Function

#### Task 3.2.A: Create transcribe-voice Edge Function

**What:** Build the Edge Function that transcribes voice notes using Whisper API.

**Acceptance Criteria:**
- [x] Function triggered by webhook on voice note insert
- [x] Function downloads audio file from Supabase Storage
- [x] Whisper API called with audio file
- [x] Note `content` field updated with transcript
- [x] Function triggers classification after transcription succeeds
- [x] Errors logged and note marked appropriately on failure

**Files:**
- Create: `supabase/functions/transcribe-voice/index.ts` — main handler
- Create: `supabase/functions/_shared/openai.ts` — Whisper API helper

**Depends On:** 3.1.B

**Spec Reference:** TECHNICAL_SPEC.md > Edge Functions > transcribe-voice

---

### Step 3.3: Database Webhooks

#### Task 3.3.A: Configure Database Webhooks

**What:** Set up Supabase database webhooks to trigger Edge Functions on note insert.

**Acceptance Criteria:**
- [x] Webhook triggers `classify-note` on INSERT on `public.notes` (no dashboard row filter; function skips unless `type = 'text'` AND `classification_status = 'pending'` AND content is non-empty)
- [x] Webhook triggers `transcribe-voice` on INSERT on `public.notes` (no dashboard row filter; function skips unless `type = 'voice'`)
- [x] Webhooks configured in Supabase dashboard (documented in migration comment)
- [x] Test: creating text note triggers classification
- [ ] Test: creating voice note triggers transcription (requires mobile app - Phase 4)

**Files:**
- Create: `supabase/migrations/00003_webhook_documentation.sql` — webhook config docs

**Depends On:** 3.2.A

**Spec Reference:** TECHNICAL_SPEC.md > Database Webhooks Configuration

---

### Step 3.4: Realtime Updates

#### Task 3.4.A: Implement Realtime Classification Updates

**What:** Subscribe to note changes so UI updates when classification completes.

**Acceptance Criteria:**
- [x] Web app subscribes to `postgres_changes` on `notes` table for current user
- [x] When note `classification_status` changes to `completed`, UI updates category
- [x] Subscription established on auth and cleaned up on logout
- [x] Category badge animates/highlights briefly on update
- [x] Works for both new notes and re-classified notes

**Files:**
- Create: `apps/web/src/hooks/useRealtimeNotes.ts` — realtime subscription hook
- Modify: `apps/web/src/pages/Notes.tsx` — integrate realtime
- Modify: `apps/web/src/components/NoteCard.tsx` — add update animation

**Depends On:** 3.3.A, 2.5.B

**Spec Reference:** TECHNICAL_SPEC.md > API Contracts > Subscribe to note changes

---

### Phase 3 Checkpoint

**Automated:**
- [x] Edge Functions deploy successfully
- [x] TypeScript compilation passes
- [x] All tests pass

**Manual Verification:**
- [x] Create text note → classification completes within 5 seconds
- [x] Category appears on note after classification
- [x] Classification confidence stored in database
- [ ] (If voice recording available) Voice note transcribes and classifies (requires mobile app - Phase 4)

---

## Phase 4: Mobile App - Core

**Goal:** Build the Expo React Native app with authentication, text capture, voice recording, and share sheet handling.

### Pre-Phase Setup

Human must complete before agents begin:

- [x] Expo CLI available via `npx expo` (no global install needed)
- [x] Add `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` to root `.env.local`
- [x] Place `google-services.json` in `apps/mobile/`

---

### Step 4.1: Mobile App Initialization

#### Task 4.1.A: Initialize Expo App

**What:** Create the Expo app with Expo Router, configured for Android with FCM.

**Acceptance Criteria:**
- [x] `apps/mobile/package.json` exists with Expo dependencies
- [x] `app.json` configured with package name `com.notesbrain.app`
- [x] Expo Router configured with file-based routing
- [ ] App runs on Android emulator via `npx expo start`
- [x] React Query provider wraps the app
- [x] Supabase client initialized from shared package

**Files:**
- Create: `apps/mobile/package.json` — dependencies
- Create: `apps/mobile/app.json` — Expo config
- Create: `apps/mobile/tsconfig.json` — TypeScript config
- Create: `apps/mobile/app/_layout.tsx` — root layout with providers
- Create: `apps/mobile/app/index.tsx` — home screen

**Depends On:** 1.2.B

**Spec Reference:** TECHNICAL_SPEC.md > Mobile Implementation Details > Expo Configuration

---

### Step 4.2: Mobile Authentication

#### Task 4.2.A: Implement Mobile Auth Flow

**What:** Build login/signup screens with shared auth logic from @notesbrain/shared.

**Acceptance Criteria:**
- [x] Login screen with email/password fields
- [x] Signup screen with email/password fields
- [x] Magic link option sends email and shows "check email" message
- [x] Successful auth navigates to home (capture screen)
- [x] Auth state persists using Supabase session
- [x] Logout returns to login screen

**Files:**
- Create: `apps/mobile/app/(auth)/login.tsx` — login screen
- Create: `apps/mobile/app/(auth)/signup.tsx` — signup screen
- Create: `apps/mobile/app/(auth)/_layout.tsx` — auth layout
- Create: `apps/mobile/hooks/useAuth.ts` — auth hook (mobile-specific)

**Depends On:** 4.1.A

**Spec Reference:** TECHNICAL_SPEC.md > Authentication Flow

---

### Step 4.3: Text Capture

#### Task 4.3.A: Build Capture Screen

**What:** Create the main capture screen that opens immediately to text input.

**Acceptance Criteria:**
- [x] Home screen shows text input focused by default
- [x] Keyboard opens automatically on screen load
- [x] Submit button (or Enter) creates text note
- [x] Note saves with `classification_status: 'pending'`
- [x] Success feedback shown (brief toast or checkmark)
- [x] Input clears after submission

**Files:**
- Create: `apps/mobile/app/(app)/index.tsx` — capture screen
- Create: `apps/mobile/components/CaptureInput.tsx` — text input component
- Create: `apps/mobile/hooks/useCreateNote.ts` — create mutation (mobile)

**Depends On:** 4.2.A

**Spec Reference:** PRODUCT_SPEC.md > Capture (Android) > App open

---

### Step 4.4: Voice Recording

#### Task 4.4.A: Implement Voice Recording

**What:** Add voice note recording using expo-audio with 5-minute limit.

**Acceptance Criteria:**
- [x] Mic button visible on capture screen
- [x] Tapping mic starts recording with visual indicator
- [x] Timer shows recording duration
- [x] Recording stops automatically at 5 minutes
- [x] Stop button ends recording early
- [x] Audio saved as .m4a and uploaded to Supabase Storage
- [x] Note created with `type: 'voice'` and attachment reference

**Files:**
- Create: `apps/mobile/components/VoiceRecorder.tsx` — recording UI
- Create: `apps/mobile/hooks/useVoiceRecording.ts` — expo-audio recording hook
- Modify: `apps/mobile/app/(app)/index.tsx` — add voice recorder

**Depends On:** 4.3.A

**Spec Reference:** TECHNICAL_SPEC.md > Mobile Implementation Details > Voice Recording

---

### Step 4.5: Share Sheet

#### Task 4.5.A: Handle Share Sheet Intents

**What:** Configure app to receive shared content from other Android apps.

**Acceptance Criteria:**
- [x] `app.json` has intent filters for text/*, image/*, application/pdf
- [x] App receives shared text and creates note
- [x] App receives shared images/files and prompts for category
- [x] Shared URLs detected and saved as text notes
- [x] App handles share intent when launched from cold start
- [x] App handles share intent when already running

**Files:**
- Modify: `apps/mobile/app.json` — add intent filters
- Create: `apps/mobile/hooks/useShareIntent.ts` — share handling hook
- Create: `apps/mobile/components/ShareHandler.tsx` — share UI
- Modify: `apps/mobile/app/_layout.tsx` — integrate share handler

**Depends On:** 4.4.A

**Spec Reference:** TECHNICAL_SPEC.md > Mobile Implementation Details > Share Sheet Handling

---

### Step 4.6: Mobile Note List

#### Task 4.6.A: Build Mobile Note List View

**What:** Create note list screen mirroring web functionality.

**Acceptance Criteria:**
- [x] Notes tab shows reverse-chronological list
- [x] Each note shows content preview, category badge, timestamp
- [x] Category filter tabs at top
- [x] Pull-to-refresh reloads notes
- [x] Tapping note opens detail view (or expands inline)
- [x] Realtime subscription updates list when classification completes

**Files:**
- Create: `apps/mobile/app/(app)/notes.tsx` — notes list screen
- Create: `apps/mobile/components/NotesList.tsx` — list component
- Create: `apps/mobile/components/MobileNoteCard.tsx` — note card
- Create: `apps/mobile/components/MobileCategoryFilter.tsx` — filter tabs
- Create: `apps/mobile/hooks/useNotes.ts` — notes query (mobile)

**Depends On:** 4.5.A

**Spec Reference:** PRODUCT_SPEC.md > View & Organize (Web) (mirrored for mobile)

---

### Phase 4 Checkpoint

**Automated:**
- [x] `npx expo start` runs without errors
- [x] TypeScript compilation passes
- [x] All tests pass

**Manual Verification:**
- [x] Can sign up and log in on Android emulator
- [x] Text capture creates notes that classify
- [x] Voice recording works (5-min limit enforced)
- [x] Share sheet receives text and files from other apps
- [x] Notes list displays and filters work
- [x] Realtime updates show classification completion

---

## Phase 5: Daily Summary

**Goal:** Implement summary generation, push notifications, and the summary view.

### Pre-Phase Setup

Human must complete before agents begin:

- [ ] Add `FCM_PROJECT_ID` to Supabase secrets
- [ ] Add `FCM_SERVICE_ACCOUNT_KEY` (full JSON) to Supabase secrets
- [ ] Enable pg_cron extension in Supabase (Database > Extensions)
- [ ] Enable pg_net extension in Supabase (Database > Extensions)

---

### Step 5.1: Summary Generation

#### Task 5.1.A: Create generate-summary Edge Function

**What:** Build the Edge Function that generates daily summaries using OpenAI Chat Completions API.

**Acceptance Criteria:**
- [ ] Function runs on cron trigger `{trigger: 'cron'}`
- [ ] Function finds users where local time is ~07:55 (±5 min window)
- [ ] For each eligible user, fetches notes from last 48 hours
- [ ] OpenAI API called with summary prompt from TECHNICAL_SPEC.md
- [ ] Response parsed as `DailySummaryContent` (top_actions, avoiding, small_win)
- [ ] Summary saved to `daily_summaries` table with JSONB content

**Files:**
- Create: `supabase/functions/generate-summary/index.ts` — main handler
- Modify: `supabase/functions/_shared/openai.ts` — add summary prompt

**Depends On:** 3.1.B

**Spec Reference:** TECHNICAL_SPEC.md > Edge Functions > generate-summary

---

### Step 5.2: Push Notifications

#### Task 5.2.A: Create send-push Edge Function

**What:** Build the Edge Function that sends push notifications via FCM HTTP v1 API.

**Acceptance Criteria:**
- [ ] Function accepts `user_id`, `summary_id`, `title`, `body`
- [ ] Function fetches Android device with `push_token` for user
- [ ] FCM HTTP v1 API called with correct format
- [ ] `daily_summaries.sent_at` updated on successful send
- [ ] Function handles case where user has no registered device
- [ ] Errors logged appropriately

**Files:**
- Create: `supabase/functions/send-push/index.ts` — main handler
- Create: `supabase/functions/_shared/fcm.ts` — FCM API helper

**Depends On:** 5.1.A

**Spec Reference:** TECHNICAL_SPEC.md > Edge Functions > send-push

---

#### Task 5.2.B: Implement Push Scheduling

**What:** Update generate-summary to call send-push at ~08:00 and configure pg_cron.

**Acceptance Criteria:**
- [ ] generate-summary checks for summaries where local time is ~08:00 AND `sent_at` is null
- [ ] For eligible summaries, calls send-push function
- [ ] pg_cron job created: every 5 minutes calls generate-summary
- [ ] Migration documents cron configuration
- [ ] Test: manual trigger of generate-summary at appropriate time

**Files:**
- Modify: `supabase/functions/generate-summary/index.ts` — add push scheduling logic
- Create: `supabase/migrations/00004_cron_schedule.sql` — pg_cron setup

**Depends On:** 5.2.A

**Spec Reference:** TECHNICAL_SPEC.md > pg_cron Configuration

---

### Step 5.3: Device Registration

#### Task 5.3.A: Implement FCM Token Registration

**What:** Register device push tokens in the mobile app.

**Acceptance Criteria:**
- [ ] App requests notification permissions on first launch
- [ ] FCM token obtained and saved to `devices` table
- [ ] Token updates if changed (app reinstall)
- [ ] `platform: 'android'` set correctly
- [ ] `last_seen_at` updated on app open
- [ ] Token registration happens after successful auth

**Files:**
- Create: `apps/mobile/hooks/usePushToken.ts` — FCM token hook
- Create: `apps/mobile/services/notifications.ts` — notification setup
- Modify: `apps/mobile/app/(app)/_layout.tsx` — trigger registration

**Depends On:** 4.6.A

**Spec Reference:** TECHNICAL_SPEC.md > API Contracts > Register Android device push token

---

### Step 5.4: Summary View

#### Task 5.4.A: Build Summary View Screen

**What:** Create the screen that displays the daily summary content.

**Acceptance Criteria:**
- [ ] Summary screen shows today's summary if it exists
- [ ] Displays: top 3 actions as checklist, "avoiding" section, "small win" section
- [ ] Push notification tap opens summary screen
- [ ] If no summary for today, shows appropriate message
- [ ] Pull-to-refresh checks for new summary
- [ ] Navigation from notes screen to summary screen

**Files:**
- Create: `apps/mobile/app/(app)/summary.tsx` — summary screen
- Create: `apps/mobile/components/SummaryCard.tsx` — summary display
- Create: `apps/mobile/hooks/useDailySummary.ts` — summary query hook
- Modify: `apps/mobile/services/notifications.ts` — handle notification tap

**Depends On:** 5.3.A

**Spec Reference:** PRODUCT_SPEC.md > Daily Summary (Mobile Push Notification)

---

### Phase 5 Checkpoint

**Automated:**
- [ ] Edge Functions deploy successfully
- [ ] pg_cron job visible in Supabase
- [ ] TypeScript compilation passes
- [ ] All tests pass

**Manual Verification:**
- [ ] Create several notes across categories
- [ ] Manually trigger generate-summary (or wait for cron)
- [ ] Summary appears in daily_summaries table with correct structure
- [ ] Push notification received on Android device/emulator
- [ ] Tapping notification opens summary screen
- [ ] Summary content is relevant to recent notes

---

## Phase 6: Polish & Integration

**Goal:** Add timezone settings, loading states, error handling, and final integration testing.

### Pre-Phase Setup

Human must complete before agents begin:

- [ ] None required

---

### Step 6.1: Timezone Settings

#### Task 6.1.A: Implement Timezone Settings

**What:** Add timezone configuration with auto-detect and manual override.

**Acceptance Criteria:**
- [ ] Settings screen exists in mobile app
- [ ] Timezone auto-detected on first app open using device locale
- [ ] Dropdown allows manual timezone selection
- [ ] Timezone saved to `users.timezone` field
- [ ] Timezone change affects daily summary delivery time
- [ ] Web app also shows timezone in settings (read-only or editable)

**Files:**
- Create: `apps/mobile/app/(app)/settings.tsx` — settings screen
- Create: `apps/mobile/components/TimezoneSelect.tsx` — timezone picker
- Create: `apps/mobile/hooks/useUserSettings.ts` — settings hook
- Create: `apps/web/src/pages/Settings.tsx` — web settings page
- Modify: `apps/web/src/App.tsx` — add settings route

**Depends On:** 5.4.A

**Spec Reference:** PRODUCT_SPEC.md > Constraints & Limits > Timezone

---

### Step 6.2: UI Polish

#### Task 6.2.A: Add Loading States and Error Handling

**What:** Implement consistent loading states and error handling across both apps.

**Acceptance Criteria:**
- [ ] All data fetches show loading spinner/skeleton
- [ ] Network errors show toast/alert with retry option
- [ ] Offline state detected and shown appropriately
- [ ] Form submissions disable button and show progress
- [ ] API errors display user-friendly messages
- [ ] React Query error boundaries catch unexpected errors

**Files:**
- Create: `apps/web/src/components/LoadingSpinner.tsx` — loading indicator
- Create: `apps/web/src/components/ErrorBoundary.tsx` — error boundary
- Create: `apps/web/src/components/Toast.tsx` — toast notifications
- Create: `apps/mobile/components/LoadingSpinner.tsx` — mobile loading
- Create: `apps/mobile/components/Toast.tsx` — mobile toast
- Modify: `apps/web/src/main.tsx` — add error boundary
- Modify: `apps/mobile/app/_layout.tsx` — add error handling

**Depends On:** 6.1.A

**Spec Reference:** TECHNICAL_SPEC.md > Implementation Sequence > Phase 6

---

#### Task 6.2.B: Implement Optimistic UI Updates

**What:** Add optimistic updates for note creation and category changes.

**Acceptance Criteria:**
- [ ] Creating note shows immediately in list before server confirms
- [ ] Category change reflects immediately before server confirms
- [ ] Failed mutations revert to previous state
- [ ] User notified of sync failure with retry option
- [ ] React Query mutation options configured for optimistic updates

**Files:**
- Modify: `apps/web/src/hooks/useCreateNote.ts` — add optimistic update
- Modify: `apps/web/src/hooks/useUpdateCategory.ts` — add optimistic update
- Modify: `apps/mobile/hooks/useCreateNote.ts` — add optimistic update

**Depends On:** 6.2.A

**Spec Reference:** TECHNICAL_SPEC.md > Implementation Sequence > Phase 6 > Optimistic UI updates

---

### Step 6.3: Production Builds

#### Task 6.3.A: Configure Production Builds

**What:** Set up production build configurations for web and mobile.

**Acceptance Criteria:**
- [ ] Web app builds with `npm run build` producing optimized bundle
- [ ] Environment variables configured for production Supabase
- [ ] Mobile app builds with `eas build --platform android`
- [ ] APK/AAB generated for Android
- [ ] Build artifacts exclude development dependencies
- [ ] Source maps generated for debugging

**Files:**
- Create: `apps/web/.env.production` — production env vars (template)
- Create: `apps/mobile/eas.json` — EAS build config
- Modify: `apps/web/vite.config.ts` — production optimizations
- Create: `apps/mobile/.env.production` — mobile production env (template)

**Depends On:** 6.2.B

**Spec Reference:** TECHNICAL_SPEC.md > Implementation Sequence > Phase 6 > Production builds

---

### Phase 6 Checkpoint

**Automated:**
- [ ] `npm run build` succeeds for all packages
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] All tests pass
- [ ] Production build completes without errors

**Manual Verification:**
- [ ] Complete end-to-end flow on web: signup → create notes → search → filter → edit category
- [ ] Complete end-to-end flow on mobile: signup → text capture → voice capture → share sheet → view notes
- [ ] Daily summary generates and delivers correctly
- [ ] Timezone setting affects delivery time
- [ ] Error states display appropriately
- [ ] Loading states appear during operations
- [ ] Production build runs without development warnings
