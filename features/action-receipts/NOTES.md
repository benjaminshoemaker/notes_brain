# Action Receipts

## One-Sentence Pitch

Every lens result produces a small, source-backed set of user-approvable actions that can be marked done, snoozed, or dismissed from the notification/result flow without turning NotesBrain into a full task app.

## Why This

NotesBrain already has capture, transcription, classification, custom lenses, scheduled execution, lens results, and push delivery. The missing bridge is that useful lens output still ends as markdown: the user must manually turn "what matters" into "what did I actually do?"

Action Receipts make the lens engine more concrete. Instead of only surfacing insight, each lens can also extract a few actionable receipts tied back to the lens result and source notes.

## Current State

Before:

- Lenses generate markdown cards in the Summary feed.
- Push notifications can open the app/result context.
- The app stores `lens_results`, but no durable action objects.
- The user has to mentally copy next steps into memory, a task app, or the next day's notes.

After:

- Lens execution stores optional structured actions alongside each result.
- Each action is explicitly user-controlled: pending, done, snoozed, or dismissed.
- Actions keep source grounding through the lens result and source note IDs.
- The Summary feed becomes a lightweight follow-through surface, not a full project/task system.

## Core Mechanism

- Add a `lens_actions` table with `lens_result_id`, `user_id`, `title`, `status`, `due_hint`, `source_note_ids`, `confidence`, `created_at`, `completed_at`, and `snoozed_until`.
- Extend `execute-lens` so that, after creating a `lens_results` row, it runs a strict JSON action-extraction pass from the same notes and result content.
- Insert only concrete, source-grounded actions. Discard actions that lack a source note ID, are too vague, or fall below a confidence threshold.
- Render actions inline inside `LensResultCard`, with controls for complete, snooze, dismiss, and view source notes.
- Include action metadata in push payloads so tapping a lens notification can open the relevant result/action context.

## Product Boundaries

In scope:

- User-approved actions extracted from lens results.
- Action status changes from the mobile Summary flow.
- Source note grounding.
- Per-lens option to enable or disable action extraction.
- No automatic external writes.

Out of scope:

- Full task management.
- Project boards, priorities, labels, or assignment.
- Calendar/reminder integrations.
- Automatic task creation outside NotesBrain.
- Web UI in the first pass.

## Data Sketch

Suggested `lens_actions` fields:

| Field | Purpose |
| --- | --- |
| `id` | Primary key |
| `lens_result_id` | Which result produced the action |
| `lens_id` | Denormalized query/filter helper |
| `user_id` | RLS ownership |
| `title` | Short action text |
| `status` | `pending`, `done`, `snoozed`, or `dismissed` |
| `due_hint` | Optional natural-language timing hint from source/result |
| `source_note_ids` | Notes used to justify the action |
| `confidence` | Model confidence after validation |
| `created_at` | Insert time |
| `completed_at` | Done timestamp |
| `dismissed_at` | Dismissed timestamp |
| `snoozed_until` | When a snoozed action should reappear |

## Implementation Sketch

Effort: Medium.

Likely files:

- `supabase/migrations/00009_lens_actions.sql`
- `supabase/functions/execute-lens/index.ts`
- `supabase/functions/_shared/openai.ts`
- `packages/shared/src/types.ts`
- `apps/mobile/hooks/useLensActions.ts`
- `apps/mobile/components/LensResultCard.tsx`
- `apps/mobile/app/(app)/summary.tsx`
- `apps/mobile/services/notifications.ts`

Steps:

1. Add the `lens_actions` schema, RLS, indexes, and shared TypeScript types.
2. Add a strict JSON action extraction helper with runtime validation.
3. Update `execute-lens` to create actions after result insertion.
4. Add mobile query/mutation hooks for action status changes.
5. Render action controls under each lens result card.
6. Update notification data so action-bearing results can deep-link into the Summary feed.

## Risk

The model may invent actions or create noisy pseudo-tasks.

Mitigation:

- Require source note IDs.
- Require concrete imperative phrasing.
- Keep a confidence threshold.
- Store actions as pending suggestions, not completed decisions.
- Add a per-lens toggle: `Extract actions from this lens`.

## Criteria Scorecard

| Criterion | Score | Rationale |
| --- | --- | --- |
| Leverage | High | Reuses lenses, result storage, push, notes, and the mobile Summary flow. |
| Surprise | High | Notes stop being passive memory and begin handing back concrete next moves. |
| Feasibility | High | The scheduled lens execution path already exists. |
| Fit | High | Matches the original goal of proactive utility from captured notes. |
| Defensibility | High | Improves with the user's private note history, custom lenses, and action feedback. |

## Open Questions

- Should action extraction be enabled globally, per lens, or only for selected lens templates?
- Should dismissed/done action feedback influence future extraction prompts?
- Should actions be shown in a separate lightweight inbox later, or only attached to lens result cards?
- What is the right maximum action count per result: 3, 5, or lens-configurable?
