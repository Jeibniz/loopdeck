# Plan: loopdeck v1

Work list for `/autopilot`. Ordered; each task is independently verifiable (TDD: red → green → refactor).
Grounded in `docs/domain/` + ADRs 0001–0003. Goal: `ws/goals/loopdeck.md`.

> **Queue note:** repo is local-only (no GitHub remote yet) → **this file IS the queue**. Once
> `Jeibniz/loopdeck` exists, `/tickets bootstrap` can mirror these into GitHub Issues.

## T1 — Project tooling & skeleton

- Add deps: `fastify`, `@fastify/static`, `yaml@^2.8`, `cron-parser@^5.5`, `cronstrue@^3.14`, `open`, `get-port`, `p-limit`; dev: `tsup`, `vitest`, types. Configure `tsup` (server CJS + browser IIFE → `dist/public`), `package.json` `bin.loopdeck`, scripts `dev`/`build`/`start`/`test`.
- **Verify:** `pnpm build` produces `dist/cli.js` + `dist/public/`; `pnpm test` runs (0 tests OK).

## T2 — `core/paths.ts` (under-root guard + atomic write) _(local-server-safety)_

- `assertUnderRoot(root, candidate)`: realpath + prefix check, throw 403-mapped error on escape. `atomicWrite(path, text)`: tmp-in-same-dir + `rename`, preserve mode.
- **Verify (T):** unit tests — traversal/`..`/abs-outside rejected; atomic write replaces content; symlink-outside rejected.

## T3 — `core/loopsDoc.ts` (comment-preserving read/edit/write) ← heart _(yaml-document-api, ADR 0001/0002)_

- `readLoops(text)` → `{ stage, loops: Loop[] (core+passthrough), raw, errors }` via `parseDocument` (+ `toJS` for display; flag unparseable on non-empty `doc.errors`).
- Ops on the Document: `updateStage`, `toggleEnabled(i)`, `updateLoop(i, patch)` (preserve block-scalar `type` for `command`), `deleteLoop(i)`, `addLoop(loop)` via `get('loops',true).add(createNode(...))`. Serialize `toString({lineWidth:0})`.
- **Verify (T):** round-trip tests against **real fixtures** copied from scaffold template + `vakio-mono/loops.yaml` (folded `command:`, `repo`/`reviewer`/`routine`, no `kind`): each op applies; **all comments + blank lines + trailing newline preserved, untouched lines byte-identical; `routine`/unknown fields intact**.

## T4 — `core/validate.ts` _(cron-libraries, loops-schema)_

- `validateCron(expr)` → `{valid, message?, human?, next?}` (cron-parser strict-off; cronstrue display). `validateLoop`/`validateStage`: name non-empty + unique-in-project (case-insensitive), `kind` enum only-if-present, `stage` enum.
- **Verify (T):** valid/invalid cron incl. 5-field; duplicate-name rejection; enum rejection; cronstrue hint string.

## T5 — `core/frontmatter.ts` (agents/skills) _(loops-schema)_

- Parse `---`-delimited frontmatter → `{name, description, body}`; edit name/description preserving body; serialize. (Use `yaml` for the frontmatter block.)
- **Verify (T):** round-trip an agent + a skill md; body byte-identical after a description edit.

## T6 — `core/discover.ts` (scan) _(loops-schema, local-server-safety)_

- `walkSuperFolder(root,{maxDepth=6})`: readdir recursion; ignore `node_modules .git dist build .next .cache coverage` + dotdirs except `.claude`; detect `loops.yaml` + `.claude/{agents,skills}`; **realpath dedupe (files) + visited-dir set (no symlink-dir follow)**; `p-limit(16)`. Returns `Project[]`.
- **Verify (T):** fixture monorepo — ignores honored, depth cap, projects grouped, **symlinked `.claude` deduped by realpath**, unparseable loops.yaml surfaced not thrown.

## T7 — `core/diff.ts`

- Unified diff old vs new text for the confirm modal.
- **Verify (T):** diff of a one-line change shows exactly that hunk.

## T8 — Fastify server + routes _(ADR 0003, local-server-safety)_

- `app.ts` + routes: `GET /api/scan`, `GET /api/file`, `POST /api/loops/preview`, `PUT /api/loops`, `PUT /api/frontmatter`. Typed `op`+`payload`. Every path `assertUnderRoot`. PUT carries original `mtime` → re-stat → 409 if stale → validate → atomicWrite.
- **Verify (T):** Fastify `inject()` — scan returns projects; preview returns diff; PUT writes; PUT 409 on stale mtime; 400 on invalid payload; 403 on traversal.

## T9 — Frontend (vanilla TS)

- `index.html` + `main.ts` + `api.ts` + `styles.css`. Views: project list → loops table (toggle/add/edit/delete + stage select, cron hint, reviewer/repo read-only) with **diff-confirm modal**; agents/skills browser (frontmatter edit + read-only body). Footer: "edits files only — run `/loops apply` in Claude Code." Use the `frontend-design` skill for a clean, CDN-free look.
- **Verify (UX):** `/ux-cycle` — scan renders, toggle→confirm→write round-trips, bad cron blocked, agent description edit works.

## T10 — CLI + packaging _(ADR 0003)_

- `cli.ts`: parse `--port`/`--no-open`, `getPort()` (default 4317), bind `127.0.0.1`, banner, `open(url)`, graceful Ctrl-C; resolve static `dist/public`.
- **Verify:** `node dist/cli.js` in a fixture super-folder opens browser, UI lists projects.

## T11 — README + ship

- README: what it is, `pnpm i && pnpm start`, screenshot, the "/loops apply after editing" note, scope/non-goals.
- **Verify:** full `pnpm lint && pnpm build && pnpm test` green; then **CHECKPOINT** — create public `Jeibniz/loopdeck` repo (confirm gh account) → push → PR.

## Dependency order

T1 → {T2, T3, T4, T5, T7} (T3 depends T2; rest parallel) → T6 (deps T3) → T8 (deps T2–T7) → T9 (deps T8) → T10 (deps T8/T9) → T11.

## Checkpoints (human)

- Before creating the public `Jeibniz/loopdeck` GitHub repo (T11) — confirm `gh` account/visibility.
- Any network call or write outside the super-folder (there should be none).

## Follow-ups (deferred from the v1 review panel + UX pass — file as issues once the repo/queue exists)

Review verdict: code & security had **no Must-fix**; web-design Must-fix (keyboard a11y) were **fixed in v1**. Deferred Consider items:

- **a11y polish:** full focus-trap in the modal (baseline focus-move + Escape are done); `role="tablist"/"tab"` on the agents/skills tabs (currently buttons); wrap the 6-col loops table in `overflow-x:auto` for narrow viewports.
- **diff view:** special-case `+++`/`---`/`@@` lines (currently a full-file diff, no hunking — fine for tiny files).
- **frontmatter:** preserve CRLF EOL if present (LF assumed); `/api/frontmatter` currently skips the staleness guard — add mtime parity.
- **server hardening (low):** smaller `bodyLimit`; optionally constrain `/api/file` reads to `loops.yaml` + `.claude/**/*.md`.
- **fidelity caveat:** editing a *folded* `command` value via `updateLoop` re-emits through `CST.setScalarValue`; single-line commands are clean. Rare (long review prompts aren't retyped in a form).
