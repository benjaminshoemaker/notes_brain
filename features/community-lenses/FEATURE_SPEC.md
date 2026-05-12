# Feature Spec: Community Lenses

**Feature:** Community Lenses
**Date:** 2026-05-11
**Status:** Draft
**Upstream:** [DISCOVERY_NOTES.md](./DISCOVERY_NOTES.md), [NOTES.md](./NOTES.md), [Lens Library Feature Spec](../archive/lens-library/FEATURE_SPEC.md)

---

## Problem Statement

The Lens Library gives users curated first-party lens templates, but users cannot share useful lenses they create with other Notes Brain users. That keeps valuable reflection and analysis patterns trapped in one account and makes the library dependent on first-party templates only.

Community Lenses lets a user publish one of their personal lenses into the Lens Library's Community tab. Other signed-in users can browse, preview, and install a copied version into their own account. Publishing shares only the lens template: name, description, prompt, schedule, lookback window, category filters, author display name, and version metadata. It must never share the publisher's notes, generated results, run history, or who installed the lens.

## Users

- **Lens authors:** Existing Notes Brain users who have created a useful lens and want it to appear in the Community tab.
- **Lens installers:** Existing Notes Brain users who want to find and install useful lenses without writing prompts from scratch.
- **Notes Brain operators:** Internal maintainers who need an operator path to hide or delist harmful, spammy, broken, or low-quality public templates.

No anonymous public browsing is required. The MVP assumes signed-in app users.

## Core Product Decision

Community publishing is a public visibility toggle managed from lens management.

When a user publishes a lens, Notes Brain creates or updates a public community template that appears in the Community section of Lens Library. Installing a community lens copies the latest template version into the installer's private `lenses` rows, matching the current Lens Library trust model.

The MVP trust model is open publishing with post-publication controls. There is no pre-publication manual review in this spec. Risk is controlled through explicit publish confirmation, prompt-publicity warnings, per-user publish limits, reporting, status-based delisting, and strict copy-on-install isolation. This is an intentional product choice for this feature spec, replacing the earlier discovery recommendation to start with private links or reviewed submissions.

Installed copies are independent forever:

- They run only against the installer's own notes.
- They can be edited, paused, run, or deleted like any normal lens.
- They do not change automatically if the author edits, unpublishes, or is delisted.
- They keep source metadata for provenance and future update UX.

## Core User Experience

### Publish From Lens Management

1. User opens **Lenses** management.
2. Each eligible personal lens has a community visibility control.
3. User turns on the public/community toggle for a lens.
4. App opens a publish review screen before changing public visibility.
5. Review screen shows:
   - Lens name
   - Description or outcome-focused summary
   - Prompt
   - Cadence
   - Lookback window
   - Category filters
   - Required author display name
   - Privacy warning that the prompt and template fields become public, and that notes, generated results, run history, and installer identities do not become public
6. User confirms publication.
7. The lens appears in the Lens Library Community tab.

Publishing is not available from the lens create/edit form in the MVP. Users publish from lens management after they have an existing saved lens.

Eligible lenses are saved user-owned lenses that were created by the current user and are not installed copies from a curated or community template. In MVP, any lens with `source_template_id` set is not eligible for community publishing. This prevents remix/fork/republish behavior until attribution rules are designed.

### Required Author Display Name

Publishing requires an author display name. The public template shows this display name, not the user's email address.

The system should still store the internal author user id so Notes Brain can enforce ownership, handle reports, and perform moderation. The public display name is a single required text field in MVP; full author profiles are out of scope.

Author display name rules:

- 2-40 visible characters after trimming.
- Must not contain an email address.
- Must not be blank or whitespace-only.
- Must not use reserved names such as `Notes Brain`, `Admin`, or `Support`.
- Must be shown on the publish review screen exactly as it will appear publicly.
- Template snapshots preserve the display name used for that published version.

### Browse Community Lenses

1. User opens Lens Library.
2. User switches to the **Community** tab or section.
3. Community list shows public templates with:
   - Name
   - Outcome-focused description
   - Author display name
   - Category
   - Cadence
   - Install count
   - Install state for the current user
4. User can search and filter by category.
5. Default sort is most installed.

The default sort is a practical discovery aid, not a leaderboard surface. The UI should avoid competitive leaderboard language such as "Top creators" or "Trending now" in MVP.

### Preview And Install

1. User selects a community lens.
2. Preview shows the template details, including prompt and schedule.
3. User taps **Add to My Lenses**.
4. App creates a copied, editable `lenses` row for the current user.
5. Confirmation states that the lens was added to the user's lenses and can be edited anytime.

Installed community lenses use the existing lens execution path. Execution reads from the installed user-owned lens row, not the public template.

### Edit Published Lens

If the author edits a lens that is currently public:

1. The author's personal lens updates as normal.
2. The public community template updates as a new template version.
3. New installers receive the latest public version.
4. Existing installed copies owned by other users do not change.

Versioning is required so installed copies can record which public template version they came from. The MVP does not need an update prompt for old installs, but the data should not prevent one later.

Versioning rules:

- Changes to `name`, `description`, `prompt`, `schedule_type`, `schedule_time`, `schedule_day`, `lookback_hours`, `categories`, or discovery `category` create a new template version.
- Changes to author display name create a new template version because attribution is part of the public snapshot.
- Status changes such as publish, unpublish, hidden, or delisted do not create a new content version.
- Re-publishing an unpublished template keeps the same template id and latest content version unless content changed while unpublished.

### Unpublish

If the author turns off community visibility:

1. The template is removed from the Community tab.
2. The author's personal lens remains unchanged.
3. Existing installed copies in other users' accounts remain unchanged.
4. The template record remains available internally for audit/provenance.

Unpublishing should not physically delete template history.

### Report And Delist

Any signed-in user can report a community lens from the preview or template details view.

Notes Brain operators need a direct way to delist a public template. For MVP, this can be manual in Supabase admin by changing a template status to `hidden` or `delisted`. The product requirement is that delisted templates disappear from Community discovery and cannot be newly installed, while already-installed user-owned copies remain unchanged.

Physical deletion in Supabase admin is not the preferred product behavior because it removes audit trail and can make provenance metadata harder to explain. A status change satisfies the MVP moderation requirement.

Report requirements:

- A signed-in user can submit at most one active report per template.
- Report reasons are: `spam`, `unsafe_prompt`, `misleading`, `private_information`, `impersonation`, and `other`.
- Reporter identity is not shown to the template author.
- The reporter sees a confirmation after submitting.
- The author is not automatically notified by the MVP.
- Reports store template id, reporter user id, reason, optional short note, and timestamp for operator review.

Delist requirements:

- A delisted or hidden template is removed from Community browse/search.
- A delisted or hidden template cannot be newly installed.
- The author sees the template as not currently public from lens management.
- Existing installed copies remain unchanged.
- Manual status changes in Supabase admin are acceptable for MVP.

## Data Ownership Model

### Public Community Template

The published template represents the public copy of a user's lens definition.

Suggested fields:

| Field | Purpose |
| --- | --- |
| `template_id` | Stable public template identifier |
| `slug` | Optional share/browser identifier |
| `author_user_id` | Internal owner/moderation link |
| `author_display_name` | Public attribution |
| `name` | Display name |
| `description` | Outcome-focused summary |
| `prompt` | Prompt copied into installed lenses |
| `schedule_type` | Daily or weekly |
| `schedule_time` | Default run time |
| `schedule_day` | Weekly run day when applicable |
| `lookback_hours` | Default note window |
| `categories` | Optional category filters |
| `category` | Discovery category |
| `version` | Current public version |
| `status` | `public`, `unpublished`, `hidden`, or `delisted` |
| `install_count` | Aggregate install count |
| `created_at` | Publication timestamp |
| `updated_at` | Latest template update timestamp |

### Template Versions

Template versions preserve immutable published snapshots.

Each time an author edits a public lens, the public template version should increment and a version snapshot should be recorded. Existing installs point at the version they installed.

### Installed User Lens

Installing creates a normal private `lenses` row owned by the installer.

The installed lens should continue using existing Lens Library provenance fields:

| Field | Behavior |
| --- | --- |
| `source_template_id` | Public community template id |
| `source_template_version` | Version installed by the user |
| `installed_from_library_at` | Install timestamp |
| `template_snapshot` | Public metadata snapshot shown later if needed |

Install count and install state rules:

- `install_count` counts successful install events, not unique current users.
- Reinstalling after deleting an installed copy counts as a new install event.
- Installing a second copy while one is still installed is not required in MVP; the UI can show `Installed` and block duplicate install.
- Authors do not install their own public template from the Community tab in MVP.
- Install state means whether the current user currently has at least one installed lens with the template id.

## Integration Points

| Area | Expected change |
| --- | --- |
| Lens management | Add community publish/unpublish control and published status display |
| Publish review | Add review/confirmation screen before making a lens public |
| Lens Library | Add Community tab/section alongside curated templates |
| Community browse | Add search, category filter, default most-installed sort, and install state |
| Preview/install | Reuse Lens Library preview/install model for community templates |
| Shared types | Add community template, template version, report, and status types |
| Supabase | Add public template/version/report tables or equivalent schema |
| RLS/policies | Ensure users can read public templates, publish only their own lenses, and install into only their own account |
| Admin operations | Allow status-based manual delisting, initially via Supabase admin |

## Scope Boundaries

### In Scope

- Mobile app experience only.
- Publishing from lens management only.
- Required publish review screen.
- Required author display name.
- Public Community tab/section in Lens Library.
- Search and category filtering.
- Default sorting by install count.
- Preview and install community templates.
- Copy-on-install semantics.
- Template version increment when author edits a public lens.
- Author unpublish behavior.
- User reporting.
- Manual operator delisting through status change.
- Aggregate install count.

### Out Of Scope

| Item | Reason |
| --- | --- |
| Ratings, reviews, leaderboards, and trending | Deferred to V2 in `DEFERRED.md` |
| Paid marketplace or creator monetization | Trust and quality need to be proven first |
| Public author profiles | Display name attribution is enough for MVP |
| Anonymous web marketplace | Feature targets signed-in mobile app users |
| Publishing from lens create/edit form | User chose lens management only |
| Automatic updates to installed lenses | Violates copy-on-install trust model |
| User-approved update prompts | Useful later, but not required for MVP |
| Remix/fork/republish of another user's template | Ownership and attribution rules are unresolved |
| Public comments | Moderation burden outside MVP |
| Pre-publication manual review | MVP publishes directly with report/delist controls |
| Hard delete as normal moderation path | Status-based delisting preserves audit history |

## Moderation And Trust Requirements

- Public publishing must require explicit confirmation.
- Publish review must clearly state that the prompt and template fields become public.
- Publish review must clearly state that notes, generated results, run history, and installer identity are not public.
- Users can report a public template.
- Operators can hide or delist a public template without deleting installed copies.
- Hidden/delisted templates do not appear in Community browse/search and cannot be newly installed.
- Publishing should limit each user to no more than 10 newly public templates per day unless the technical design chooses a stricter anti-spam control.
- Public templates must not expose private user note content in example output.
- Prompt safety checks for medical, legal, financial, impersonation, and data-exfiltration language are recommended during technical design, but automated checks are not required as a product gate for MVP.

## Validation And Error States

- User cannot publish without an author display name.
- User cannot publish with an author display name that violates length, email, blank, or reserved-name validation.
- User cannot publish a lens they do not own.
- User cannot publish an installed curated or community template copy in MVP.
- User cannot install a hidden, delisted, unpublished, or missing template.
- If install fails, the preview remains visible and shows a recoverable error.
- If publish fails, the lens remains private and the user sees a recoverable error.
- If unpublish fails, the UI must not claim the template is private.
- If a template is delisted while a user is previewing it, install is blocked with a clear message.
- Search and filters should show an empty state when no community lenses match.

## Accessibility Requirements

- Publish/unpublish control, confirmation actions, report action, search, filters, and install buttons must have accessible labels.
- The public/private status of a lens must be exposed as text, not color alone.
- Confirmation and destructive actions must use clear button labels.
- Touch targets must be at least 44 by 44 points.
- UI must follow the existing Warm Ink tokens from `apps/mobile/lib/theme.ts`.

## Acceptance Criteria

1. From lens management, a user can start publishing one of their own saved lenses to Community.
2. Publishing opens a review screen showing the template content, author display name, and privacy warning before the lens becomes public.
3. Publishing is blocked when author display name is missing.
4. Publishing is blocked when author display name fails validation.
5. Publishing is blocked for installed curated or community template copies.
6. After confirmation, the lens appears in the Lens Library Community tab for other signed-in users.
7. Community list cards show name, description, author display name, category, cadence, install count, and current user's install state.
8. Community tab supports search and category filtering.
9. Community tab defaults to sorting by install count without presenting this as a leaderboard.
10. Selecting a community lens opens a preview with prompt, schedule, lookback window, category filters, author display name, and install action.
11. Installing a community lens creates an editable user-owned `lenses` row for the installer.
12. Installed community lenses run through the existing lens execution path and analyze only the installer's notes.
13. Installed community lenses retain source template id, source template version, install timestamp, and template snapshot metadata.
14. Editing an author's public lens updates the public template as a new version when a versioned field changes.
15. Existing installed copies do not change when the author edits the public template.
16. Turning off community visibility removes the template from Community browse/search.
17. Existing installed copies do not change when the author unpublishes the template.
18. Any signed-in user can report a community lens once per template.
19. A hidden/delisted template no longer appears in Community browse/search and cannot be newly installed.
20. A hidden/delisted template does not delete or alter already-installed user-owned copies.
21. Publishing, install, unpublish, and report failures show recoverable errors.
22. Public templates never expose publisher notes, generated results, run history, or installer identities.
23. Publish review warns that the prompt itself becomes public.

## Non-Functional Requirements

- Community browse should remain usable with at least hundreds of templates through server-side filtering/sorting or efficient pagination.
- Publishing and installing must respect Supabase RLS boundaries.
- Template reads must expose only public template fields, not private lens owner data beyond display name.
- Install count must be aggregate-only and must not expose who installed a template.
- The feature should preserve existing curated Lens Library behavior.
- The feature should not change custom lens execution semantics.
- Mobile UI must follow the Warm Ink design system.

## Future Enhancements

- Ratings, written reviews, leaderboards, trending lists, and richer ranking signals.
- User-approved update prompts for installed lenses when a newer template version exists.
- Trusted creator badges or author profiles.
- Public share links for direct template previews.
- Remix/fork attribution model.
- Automated prompt safety checks before publication.
- Admin moderation UI beyond Supabase admin.
