# Discovery Notes

Generated: 2026-05-08
Source: /discover conversation + `features/editable-notes/NOTES.md`

## Idea Summary

Users should be able to fix and refine notes directly from the Notes tab. This is not just polish: it touches the core note lifecycle because captured text is not always final, especially when notes originate from voice transcription or file extraction.

The first version should make note editing feel lightweight and local to the list. A user finds the note, expands it into an inline edit state, changes the note body and existing category, then saves or cancels without being moved elsewhere in the app.

## Key Decisions

- **Problem:** Notes are currently captured but not directly editable from the Notes tab.
- **Audience:** Current Notes Brain users on the mobile app.
- **Platform:** Mobile app, primarily the Notes tab.
- **Stack preferences:** Existing Expo/React Native app, Supabase backend, and Warm Ink mobile design system.
- **MVP scope:** Edit all note types from the Notes tab, including text notes, voice-note transcripts, and file-derived note text where available.
- **Editing model:** Inline editing on the note card, ideally as an expanded inline state with clear Save and Cancel actions.
- **Classification:** Do not rerun classification automatically after a content edit.
- **Category:** Category is editable in the same flow, but only by selecting from existing categories/lenses.
- **Ordering:** Saving an edited note should not move it to the top of the Notes tab; it stays in its original capture position.
- **Source metadata:** Preserve the original source label such as `Voice note`, even if the editable text diverges from the original transcript. The app is not treating stored audio as the canonical note source.
- **Exciting part:** Making captured notes feel user-owned after the fact without adding a heavy detail-screen workflow.

## Open Questions

- Should the backend update `updated_at` for edited notes even though the Notes tab ordering stays pinned to original capture time?
- Are file notes always text-like enough to edit, or do some file notes need text-only edit affordances while attachment metadata remains separate?
- Should the UI show an "edited" marker or last-edited timestamp?
- What should happen if the user starts editing one card and taps Edit on another card?
- Should category editing use lenses, raw category labels, or whatever current classification taxonomy the app already exposes in the Notes tab?

## Existing Solutions & Tools

### Use Directly

None found that solve the full problem. Mature note apps already support editing, but this feature needs to live inside the existing Notes Brain capture/classification flow.

### Leverage

- **React Native / Expo text input primitives**: The current MVP is plain text editing, so built-in mobile text input controls should be enough unless implementation discovers keyboard or long-text limitations.
- **Expo rich-text guidance**: Expo documents richer editor approaches using DOM components or third-party editor libraries, but rich text is explicitly out of scope for this first pass. Reference: https://docs.expo.dev/guides/editing-richtext/

### Take Inspiration From

- **Joplin**: Open-source note app with Markdown/rich-text editing and tag-style organization. Useful mainly as a mature reference point for separating note content from organization metadata. https://joplinapp.org/
- **Notesnook**: Open-source, privacy-focused note app with React/React Native codebase. Useful as a broad mobile note-taking reference, not a replacement for this feature. https://github.com/streetwriters/notesnook
- **Small Expo notes apps**: Projects like Beyojar show lightweight Expo note editing flows, but they are closer to generic CRUD examples than direct product guidance. https://github.com/kaje94/beyojar

## Raw Context

- The starting note says: "Users should be able to edit notes directly from the Notes tab."
- All note types should be editable, including voice-note transcripts.
- The user was comfortable with edited voice-note text diverging from the original voice capture because the app is not saving the voice as the canonical source.
- The user prefers inline editing because it seems easier and lower-friction than a separate edit screen.
- New category creation is out of scope for now because category management has not been designed yet.
