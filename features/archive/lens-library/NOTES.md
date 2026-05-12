# Lens Library

Dedicated feature documentation: [FEATURE_SPEC.md](./FEATURE_SPEC.md)

## Starting Point

The lens creation flow should offer two paths:

1. Create your own
2. Browse Lens Library

The library should start as a curated set of pre-populated lenses and later support community-created lenses.

This is large enough for the project feature flow because it affects product UX, seed content, data ownership, install/copy behavior, and the future community model.

## Current Feedback

- The new lens flow should not go directly to a blank form.
- Users should be able to choose from existing lenses that are already pre-populated.
- Long-term direction: this should become a community feature.
- Accepted product model: installing a library lens copies it into the user's editable `lenses` rows while preserving source template/version metadata for future explicit update prompts.
- Installed lenses must not silently receive template updates. Future updates should be previewed and user-approved.
- Recommended wording accepted:
  - `Create your own`
  - `Browse Lens Library`

## Existing Spec Status

The current custom-lenses spec includes the underlying lens engine, but treats templates/pre-built lenses as V2 and shared marketplace/community lenses as future scope. This folder should become the place to define that next layer.

## Initial Library Seeds

| Lens | Cadence | Focus |
| --- | --- | --- |
| Morning Briefing | Daily | Top actions, avoidance, small win |
| Tomorrow Planner | Daily evening | Convert today's loose notes into tomorrow's short plan |
| Weekly Project Pulse | Weekly | What moved, what stalled, what needs a next step |
| Health Pattern Check | Weekly | Sleep, exercise, mood, diet, symptoms |
| Relationship Reminders | Weekly | People to follow up with, promises, open loops |
| Errands & Admin Sweep | Daily or weekly | Bills, appointments, purchases, household logistics |
| Idea Incubator | Weekly | Repeated ideas, strongest new concepts, ideas worth dropping |
| Decision Log | Weekly | Decisions made, decisions pending, missing information |
| Friction Finder | Weekly | Recurring annoyances, blockers, things that keep coming up |
| Gratitude & Wins | Weekly | Wins, good moments, progress worth noticing |

## Product Questions

- How much source metadata should be added in the first implementation pass versus deferred until update prompts exist?
- Should curated lenses and community lenses appear in one list or separate tabs?
- What metadata matters first: category, cadence, description, popularity, author, install count?
- How should prompts be reviewed before community publication?
- Should the library be available offline from bundled seed data, server data, or both?

## Initial Scope Candidate

- Change `+` on the Lenses tab to open a choice screen.
- Add `Create your own` path to the existing lens form.
- Add `Browse Lens Library` path to a curated list of seed lenses.
- Installing a seed lens creates a normal editable user lens.
- Preserve source template/version metadata on installed lenses if the schema change is included.
- Defer community publishing until the curated library behavior is proven.
- Defer automatic or merge-style updates; future template updates should be explicit and user-approved.

## Acceptance Criteria Draft

- Tapping `+` presents the two creation paths.
- `Create your own` opens the current blank lens form.
- `Browse Lens Library` shows the curated seed list.
- Selecting a library lens previews its name, description, prompt, cadence, categories, and lookback window.
- Installing a library lens creates an editable lens owned by the current user.
- Updating a library template does not silently alter installed user lenses.
