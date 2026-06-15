# Goal: loopdeck — visualize & CRUD the agent-scaffold autonomy YAML

- **Slug:** loopdeck **Created:** 2026-06-15 **Status:** done (live)

> Built, reviewed, shipped — **live** at github.com/Jeibniz/loopdeck (PR #1 merged 2026-06-15, v1.0.0). Grounded in `docs/domain/` + ADRs 0001–0003. Follow-on work (CC assist, editable bodies) on its own branches.

## Problem / why now

The agent-scaffold's scheduled autonomy is declared in `loops.yaml` (one per project) and its agents/skills are Markdown files with YAML frontmatter under `.claude/`. Today these are edited by hand, raw. The scaffold's own `loops.yaml` header already promises _"a future UI manages this."_ As the number of scaffolded projects grows (kontera, vakio-mono, …), there's no way to _see_ the autonomy config across a whole monorepo / super-folder at a glance, or to safely toggle/add/edit loops without hand-editing YAML and risking comment loss. loopdeck is that UI: run `npx loopdeck` (or, for v1, `pnpm start`) from a super-folder, see every project's loops in a table, CRUD them with comments preserved, and browse agents/skills.

## Acceptance criteria (the contract)

> Concrete, testable, grounded in `docs/domain/`. Each (T) = unit/integration test, (UX) = live `/ux-cycle`.

- [ ] (UX) From a clone of `Jeibniz/loopdeck`, `pnpm i && pnpm start` (and `node dist/cli.js`) starts a server bound to `127.0.0.1` and opens the browser with no config. _(ADR 0003)_
- [ ] (T) Scan from cwd finds every `loops.yaml` and `.claude/{agents,skills}` underneath; ignores `node_modules`/`.git`/build dirs; **dedupes symlink-shared `.claude` by realpath** and does not follow symlinked dirs; depth-capped; a malformed `loops.yaml` is surfaced as "unparseable" (caught via non-empty `doc.errors`) rather than crashing the scan. _(loops-schema, yaml-document-api, local-server-safety)_
- [ ] (T) Loops table supports toggle-enabled / add / edit / delete + `stage` change; **every write previews a diff, the user confirms, then writes**; **all YAML comments, blank lines, field order, and trailing newline are preserved** and untouched lines are byte-identical — asserted against **real scaffold + vakio-mono fixtures** (incl. the folded `command: >` and the producer-only/no-`kind` file). _(yaml-document-api, ADR 0002)_
- [ ] (T) **Unknown fields are preserved on every write**; `routine:` is never edited or dropped; `reviewer:`/`repo:` are shown **read-only**. Editing a `command` that was a block scalar keeps the `>`/`|` style. _(loops-schema, ADR 0001/0002)_
- [ ] (T) Invalid cron is flagged in the UI with a `cronstrue` human hint and **blocked on write** (validated by `cron-parser` `CronExpressionParser.parse`, `strict` off, accepting 5-field); duplicate loop names within a project rejected; `kind ∈ {consumer,producer}` enforced **only when present**; `stage ∈ {early,steady,maintenance}`. _(cron-libraries, loops-schema)_
- [ ] (UX) Agents/skills browser lists name + description and can edit frontmatter (diff-confirmed, body untouched); body shown read-only.
- [ ] (T) Writes are atomic (tmp-in-same-dir + `rename`), under-root realpath-guarded (path traversal → `403`), and return `409` on stale `mtime`. _(local-server-safety)_
- [ ] (T) `vitest` green for discover (incl. symlink dedupe) / loops round-trip / validation; (UX) live-UX acceptance via `/ux-cycle` passes; README documents how to run it.

## Constraints

- Stack: TypeScript + tsup/esbuild, Node ≥18 (matches the `--ts` starter), Fastify + `@fastify/static`, `yaml` (eemeli) v2 Document API, `cronstrue` + `cron-parser`, vanilla-TS frontend (no framework), bundled — **no CDN / no network at runtime**.
- It only edits the declarative files. It must **not** itself run `/loops apply` or `/autopilot`; a footer reminds the user to run `/loops apply` in Claude Code after editing.
- Public repo under personal GitHub user **Jeibniz** (outside the vakio org).
- Full design reference: `/Users/jonathan/.claude/plans/curried-cooking-wombat.md`.

## Out of scope (YAGNI)

- Publishing to the npm registry (deferred — see Distribution decision; v1 runs from a clone).
- Running/scheduling loops, talking to `/schedule`, or any cloud/GitHub API calls.
- Editing `settings.json`, `ci.yml`, ticket queues, or `ws/` docs.
- Auth / multi-user / remote hosting — strictly local, single user, loopback.
- A heavyweight markdown editor for agent/skill bodies (read-only view + light frontmatter edit only).

## Research agenda (filled here; answered by /research → docs/domain/)

> Light — this is a known-tech build. Mostly version-correct library API confirmation via context7.

- [ ] **loops.yaml + frontmatter schema, verified against the real files** (kontera, vakio-mono, scaffold template) — including the vakio **producer-only** variant (no consumer) and the `stage` enum. Capture the canonical shape the tool must read/write.
- [ ] **`yaml` (eemeli) v2 Document API** for comment-preserving surgical edits: exact `parseDocument` → `setIn`/`set`/`deleteIn`/`createNode` + `seq.add` behavior; how comments (`commentBefore`/inline) survive; anchors/aliases edge cases; trailing-newline/EOL preservation.
- [ ] **Cron handling**: `cron-parser` validation API + `cronstrue` human-description API; 5-field vs 6-field handling; what counts as invalid for the scaffold's purposes.
- [ ] **Local-server safety practices**: loopback binding, path-traversal/under-root enforcement, atomic write (tmp+rename), staleness (mtime/hash) guard — confirm idiomatic Node patterns.

## Technical approach (grounded)

- **Read/write:** `yaml@^2.8` `parseDocument` → surgical `setIn`/`deleteIn`/`createNode`+`seq.add` → `toString({lineWidth:0})`; never round-trip via `toJS()`. Block-scalar style preserved via node `type`. _(yaml-document-api, ADR 0002)_
- **Data model:** core `{name,kind?,command,cron,enabled}` + passthrough of all other keys; `routine` machine-owned. _(ADR 0001)_
- **Cron:** `cron-parser@^5.5` validates (strict off), `cronstrue@^3.14` describes (display only). _(cron-libraries)_
- **Server:** Fastify on `127.0.0.1` + `@fastify/static`; typed ops (`updateStage/addLoop/updateLoop/deleteLoop/toggleEnabled`) so edits are surgical; `/preview` (diff) + `PUT` (write); atomic write; 409 staleness; under-root guard. _(local-server-safety, ADR 0003)_
- **Frontend:** vanilla TS, bundled, no CDN — project list → loops table (toggle/add/edit/delete + diff-confirm modal) → agents/skills browser.
- Full design: `/Users/jonathan/.claude/plans/curried-cooking-wombat.md`.

## Open questions (must be empty to be `ready`)

- _(none — distribution = run-from-clone; extra-field handling = read-only+preserve (ADR 0001); CONFIRM.md reviewed.)_

## Required inputs (the human must supply these)

- [ ] GitHub `Jeibniz` account access to create the public repo `Jeibniz/loopdeck` — deferred until ship (repo can be created at PR time; `gh auth` as Jeibniz, or create via web).
- [ ] npm publish token — **not required** (npm publishing is out of scope for v1).

## Checkpoints — STOP and ask the human before:

- Creating the public GitHub repo under the Jeibniz account (outward-facing) — confirm account + visibility first.
- Any write outside the super-folder tree, or any network call (there should be none).
- Adding a paid or heavyweight dependency beyond the agreed small stack.

## Definition of done

`npx`/`pnpm start` loopdeck from a super-folder opens a clean local UI that lists every project's loops and lets you CRUD them with comments preserved and changes diff-confirmed, with green tests, browse/edit of agents & skills frontmatter, and a public `Jeibniz/loopdeck` repo + README.
