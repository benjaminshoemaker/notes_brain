-- =====================================================
-- Community Lenses: public templates and moderation shell
-- =====================================================
--
-- Adds the server-backed community template data model plus database-owned
-- publish, unpublish, install, report, version sync, and provenance guards.
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

-- =====================================================
-- Shared snapshot helper
-- =====================================================
CREATE OR REPLACE FUNCTION build_lens_template_snapshot(p_template lens_templates)
RETURNS JSONB AS $$
BEGIN
  RETURN jsonb_build_object(
    'template_id', p_template.id::text,
    'version', p_template.version,
    'name', p_template.name,
    'description', p_template.description,
    'category', p_template.category,
    'author_type', 'community',
    'author_name', p_template.author_display_name,
    'prompt', p_template.prompt,
    'schedule_type', p_template.schedule_type,
    'schedule_time', p_template.schedule_time,
    'schedule_day', p_template.schedule_day,
    'lookback_hours', p_template.lookback_hours,
    'categories', p_template.categories
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- Publish/unpublish/install/report RPCs
-- =====================================================
CREATE OR REPLACE FUNCTION publish_lens_template(
  p_lens_id UUID,
  p_author_display_name TEXT,
  p_description TEXT,
  p_category note_category DEFAULT 'uncategorized'
)
RETURNS lens_templates AS $$
DECLARE
  v_source_lens lenses%ROWTYPE;
  v_template lens_templates%ROWTYPE;
  v_new_version INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT *
  INTO v_source_lens
  FROM lenses
  WHERE id = p_lens_id
    AND user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lens not found';
  END IF;

  IF v_source_lens.source_template_id IS NOT NULL THEN
    RAISE EXCEPTION 'Installed library lenses cannot be published';
  END IF;

  IF p_author_display_name IS NULL
    OR char_length(btrim(p_author_display_name)) < 2
    OR char_length(btrim(p_author_display_name)) > 40 THEN
    RAISE EXCEPTION 'author display name is required';
  END IF;

  IF p_author_display_name ~* '[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+' THEN
    RAISE EXCEPTION 'author display name must not contain an email address';
  END IF;

  IF lower(btrim(p_author_display_name)) IN ('notes brain', 'admin', 'support') THEN
    RAISE EXCEPTION 'reserved author display name';
  END IF;

  IF p_description IS NULL OR char_length(btrim(p_description)) = 0 THEN
    RAISE EXCEPTION 'description is required';
  END IF;

  IF char_length(btrim(p_description)) > 280 THEN
    RAISE EXCEPTION 'description must be 280 characters or fewer';
  END IF;

  SELECT *
  INTO v_template
  FROM lens_templates
  WHERE source_lens_id = p_lens_id;

  IF FOUND AND v_template.status IN ('hidden', 'delisted') THEN
    RAISE EXCEPTION 'Template cannot be republished from its moderation state';
  END IF;

  IF NOT FOUND AND (
    SELECT count(*)
    FROM lens_templates
    WHERE author_user_id = auth.uid()
      AND created_at >= NOW() - INTERVAL '24 hours'
  ) >= 10 THEN
    RAISE EXCEPTION 'Community publish limit reached';
  END IF;

  IF NOT FOUND THEN
    INSERT INTO lens_templates (
      source_lens_id,
      author_user_id,
      author_display_name,
      name,
      description,
      prompt,
      schedule_type,
      schedule_time,
      schedule_day,
      lookback_hours,
      categories,
      category,
      status
    )
    VALUES (
      v_source_lens.id,
      auth.uid(),
      btrim(p_author_display_name),
      v_source_lens.name,
      btrim(p_description),
      v_source_lens.prompt,
      v_source_lens.schedule_type,
      v_source_lens.schedule_time,
      v_source_lens.schedule_day,
      v_source_lens.lookback_hours,
      v_source_lens.categories,
      p_category,
      'public'
    )
    RETURNING * INTO v_template;

    INSERT INTO lens_template_versions(template_id, version, snapshot)
    VALUES (v_template.id, v_template.version, build_lens_template_snapshot(v_template));

    RETURN v_template;
  END IF;

  v_new_version := v_template.version;

  IF v_template.name IS DISTINCT FROM v_source_lens.name
    OR v_template.description IS DISTINCT FROM btrim(p_description)
    OR v_template.prompt IS DISTINCT FROM v_source_lens.prompt
    OR v_template.schedule_type IS DISTINCT FROM v_source_lens.schedule_type
    OR v_template.schedule_time IS DISTINCT FROM v_source_lens.schedule_time
    OR v_template.schedule_day IS DISTINCT FROM v_source_lens.schedule_day
    OR v_template.lookback_hours IS DISTINCT FROM v_source_lens.lookback_hours
    OR v_template.categories IS DISTINCT FROM v_source_lens.categories
    OR v_template.category IS DISTINCT FROM p_category
    OR v_template.author_display_name IS DISTINCT FROM btrim(p_author_display_name) THEN
    v_new_version := v_template.version + 1;
  END IF;

  UPDATE lens_templates
  SET
    author_display_name = btrim(p_author_display_name),
    name = v_source_lens.name,
    description = btrim(p_description),
    prompt = v_source_lens.prompt,
    schedule_type = v_source_lens.schedule_type,
    schedule_time = v_source_lens.schedule_time,
    schedule_day = v_source_lens.schedule_day,
    lookback_hours = v_source_lens.lookback_hours,
    categories = v_source_lens.categories,
    category = p_category,
    version = v_new_version,
    status = 'public',
    updated_at = NOW()
  WHERE id = v_template.id
  RETURNING * INTO v_template;

  IF v_new_version > v_template.version - 1 THEN
    INSERT INTO lens_template_versions(template_id, version, snapshot)
    VALUES (v_template.id, v_template.version, build_lens_template_snapshot(v_template))
    ON CONFLICT (template_id, version) DO NOTHING;
  END IF;

  RETURN v_template;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions;

CREATE OR REPLACE FUNCTION unpublish_lens_template(p_lens_id UUID)
RETURNS lens_templates AS $$
DECLARE
  v_template lens_templates%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  UPDATE lens_templates
  SET status = 'unpublished',
      updated_at = NOW()
  WHERE source_lens_id = p_lens_id
    AND author_user_id = auth.uid()
  RETURNING * INTO v_template;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Community template not found';
  END IF;

  RETURN v_template;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions;

CREATE OR REPLACE FUNCTION install_lens_template(p_template_id UUID)
RETURNS lenses AS $$
DECLARE
  v_template lens_templates%ROWTYPE;
  v_lens lenses%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT *
  INTO v_template
  FROM lens_templates
  WHERE id = p_template_id
    AND status = 'public';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Community lens template is not available';
  END IF;

  IF v_template.author_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Authors cannot install their own community template';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM lenses
    WHERE user_id = auth.uid()
      AND source_template_id = p_template_id::text
  ) THEN
    RAISE EXCEPTION 'Community lens template is already installed';
  END IF;

  PERFORM set_config('app.community_lens_install', 'true', true);

  INSERT INTO lenses (
    user_id,
    name,
    prompt,
    schedule_type,
    schedule_time,
    schedule_day,
    lookback_hours,
    categories,
    source_template_id,
    source_template_version,
    installed_from_library_at,
    template_snapshot
  )
  VALUES (
    auth.uid(),
    v_template.name,
    v_template.prompt,
    v_template.schedule_type,
    v_template.schedule_time,
    v_template.schedule_day,
    v_template.lookback_hours,
    v_template.categories,
    p_template_id::text,
    v_template.version,
    NOW(),
    build_lens_template_snapshot(v_template)
  )
  RETURNING * INTO v_lens;

  INSERT INTO lens_template_installs (
    template_id,
    template_version,
    installed_lens_id,
    user_id
  )
  VALUES (
    v_template.id,
    v_template.version,
    v_lens.id,
    auth.uid()
  );

  UPDATE lens_templates
  SET install_count = install_count + 1,
      updated_at = NOW()
  WHERE id = v_template.id;

  RETURN v_lens;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions;

CREATE OR REPLACE FUNCTION report_lens_template(
  p_template_id UUID,
  p_reason lens_template_report_reason,
  p_note TEXT DEFAULT NULL
)
RETURNS lens_template_reports AS $$
DECLARE
  v_existing_report lens_template_reports%ROWTYPE;
  v_report lens_template_reports%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  PERFORM 1
  FROM lens_templates
  WHERE id = p_template_id
    AND status = 'public';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Community lens template is not available';
  END IF;

  SELECT *
  INTO v_existing_report
  FROM lens_template_reports
  WHERE template_id = p_template_id
    AND reporter_user_id = auth.uid()
    AND resolved_at IS NULL;

  IF FOUND THEN
    RETURN v_existing_report;
  END IF;

  IF p_note IS NOT NULL AND char_length(p_note) > 500 THEN
    RAISE EXCEPTION 'Report note must be 500 characters or fewer';
  END IF;

  INSERT INTO lens_template_reports (
    template_id,
    reporter_user_id,
    reason,
    note
  )
  VALUES (
    p_template_id,
    auth.uid(),
    p_reason,
    NULLIF(btrim(p_note), '')
  )
  RETURNING * INTO v_report;

  RETURN v_report;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions;

-- =====================================================
-- Community provenance and source-version triggers
-- =====================================================
CREATE OR REPLACE FUNCTION enforce_community_lens_install_guard()
RETURNS TRIGGER AS $$
DECLARE
  v_template_id UUID;
BEGIN
  IF NEW.source_template_id IS NULL THEN
    RETURN NEW;
  END IF;

  BEGIN
    v_template_id := NEW.source_template_id::UUID;
  EXCEPTION
    WHEN invalid_text_representation THEN
      RETURN NEW;
  END;

  IF EXISTS (SELECT 1 FROM lens_templates WHERE id = v_template_id)
    AND current_setting('app.community_lens_install', true) = 'true' THEN
    RETURN NEW;
  END IF;

  IF EXISTS (SELECT 1 FROM lens_templates WHERE id = v_template_id) THEN
    RAISE EXCEPTION 'Community lens provenance can only be set by install_lens_template';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions;

CREATE TRIGGER lenses_community_install_guard
  BEFORE INSERT OR UPDATE OF source_template_id ON lenses
  FOR EACH ROW EXECUTE FUNCTION enforce_community_lens_install_guard();

CREATE OR REPLACE FUNCTION sync_lens_template_from_source_lens()
RETURNS TRIGGER AS $$
DECLARE
  v_template lens_templates%ROWTYPE;
BEGIN
  SELECT *
  INTO v_template
  FROM lens_templates
  WHERE source_lens_id = NEW.id
    AND status IN ('public', 'unpublished');

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  IF OLD.name IS DISTINCT FROM NEW.name
    OR OLD.prompt IS DISTINCT FROM NEW.prompt
    OR OLD.schedule_type IS DISTINCT FROM NEW.schedule_type
    OR OLD.schedule_time IS DISTINCT FROM NEW.schedule_time
    OR OLD.schedule_day IS DISTINCT FROM NEW.schedule_day
    OR OLD.lookback_hours IS DISTINCT FROM NEW.lookback_hours
    OR OLD.categories IS DISTINCT FROM NEW.categories THEN
    UPDATE lens_templates
    SET
      name = NEW.name,
      prompt = NEW.prompt,
      schedule_type = NEW.schedule_type,
      schedule_time = NEW.schedule_time,
      schedule_day = NEW.schedule_day,
      lookback_hours = NEW.lookback_hours,
      categories = NEW.categories,
      version = v_template.version + 1,
      updated_at = NOW()
    WHERE id = v_template.id
    RETURNING * INTO v_template;

    INSERT INTO lens_template_versions(template_id, version, snapshot)
    VALUES (v_template.id, v_template.version, build_lens_template_snapshot(v_template));
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER lenses_sync_community_template
  AFTER UPDATE OF name, prompt, schedule_type, schedule_time, schedule_day, lookback_hours, categories ON lenses
  FOR EACH ROW EXECUTE FUNCTION sync_lens_template_from_source_lens();

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
GRANT EXECUTE ON FUNCTION publish_lens_template(UUID, TEXT, TEXT, note_category) TO authenticated;
GRANT EXECUTE ON FUNCTION unpublish_lens_template(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION install_lens_template(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION report_lens_template(UUID, lens_template_report_reason, TEXT) TO authenticated;

CREATE TRIGGER lens_templates_updated_at BEFORE UPDATE ON lens_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Rollback reference:
-- DROP TRIGGER IF EXISTS lenses_sync_community_template ON lenses;
-- DROP FUNCTION IF EXISTS sync_lens_template_from_source_lens();
-- DROP TRIGGER IF EXISTS lenses_community_install_guard ON lenses;
-- DROP FUNCTION IF EXISTS enforce_community_lens_install_guard();
-- DROP FUNCTION IF EXISTS report_lens_template(UUID, lens_template_report_reason, TEXT);
-- DROP FUNCTION IF EXISTS install_lens_template(UUID);
-- DROP FUNCTION IF EXISTS unpublish_lens_template(UUID);
-- DROP FUNCTION IF EXISTS publish_lens_template(UUID, TEXT, TEXT, note_category);
-- DROP FUNCTION IF EXISTS build_lens_template_snapshot(lens_templates);
-- DROP TRIGGER IF EXISTS lens_templates_updated_at ON lens_templates;
-- DROP VIEW IF EXISTS community_lens_templates_public;
-- DROP TABLE IF EXISTS lens_template_reports;
-- DROP TABLE IF EXISTS lens_template_installs;
-- DROP TABLE IF EXISTS lens_template_versions;
-- DROP TABLE IF EXISTS lens_templates;
-- DROP TYPE IF EXISTS lens_template_report_reason;
-- DROP TYPE IF EXISTS lens_template_status;
