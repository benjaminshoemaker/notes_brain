-- Ensure extensions schema exists and is in the search path.
-- Supabase often installs extension functions (e.g. uuid_generate_v4) into the `extensions` schema.
CREATE SCHEMA IF NOT EXISTS extensions;
SET search_path = public, extensions;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- Categories enum
CREATE TYPE note_category AS ENUM (
  'ideas',
  'projects',
  'family',
  'friends',
  'health',
  'admin',
  'uncategorized'
);

-- Note type enum
CREATE TYPE note_type AS ENUM ('text', 'voice', 'file');

-- Classification status enum
CREATE TYPE classification_status AS ENUM ('pending', 'completed', 'failed', 'manual');

-- Device platform enum (MVP targets Android + Web)
CREATE TYPE device_platform AS ENUM ('android', 'web');

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notes table
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  type note_type NOT NULL,
  content TEXT,
  category note_category NOT NULL DEFAULT 'uncategorized',
  classification_confidence FLOAT CHECK (
    classification_confidence >= 0 AND classification_confidence <= 1
  ),
  classification_status classification_status NOT NULL DEFAULT 'pending',
  search_vector TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('english', COALESCE(content, ''))
  ) STORED
);

-- Attachments table (separate for flexibility)
CREATE TABLE attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Daily summaries table
CREATE TABLE daily_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  summary_date DATE NOT NULL,
  content JSONB NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  UNIQUE(user_id, summary_date)
);

-- Devices table (push token stored per device/platform)
CREATE TABLE devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform device_platform NOT NULL,
  push_token TEXT,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, platform)
);

-- Indexes
CREATE INDEX idx_notes_user_id ON notes(user_id);
CREATE INDEX idx_notes_category ON notes(category);
CREATE INDEX idx_notes_created_at ON notes(created_at DESC);
CREATE INDEX idx_notes_classification_status ON notes(classification_status);
CREATE INDEX idx_notes_search_vector ON notes USING GIN(search_vector);
CREATE INDEX idx_attachments_note_id ON attachments(note_id);
CREATE INDEX idx_daily_summaries_user_date ON daily_summaries(user_id, summary_date);
CREATE INDEX idx_devices_user_id ON devices(user_id);

-- Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;

-- RLS Policies (user can only access own data)
CREATE POLICY users_policy ON users FOR ALL USING (auth.uid() = id);
CREATE POLICY notes_policy ON notes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY attachments_policy ON attachments FOR ALL
  USING (note_id IN (SELECT id FROM notes WHERE user_id = auth.uid()));
CREATE POLICY daily_summaries_policy ON daily_summaries FOR ALL USING (auth.uid() = user_id);
CREATE POLICY devices_policy ON devices FOR ALL USING (auth.uid() = user_id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER notes_updated_at BEFORE UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER devices_updated_at BEFORE UPDATE ON devices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
