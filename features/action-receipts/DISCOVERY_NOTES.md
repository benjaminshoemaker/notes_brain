# Discovery Notes

Generated: 2026-05-10
Source: targeted `/discover action-receipts` pass from `features/action-receipts`

## Idea Summary

Action Receipts turn useful lens output into a small set of source-backed actions the user can accept, complete, snooze, or dismiss from the Summary/Lenses result flow. The goal is not to build a full task manager. The goal is to close the gap between "NotesBrain noticed something important" and "I know what I did with it."

The strongest version keeps the feature tightly attached to lens results: each action is grounded in source notes, remains user-controlled, and lives beside the insight that produced it. That preserves NotesBrain's core shape as a proactive notes intelligence app while making lens results more concrete.

## Key Decisions

- **Problem:** Lens results currently end as markdown insight, and the user still has to manually turn follow-ups into real action.
- **Audience:** Current NotesBrain users, starting with the single-user personal workflow already served by notes, voice capture, custom lenses, scheduled lens execution, lens results, and push delivery.
- **Platform:** Mobile first, inside the existing Summary/Lenses result flow. Web UI is out of scope for the first pass.
- **Stack preferences:** Use the existing Supabase, Edge Function, shared TypeScript, React Native, and React Query stack.
- **MVP scope:** Store optional structured actions created from lens results, render them inline on result cards, and support pending/done/snoozed/dismissed status changes with source-note grounding.
- **Exciting part:** Notes stop being passive memory and start handing back concrete, reviewable next moves without creating another productivity system to maintain.

## Open Questions

- Should action extraction default on globally, default off globally, or be configurable per lens?
- Should dismissed/done feedback influence future extraction prompts, or should feedback only affect local action state in the MVP?
- Should actions remain only attached to lens result cards, or should a later lightweight action inbox aggregate pending items?
- What maximum action count per result best avoids noise: 3, 5, or lens-configurable?
- Should `snoozed_until` re-surface actions only inside Summary/Lenses, or also through push notifications?
- Should action title validation require imperative phrasing, an explicit actor, a due hint, or only source grounding plus concreteness?

## Existing Solutions & Tools

### Use Directly

None found that solve the full problem. The market is crowded with AI meeting-note tools that extract action items, but they generally replace capture/transcription workflows or push actions into a meeting/task context. They do not replace NotesBrain's lens-result-specific, source-grounded action layer.

### Leverage

- [Meeting Action Item Detection with Regularized Context Modeling](https://arxiv.org/abs/2303.16763) - Research framing for action item detection as a distinct task from summarization. Relevant mainly as a reminder that local and global context both matter when deciding whether text implies an action.
- Existing NotesBrain lens execution pipeline - The current `execute-lens` path already gathers source notes, produces a `lens_results` row, and supports push/result navigation. This is the core leverage point; action extraction should be a constrained follow-on pass, not a separate notes scan.
- Existing mobile lens result components and query patterns - `LensResultCard`, Summary/Lenses screen data loading, and React Query mutation patterns should carry the first UI, keeping the MVP small.

### Take Inspiration From

- [Memoant](https://memoant.com/) - Open-source meeting capture that turns transcripts into Obsidian notes with summaries, action items, decisions, and tags. Useful pattern: structured metadata next to the original note, with privacy/local-first positioning.
- [Notely](https://notely.ai/) - AI meeting notes with local, cloud, and self-hosted modes and a simple Record/Summarise/Act framing. Useful pattern: make "act" a first-class post-note step, not a buried summary section.
- [OpenWhispr AI Notepad](https://openwhispr.com/notepad) - Lets users run AI actions on notes, including extracting to-dos and custom post-meeting actions. Useful pattern: user-triggered AI actions are understandable and feel safer than hidden automation.
- [Nudge](https://thenudge.app/) - Local-first task starter focused on reducing activation energy rather than becoming a heavy task app. Useful boundary reference: action receipts should make next steps easier to start, not grow into boards, labels, priorities, and assignment.

## Raw Context

- Existing pitch: "Every lens result produces a small, source-backed set of user-approvable actions that can be marked done, snoozed, or dismissed from the notification/result flow without turning NotesBrain into a full task app."
- Existing boundary: "No automatic external writes."
- Existing mitigation: require source note IDs, concrete phrasing, confidence threshold, and pending suggestions rather than completed decisions.
- Existing implementation direction: add `lens_actions`, extend `execute-lens` after result creation, and render controls inline in `LensResultCard`.
- Product risk to keep central: noisy pseudo-tasks would damage trust faster than missing a few valid actions.
