-- =====================================================
-- Community Lenses: public templates and moderation shell
-- =====================================================
--
-- Adds the server-backed community template data model. Publication,
-- installation, reporting, version sync, and provenance guards are added in
-- later sections of this migration during the RPC task.
--

SET search_path = public, extensions;

CREATE TYPE lens_template_status AS ENUM ('public', 'unpublished', 'hidden', 'delisted');
CREATE TYPE lens_template_report_reason AS ENUM (
  'spam',
  'unsafe_prompt',
  'misleading',
  'private_information',
  'impersonation',
  'other'
);

-- =====================================================
-- Current public/community template state
-- =====================================================
CREATE TABLE lens_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_lens_id UUID NOT NULL REFERENCES lenses(id) ON DELETE CASCADE,
  author_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author_display_name TEXT NOT NULL CHECK (
    char_length(btrim(author_display_name)) BETWEEN 2 AND 40
    AND author_display_name !~* '[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+'
    AND lower(btrim(author_display_name)) NOT IN ('notes brain', 'admin', 'support')
  ),
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  description TEXT NOT NULL CHECK (char_length(description) BETWEEN 1 AND 280),
  prompt TEXT NOT NULL CHECK (char_length(prompt) BETWEEN 20 AND 2000),
  schedule_type lens_schedule_type NOT NULL,
  schedule_time TIME NOT NULL,
  schedule_day SMALLINT CHECK (schedule_day >= 0 AND schedule_day <= 6),
  lookback_hours INTEGER NOT NULL CHECK (lookback_hours > 0 AND lookback_hours <= 720),
  categories TEXT[] DEFAULT NULL,
  category note_category NOT NULL DEFAULT 'uncategorized',
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  status lens_template_status NOT NULL DEFAULT 'public',
  install_count INTEGER NOT NULL DEFAULT 0 CHECK (install_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source_lens_id),
  CHECK (schedule_type != 'weekly' OR schedule_day IS NOT NULL)
);

-- =====================================================
-- Immutable snapshots for each published template version
-- =====================================================
CREATE TABLE lens_template_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES lens_templates(id) ON DELETE CASCADE,
  version INTEGER NOT NULL CHECK (version > 0),
  snapshot JSONB NOT NULL CHECK (
    snapshot ? 'template_id'
    AND snapshot ? 'version'
    AND snapshot ? 'name'
    AND snapshot ? 'description'
    AND snapshot ? 'category'
    AND snapshot ? 'author_type'
    AND snapshot ? 'author_name'
    AND snapshot ? 'prompt'
    AND snapshot ? 'schedule_type'
    AND snapshot ? 'schedule_time'
    AND snapshot ? 'schedule_day'
    AND snapshot ? 'lookback_hours'
    AND snapshot ? 'categories'
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (template_id, version)
);

-- =====================================================
-- Install events and current-user install-state support
-- =====================================================
CREATE TABLE lens_template_installs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES lens_templates(id) ON DELETE RESTRICT,
  template_version INTEGER NOT NULL CHECK (template_version > 0),
  installed_lens_id UUID NOT NULL REFERENCES lenses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (installed_lens_id)
);

-- =====================================================
-- User reports for operator review
-- =====================================================
CREATE TABLE lens_template_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES lens_templates(id) ON DELETE CASCADE,
  reporter_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason lens_template_report_reason NOT NULL,
  note TEXT CHECK (note IS NULL OR char_length(note) <= 500),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_lens_template_reports_one_active_per_user
  ON lens_template_reports(template_id, reporter_user_id)
  WHERE resolved_at IS NULL;

-- =====================================================
-- Public browse/preview view
-- =====================================================
CREATE VIEW community_lens_templates_public AS
SELECT
  id,
  name,
  description,
  prompt,
  schedule_type,
  schedule_time,
  schedule_day,
  lookback_hours,
  categories,
  category,
  version,
  author_display_name,
  install_count,
  created_at,
  updated_at
FROM lens_templates
WHERE status = 'public';

-- =====================================================
-- Indexes
-- =====================================================
CREATE INDEX idx_lens_templates_public_sort
  ON lens_templates(status, install_count DESC, updated_at DESC);

CREATE INDEX idx_lens_templates_category
  ON lens_templates(category)
  WHERE status = 'public';

CREATE INDEX idx_lens_templates_author
  ON lens_templates(author_user_id);

CREATE INDEX idx_lens_template_versions_template
  ON lens_template_versions(template_id, version DESC);

CREATE INDEX idx_lens_template_installs_template_id
  ON lens_template_installs(template_id);

CREATE INDEX idx_lens_template_installs_user_template
  ON lens_template_installs(user_id, template_id, created_at DESC);

CREATE INDEX idx_lens_template_reports_template
  ON lens_template_reports(template_id, created_at DESC);

-- =====================================================
-- Row Level Security
-- =====================================================
ALTER TABLE lens_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE lens_template_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lens_template_installs ENABLE ROW LEVEL SECURITY;
ALTER TABLE lens_template_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY lens_templates_select_own
  ON lens_templates FOR SELECT
  TO authenticated
  USING (auth.uid() = author_user_id);

CREATE POLICY lens_template_versions_select_own
  ON lens_template_versions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM lens_templates lt
      WHERE lt.id = lens_template_versions.template_id
        AND auth.uid() = lt.author_user_id
    )
  );

CREATE POLICY lens_template_installs_select_own
  ON lens_template_installs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY lens_template_reports_select_own
  ON lens_template_reports FOR SELECT
  TO authenticated
  USING (auth.uid() = reporter_user_id);

-- Keep direct table access narrow. Public discovery reads the view; mutation
-- access is added through SECURITY DEFINER RPCs in the next task.
REVOKE ALL ON lens_templates FROM anon;
REVOKE ALL ON lens_template_versions FROM anon;
REVOKE ALL ON lens_template_installs FROM anon;
REVOKE ALL ON lens_template_reports FROM anon;
REVOKE ALL ON community_lens_templates_public FROM anon;

GRANT SELECT ON lens_templates TO authenticated;
GRANT SELECT ON lens_template_versions TO authenticated;
GRANT SELECT ON lens_template_installs TO authenticated;
GRANT SELECT ON lens_template_reports TO authenticated;
GRANT SELECT ON community_lens_templates_public TO authenticated;

CREATE TRIGGER lens_templates_updated_at BEFORE UPDATE ON lens_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Rollback reference:
-- DROP TRIGGER IF EXISTS lens_templates_updated_at ON lens_templates;
-- DROP VIEW IF EXISTS community_lens_templates_public;
-- DROP TABLE IF EXISTS lens_template_reports;
-- DROP TABLE IF EXISTS lens_template_installs;
-- DROP TABLE IF EXISTS lens_template_versions;
-- DROP TABLE IF EXISTS lens_templates;
-- DROP TYPE IF EXISTS lens_template_report_reason;
-- DROP TYPE IF EXISTS lens_template_status;
