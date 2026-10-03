# dsops-acquisition

Project acquisition and requirements gathering — the internal discovery tool Nexular runs
engagements through, extracted from `dsops-frontend` so it stays off the DSOPS product surface.

Vite + React UI (`src/`) over an Express + SQLite API (`server/`). API details and the full
endpoint table live in [`server/README.md`](server/README.md).

```
Project          one engagement
 └── Topic       carries an objective
      └── Question          root question against the objective
           ├── Question     counter question (nests arbitrarily deep)
           └── Answer       rich text, or a webm audio submission
```

Audio answers land on disk at `transcript_status = 'pending'`. The speech-to-text / LLM step
pulls them off `GET /api/transcription-queue` with their question, topic objective and project
as context, then writes the text back with `PATCH /api/answers/:id`. **No worker drains that
queue yet** — see the open items below.

## Run locally

Two terminals:

```bash
cd server && npm install && npm run seed && npm start   # API on :4000
npm install && npm run dev                              # UI on :5173, /api proxied to :4000
```

`DATA_DIR` (default `server/data`) holds `acquisition.db` and `uploads/`.

## Run containerised

```bash
docker compose up --build    # UI on http://localhost:8080, API on http://localhost:4000
```

nginx serves the built UI and proxies `/api` to the API container, so the browser sees one
origin. The SQLite file and uploads live in the `acquisition-data` named volume.

## Status

Working end to end: full CRUD, nested counter questions, rich-text and audio answers,
byte-exact playback, transcription queue in and out, cascade delete taking audio files off
disk with the rows.

Open items:

- **The compose images have never been built** — `docker compose config` validates, but Docker
  Desktop was down for both the original run and the extraction.
- **No transcription worker.** The queue endpoint exists; nothing drains it.
- **No automated tests.** Everything so far is hand-verified.
- **No auth.** Attribution is a free-text name in `localStorage`. Rich text is stored as HTML
  and rendered with `dangerouslySetInnerHTML` — safe only while every author is trusted and
  this stays on the internal network. Sanitise before exposing it any wider.
