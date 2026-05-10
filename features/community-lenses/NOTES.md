# Community Lenses

## Starting Point

Lens Library v1 proved the copy-on-install model for curated first-party lens templates. The next layer is letting users create lenses that can be published for other users to discover, install, rate, and remix.

This is not implemented yet. Treat this folder as planned discovery for a future feature, not an active execution plan.

## Product Direction

Community lenses should extend the existing Lens Library rather than create a separate execution system. A community lens is a template for a prompt, schedule, lookback window, and category filters. Installing one should still copy it into the user's editable `lenses` rows, preserving the current trust model:

- Published templates do not read or expose the publisher's notes.
- Installed lenses run only against the installer's own notes.
- Template updates do not silently alter installed user lenses.
- Users can edit, pause, run, or delete installed community lenses like any other lens.

## Core User Flows

### Create and Publish

1. User creates or edits a personal lens.
2. User chooses `Publish to Community` from lens management or the lens form.
3. App shows a pre-publish review screen with:
   - Name
   - Description
   - Prompt
   - Cadence
   - Lookback window
   - Category filters
   - Privacy warning that only the template is published, not notes or results
4. User submits for review or publishes directly, depending on moderation model.
5. Published template gets a stable template id, version, author attribution, and status.

### Browse and Install

1. User opens Lens Library.
2. User can switch between `Curated` and `Community`, or browse one combined library with filters.
3. Community cards show:
   - Name
   - Outcome-focused description
   - Author
   - Category
   - Cadence
   - Install count
   - Rating or saves
4. User previews the template and installs a copied editable lens.

### Leaderboards and Discovery

Community discovery should make useful lenses easy to find without incentivizing spam.

Possible surfaces:

- Top installed this week
- Highest rated
- New and promising
- Featured by Notes Brain
- Category leaderboards: Planning, Health, Work, Relationships, Reflection
- Trending among similar users only if privacy-safe and explainable

Ranking should avoid exposing private usage details. Public metrics can be aggregate counts, ratings, saves, and moderation/featured signals.

## Data Model Sketch

Likely new tables:

| Table | Purpose |
| --- | --- |
| `lens_templates` | Published template definitions and version metadata |
| `lens_template_versions` | Immutable released versions of a template |
| `lens_template_installs` | Aggregate-safe install tracking and user install relation |
| `lens_template_ratings` | User ratings/saves/reviews if reviews are included |
| `lens_template_reports` | User reports and moderation workflow |

Potential fields:

- `template_id`
- `slug`
- `author_user_id`
- `author_display_name`
- `name`
- `description`
- `prompt`
- `schedule_type`
- `schedule_time`
- `schedule_day`
- `lookback_hours`
- `categories`
- `version`
- `status`: `draft`, `submitted`, `approved`, `rejected`, `hidden`
- `review_status`
- `install_count`
- `rating_average`
- `rating_count`
- `featured_at`
- `created_at`
- `updated_at`

Existing `lenses.source_template_id`, `source_template_version`, `installed_from_library_at`, and `template_snapshot` should continue to identify copied installs.

## Moderation and Trust

Before this ships, decide how prompts are reviewed. A community prompt can shape what the app notices, omits, or infers from private notes, so publishing needs stronger trust controls than normal notes.

Open moderation choices:

- Manual review before publication
- Automated checks plus report-and-remove
- Trusted/featured creators first
- Private link sharing before public marketplace
- Prompt safety checks for sensitive claims, medical/legal/financial advice, data exfiltration language, or impersonation

Recommended first step: private/unlisted sharing or reviewed submissions, not fully open publishing.

## Leaderboard Guardrails

Leaderboards should rank templates, not people by private behavior.

Guardrails:

- Do not expose who installed a template.
- Do not expose how often an installed lens runs for a user.
- Do not rank by generated results or note content.
- Rate-limit publishing.
- Require author identity/display name.
- Allow reporting.
- Allow Notes Brain to delist templates without deleting already installed user-owned copies.

## Scope Candidate

### Phase 1: Private Sharing Foundation

- Add server-backed `lens_templates`.
- Let a user publish a lens as unlisted/private-link template.
- Let another user install from a direct template link.
- Preserve copy-on-install semantics.
- Track install count.

### Phase 2: Reviewed Community Library

- Add submission/review states.
- Add public community browse tab.
- Add author pages or author labels.
- Add reporting and delisting.
- Add category filters.

### Phase 3: Leaderboards

- Add aggregate metrics.
- Add trending/top lists.
- Add rating/saves if needed.
- Add featured/editorial placement.

## Open Questions

- Should v1 start with private sharing before a public community library?
- Should community templates require review before publication?
- Should ratings exist, or are installs/saves enough?
- Should authors be real user profiles, pseudonyms, or Notes Brain display names?
- How should version updates work for installed community lenses?
- Can a user publish a lens that was originally installed from someone else's template?
- Should templates include example output, screenshots, or sample prompts?
- What happens when a template is reported or delisted?
- Should users be able to fork/remix and republish templates?

## Non-Goals for First Pass

- No automatic mutation of installed lenses when a community template changes.
- No public exposure of user notes, lens results, or run history.
- No paid marketplace or creator monetization until trust and quality are proven.
- No open leaderboard based on private usage behavior.
