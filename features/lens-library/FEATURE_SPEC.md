# Feature Spec: Lens Library

**Feature:** Lens Library
**Date:** 2026-05-09
**Status:** Discovery / product specification draft
**Upstream:** [NOTES.md](./NOTES.md), [Custom Lenses Feature Spec](../custom-lenses/FEATURE_SPEC.md)

---

## Problem Statement

The custom lens engine lets users define their own recurring AI analyses over their notes, but a blank lens form is a high-friction starting point. Most users should not need to invent useful prompts, cadences, lookback windows, or categories from scratch before they understand what lenses can do.

The Lens Library gives users a curated set of useful, pre-populated lenses they can add to their account. It should make the first-run lens experience feel guided while preserving the core custom-lenses principle: once a lens is in a user's account, it belongs to them and can be edited, paused, run, or deleted like any other lens.

## Core Decision

Installing a Lens Library item **copies it into the user's personal `lenses` rows as an editable user-owned lens**.

Installed lenses keep source metadata so the app can identify where they came from:

| Field | Purpose |
| --- | --- |
| `source_template_id` | Links the installed lens back to the library template. |
| `source_template_version` | Records the template version installed by the user. |
| `installed_at` | Records when the user added it. |
| `has_user_edits` | Optional helper for future update UX. |

Template changes must **not** silently mutate installed lenses. Future versions may offer explicit update prompts, but updates should be user-approved.

## Why Copy, Not Live Sync

Consumer template galleries usually create independent copies rather than live-linked instances:

- Google Docs opens a copy when a user starts from a document template.
- Airtable Universe copies a base into a user's workspace.
- Trello cards created from templates do not receive later template edits automatically.
- GitHub repository templates create new repositories with unrelated history.
- Apple Shortcuts Gallery adds a shortcut to the user's collection.

The opposite pattern is a shared library or plugin model, where the installed item remains connected to a maintained source. That model can be valuable, but it carries more operational and trust burden. Figma's shared-library guidance emphasizes testing, changelogs, and careful communication because one published update can affect many downstream files. Obsidian avoids automatic community-plugin updates for security reasons and requires users to check and apply updates manually.

Lens prompts are especially sensitive because they operate over private personal notes. A silent prompt update could change what the app notices, omits, prioritizes, or infers. For this product, user trust and local ownership are more important than automatic central control.

## Update Convention

Version updates are allowed only as an explicit user action.

Recommended future states:

| State | Meaning | UX |
| --- | --- | --- |
| Not installed | User has no lens copied from this template. | Show `Add to My Lenses`. |
| Installed | User has a lens from the current template version. | Show `Installed`. |
| Update available | User has an older version installed. | Show `Update available` with changelog preview. |
| Customized | User has edited the installed lens. | Prefer `Add updated copy` over in-place overwrite. |

Recommended v1 update behavior:

1. Detect update availability by comparing `source_template_version` to the current library template version.
2. Show a preview of what changed.
3. Offer `Add updated copy`.
4. Do not attempt field-level merge in v1.

In-place update can be considered later, but only after there is a clear rule for which fields are template-owned versus user-owned. Until then, adding a fresh updated copy is safer and easier to explain.

## Core User Experience

### Entry Point

The lens creation flow offers two paths:

1. `Create your own`
2. `Browse Lens Library`

The `+` action on the Lenses or Summary area should open this choice instead of going directly to a blank lens form.

### Browse Lens Library

The library starts as a curated set of first-party lens templates. Community-created lenses are future scope.

Each library card should show:

- Lens name
- Short outcome-focused description
- Cadence
- Category
- Install state (`Installed`, `Update available`, or no badge)

### Preview

Selecting a library lens opens a preview with:

- Name
- Description
- What this lens looks for
- Example result shape or short output preview
- Prompt, collapsed under an advanced/details affordance if needed
- Cadence
- Categories
- Lookback window
- Version and last updated date, once versioning exists

Primary action: `Add to My Lenses`

After install, confirm ownership plainly: `Added to My Lenses. You can edit it anytime.`

### Installed Lens Behavior

An installed library lens behaves like any normal custom lens:

- User can edit the name, prompt, schedule, categories, and lookback window.
- User can pause, resume, run now, or delete it.
- Results are written as normal `lens_results`.
- Deleting the user lens does not affect the library template.
- Editing the user lens does not affect the library template.

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

## Data Ownership Model

### Library Template

The canonical curated lens definition. It may live in bundled seed data, a server table, or both, but conceptually it is not user-owned.

Suggested fields:

| Field | Purpose |
| --- | --- |
| `template_id` | Stable identifier for the library lens. |
| `version` | Monotonic version for update detection. |
| `name` | Display name. |
| `description` | Outcome-focused summary. |
| `prompt` | Default prompt copied into the installed lens. |
| `schedule_type` | Daily or weekly default. |
| `schedule_time` | Default time. |
| `schedule_day` | Default day for weekly lenses. |
| `lookback_hours` | Default note window. |
| `categories` | Optional default category filters. |
| `author_type` | `curated` for v1, later `community`. |
| `author_name` | Display source. |
| `review_status` | Needed before community lenses. |
| `changelog` | Human-readable version notes. |

### Installed User Lens

The normal `lenses` row created from a template. It should contain the copied user-editable fields plus source metadata.

The user's active lens should not read live prompt or schedule values from the template at execution time. Execution should use the installed lens row.

## Community Lens Direction

Community lenses should be treated as a marketplace-style extension of the curated library, not as silently synced shared objects.

Before community publishing exists, the product needs:

- Manual or trusted review before publication
- Author identity
- Versioned releases
- Required changelog for updates
- Install count or popularity signal
- Report/flag controls
- Clear permission/privacy language around what lens prompts do
- Explicit update acceptance, not automatic updates

Curated and community lenses may eventually live in one library with filters, but v1 should avoid community publishing until curated install behavior is proven.

## Scope Boundaries

### In Scope for First Feature Pass

- Replace direct `+` behavior with a choice between `Create your own` and `Browse Lens Library`.
- Show a curated Lens Library list.
- Preview each curated lens before install.
- Install a library lens by copying it into the user's editable `lenses`.
- Store source template metadata on installed lenses if the schema change is included.
- Defer automatic update behavior.

### Out of Scope for First Feature Pass

- Community publishing
- Ratings, reviews, comments, or public profiles
- Automatic updates to installed lenses
- Field-level merge between customized lenses and newer templates
- Paid templates or creator monetization
- Remote execution behavior different from normal custom lenses

## Acceptance Criteria Draft

- Tapping `+` presents `Create your own` and `Browse Lens Library`.
- `Create your own` opens the current blank lens form.
- `Browse Lens Library` shows the curated seed list.
- Selecting a library lens previews its name, description, prompt, cadence, categories, and lookback window.
- Installing a library lens creates an editable lens owned by the current user.
- Installed lenses run through the existing custom-lens execution path.
- Installed lenses retain source template/version metadata if that schema is part of the implementation.
- Updating the library template does not silently alter installed user lenses.

## Research Notes

| Product / Pattern | Observed Model | Relevance |
| --- | --- | --- |
| Google Docs templates | Starting from a template opens a copy. | Strong precedent for user-owned document/template copies. |
| Airtable Universe | Users copy published bases into their own workspace. | Strong precedent for template galleries that seed user-owned assets. |
| Trello template cards | Existing cards created from a template do not auto-update after template edits. | Clear precedent for new copies receiving latest template, old copies staying stable. |
| GitHub template repositories | Generated repositories have unrelated history from the template. | Technical analogy for templates as project starters, not synced forks. |
| Apple Shortcuts Gallery | Gallery shortcuts are added to the user's collection. | Consumer automation precedent close to lenses: useful defaults become user-owned actions. |
| Figma shared libraries | Connected instances can receive accepted updates, but require testing and changelog discipline. | Useful later if Notes Brain adds explicit version/update review. Too complex for v1. |
| Obsidian community plugins | Community plugins require manual update checks for security. | Important caution for community prompt/lens ecosystems over private data. |

## Source Links

- [Google Docs templates](https://support.google.com/docs/answer/148833?hl=en-GB&ref_topic=19434)
- [Apple Shortcuts Gallery](https://support.apple.com/en-gb/guide/shortcuts/apdd018638ca/ios)
- [Airtable Universe](https://support.airtable.com/docs/airtable-universe)
- [Trello template cards](https://community.atlassian.com/learning/lesson/create-template-boards-and-cards-in-trello)
- [GitHub template repositories](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-repository-from-a-template)
- [Figma shared libraries](https://www.figma.com/best-practices/components-styles-and-shared-libraries/)
- [Figma component update guidance](https://help.figma.com/hc/en-us/articles/39747637290263-Components-collection-Tips-for-component-management)
- [Obsidian community plugins](https://obsidian.md/help/community-plugins)
