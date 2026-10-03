# dsops-acquisition — instructions for Claude

Project acquisition and requirements gathering: the internal tool Nexular runs discovery
through when scoping a DSOPS engagement. Stack: React 18, TypeScript, Vite, Tailwind CSS,
Radix UI on the front; Express 4 + SQLite (better-sqlite3) on the back; Node.js/npm 22 LTS.

## This repo is a support system, not a DSOPS product surface

Read this before applying the conventions from the other repos:

- **It owns no work package.** It sits outside the v0 WP schedule in `../dsops-docs/03-build-plan.md`.
- **`../dsops-docs/02-technical-specification.md` does not cover it.** There are no requirement
  IDs to cite, because the spec does not describe this system. Do not invent them, and do not
  bend this repo's model to fit the spec'd entities — it touches none of them.
- **The stack is deliberately different.** SQLite and Express, not Spring Boot and PostgreSQL.
  That is a decision, not drift: the tool is self-contained and runs locally. Don't "align" it
  with `../dsops-api/` without a reason beyond consistency.
- **It has no auth, by design, for now.** Attribution is a free-text name in `localStorage`.
  Do not wire it to Keycloak or the spec §10.1 passkey flow — those belong to the product.

What it does share with the rest of the monorepo: the build log. End every run here with a
`../dsops-docs/build-log.md` entry (newest first, template in `03-build-plan.md` §2.4), so
project-wide progress stays visible even though this work is off the WP schedule.

## Read before working here

1. `../dsops-docs/00-start-here.md` — orientation for the monorepo.
2. `../dsops-docs/03-build-plan.md` §2 — the run protocol, which applies here even without a WP.
3. The last 5 entries of `../dsops-docs/build-log.md` for recent context.
4. `README.md` and `server/README.md` here — the model, the endpoint table, current status.

Never read `../dsops-docs/review/` (generated Word copies for humans). Never edit
`../../Immutable Documents/`.

## Sibling repositories

- `../dsops-docs/` — spec, build plan, ADRs, build log. Source of truth for the product; this
  repo appears only in the build log.
- `../dsops-frontend/` — the DSOPS web dashboard (WP-12). This repo was extracted from it on
  2026-10-03; the four shadcn primitives in `src/components/ui/`, `src/lib/utils.ts` and
  `ThemeToggle.tsx` are copies that exist in both. They are generated boilerplate — if one
  needs changing here, change it here and leave the other alone.
- `../dsops-api/`, `../dsops-contracts/` — the product backend and its contracts. This repo
  calls neither.

## Repo-specific rules

- **Two npm projects.** The UI is at the root; the API is `server/` with its own
  `package.json`. Install and run them separately.
- `npm install` is slow over the Cowork file bridge; prefer running it natively on the lead
  engineer's machine.
- **Deletes cascade and take files with them.** `repo.js` walks the question subtree with a
  recursive CTE and unlinks the audio off disk. Preserve that when touching delete paths — an
  orphaned `uploads/` is the failure mode.
- **Stored HTML is rendered with `dangerouslySetInnerHTML`.** Any change that widens who can
  author answers needs sanitisation first.
- Audio is `audio/webm;codecs=opus` from the browser `MediaRecorder`. Keep the stored bytes
  untouched — playback is verified byte-exact.
- No new dependency without a one-line reason in the PR. `multer` is pinned to 2.x on purpose:
  1.x is deprecated and flagged vulnerable.
