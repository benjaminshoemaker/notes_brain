# Editable Notes

## Starting Point

Users should be able to edit notes directly from the Notes tab.

This is large enough for the project feature flow because it touches the core note lifecycle, not just a single screen polish item.

## Current Feedback

- Notes should be editable from the Notes tab.

## Product Questions

- Which note types are editable?
  - Text notes are clearly editable.
  - Voice-note transcripts probably should be editable, but the UI should preserve that the original source was voice.
  - File notes may need different rules depending on whether the user is editing extracted text, metadata, or category only.
- After a note edit, should classification rerun automatically?
- Should editing update `updated_at` only, or also preserve an edit history?
- Should category be editable in the same flow, or stay as a separate interaction?
- Should edits be inline inside the Notes tab or in a separate note detail/edit screen?

## Initial Scope Candidate

- Add an edit affordance on note cards.
- Open a focused edit view or inline editor for note content.
- Save/cancel clearly.
- Update the existing note row instead of creating a replacement note.
- Re-run classification only if content changed and the note is text-like.

## Out Of Scope For First Pass

- Full edit history.
- Collaborative editing.
- Rich text.
- Attachment replacement.

## Acceptance Criteria Draft

- User can edit a text note from the Notes tab.
- User can cancel without changing the note.
- User can save and see the updated note in the list.
- Failed saves show an error and do not lose the local draft.
- The behavior for classification after edit is explicit and tested.
