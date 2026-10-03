import fs from "node:fs";
import path from "node:path";
import express from "express";
import cors from "cors";
import multer from "multer";
import { UPLOAD_DIR, newId } from "./db.js";
import * as repo from "./repo.js";

const PORT = Number(process.env.PORT ?? 4000);
const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));

/* Audio arrives as webm from the browser's MediaRecorder; it is stored as-is so the
   speech-to-text step downstream gets the original container. */
const upload = multer({
  limits: { fileSize: 50 * 1024 * 1024 },
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, _file, cb) => cb(null, `${newId("aud")}.webm`),
  }),
});

const ok = (res, body, code = 200) => res.status(code).json(body);
const notFound = (res, what = "resource") => res.status(404).json({ error: `${what} not found` });
const bad = (res, msg) => res.status(400).json({ error: msg });

/** Removes audio files left behind by a cascade delete. */
const dropAudio = (files) => {
  for (const file of files) fs.rmSync(path.join(UPLOAD_DIR, file), { force: true });
};

/** Wrap a handler so a thrown error becomes a 500 instead of a hung request. */
const h = (fn) => (req, res) => {
  try {
    fn(req, res);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
};

app.get("/api/health", (_req, res) => ok(res, { status: "up", time: new Date().toISOString() }));

/* ---------- projects ---------- */

app.get("/api/projects", h((_req, res) => ok(res, repo.listProjects())));

app.post(
  "/api/projects",
  h((req, res) => {
    const name = req.body?.name?.trim();
    if (!name) return bad(res, "name is required");
    ok(res, repo.createProject({ ...req.body, name }), 201);
  })
);

app.get(
  "/api/projects/:id",
  h((req, res) => {
    const bundle = repo.projectBundle(req.params.id);
    return bundle ? ok(res, bundle) : notFound(res, "project");
  })
);

app.patch(
  "/api/projects/:id",
  h((req, res) => {
    const updated = repo.updateProject(req.params.id, req.body ?? {});
    return updated ? ok(res, updated) : notFound(res, "project");
  })
);

app.delete(
  "/api/projects/:id",
  h((req, res) => {
    const files = repo.audioFilesUnder("project", req.params.id);
    if (!repo.deleteProject(req.params.id)) return notFound(res, "project");
    dropAudio(files);
    res.status(204).end();
  })
);

/* ---------- topics ---------- */

app.get(
  "/api/projects/:id/topics",
  h((req, res) =>
    repo.getProject(req.params.id) ? ok(res, repo.listTopics(req.params.id)) : notFound(res, "project")
  )
);

app.post(
  "/api/projects/:id/topics",
  h((req, res) => {
    const title = req.body?.title?.trim();
    if (!title) return bad(res, "title is required");
    const topic = repo.createTopic(req.params.id, { ...req.body, title });
    return topic ? ok(res, topic, 201) : notFound(res, "project");
  })
);

app.get(
  "/api/topics/:id",
  h((req, res) => {
    const topic = repo.getTopic(req.params.id);
    if (!topic) return notFound(res, "topic");
    ok(res, { ...topic, questions: repo.questionThread(topic.id) });
  })
);

app.patch(
  "/api/topics/:id",
  h((req, res) => {
    const updated = repo.updateTopic(req.params.id, req.body ?? {});
    return updated ? ok(res, updated) : notFound(res, "topic");
  })
);

app.delete(
  "/api/topics/:id",
  h((req, res) => {
    const files = repo.audioFilesUnder("topic", req.params.id);
    if (!repo.deleteTopic(req.params.id)) return notFound(res, "topic");
    dropAudio(files);
    res.status(204).end();
  })
);

/* ---------- questions ---------- */

app.post(
  "/api/topics/:id/questions",
  h((req, res) => {
    const body = req.body?.body?.trim();
    if (!body) return bad(res, "body is required");
    const question = repo.createQuestion(req.params.id, { ...req.body, body });
    return question ? ok(res, question, 201) : notFound(res, "topic or parent question");
  })
);

app.patch(
  "/api/questions/:id",
  h((req, res) => {
    const updated = repo.updateQuestion(req.params.id, req.body ?? {});
    return updated ? ok(res, updated) : notFound(res, "question");
  })
);

app.delete(
  "/api/questions/:id",
  h((req, res) => {
    const files = repo.audioFilesUnder("question", req.params.id);
    if (!repo.deleteQuestion(req.params.id)) return notFound(res, "question");
    dropAudio(files);
    res.status(204).end();
  })
);

/* ---------- answers ---------- */

app.post(
  "/api/questions/:id/answers",
  h((req, res) => {
    const html = req.body?.body_html?.trim();
    if (!html) return bad(res, "body_html is required");
    const answer = repo.createAnswer(req.params.id, {
      kind: "text",
      body_html: html,
      author: req.body?.author,
    });
    return answer ? ok(res, answer, 201) : notFound(res, "question");
  })
);

app.post("/api/questions/:id/answers/audio", upload.single("audio"), (req, res) => {
  if (!req.file) return bad(res, "audio file is required (field name: audio)");
  const answer = repo.createAnswer(req.params.id, {
    kind: "audio",
    audio_file: req.file.filename,
    audio_mime: "audio/webm",
    audio_bytes: req.file.size,
    audio_duration_ms: req.body?.duration_ms ? Number(req.body.duration_ms) : null,
    author: req.body?.author,
  });
  if (!answer) {
    fs.rmSync(path.join(UPLOAD_DIR, req.file.filename), { force: true });
    return notFound(res, "question");
  }
  ok(res, answer, 201);
});

app.get(
  "/api/answers/:id/audio",
  h((req, res) => {
    const answer = repo.getAnswer(req.params.id);
    if (!answer?.audio_file) return notFound(res, "audio");
    const file = path.join(UPLOAD_DIR, answer.audio_file);
    if (!fs.existsSync(file)) return notFound(res, "audio file");
    res.type(answer.audio_mime ?? "audio/webm");
    fs.createReadStream(file).pipe(res);
  })
);

app.patch(
  "/api/answers/:id",
  h((req, res) => {
    const updated = repo.updateAnswer(req.params.id, req.body ?? {});
    return updated ? ok(res, updated) : notFound(res, "answer");
  })
);

app.delete(
  "/api/answers/:id",
  h((req, res) => {
    const answer = repo.getAnswer(req.params.id);
    if (!answer) return notFound(res, "answer");
    repo.deleteAnswer(answer.id);
    if (answer.audio_file) fs.rmSync(path.join(UPLOAD_DIR, answer.audio_file), { force: true });
    res.status(204).end();
  })
);

/* Audio answers still awaiting transcription — the queue the STT/LLM step polls. */
app.get(
  "/api/transcription-queue",
  h((_req, res) => ok(res, repo.pendingTranscriptions()))
);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status ?? 500).json({ error: err.message ?? "server error" });
});

app.listen(PORT, "0.0.0.0", () => console.log(`acquisition api listening on :${PORT}`));
