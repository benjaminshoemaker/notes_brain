# Discovery Notes

Generated: 2026-05-10
Source: targeted `/discover community-lenses` pass from `features/community-lenses`

## Idea Summary

Community lenses extend the existing Lens Library from first-party curated templates into user-published templates that other users can discover, preview, install, rate, and remix. The feature should preserve the current trust model: publishing shares a lens template, not a user's notes, results, run history, or private behavior.

The strongest direction is to start with private or reviewed sharing before a fully open marketplace. The core value is reuse and discovery of useful reflection/analysis patterns, while the main product risk is trust: a lens prompt can influence what the app notices, omits, and infers from private notes.

## Key Decisions

- **Problem:** Users can create useful personal lenses, but there is no safe way to share those patterns with other users.
- **Audience:** Notes Brain users who want reusable reflection/analysis workflows, plus trusted early creators whose lenses can seed the library.
- **Platform:** Mobile app first, inside the existing Lens Library and lens management flows.
- **Stack preferences:** Existing React Native/Expo mobile app, Supabase/Postgres backend, and current copy-on-install lens model.
- **MVP scope:** Publish a personal lens as an unlisted or reviewed template, install it from a direct link or controlled community surface, and preserve copy-on-install semantics.
- **Exciting part:** Making useful lenses discoverable without turning private note behavior into a public signal or incentivizing spammy prompt publishing.

## Open Questions

- Should v1 be private-link sharing only, reviewed public submissions, or a small trusted-creator beta?
- Should community templates require manual review before publication, or can automated checks plus reports be enough for the first public version?
- Are installs and saves enough as quality signals, or should ratings/reviews exist in the initial public surface?
- What author identity model should ship first: real profiles, pseudonyms, or simple Notes Brain display names?
- How should template version updates work after a user has installed and edited their copied lens?
- Can a user remix and republish a lens originally installed from another community template?
- Should templates include example outputs, screenshots, or sample prompts, given that real note-derived results cannot be exposed?
- What should happen to already installed user-owned copies when the source community template is reported, hidden, or delisted?

## Existing Solutions & Tools

### Use Directly

None found that solve the full problem. Generic prompt libraries and marketplaces share prompts, but they do not provide Notes Brain's domain-specific lens schema, schedule/lookback/category fields, private-note execution boundary, or copy-to-user-owned-lens install model.

### Leverage

- [prompts.chat](https://prompts.chat/) is an open-source, self-hostable prompt community with browsing, categories, tags, authors, likes, and prompt collections. It is most relevant as a reference for discovery metadata and self-hosted community mechanics, not as a drop-in product.
- [cvibe](https://cvibe.dev/) presents itself as an open-source prompt hub with reusable/installable prompts and MCP-native distribution. Its package-like install/reuse framing is useful precedent for template distribution, even though Notes Brain needs mobile-first lens installs rather than developer prompt packages.
- [PromptBase](https://promptbase.com/marketplace) is a mature commercial prompt marketplace. It is useful as a cautionary example for commerce, categories, creator incentives, and marketplace dynamics; monetization should remain out of scope until trust and quality are proven.

### Take Inspiration From

- [Promptraft](https://promptraft.com/) frames prompts as curated, versioned skills. This supports keeping Notes Brain's first community release curated/reviewed rather than fully open.
- [Promptly.cafe](https://promptly.cafe/) emphasizes creator profiles, categories, ratings/reviews, and prompt stories. Those are useful marketplace UX patterns, but Notes Brain should avoid copying the social/feed energy too early.
- Prompt management tools that emphasize versioning and team/shared libraries suggest treating prompt templates as versioned application logic. For Notes Brain, `lens_template_versions` and immutable snapshots are more important than live-updating installed lenses.

## Raw Context

- Existing Lens Library v1 already proves copy-on-install: a template becomes a normal user-owned `lenses` row with `source_template_id`, `source_template_version`, `installed_from_library_at`, and `template_snapshot`.
- The feature should extend Lens Library, not create a separate execution system.
- Public metrics should be aggregate-safe: install counts, saves, ratings, reports, and featured status are acceptable; note content, generated results, run frequency, and who installed what are not.
- Recommended first step from the existing note: private/unlisted sharing or reviewed submissions, not fully open publishing.
- Non-goals for the first pass: no automatic mutation of installed lenses, no exposure of notes/results/run history, no paid marketplace, and no leaderboard based on private usage behavior.
