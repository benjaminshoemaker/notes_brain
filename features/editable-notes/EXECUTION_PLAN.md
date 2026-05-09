# Execution Plan: Editable Notes

## Overview

| Metric | Value |
|--------|-------|
| Feature | Editable Notes |
| Target Project | Notes Brain |
| Total Phases | 4 |
| Total Steps | 7 |
| Total Tasks | 11 |

## Integration Points

| Existing Component | Integration Type | Notes |
|--------------------|------------------|-------|
| `apps/mobile/app/(app)/notes.tsx` | modifies | Owns active edit state, focus cleanup, filter lockout, and realtime conflict callbacks. |
| `apps/mobile/components/NotesList.tsx` | modifies | Passes edit state and callbacks into cards while preserving category filtering and refresh behavior. |
| `apps/mobile/components/MobileNoteCard.tsx` | modifies | Adds read/edit states, draft validation, category picker, save/cancel actions, and disabled edit affordances. |
| `apps/mobile/hooks/useUpdateNote.ts` | creates | Updates existing notes with optimistic-safe cache replacement and no classification trigger. |
| `apps/mobile/hooks/useRealtimeNotes.ts` | modifies | Allows active-edit notes to convert remote updates/deletes into explicit conflict states. |
| `apps/mobile/lib/testIds.ts` | modifies | Adds stable selectors for edit controls, category options, inline errors, and conflict messages. |
| `packages/shared/src/constants.ts` | uses | Reuses the existing category list without adding new categories. |
| `apps/mobile/test/smoke/*` | creates/modifies | Adds deterministic unit and smoke coverage for edit behavior and regressions. |
| `scripts/e2e/*` and `tests/e2e/mobile/*` | creates | Provides agent-runnable seed, cleanup, driver, evidence, and rerun guidance for the flow plan. |

## Phase Dependency Graph

```text
Phase 1: Data and Realtime Contracts
  -> Phase 2: Inline Mobile Editing UI
      -> Phase 3: Regression Coverage
          -> Phase 4: Flow Verification Harness
```

---

## Phase 1: Data and Realtime Contracts

**Goal:** Establish the update mutation, validation contract, selectors, and realtime coordination needed before UI wiring.
**Depends On:** None

### Pre-Phase Setup

Human must complete before starting:
- [ ] Confirm mobile test dependencies install from the current workspace.
  - Verify: `cd apps/mobile && npm test -- test/smoke/notes-screen.test.tsx`
- [ ] Confirm the shared category source is available.
  - Verify: `rg "export const CATEGORIES" packages/shared/src/constants.ts`

### Step 1.1: Edit Mutation Foundation

**Depends On:** None

---

#### Task 1.1.A: Add edit validation and selectors

**Description:**
Add a small validation helper for note edit drafts and extend centralized mobile test IDs. This gives the card, list, and flow harness one consistent definition for body editability, category-only saves, no-change saves, and stable selectors.

**Requirement:** FEATURE_SPEC Acceptance Criteria 1, 4, 8, 14; FEATURE_TECHNICAL_SPEC "Test IDs" and "Validation Helper"

**Acceptance Criteria:**
- [x] (TEST) Draft validation allows body/category saves, rejects no-change saves, rejects blank editable bodies, and allows category-only saves for null or empty original content.
  - Verify: `cd apps/mobile && npm test -- test/smoke/note-edit-validation.test.ts`
- [x] (CODE) `apps/mobile/lib/noteEditValidation.ts` exports a typed validation helper that receives original content/category and draft content/category.
  - Verify: `rg "export .*validate.*Note.*Edit|export .*get.*Note.*Edit" apps/mobile/lib/noteEditValidation.ts`
- [x] (CODE) `apps/mobile/lib/testIds.ts` exposes `editButton`, `editInput`, `categoryOption`, `saveButton`, `cancelButton`, `editError`, and `editConflict` under `testIds.notes`.
  - Verify: `rg "editButton|editInput|categoryOption|saveButton|cancelButton|editError|editConflict" apps/mobile/lib/testIds.ts`
- [x] (TYPE) New helper and selectors typecheck with the mobile app.
  - Verify: `cd apps/mobile && npm run typecheck`

**Files to Create:**
- `apps/mobile/lib/noteEditValidation.ts` - pure draft validation helper.
- `apps/mobile/test/smoke/note-edit-validation.test.ts` - deterministic helper tests.

**Files to Modify:**
- `apps/mobile/lib/testIds.ts` - add stable note edit selectors.

**Existing Code to Reference:**
- `apps/mobile/lib/testIds.ts` - current selector naming style.
- `packages/shared/src/constants.ts` - category type/source.

**Dependencies:**
- None

**Spec Reference:** "Validation And Error States"; "Test IDs"

**Browser Verification:**
- Criteria IDs: None
- Notes: Mobile component behavior is covered by Vitest and the later mobile flow harness.

---

#### Task 1.1.B: Create the update-note mutation hook

**Description:**
Create `useUpdateNote` for authenticated Supabase note updates. The hook updates only the current user's row, uses `expectedUpdatedAt` for conflict detection, preserves attachments in cache, maintains list order, and never writes classification fields.

**Requirement:** FEATURE_SPEC Acceptance Criteria 5, 6, 9, 10, 11; FEATURE_TECHNICAL_SPEC "Mutation Hook Design"

**Acceptance Criteria:**
- [x] (TEST) Successful saves update `content` and/or `category` in the existing cached row without moving the note.
  - Verify: `cd apps/mobile && npm test -- test/smoke/use-update-note.test.ts`
- [x] (TEST) Conflict, not-found, unauthenticated, and Supabase failure paths throw typed error codes and leave the notes cache unchanged.
  - Verify: `cd apps/mobile && npm test -- test/smoke/use-update-note.test.ts`
- [x] (TEST) The mutation payload never includes `classification_status`, `classification_confidence`, or a `classify-note` invocation.
  - Verify: `cd apps/mobile && npm test -- test/smoke/use-update-note.test.ts`
- [x] (CODE) The Supabase update filters by `id`, `user_id`, and `updated_at` and selects attachments in the returned row.
  - Verify: `rg "\\.eq\\(\"id\"|\\.eq\\(\"user_id\"|\\.eq\\(\"updated_at\"|attachments" apps/mobile/hooks/useUpdateNote.ts`
- [x] (TYPE) The new hook compiles with existing mobile types.
  - Verify: `cd apps/mobile && npm run typecheck`

**Files to Create:**
- `apps/mobile/hooks/useUpdateNote.ts` - update mutation hook and typed errors.
- `apps/mobile/test/smoke/use-update-note.test.ts` - hook tests with mocked Supabase and React Query cache.

**Files to Modify:**
- None

**Existing Code to Reference:**
- `apps/mobile/hooks/useCreateNote.ts` - mutation and cache update patterns.
- `apps/mobile/hooks/useUploadVoiceNote.ts` - attachment-aware cache updates.
- `packages/shared/src/notes.ts` - attachment merge behavior to review before reuse.

**Dependencies:**
- Task 1.1.A for validation and selector conventions.

**Spec Reference:** "Mutation Hook Design"; "Classification Behavior"; "Data Model"

**Browser Verification:**
- Criteria IDs: None
- Notes: Data behavior is covered by hook tests and the later Supabase-backed mobile flow.

---

### Step 1.2: Realtime Coordination

**Depends On:** Step 1.1

---

#### Task 1.2.A: Add active-edit realtime callbacks

**Description:**
Extend `useRealtimeNotes` so active edit rows can opt out of immediate cache overwrite/removal. Read-mode notes should keep the current realtime behavior, while updates/deletes for the active note become explicit conflict or deleted states.

**Requirement:** FEATURE_SPEC Acceptance Criteria 9, 13; FEATURE_TECHNICAL_SPEC "Realtime Coordination"

**Acceptance Criteria:**
- [x] (TEST) UPDATE events for read-mode notes still update the `["notes"]` cache.
  - Verify: `cd apps/mobile && npm test -- test/smoke/realtime-notes.test.ts`
- [x] (TEST) UPDATE events where `onRemoteUpdate` returns true skip cache replacement and invoke the active-edit callback path.
  - Verify: `cd apps/mobile && npm test -- test/smoke/realtime-notes.test.ts`
- [x] (TEST) DELETE events where `onRemoteDelete` returns true skip immediate cache removal and invoke the active-edit callback path.
  - Verify: `cd apps/mobile && npm test -- test/smoke/realtime-notes.test.ts`
- [x] (CODE) `useRealtimeNotes` accepts an optional callbacks object with `onRemoteUpdate` and `onRemoteDelete`.
  - Verify: `rg "onRemoteUpdate|onRemoteDelete|RealtimeNoteCallbacks" apps/mobile/hooks/useRealtimeNotes.ts`
- [x] (TYPE) Existing `useRealtimeNotes(userId)` callers remain valid.
  - Verify: `cd apps/mobile && npm run typecheck`

**Files to Create:**
- `apps/mobile/test/smoke/realtime-notes.test.ts` - realtime cache coordination tests.

**Files to Modify:**
- `apps/mobile/hooks/useRealtimeNotes.ts` - optional callbacks and active-edit cache skip behavior.

**Existing Code to Reference:**
- `apps/mobile/hooks/useRealtimeNotes.ts` - current insert/update/delete subscription behavior.
- `apps/mobile/test/setup.ts` - test environment patterns.

**Dependencies:**
- Task 1.1.B for note update error semantics.

**Spec Reference:** "Realtime Coordination"; "Realtime compatibility"

**Browser Verification:**
- Criteria IDs: None
- Notes: Realtime UI states are covered in Phase 2 and Phase 3 tests.

---

### Phase 1 Checkpoint

**Automated Checks:**
- [x] Mobile edit foundation tests pass.
  - Verify: `cd apps/mobile && npm test -- test/smoke/note-edit-validation.test.ts test/smoke/use-update-note.test.ts test/smoke/realtime-notes.test.ts`
- [x] Mobile type checking passes.
  - Verify: `cd apps/mobile && npm run typecheck`
- [x] Existing Notes screen smoke test still passes.
  - Verify: `cd apps/mobile && npm test -- test/smoke/notes-screen.test.tsx`

**Regression Verification:**
- [x] Existing note creation still references `classify-note` only in create/transcription paths, not in update-note code.
  - Verify: `rg "classify-note" apps/mobile/hooks apps/mobile/app apps/mobile/components`
- [x] No database migration was added for editable notes.
  - Verify: `git diff --name-only -- supabase/migrations | wc -l | tr -d ' '`

---

## Phase 2: Inline Mobile Editing UI

**Goal:** Add the inline card editing experience while preserving source indicators, filtering, ordering, accessibility, and stable draft behavior.
**Depends On:** Phase 1

### Pre-Phase Setup

Human must complete before starting:
- [ ] Confirm Warm Ink tokens remain the mobile UI source of truth.
  - Verify: `test -f apps/mobile/lib/theme.ts && rg "colors|radii|shadows" apps/mobile/lib/theme.ts`
- [ ] Confirm Ionicons is available for mobile icon buttons.
  - Verify: `rg "@expo/vector-icons" apps/mobile`

### Step 2.1: Screen and List Coordination

**Depends On:** Phase 1

---

#### Task 2.1.A: Wire active edit state through Notes screen and list

**Description:**
Add `ActiveEditState` near the Notes screen/list layer and pass editing props through `NotesList`. While a draft is active, disable other edit affordances, disable category filter changes, omit pull-to-refresh, clear drafts on tab focus loss or sign-out, and route realtime update/delete events into conflict state.

**Requirement:** FEATURE_SPEC Acceptance Criteria 1, 7, 12, 13; FEATURE_TECHNICAL_SPEC "Notes Screen/List State"

**Acceptance Criteria:**
- [x] (TEST) Starting one edit disables edit controls on other notes and prevents starting a second editor.
  - Verify: `cd apps/mobile && npm test -- test/smoke/notes-list-edit.test.tsx`
- [x] (TEST) Category filters and pull-to-refresh are disabled or omitted while a draft is active, then restored after save or cancel.
  - Verify: `cd apps/mobile && npm test -- test/smoke/notes-list-edit.test.tsx`
- [x] (TEST) Notes tab focus loss and sign-out clear active draft state without saving changes.
  - Verify: `cd apps/mobile && npm test -- test/smoke/notes-screen-edit-state.test.tsx`
- [x] (TEST) Realtime update/delete callbacks for the active note set `remoteState` to `updated` or `deleted` and keep the draft visible.
  - Verify: `cd apps/mobile && npm test -- test/smoke/notes-screen-edit-state.test.tsx`
- [x] (TEST) Cancel after a remote update refetches the server row, and Cancel after a remote delete refetches or removes the deleted card from cache.
  - Verify: `cd apps/mobile && npm test -- test/smoke/notes-screen-edit-state.test.tsx`
- [x] (TYPE) Notes screen/list/card prop wiring compiles.
  - Verify: `cd apps/mobile && npm run typecheck`

**Files to Create:**
- `apps/mobile/test/smoke/notes-list-edit.test.tsx` - list-level edit coordination tests.
- `apps/mobile/test/smoke/notes-screen-edit-state.test.tsx` - screen state, focus, sign-out, and realtime callback tests.

**Files to Modify:**
- `apps/mobile/app/(app)/notes.tsx` - active edit state, focus cleanup, sign-out cleanup, realtime callbacks.
- `apps/mobile/components/NotesList.tsx` - edit props, refresh lockout, filter lockout.
- `apps/mobile/components/MobileCategoryFilter.tsx` - disabled category filter support if needed.

**Existing Code to Reference:**
- `apps/mobile/app/(app)/notes.tsx` - current selected category and realtime wiring.
- `apps/mobile/components/NotesList.tsx` - current FlatList and RefreshControl setup.
- `apps/mobile/components/MobileCategoryFilter.tsx` - existing category pill behavior.

**Dependencies:**
- Task 1.2.A for realtime callbacks.

**Spec Reference:** "Editing Lockout"; "Notes Screen/List State"; "Realtime Coordination"

**Browser Verification:**
- Criteria IDs: None
- Notes: Mobile UI behavior is covered by react-test-renderer tests and Phase 4 device/emulator flow.

---

### Step 2.2: Card Edit Experience

**Depends On:** Step 2.1

---

#### Task 2.2.A: Add read/edit states to MobileNoteCard

**Description:**
Extend `MobileNoteCard` with an inline edit state using a multiline text input, existing-category picker, Save, and Cancel. Keep the read-mode layout compatible with current cards and use Warm Ink tokens plus Ionicons for controls.

**Requirement:** FEATURE_SPEC Acceptance Criteria 1, 2, 3, 4, 5, 6, 7; FEATURE_TECHNICAL_SPEC "UI Component Design"

**Acceptance Criteria:**
- [x] (TEST) Tapping Edit renders a multiline body input, category options from `CATEGORIES`, Save, and Cancel in the same card.
  - Verify: `cd apps/mobile && npm test -- test/smoke/mobile-note-card-edit.test.tsx`
- [x] (TEST) Saving changed body/category calls `onSaveEdit` with `id`, changed fields, and `expectedUpdatedAt`, then returns to read mode on success.
  - Verify: `cd apps/mobile && npm test -- test/smoke/mobile-note-card-edit.test.tsx`
- [x] (TEST) Cancel discards draft body/category changes and returns to the original read-mode content.
  - Verify: `cd apps/mobile && npm test -- test/smoke/mobile-note-card-edit.test.tsx`
- [x] (TEST) Voice and file source indicators plus attachment counts remain visible in read mode after edit saves.
  - Verify: `cd apps/mobile && npm test -- test/smoke/mobile-note-card-edit.test.tsx`
- [x] (CODE) Edit controls use centralized test IDs and import colors/radii/shadows from `apps/mobile/lib/theme.ts`.
  - Verify: `rg "testIds\\.notes\\.(editButton|editInput|saveButton|cancelButton|categoryOption)|from '../lib/theme'|from \"../lib/theme\"" apps/mobile/components/MobileNoteCard.tsx`

**Files to Create:**
- `apps/mobile/test/smoke/mobile-note-card-edit.test.tsx` - card edit interaction tests.

**Files to Modify:**
- `apps/mobile/components/MobileNoteCard.tsx` - read/edit state rendering and controls.

**Existing Code to Reference:**
- `apps/mobile/components/MobileNoteCard.tsx` - existing source label, attachment count, timestamp, and category display.
- `apps/mobile/components/MobileCategoryFilter.tsx` - existing category tint and label formatting.
- `apps/mobile/lib/theme.ts` - Warm Ink tokens.

**Dependencies:**
- Task 2.1.A for parent callbacks and active edit props.

**Spec Reference:** "Core User Experience"; "Editable Content"; "Category Editing"; "UX Approach Decision"

**Browser Verification:**
- Criteria IDs: None
- Notes: Device/emulator screenshots are captured by the Phase 4 flow harness.

---

#### Task 2.2.B: Add validation, conflict, deleted, pending, and accessibility states

**Description:**
Complete the edge-state behavior inside the inline editor. Pending notes should show a disabled, non-clickable edit affordance; null/empty content notes support category-only saves; failed notes with saved text are editable; remote update/delete states preserve drafts and disable Save.

**Requirement:** FEATURE_SPEC Acceptance Criteria 8, 9, 12, 13, 14; FEATURE_TECHNICAL_SPEC "UI Component Design"

**Acceptance Criteria:**
- [x] (TEST) Editable notes with blank draft body show inline validation and keep Save disabled until valid.
  - Verify: `cd apps/mobile && npm test -- test/smoke/mobile-note-card-edit.test.tsx`
- [x] (TEST) Null or empty-content notes display body-unavailable state and allow category-only saves when the category changes.
  - Verify: `cd apps/mobile && npm test -- test/smoke/mobile-note-card-edit.test.tsx`
- [x] (TEST) Pending notes expose a disabled edit control with disabled accessibility state and do not enter edit mode when pressed.
  - Verify: `cd apps/mobile && npm test -- test/smoke/mobile-note-card-edit.test.tsx`
- [x] (TEST) Save failure keeps the draft visible, shows an inline error, and allows retry or cancel.
  - Verify: `cd apps/mobile && npm test -- test/smoke/mobile-note-card-edit.test.tsx`
- [x] (TEST) Remote updated/deleted states show inline messages, preserve the draft, disable Save, and require Cancel to reload or clear the card.
  - Verify: `cd apps/mobile && npm test -- test/smoke/mobile-note-card-edit.test.tsx`
- [x] (CODE) Edit, Save, Cancel, input, category option, disabled, validation, and conflict controls include accessibility labels/states.
  - Verify: `rg "accessibilityLabel|accessibilityState|accessibilityRole" apps/mobile/components/MobileNoteCard.tsx`

**Files to Create:**
- None

**Files to Modify:**
- `apps/mobile/components/MobileNoteCard.tsx` - validation/error/conflict/deleted/pending/accessibility behavior.

**Existing Code to Reference:**
- `apps/mobile/components/MobileNoteCard.tsx` - existing classification status and failed/pending display.
- `apps/mobile/lib/noteEditValidation.ts` - validation contract from Task 1.1.A.

**Dependencies:**
- Task 2.2.A for base editor rendering.

**Spec Reference:** "Editing Availability"; "Validation And Error States"; "Accessibility Requirements"

**Browser Verification:**
- Criteria IDs: None
- Notes: Accessibility selectors and snapshots are covered by tests plus Phase 4 evidence.

---

### Phase 2 Checkpoint

**Automated Checks:**
- [ ] Mobile card/list/screen edit tests pass.
  - Verify: `cd apps/mobile && npm test -- test/smoke/mobile-note-card-edit.test.tsx test/smoke/notes-list-edit.test.tsx test/smoke/notes-screen-edit-state.test.tsx`
- [ ] Mobile type checking passes.
  - Verify: `cd apps/mobile && npm run typecheck`
- [ ] Existing Notes screen smoke test still passes.
  - Verify: `cd apps/mobile && npm test -- test/smoke/notes-screen.test.tsx`

**Regression Verification:**
- [ ] Capture screen smoke test still passes after shared note card/test setup changes.
  - Verify: `cd apps/mobile && npm test -- test/smoke/capture-screen.test.tsx`
- [ ] Mobile UI changes use theme tokens rather than hardcoded Warm Ink colors in edited components.
  - Verify: `rg "#FAF8F5|#4F46E5|#1C1917|#57534E|#A8A29E" apps/mobile/components/MobileNoteCard.tsx apps/mobile/components/NotesList.tsx apps/mobile/app/\\(app\\)/notes.tsx`

---

## Phase 3: Regression Coverage

**Goal:** Lock the behavior with focused tests for save/cancel/failure/realtime/order/classification/source-label regressions before adding the end-to-end flow harness.
**Depends On:** Phase 2

### Pre-Phase Setup

Human must complete before starting:
- [ ] Confirm the mobile test runner can execute the full smoke suite.
  - Verify: `cd apps/mobile && npm test -- test/smoke`
- [ ] Confirm package scripts expose typecheck and lint commands or document the available substitute in this plan before execution.
  - Verify: `node -e "const p=require('./apps/mobile/package.json').scripts; console.log({test:p.test,typecheck:p.typecheck,lint:p.lint})"`

### Step 3.1: Behavior Regression Tests

**Depends On:** Phase 2

---

#### Task 3.1.A: Cover save, cancel, validation, category, and source-label regressions

**Description:**
Broaden component/list tests so the accepted mobile behavior is difficult to regress. These tests should exercise all note types with saved content, failed notes with saved content, null/empty-content category-only notes, and source label preservation after edits.

**Requirement:** FEATURE_SPEC Acceptance Criteria 2, 3, 4, 5, 6, 7, 8, 9

**Acceptance Criteria:**
- [ ] (TEST) Text, voice, and file notes with saved content can enter edit mode and save changed body text.
  - Verify: `cd apps/mobile && npm test -- test/smoke/mobile-note-card-edit.test.tsx`
- [ ] (TEST) Category changes update the card state and the list/category filter behavior reflects the new category.
  - Verify: `cd apps/mobile && npm test -- test/smoke/notes-list-edit.test.tsx`
- [ ] (TEST) Failed notes with saved text are editable, while pending notes remain non-editable.
  - Verify: `cd apps/mobile && npm test -- test/smoke/mobile-note-card-edit.test.tsx`
- [ ] (TEST) Voice/file source labels and file attachment count remain visible after the save path returns to read mode.
  - Verify: `cd apps/mobile && npm test -- test/smoke/mobile-note-card-edit.test.tsx`
- [ ] (TEST) Save failure and empty-body validation preserve local draft text and selected category.
  - Verify: `cd apps/mobile && npm test -- test/smoke/mobile-note-card-edit.test.tsx`

**Files to Create:**
- None

**Files to Modify:**
- `apps/mobile/test/smoke/mobile-note-card-edit.test.tsx` - additional card cases.
- `apps/mobile/test/smoke/notes-list-edit.test.tsx` - filter behavior cases.

**Existing Code to Reference:**
- `apps/mobile/components/MobileNoteCard.tsx` - note type/source rendering.
- `apps/mobile/components/NotesList.tsx` - category filtering.

**Dependencies:**
- Task 2.2.B for completed card edge-state behavior.

**Spec Reference:** "Editable Content"; "Category Editing"; "Validation And Error States"

**Browser Verification:**
- Criteria IDs: None
- Notes: Phase 4 captures device/emulator evidence for the same user-visible flow.

---

#### Task 3.1.B: Cover no-reclassification, stable ordering, and realtime regressions

**Description:**
Add tests around the highest-risk non-visual behavior: save should not classify, notes should stay sorted by `created_at`, and realtime update/delete should not silently overwrite an active draft. These tests protect the explicit product decisions that the edited text can diverge from original voice/file sources and that ordering stays in original capture position.

**Requirement:** FEATURE_SPEC Acceptance Criteria 10, 11, 12, 13; FEATURE_TECHNICAL_SPEC "Cache Updates" and "Realtime Coordination"

**Acceptance Criteria:**
- [ ] (TEST) Saving an edit does not call `invokeLocalEdgeFunction`, does not reset `classification_status`, and does not change `classification_confidence`.
  - Verify: `cd apps/mobile && npm test -- test/smoke/use-update-note.test.ts test/smoke/notes-screen-edit-state.test.tsx`
- [ ] (TEST) Updating a middle note preserves the exact cached array order before and after save.
  - Verify: `cd apps/mobile && npm test -- test/smoke/use-update-note.test.ts test/smoke/notes-list-edit.test.tsx`
- [ ] (TEST) Realtime update/delete conflict states disable Save, preserve the active draft, and require Cancel to reload or clear the card.
  - Verify: `cd apps/mobile && npm test -- test/smoke/realtime-notes.test.ts test/smoke/notes-screen-edit-state.test.tsx`
- [ ] (TEST) Sign-out and Notes tab navigation discard unsaved draft state without running a save.
  - Verify: `cd apps/mobile && npm test -- test/smoke/notes-screen-edit-state.test.tsx`
- [ ] (TYPE) All note edit test coverage compiles without loosening mobile note types.
  - Verify: `cd apps/mobile && npm run typecheck`

**Files to Create:**
- None

**Files to Modify:**
- `apps/mobile/test/smoke/use-update-note.test.ts` - no classification and ordering cases.
- `apps/mobile/test/smoke/realtime-notes.test.ts` - conflict and deleted cases.
- `apps/mobile/test/smoke/notes-screen-edit-state.test.tsx` - sign-out, focus loss, conflict UI cases.

**Existing Code to Reference:**
- `apps/mobile/hooks/useCreateNote.ts` - classification invocation path to avoid reusing in update.
- `apps/mobile/hooks/useNotes.ts` - created_at ordering.
- `apps/mobile/hooks/useRealtimeNotes.ts` - cache update/delete behavior.

**Dependencies:**
- Task 3.1.A can run in parallel after Phase 2, but both must finish before Phase 3 checkpoint.

**Spec Reference:** "Classification Behavior"; "Existing Functionality To Preserve"; "Realtime Compatibility"

**Browser Verification:**
- Criteria IDs: None
- Notes: Device/emulator evidence is handled in Phase 4.

---

### Phase 3 Checkpoint

**Automated Checks:**
- [ ] Full mobile smoke suite passes.
  - Verify: `cd apps/mobile && npm test -- test/smoke`
- [ ] Mobile type checking passes.
  - Verify: `cd apps/mobile && npm run typecheck`
- [ ] Root test command still passes if configured.
  - Verify: `npm test -- --runInBand || npm test`

**Regression Verification:**
- [ ] Editable notes did not add a route or database migration.
  - Verify: `git diff --name-only | rg "apps/mobile/app/.*/edit|supabase/migrations" || true`
- [ ] Editable notes did not add new categories.
  - Verify: `git diff -- packages/shared/src/constants.ts apps/mobile | rg "ideas|projects|family|friends|health|admin|uncategorized"`

---

## Phase 4: Flow Verification Harness

**Goal:** Convert the applicable flow verification plan into repeatable setup, driver, assertions, evidence capture, and teardown artifacts, then run the full verification set.
**Depends On:** Phase 3

### Pre-Phase Setup

Human must complete before starting:
- [ ] Confirm local Supabase environment variables are current before running seeded flow tests.
  - Verify: `npx supabase status -o env >/tmp/notesbrain-supabase-env.txt && test -s /tmp/notesbrain-supabase-env.txt`
- [ ] Confirm the mobile MCP dev command exists.
  - Verify: `node -e "const s=require('./package.json').scripts; if(!s['dev:mobile:mcp']) process.exit(1)"`
- [ ] For Android local runs, confirm adb reverse can be applied when a device is connected.
  - Verify: `adb devices | sed -n '2p' >/dev/null && adb reverse tcp:65421 tcp:65421 || true`

### Step 4.1: Seed and Driver Artifacts

**Depends On:** Phase 3

---

#### Task 4.1.A: Add deterministic seed and cleanup support for the editable-notes flow

**Description:**
Create a small local Supabase seed/cleanup script for the flow plan's test user and note set. The script should create completed text, voice, file-with-attachment, pending, and null/empty-content notes with deterministic prefixes and distinct `created_at` values so ordering and teardown are repeatable.

**Requirement:** FLOW_VERIFICATION_PLAN "Setup/State" and "Teardown/Rerun"

**Acceptance Criteria:**
- [ ] (CODE) A seed script exists and documents required environment variables or derives them from local Supabase status.
  - Verify: `test -f scripts/e2e/seed-editable-notes-flow.mjs && rg "SUPABASE|seed|cleanup|editable-notes" scripts/e2e/seed-editable-notes-flow.mjs`
- [ ] (CODE) The seed data includes completed text, completed voice, completed file with attachment, pending, and null/empty-content category-only notes.
  - Verify: `rg "text|voice|file|pending|null|empty|attachment" scripts/e2e/seed-editable-notes-flow.mjs`
- [ ] (CODE) The script supports cleanup by deterministic content prefix or deterministic test user scope.
  - Verify: `rg "cleanup|delete|prefix|test user|testUser" scripts/e2e/seed-editable-notes-flow.mjs`
- [ ] (TEST) The script can run a dry-run or help mode without mutating the database.
  - Verify: `node scripts/e2e/seed-editable-notes-flow.mjs --help`
- [ ] (CODE) The seeded notes use distinct `created_at` values for stable ordering assertions.
  - Verify: `rg "created_at|createdAt" scripts/e2e/seed-editable-notes-flow.mjs`

**Files to Create:**
- `scripts/e2e/seed-editable-notes-flow.mjs` - deterministic seed/cleanup script.

**Files to Modify:**
- None

**Existing Code to Reference:**
- `supabase/migrations/00001_initial_schema.sql` - notes and attachments columns.
- `apps/mobile/hooks/useNotes.ts` - ordering expectations.

**Dependencies:**
- Phase 3 tests must pass before adding end-to-end seed artifacts.

**Spec Reference:** "Flow Verification Plan: Setup/State"; "Teardown/Rerun"

**Browser Verification:**
- Criteria IDs: None
- Notes: Mobile driver instructions are created in Task 4.1.B.

---

#### Task 4.1.B: Add mobile flow driver and evidence runbook

**Description:**
Create an agent-runnable flow document that maps the seeded data to mobile automation steps, selectors, assertions, evidence paths, and teardown commands. It should include Android adb reverse guidance, mobile MCP startup, screenshot/accessibility tree evidence, Supabase row assertions, and rerun behavior.

**Requirement:** FLOW_VERIFICATION_PLAN "Driver", "Assertions", "Evidence", and "Teardown/Rerun"

**Acceptance Criteria:**
- [ ] (CODE) The mobile flow runbook includes setup, seed, sign-in, Notes tab navigation, edit, save, cancel, validation, category-only save, pending-note, and teardown steps.
  - Verify: `test -f tests/e2e/mobile/editable-notes-flow.md && rg "setup|seed|sign in|Notes|Edit|Save|Cancel|validation|category-only|pending|teardown" tests/e2e/mobile/editable-notes-flow.md`
- [ ] (CODE) The runbook references the centralized edit test IDs and category option selectors.
  - Verify: `rg "editButton|editInput|categoryOption|saveButton|cancelButton|editError|editConflict" tests/e2e/mobile/editable-notes-flow.md`
- [ ] (CODE) The runbook includes evidence capture targets for edit mode, disabled controls, saved read mode, empty validation, and Supabase row output.
  - Verify: `rg "screenshot|accessibility|disabled|saved read|empty|Supabase|classification_status|classification_confidence" tests/e2e/mobile/editable-notes-flow.md`
- [ ] (CODE) The runbook includes Android local-backend setup through `adb reverse tcp:65421 tcp:65421`.
  - Verify: `rg "adb reverse tcp:65421 tcp:65421" tests/e2e/mobile/editable-notes-flow.md`
- [ ] (CODE) The runbook states reruns are idempotent after cleanup and points to `artifacts/` or `test-results/` for failed-run evidence.
  - Verify: `rg "idempotent|cleanup|artifacts|test-results" tests/e2e/mobile/editable-notes-flow.md`

**Files to Create:**
- `tests/e2e/mobile/editable-notes-flow.md` - mobile flow verification runbook.

**Files to Modify:**
- None

**Existing Code to Reference:**
- `apps/mobile/lib/testIds.ts` - selector names.
- `features/editable-notes/FLOW_VERIFICATION_PLAN.md` - flow claim, assertions, evidence, and teardown requirements.
- `AGENTS.md` - mobile emulation workflow.

**Dependencies:**
- Task 4.1.A for seed/cleanup command names.

**Spec Reference:** "Flow Verification Plan"

**Browser Verification:**
- Criteria IDs: None
- Notes: This is a mobile automation runbook, not a web browser route.

---

### Step 4.2: Final Verification

**Depends On:** Step 4.1

---

#### Task 4.2.A: Run complete editable-notes verification and record evidence

**Description:**
Run the full automated verification set and, when an emulator or device is available, execute the mobile flow runbook against seeded local data. Record command output and evidence paths so the feature can be rerun or debugged by another agent.

**Requirement:** FLOW_VERIFICATION_PLAN "Assertions" and "Evidence"; FEATURE_SPEC all acceptance criteria

**Acceptance Criteria:**
- [ ] (TEST) Full mobile smoke suite passes with editable-notes tests included.
  - Verify: `cd apps/mobile && npm test -- test/smoke`
- [ ] (TYPE) Mobile type checking passes.
  - Verify: `cd apps/mobile && npm run typecheck`
- [ ] (LINT) Mobile lint passes when the script is available, or the package script absence is documented in the evidence file.
  - Verify: `node -e "const s=require('./apps/mobile/package.json').scripts; process.exit(s.lint?0:2)" && cd apps/mobile && npm run lint || test -f features/editable-notes/FLOW_VERIFICATION_EVIDENCE.md`
- [ ] (CODE) Flow evidence file records test output, seed command, device/emulator availability, screenshots or accessibility snapshots, Supabase assertion output, and teardown result.
  - Verify: `test -f features/editable-notes/FLOW_VERIFICATION_EVIDENCE.md && rg "npm test|seed|device|emulator|screenshot|accessibility|Supabase|teardown" features/editable-notes/FLOW_VERIFICATION_EVIDENCE.md`
- [ ] (CODE) Evidence explicitly confirms no classification rerun, stable `created_at` ordering, and original source indicators after save.
  - Verify: `rg "classification|created_at|source|voice|file" features/editable-notes/FLOW_VERIFICATION_EVIDENCE.md`

**Files to Create:**
- `features/editable-notes/FLOW_VERIFICATION_EVIDENCE.md` - final run evidence and any unavailable-device notes.

**Files to Modify:**
- `features/editable-notes/EXECUTION_PLAN.md` - mark completed task checkboxes after verification.

**Existing Code to Reference:**
- `tests/e2e/mobile/editable-notes-flow.md` - mobile flow driver.
- `scripts/e2e/seed-editable-notes-flow.mjs` - seed and cleanup.
- `AGENTS.md` - mobile emulation and smoke test expectations.

**Dependencies:**
- Task 4.1.A and Task 4.1.B.

**Spec Reference:** "Acceptance Criteria"; "Flow Verification Plan"

**Browser Verification:**
- Criteria IDs: None
- Notes: The final user flow is verified through mobile automation and Supabase assertions.

---

### Phase 4 Checkpoint

**Automated Checks:**
- [ ] Full mobile smoke suite passes.
  - Verify: `cd apps/mobile && npm test -- test/smoke`
- [ ] Mobile type checking passes.
  - Verify: `cd apps/mobile && npm run typecheck`
- [ ] Flow verification artifacts exist and reference setup, driver, assertions, evidence, and teardown.
  - Verify: `rg "setup|driver|assertions|evidence|teardown" tests/e2e/mobile/editable-notes-flow.md features/editable-notes/FLOW_VERIFICATION_EVIDENCE.md`

**Regression Verification:**
- [ ] Existing capture and Notes screen smoke tests pass after the final flow harness changes.
  - Verify: `cd apps/mobile && npm test -- test/smoke/capture-screen.test.tsx test/smoke/notes-screen.test.tsx`
- [ ] The working tree has no unintended schema, category, route, or attachment-metadata changes for editable notes.
  - Verify: `git diff --name-only | rg "supabase/migrations|packages/shared/src/constants.ts|attachment|apps/mobile/app/.*/edit" || true`

---

## Rollback Plan

- No database migration is planned, so rollback is a mobile/client code revert.
- The update mutation is isolated in `apps/mobile/hooks/useUpdateNote.ts`; reverting the Notes screen/list/card wiring removes the feature without changing saved data shape.
- Flow seed artifacts use deterministic prefixes and cleanup, so test data can be removed without touching user data.
