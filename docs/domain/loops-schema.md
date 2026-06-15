# Domain: loops.yaml + agent/skill frontmatter schema (the data loopdeck reads/writes)

- **Last updated:** 2026-06-15 **Overall confidence:** high (verified against real files on disk)

## Summary

loopdeck edits two shapes: `loops.yaml` (project root) and Markdown frontmatter in `.claude/agents/*.md` and `.claude/skills/<name>/SKILL.md`. **The `loops.yaml` schema is intentionally extensible** — the scaffold template uses a minimal shape, but real projects (vakio-mono) add fields. loopdeck must therefore treat a known core set of fields as first-class and **preserve all other fields untouched** (round-trip), never assuming a fixed key set. Surgical edits via the `yaml` Document API give this for free (see [[yaml-document-api]]).

## Key facts / rules

- **Core loop fields (scaffold template):** each item in `loops[]` has `name` (str), `kind` (`consumer`|`producer`), `command` (str), `cron` (5-field str), `enabled` (bool). Root has `stage` (`early`|`steady`|`maintenance`). _Source:_ `/Users/jonathan/Projects/_agent-scaffold/templates/autonomy/loops.yaml` (2026-06-15). _Confidence:_ high.
- **Real-world variant adds fields (vakio-mono):** root adds `repo:` (default issue target). Loops add `reviewer:` (agent name), and **`routine:`** (a `trig_...` cloud-routine id). `command` is a **folded block scalar** (`command: >`) spanning many lines. The file is **producer-only — no `kind: consumer`**. _Source:_ `/Users/jonathan/vakio-mono/loops.yaml` (2026-06-15). _Confidence:_ high.
- **`routine:` is owned by `/loops apply`, not the human.** It's written back when a loop is reconciled into a `/schedule` cloud routine. **loopdeck must never drop or rewrite it** — surgical edits to _other_ keys leave it intact. _Source:_ vakio loops.yaml inline comment "created by /loops apply 2026-06-15"; scaffold `loops` SKILL.md. _Confidence:_ high.
- **`command` may be a quoted scalar OR a folded/literal block scalar.** Editing a _different_ key preserves the block style automatically; editing `command` itself must preserve `>`/`|` via the node `type` (see [[yaml-document-api]] §6b). _Confidence:_ high.
- **Field order varies** (scaffold: name,kind,command,cron,enabled · vakio: name,kind,reviewer,cron,enabled,routine,command). Don't assume order; address fields by key path. _Confidence:_ high.
- **`stage` is a hint, not enforced** — the human sets the actual `cron`. _Source:_ scaffold loops.yaml header. _Confidence:_ high.
- **Frontmatter shape (agents + skills):** YAML frontmatter delimited by `---` … `---` with exactly `name` + `description` (both strings), followed by a Markdown body. _Source:_ `.claude/agents/planner.md`, `.claude/skills/loops/SKILL.md` (2026-06-15). _Confidence:_ high.
- **The header comments matter.** Both loops.yaml files open with a multi-line `#` explainer the team relies on; preserving it on write is a hard requirement (the whole reason for the Document API). _Confidence:_ high.

## Design implications for loopdeck

- Data model: `Loop = { name, kind?, command, cron, enabled, ...passthrough }`. Render core fields as first-class; surface unknown fields (`reviewer`, `routine`, `repo`) read-only (or lightly editable) but **always preserve** them.
- `kind` is **optional** — vakio loops omit `consumer`; don't require it. Validate `kind ∈ {consumer,producer}` only _if present_.
- When adding a new loop, only write the core fields; don't fabricate `routine`/`reviewer`.
- Editing `command` must keep block-scalar style if the original used one.

## Open / needs confirmation

- Confirm loopdeck should **preserve-but-not-edit** `routine:` (treat as machine-owned) and show `reviewer:`/`repo:` as editable-or-readonly. Listed in `CONFIRM.md`.
- Whether to also surface the vakio root `repo:` field in the UI (v1 could just preserve it). In `CONFIRM.md`.

## Sources

- `/Users/jonathan/Projects/_agent-scaffold/templates/autonomy/loops.yaml` — scaffold template (primary) · 2026-06-15
- `/Users/jonathan/vakio-mono/loops.yaml` — real producer-only variant w/ repo/reviewer/routine/folded command (primary) · 2026-06-15
- `/Users/jonathan/Projects/kontera/loops.yaml` — consumer+producer example (primary) · 2026-06-15
- `.claude/agents/planner.md`, `.claude/skills/loops/SKILL.md` — frontmatter shape (primary) · 2026-06-15
