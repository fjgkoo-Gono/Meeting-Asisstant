-- Meeting Assistant — schema for Supabase
-- Run this once in the Supabase SQL Editor before connecting the app.

CREATE TABLE IF NOT EXISTS projects (
  id          SERIAL PRIMARY KEY,
  name        TEXT        NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meetings (
  id          SERIAL PRIMARY KEY,
  project_id  INTEGER     NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL,
  date        DATE        NOT NULL,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS materials (
  id             SERIAL PRIMARY KEY,
  meeting_id     INTEGER NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  type           TEXT    NOT NULL,
  filename       TEXT    NOT NULL,
  original_name  TEXT    NOT NULL,
  extracted_text TEXT,
  status         TEXT    NOT NULL DEFAULT 'processing',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id           SERIAL PRIMARY KEY,
  context_type TEXT    NOT NULL,
  context_id   INTEGER NOT NULL,
  role         TEXT    NOT NULL,
  content      TEXT    NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
