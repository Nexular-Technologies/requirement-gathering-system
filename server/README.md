# Acquisition API

Project acquisition and requirements gathering — a business support system alongside DSOPS.
Express + SQLite, consumed by the **Acquisition** tab in the dashboard.

## Model

```
Project          one engagement
 └── Topic       carries an objective
      └── Question          root question against the objective
           ├── Question     counter question (nests arbitrarily deep)
           └── Answer       rich text, or a webm audio submission
```

Audio answers are stored as `.webm` on disk and start at `transcript_status = 'pending'`.
The speech-to-text / LLM step picks them off `GET /api/transcription-queue`, then writes
the text back with `PATCH /api/answers/:id`.

## Run

```bash
npm install
npm run seed     # optional: one worked example, skipped if data already exists
npm start        # http://localhost:4000
```

`DATA_DIR` (default `./data`) holds `acquisition.db` and `uploads/`.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/health` | liveness |
| GET/POST | `/api/projects` | list / create |
| GET | `/api/projects/:id` | project with topics, threads and answers nested |
| PATCH/DELETE | `/api/projects/:id` | update / delete (cascades) |
| GET/POST | `/api/projects/:id/topics` | list / create topics |
| GET | `/api/topics/:id` | topic with its question thread |
| PATCH/DELETE | `/api/topics/:id` | update / delete |
| POST | `/api/topics/:id/questions` | add a question; `parent_id` makes it a counter question |
| PATCH/DELETE | `/api/questions/:id` | update status or body / delete |
| POST | `/api/questions/:id/answers` | rich text answer (`body_html`) |
| POST | `/api/questions/:id/answers/audio` | multipart webm (field `audio`, optional `duration_ms`) |
| GET | `/api/answers/:id/audio` | stream the stored webm |
| PATCH/DELETE | `/api/answers/:id` | write transcript / delete |
| GET | `/api/transcription-queue` | audio answers awaiting transcription, with their question context |

Deletes cascade through the thread, and the audio files on disk go with the rows.
