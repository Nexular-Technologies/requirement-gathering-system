import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

export const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.resolve(import.meta.dirname, "../data");
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

export const db = new Database(path.join(DATA_DIR, "acquisition.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS projects (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  client      TEXT,
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'active',
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS topics (
  id         TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  objective  TEXT,
  status     TEXT NOT NULL DEFAULT 'open',
  position   INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_topics_project ON topics(project_id);

-- A question is a node in a thread. parent_id NULL = root question of the topic;
-- parent_id set = counter question raised against another question.
CREATE TABLE IF NOT EXISTS questions (
  id         TEXT PRIMARY KEY,
  topic_id   TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  parent_id  TEXT REFERENCES questions(id) ON DELETE CASCADE,
  body       TEXT NOT NULL,
  author     TEXT,
  status     TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_questions_topic ON questions(topic_id);
CREATE INDEX IF NOT EXISTS idx_questions_parent ON questions(parent_id);

-- A response attributed to one question: rich text, or a webm audio submission
-- (transcript filled in later by the speech-to-text / LLM pipeline).
CREATE TABLE IF NOT EXISTS answers (
  id               TEXT PRIMARY KEY,
  question_id      TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  kind             TEXT NOT NULL CHECK (kind IN ('text','audio')),
  body_html        TEXT,
  audio_file       TEXT,
  audio_mime       TEXT,
  audio_bytes      INTEGER,
  audio_duration_ms INTEGER,
  transcript       TEXT,
  transcript_status TEXT NOT NULL DEFAULT 'none',
  author           TEXT,
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_answers_question ON answers(question_id);
`);

export const nowIso = () => new Date().toISOString();
export const newId = (prefix) => `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
