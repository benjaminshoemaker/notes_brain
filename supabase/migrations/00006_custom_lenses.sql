-- =====================================================
-- Custom Lenses: User-configurable scheduled AI prompts
-- =====================================================
--
-- Generalizes the daily summary into a platform where users
-- define their own prompt + schedule + data filter combinations.
--

-- Lens schedule type
CREATE TYPE lens_schedule_type AS ENUM ('daily', 'weekly');

-- =====================================================
-- Lenses table
-- =====================================================
CREATE TABLE lenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  prompt TEXT NOT NULL CHECK (char_length(prompt) BETWEEN 20 AND 2000),
  schedule_type lens_schedule_type NOT NULL DEFAULT 'daily',
  schedule_time TIME NOT NULL DEFAULT '08:00',
  schedule_day SMALLINT CHECK (schedule_day >= 0 AND schedule_day <= 6),
  lookback_hours INTEGER NOT NULL DEFAULT 24 CHECK (lookback_hours > 0 AND lookback_hours <= 720),
  categories TEXT[] DEFAULT NULL,  -- NULL = all categories
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  next_run_at TIMESTAMPTZ,
  last_run_at TIMESTAMPTZ,
  consecutive_failures SMALLINT NOT NULL DEFAULT 0,
  last_error TEXT,
  last_error_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Weekly lenses must specify a day
ALTER TABLE lenses ADD CONSTRAINT weekly_requires_day
  CHECK (schedule_type != 'weekly' OR schedule_day IS NOT NULL);

-- =====================================================
-- Lens results table
-- =====================================================
CREATE TABLE lens_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lens_id UUID NOT NULL REFERENCES lenses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  notes_analyzed INTEGER NOT NULL DEFAULT 0,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

-- =====================================================
-- Indexes
-- =====================================================
CREATE INDEX idx_lenses_user_id ON lenses(user_id);
CREATE INDEX idx_lenses_next_run ON lenses(next_run_at) WHERE is_active = true;
CREATE INDEX idx_lens_results_user_id ON lens_results(user_id, generated_at DESC);
CREATE INDEX idx_lens_results_lens_id ON lens_results(lens_id, generated_at DESC);

-- Partial unique index: at most one default lens per user
CREATE UNIQUE INDEX idx_lenses_one_default_per_user ON lenses(user_id) WHERE is_default = true;

-- =====================================================
-- Row Level Security
-- =====================================================
ALTER TABLE lenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE lens_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY lenses_policy ON lenses FOR ALL USING (auth.uid() = user_id);
CREATE POLICY lens_results_policy ON lens_results FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- Updated_at trigger (reuses existing function from 00001)
-- =====================================================
CREATE TRIGGER lenses_updated_at BEFORE UPDATE ON lenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- Compute next_run_at on insert or schedule changes
-- Single source of truth for scheduling computation.
-- =====================================================
CREATE OR REPLACE FUNCTION compute_next_run_at()
RETURNS TRIGGER AS $$
DECLARE
  user_tz TEXT;
  local_now TIMESTAMP;
  candidate TIMESTAMP;
BEGIN
  -- When pausing, clear next_run_at
  IF NEW.is_active = false THEN
    NEW.next_run_at := NULL;
    RETURN NEW;
  END IF;

  -- Only compute when relevant fields change or on insert
  IF TG_OP = 'INSERT' OR
     OLD.schedule_time IS DISTINCT FROM NEW.schedule_time OR
     OLD.schedule_day IS DISTINCT FROM NEW.schedule_day OR
     OLD.schedule_type IS DISTINCT FROM NEW.schedule_type OR
     (OLD.is_active = false AND NEW.is_active = true) THEN

    SELECT timezone INTO user_tz FROM users WHERE id = NEW.user_id;
    user_tz := COALESCE(user_tz, 'America/New_York');

    -- Get current time in user's timezone
    local_now := (NOW() AT TIME ZONE user_tz);

    -- Start candidate at today + schedule_time in user's timezone
    candidate := date_trunc('day', local_now) + NEW.schedule_time;

    -- If candidate is in the past, advance to next day
    IF candidate <= local_now THEN
      candidate := candidate + INTERVAL '1 day';
    END IF;

    -- For weekly, advance to the correct day of week
    IF NEW.schedule_type = 'weekly' AND NEW.schedule_day IS NOT NULL THEN
      WHILE EXTRACT(DOW FROM candidate)::int != NEW.schedule_day LOOP
        candidate := candidate + INTERVAL '1 day';
      END LOOP;
    END IF;

    -- Convert back to UTC for storage
    NEW.next_run_at := candidate AT TIME ZONE user_tz;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER lenses_compute_next_run
  BEFORE INSERT OR UPDATE ON lenses
  FOR EACH ROW EXECUTE FUNCTION compute_next_run_at();

-- =====================================================
-- Auto-create Morning Briefing for new users
-- =====================================================
CREATE OR REPLACE FUNCTION create_default_lens()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO lenses (user_id, name, prompt, schedule_type, schedule_time, lookback_hours, is_default)
  VALUES (
    NEW.id,
    'Morning Briefing',
    'Give me my top 3 action items, one thing I''m avoiding, and one small win.',
    'daily',
    '08:00',
    48,
    true
  )
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_create_default_lens
  AFTER INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION create_default_lens();

-- =====================================================
-- Max 10 lenses per user
-- =====================================================
CREATE OR REPLACE FUNCTION check_lens_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT count(*) FROM lenses WHERE user_id = NEW.user_id) >= 10 THEN
    RAISE EXCEPTION 'Maximum of 10 lenses per user';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_lens_limit
  BEFORE INSERT ON lenses
  FOR EACH ROW EXECUTE FUNCTION check_lens_limit();
