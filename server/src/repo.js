import { db, nowIso, newId } from "./db.js";

/* ---------- projects ---------- */

export const listProjects = () =>
  db
    .prepare(
      `SELECT p.*,
              (SELECT COUNT(*) FROM topics t WHERE t.project_id = p.id) AS topic_count,
              (SELECT COUNT(*) FROM questions q
                 JOIN topics t ON t.id = q.topic_id
                WHERE t.project_id = p.id) AS question_count,
              (SELECT COUNT(*) FROM answers a
                 JOIN questions q ON q.id = a.question_id
                 JOIN topics t ON t.id = q.topic_id
                WHERE t.project_id = p.id) AS answer_count
         FROM projects p
        ORDER BY p.created_at DESC`
    )
    .all();

export function createProject({ name, client, description, status }) {
  const ts = nowIso();
  const id = newId("prj");
  db.prepare(
    `INSERT INTO projects (id, name, client, description, status, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?)`
  ).run(id, name, client ?? null, description ?? null, status ?? "active", ts, ts);
  return getProject(id);
}

export const getProject = (id) => db.prepare(`SELECT * FROM projects WHERE id = ?`).get(id);

export function updateProject(id, patch) {
  const current = getProject(id);
  if (!current) return null;
  const next = { ...current, ...pick(patch, ["name", "client", "description", "status"]) };
  db.prepare(
    `UPDATE projects SET name=?, client=?, description=?, status=?, updated_at=? WHERE id=?`
  ).run(next.name, next.client, next.description, next.status, nowIso(), id);
  return getProject(id);
}

export const deleteProject = (id) => db.prepare(`DELETE FROM projects WHERE id = ?`).run(id).changes > 0;

/* ---------- topics ---------- */

export const listTopics = (projectId) =>
  db
    .prepare(
      `SELECT t.*,
              (SELECT COUNT(*) FROM questions q WHERE q.topic_id = t.id) AS question_count,
              (SELECT COUNT(*) FROM questions q
                WHERE q.topic_id = t.id
                  AND EXISTS (SELECT 1 FROM answers a WHERE a.question_id = q.id)) AS answered_count
         FROM topics t
        WHERE t.project_id = ?
        ORDER BY t.position, t.created_at`
    )
    .all(projectId);

export function createTopic(projectId, { title, objective, status }) {
  if (!getProject(projectId)) return null;
  const ts = nowIso();
  const id = newId("top");
  const { next } = db
    .prepare(`SELECT COALESCE(MAX(position), -1) + 1 AS next FROM topics WHERE project_id = ?`)
    .get(projectId);
  db.prepare(
    `INSERT INTO topics (id, project_id, title, objective, status, position, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?)`
  ).run(id, projectId, title, objective ?? null, status ?? "open", next, ts, ts);
  return getTopic(id);
}

export const getTopic = (id) => db.prepare(`SELECT * FROM topics WHERE id = ?`).get(id);

export function updateTopic(id, patch) {
  const current = getTopic(id);
  if (!current) return null;
  const next = { ...current, ...pick(patch, ["title", "objective", "status", "position"]) };
  db.prepare(
    `UPDATE topics SET title=?, objective=?, status=?, position=?, updated_at=? WHERE id=?`
  ).run(next.title, next.objective, next.status, next.position, nowIso(), id);
  return getTopic(id);
}

export const deleteTopic = (id) => db.prepare(`DELETE FROM topics WHERE id = ?`).run(id).changes > 0;

/* ---------- questions & answers ---------- */

export const getQuestion = (id) => db.prepare(`SELECT * FROM questions WHERE id = ?`).get(id);

export function createQuestion(topicId, { body, author, parent_id }) {
  if (!getTopic(topicId)) return null;
  if (parent_id) {
    const parent = getQuestion(parent_id);
    if (!parent || parent.topic_id !== topicId) return null;
  }
  const ts = nowIso();
  const id = newId("qst");
  db.prepare(
    `INSERT INTO questions (id, topic_id, parent_id, body, author, status, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?)`
  ).run(id, topicId, parent_id ?? null, body, author ?? null, "open", ts, ts);
  return getQuestion(id);
}

export function updateQuestion(id, patch) {
  const current = getQuestion(id);
  if (!current) return null;
  const next = { ...current, ...pick(patch, ["body", "status", "author"]) };
  db.prepare(`UPDATE questions SET body=?, status=?, author=?, updated_at=? WHERE id=?`).run(
    next.body,
    next.status,
    next.author,
    nowIso(),
    id
  );
  return getQuestion(id);
}

export const deleteQuestion = (id) =>
  db.prepare(`DELETE FROM questions WHERE id = ?`).run(id).changes > 0;

export const getAnswer = (id) => db.prepare(`SELECT * FROM answers WHERE id = ?`).get(id);

export function createAnswer(questionId, data) {
  if (!getQuestion(questionId)) return null;
  const ts = nowIso();
  const id = newId("ans");
  db.prepare(
    `INSERT INTO answers (id, question_id, kind, body_html, audio_file, audio_mime, audio_bytes,
                          audio_duration_ms, transcript, transcript_status, author, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(
    id,
    questionId,
    data.kind,
    data.body_html ?? null,
    data.audio_file ?? null,
    data.audio_mime ?? null,
    data.audio_bytes ?? null,
    data.audio_duration_ms ?? null,
    data.transcript ?? null,
    data.kind === "audio" ? "pending" : "none",
    data.author ?? null,
    ts,
    ts
  );
  return getAnswer(id);
}

export function updateAnswer(id, patch) {
  const current = getAnswer(id);
  if (!current) return null;
  const next = {
    ...current,
    ...pick(patch, ["body_html", "transcript", "transcript_status", "author"]),
  };
  db.prepare(
    `UPDATE answers SET body_html=?, transcript=?, transcript_status=?, author=?, updated_at=? WHERE id=?`
  ).run(next.body_html, next.transcript, next.transcript_status, next.author, nowIso(), id);
  return getAnswer(id);
}

export const deleteAnswer = (id) => db.prepare(`DELETE FROM answers WHERE id = ?`).run(id).changes > 0;

/* Questions of a topic as a nested thread, each node carrying its answers. */
export function questionThread(topicId) {
  const rows = db
    .prepare(`SELECT * FROM questions WHERE topic_id = ? ORDER BY created_at`)
    .all(topicId);
  const answers = db
    .prepare(
      `SELECT a.* FROM answers a
         JOIN questions q ON q.id = a.question_id
        WHERE q.topic_id = ?
        ORDER BY a.created_at`
    )
    .all(topicId);

  const byId = new Map(rows.map((q) => [q.id, { ...q, answers: [], children: [] }]));
  for (const a of answers) byId.get(a.question_id)?.answers.push(a);

  const roots = [];
  for (const node of byId.values()) {
    const parent = node.parent_id ? byId.get(node.parent_id) : null;
    (parent ? parent.children : roots).push(node);
  }
  return roots;
}

/* Whole project, nested — the bundle handed to the LLM for processing. */
export function projectBundle(projectId) {
  const project = getProject(projectId);
  if (!project) return null;
  return {
    ...project,
    topics: listTopics(projectId).map((t) => ({ ...t, questions: questionThread(t.id) })),
  };
}

function pick(obj, keys) {
  const out = {};
  for (const k of keys) if (obj?.[k] !== undefined) out[k] = obj[k];
  return out;
}

/* Audio answers awaiting transcription — the work queue for the STT/LLM step. */
export const pendingTranscriptions = () =>
  db
    .prepare(
      `SELECT a.id, a.question_id, a.audio_file, a.audio_mime, a.audio_duration_ms, a.created_at,
              q.body AS question, t.id AS topic_id, t.title AS topic, t.objective,
              p.id AS project_id, p.name AS project
         FROM answers a
         JOIN questions q ON q.id = a.question_id
         JOIN topics t ON t.id = q.topic_id
         JOIN projects p ON p.id = t.project_id
        WHERE a.kind = 'audio' AND a.transcript_status = 'pending'
        ORDER BY a.created_at`
    )
    .all();

/* Audio files belonging to a project, topic or question — collected before a
   cascade delete so the files on disk go with the rows. Counter questions nest
   arbitrarily deep, so the question scope walks the whole subtree. */
export function audioFilesUnder(scope, id) {
  const sql = {
    project: `SELECT a.audio_file FROM answers a
                JOIN questions q ON q.id = a.question_id
                JOIN topics t ON t.id = q.topic_id
               WHERE a.audio_file IS NOT NULL AND t.project_id = ?`,
    topic: `SELECT a.audio_file FROM answers a
              JOIN questions q ON q.id = a.question_id
             WHERE a.audio_file IS NOT NULL AND q.topic_id = ?`,
    question: `WITH RECURSIVE subtree(id) AS (
                 SELECT id FROM questions WHERE id = ?
                 UNION ALL
                 SELECT q.id FROM questions q JOIN subtree s ON q.parent_id = s.id
               )
               SELECT a.audio_file FROM answers a
                 JOIN subtree s ON s.id = a.question_id
                WHERE a.audio_file IS NOT NULL`,
  }[scope];
  if (!sql) throw new Error(`unknown scope: ${scope}`);
  return db.prepare(sql).all(id).map((r) => r.audio_file);
}
