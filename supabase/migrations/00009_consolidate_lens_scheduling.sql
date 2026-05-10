-- =====================================================
-- Consolidate lens scheduling in SQL
-- =====================================================
--
-- Keeps next_run_at calculation in one database-owned helper. Edge Functions
-- should call mark_lens_execution_success() after a successful run instead of
-- reimplementing timezone and weekly scheduling logic.
--

SET search_path = public, extensions;

CREATE OR REPLACE FUNCTION calculate_next_lens_run_at(
  p_user_id UUID,
  p_schedule_type lens_schedule_type,
  p_schedule_time TIME,
  p_schedule_day SMALLINT,
  p_is_active BOOLEAN,
  p_from TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  user_tz TEXT;
  local_now TIMESTAMP;
  candidate TIMESTAMP;
BEGIN
  IF p_is_active = false THEN
    RETURN NULL;
  END IF;

  SELECT timezone INTO user_tz FROM users WHERE id = p_user_id;
  user_tz := COALESCE(user_tz, 'America/New_York');

  local_now := (p_from AT TIME ZONE user_tz);
  candidate := date_trunc('day', local_now) + p_schedule_time;

  IF candidate <= local_now THEN
    candidate := candidate + INTERVAL '1 day';
  END IF;

  IF p_schedule_type = 'weekly' AND p_schedule_day IS NOT NULL THEN
    WHILE EXTRACT(DOW FROM candidate)::int != p_schedule_day LOOP
      candidate := candidate + INTERVAL '1 day';
    END LOOP;
  END IF;

  RETURN candidate AT TIME ZONE user_tz;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION compute_next_run_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = false THEN
    NEW.next_run_at := NULL;
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' OR
     OLD.schedule_time IS DISTINCT FROM NEW.schedule_time OR
     OLD.schedule_day IS DISTINCT FROM NEW.schedule_day OR
     OLD.schedule_type IS DISTINCT FROM NEW.schedule_type OR
     OLD.updated_at IS DISTINCT FROM NEW.updated_at OR
     (OLD.is_active = false AND NEW.is_active = true) THEN
    NEW.next_run_at := calculate_next_lens_run_at(
      NEW.user_id,
      NEW.schedule_type,
      NEW.schedule_time,
      NEW.schedule_day,
      NEW.is_active
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION mark_lens_execution_success(
  p_lens_id UUID,
  p_executed_at TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE(next_run_at TIMESTAMPTZ) AS $$
DECLARE
  updated_next_run_at TIMESTAMPTZ;
BEGIN
  UPDATE lenses
  SET
    last_run_at = p_executed_at,
    next_run_at = calculate_next_lens_run_at(
      user_id,
      schedule_type,
      schedule_time,
      schedule_day,
      is_active,
      p_executed_at
    ),
    consecutive_failures = 0,
    last_error = NULL,
    last_error_at = NULL
  WHERE id = p_lens_id
  RETURNING lenses.next_run_at INTO updated_next_run_at;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lens not found: %', p_lens_id;
  END IF;

  RETURN QUERY SELECT updated_next_run_at;
END;
$$ LANGUAGE plpgsql;
