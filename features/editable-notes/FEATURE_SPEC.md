# Feature Spec: Editable Notes

**Feature:** Editable Notes
**Date:** 2026-05-08
**Status:** Draft
**Upstream:** [DISCOVERY_NOTES.md](./DISCOVERY_NOTES.md), [NOTES.md](./NOTES.md)

---

## Problem Statement

Users can capture notes, but they cannot correct or refine them from the Notes tab. That makes the captured note feel final even when the content is imperfect, especially after voice transcription or file extraction.

Editable Notes gives users ownership over captured content after the fact. From the Notes tab, a user can edit a note's body and category in place, then either save the draft or cancel it before returning to read mode.

## Users

Existing Notes Brain mobile users. No new user type.

## Core User Experience

### Editing a Note

1. User opens the **Notes** tab.
2. Each note card shows an edit affordance when editing is allowed for that card.
3. User taps **Edit** on a note card.
4. The selected card expands into an inline edit state without navigating away from the Notes tab.
5. The edit state includes:
   - A plain text editor for the note body.
   - A category picker limited to existing categories.
   - **Save** and **Cancel** actions.
6. User edits the note body, category, or both.
7. User taps **Save**.
8. The card returns to read mode and shows the updated note body/category.
9. The note remains in its original capture position in the Notes tab.

### Canceling an Edit

1. User opens a note card's inline edit state.
2. User changes the body and/or category.
3. User taps **Cancel**.
4. The local draft is discarded.
5. The card returns to read mode with the previously saved content and category.

### Editing Lockout

Only one note can be edited at a time. While one note is in edit mode, edit affordances on other notes are visibly disabled and not clickable.

If the user wants to edit another note, they must first save or cancel the current edit. This avoids silent draft loss and keeps the MVP behavior predictable.

If the user leaves the Notes tab, signs out, or the Notes screen unmounts while a draft is active, the draft is discarded unless it has already been saved. Pull-to-refresh is disabled while a draft is active so the list cannot be manually refreshed out from under the editor.

## Editable Content

All note types are editable:

| Note type | Editable body | Source label |
|-----------|---------------|--------------|
| Text | The saved `content` text | Text note |
| Voice | The saved transcript text in `content` | Voice note |
| File | The saved note body in `content`, which may currently begin as the filename | File attachment |

Voice-note text may diverge from the original transcript after editing. This is acceptable because the app is not treating stored audio as the canonical note source. The source metadata and icon should remain intact so the user can still see that the note began as voice or file input.

For file notes, editing `content` changes the note body shown in the card. It does not rename the attachment, change the attachment record, replace the file, or edit file metadata. If the existing `content` is only the filename, that filename is treated as the initial note body.

Notes without editable text content may still expose category editing if the implementation presents the body area as unavailable for that note. In that state, Save is allowed only when the category changed, and the note body remains null or empty. The first implementation should not invent attachment replacement, audio playback, or file metadata editing.

## Editing Availability

Editing is allowed when:

- The note has a stable saved row in Supabase.
- The note is not currently saving an edit.
- No other note card is currently being edited.
- The note is not in `classification_status = "pending"`.

Pending notes are not editable because their content/category may still be changing through transcription or classification. Failed notes can be edited when they have saved text content. Notes with null or empty content can expose category-only editing, but a body edit cannot be saved until the body is non-empty after trimming.

## Category Editing

Category editing is part of the same inline edit flow.

The picker is limited to the current note categories:

- `ideas`
- `projects`
- `family`
- `friends`
- `health`
- `admin`
- `uncategorized`

Creating new categories is out of scope for this feature.

## Classification Behavior

Saving an edited note must not rerun automatic classification.

The saved category is whatever the user selected in the edit flow. If the user edits only the body and leaves category unchanged, the previous category remains. The spec does not require an "edited" marker or visible last-edited timestamp.

The implementation may update internal note metadata such as `updated_at`, but the Notes tab must continue ordering notes by original `created_at`, newest first.

## UX Approach Decision

| Criterion | Inline card edit | Separate edit screen |
|-----------|------------------|----------------------|
| User value delivered | High: edit where the note was found | Medium: edit is available but requires navigation |
| Integration complexity | Medium: card/list state and keyboard handling | Medium: route/form plumbing |
| Risk to existing flows | Low if only one card can edit at a time | Low, but adds a new navigation path |
| Consistency with Notes tab | Strong: keeps the user in the list | Moderate: breaks the quick correction flow |
| Implementation effort | Small-to-medium | Medium |

**Recommendation:** Inline card edit.
**Confidence:** High.
**Rationale:** The feature is primarily a quick correction workflow. Keeping the interaction inside the Notes tab avoids a heavier note-detail experience and matches the user's stated preference.

## Integration Points

### Existing Data

The feature uses the existing `notes` table:

| Column | Behavior |
|--------|----------|
| `content` | Updated when the user saves body changes |
| `category` | Updated when the user saves category changes |
| `type` | Preserved; continues to drive source icon/label |
| `created_at` | Preserved; continues to drive list ordering |
| `updated_at` | May update through the existing database trigger |
| `classification_status` | Must not be reset to `pending` by this feature |
| `classification_confidence` | Must not be recomputed by this feature |

### Existing Components

| Component | Expected change |
|-----------|-----------------|
| `apps/mobile/app/(app)/notes.tsx` | Own or coordinate the currently edited note ID if list-level state is needed |
| `apps/mobile/components/NotesList.tsx` | Pass edit state and callbacks into note cards; keep filtering and refresh behavior intact |
| `apps/mobile/components/MobileNoteCard.tsx` | Add read/edit states, body input, category picker, Save/Cancel actions, disabled edit affordance |
| `apps/mobile/hooks/useNotes.ts` | Preserve `created_at` ordering |
| New or existing mutation hook | Save note body/category changes through Supabase |
| `apps/mobile/lib/testIds.ts` | Add stable selectors for edit, save, cancel, body input, category picker, and disabled edit state |

### Existing Functionality To Preserve

- Notes still load in reverse `created_at` order.
- Category filtering still works after edits.
- Pull-to-refresh still works when no draft is active; it is disabled while a note is being edited.
- Realtime updates still update the list.
- Pending/failed classification display still works.
- Voice/file icons and attachment counts remain visible in read mode.
- Capture flow is unchanged.
- Summary/lens execution is not manually triggered by editing a note.

## Scope Boundaries

### In Scope

- Mobile Notes tab only.
- Inline editing from note cards.
- Editing note body for all note types that have saved text content.
- Editing category using existing categories only.
- Save and cancel behavior.
- Preventing empty note body saves.
- Handling save failure without losing the local draft.
- Disabling other cards' edit affordances while one card is being edited.
- Tests for successful save, cancel, validation, failure, category change, no reclassification, and ordering.

### Out of Scope

| Item | Reason |
|------|--------|
| Creating new categories | Category management has not been designed yet |
| Full edit history | Not needed for the first correction workflow |
| Rich text or Markdown editing | Plain text is enough for captured notes |
| Attachment replacement | File lifecycle is separate from text correction |
| Audio playback or original transcript comparison | Voice audio is not the canonical saved source |
| Collaborative editing | Single-user mobile workflow |
| Web editing UI | Mobile Notes tab is the target surface |
| Automatic reclassification after edit | User explicitly chose stable category behavior |
| Visible edited marker | Avoid clutter in the MVP |

## Validation And Error States

- Body saves are blocked when the trimmed body text is empty.
- Category-only saves are allowed for notes that already have null or empty body content.
- Empty-body validation appears inline inside the editing card.
- Save failure shows a visible error and keeps the user's draft in the editor.
- Cancel must not persist body or category changes.
- Other note cards must communicate disabled edit state visually and through accessibility semantics while one edit is active.
- If the note is updated remotely while the user is editing it, the active draft stays visible, a conflict message appears inside the card, and Save is disabled. The user can cancel to reload the latest server version.
- If the note is deleted remotely while the user is editing it, the active draft stays visible, a deletion message appears inside the card, and Save is disabled. The user can cancel to leave edit mode and remove the card from the list.

## Accessibility Requirements

- Edit, Save, Cancel, body input, and category picker controls must have accessible labels.
- Disabled edit affordances must be exposed as disabled to assistive technology.
- Validation and save errors must be announced or otherwise reachable by screen readers.
- Touch targets for Edit, Save, Cancel, and category options must be at least 44 by 44 points.
- UI must follow the existing Warm Ink design tokens from `apps/mobile/lib/theme.ts`.

## Acceptance Criteria

1. **Open edit state:** From the Notes tab, the user can tap Edit on a note card and the card expands into an inline edit state.
2. **Edit all note types:** Text notes, voice-note transcripts, and file-note body text can be edited when the note has saved text content and is not pending.
3. **Preserve source label:** After saving an edited voice or file note, the card still shows the original source type indicator.
4. **Edit category:** In the same edit state, the user can select one of the existing categories.
5. **Save body change:** Saving a changed body updates the existing note row and shows the new text in the list.
6. **Save category change:** Saving a changed category updates the note's category and the category filter behavior reflects the change.
7. **Cancel:** Cancel discards draft body/category changes and returns the card to read mode.
8. **No empty body save:** Saving trimmed empty body text is blocked with an inline validation message, except for category-only saves on notes that already have null or empty body content.
9. **Save failure:** If the save fails, the card remains in edit mode, shows an error, and preserves the user's draft.
10. **No automatic reclassification:** Saving an edit does not reset classification to `pending`, does not invoke classification, and does not recompute classification confidence.
11. **Stable ordering:** Saving an edit does not move the note in the Notes tab; ordering remains based on `created_at` descending.
12. **Single active editor:** While one card is being edited, other cards' edit affordances are disabled and not clickable.
13. **Realtime compatibility:** Realtime note updates refresh read-mode cards. If the active edit card receives a remote update or delete, the draft remains visible, Save is disabled, and the user must cancel to reload or clear the card.
14. **Accessible controls:** Edit controls, disabled states, validation, and errors are accessible to screen readers.

## Non-Functional Requirements

- **Performance:** Entering edit mode must be local UI state with no network request. After the user taps Save, the next rendered state of the card must show a pending/saving indicator. The implementation should update the edited card without a full notes-list refetch unless a full refetch is required to recover from an error or reconcile realtime data.
- **Reliability:** Failed saves preserve local draft data until the user retries or cancels.
- **Security:** Users can only update their own notes through existing Supabase RLS policies.
- **Compatibility:** The feature should not require a database schema change unless the technical spec identifies a hard requirement.
- **Design:** Mobile UI must use Warm Ink tokens from `apps/mobile/lib/theme.ts`; no hardcoded colors, radii, or shadows.

## Future Enhancements

- Create new categories during note editing.
- Add an optional visible edited timestamp or edited marker.
- Add full edit history.
- Add a focused detail/edit screen if long-note editing becomes awkward inline.
- Add rich text or Markdown editing.
- Add file attachment replacement or metadata editing.
