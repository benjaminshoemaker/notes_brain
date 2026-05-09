-- =====================================================
-- Lens Library: source metadata for copied templates
-- =====================================================
--
-- Adds provenance fields to normal user-owned lenses so the mobile app can
-- recognize installs from bundled templates without live-linking execution to
-- template data.
--

ALTER TABLE lenses
  ADD COLUMN source_template_id TEXT,
  ADD COLUMN source_template_version INTEGER,
  ADD COLUMN installed_from_library_at TIMESTAMPTZ,
  ADD COLUMN template_snapshot JSONB;

CREATE INDEX idx_lenses_source_template
  ON lenses(user_id, source_template_id)
  WHERE source_template_id IS NOT NULL;

-- Mark existing default Morning Briefing lenses as installed from the bundled
-- template. Do not backfill non-default user-created lenses with the same name.
UPDATE lenses
SET
  source_template_id = 'morning-briefing',
  source_template_version = 1,
  installed_from_library_at = COALESCE(created_at, NOW()),
  template_snapshot = jsonb_build_object(
    'template_id', 'morning-briefing',
    'version', 1,
    'name', 'Morning Briefing',
    'description', 'Top actions, avoidance, and one small win',
    'category', 'planning',
    'author_type', 'curated',
    'author_name', 'Notes Brain'
  )
WHERE is_default = true
  AND name = 'Morning Briefing'
  AND source_template_id IS NULL;

-- Keep new-user default lenses aligned with the same template metadata.
CREATE OR REPLACE FUNCTION create_default_lens()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO lenses (
    user_id,
    name,
    prompt,
    schedule_type,
    schedule_time,
    lookback_hours,
    is_default,
    source_template_id,
    source_template_version,
    installed_from_library_at,
    template_snapshot
  )
  VALUES (
    NEW.id,
    'Morning Briefing',
    'Give me my top 3 action items, one thing I''m avoiding, and one small win.',
    'daily',
    '08:00',
    48,
    true,
    'morning-briefing',
    1,
    NOW(),
    jsonb_build_object(
      'template_id', 'morning-briefing',
      'version', 1,
      'name', 'Morning Briefing',
      'description', 'Top actions, avoidance, and one small win',
      'category', 'planning',
      'author_type', 'curated',
      'author_name', 'Notes Brain'
    )
  )
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Rollback reference:
-- DROP INDEX IF EXISTS idx_lenses_source_template;
-- ALTER TABLE lenses
--   DROP COLUMN IF EXISTS template_snapshot,
--   DROP COLUMN IF EXISTS installed_from_library_at,
--   DROP COLUMN IF EXISTS source_template_version,
--   DROP COLUMN IF EXISTS source_template_id;
