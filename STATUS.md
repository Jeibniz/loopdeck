# STATUS — loopdeck

> North-star + current state. Claude reads this **first** and updates it **last** each iteration.
> Keep it short and current; history lives in `ws/journal.md`.

## Goal

A local `npx`/`pnpm start` web UI (**loopdeck**) to visualize & CRUD the agent-scaffold autonomy YAML (`loops.yaml` + `.claude/agents` & `skills` frontmatter) across a super-folder, with comments preserved on write. See `ws/goals/loopdeck.md`.

## Done

- Project scaffolded from agent-scaffold (2026-06-15).
- `/spec` FRAME → `/research` (4 `docs/domain/` topics + CONFIRM) → `/spec` REFINE.
- Goal **locked: `Status: ready`** (`ws/goals/loopdeck.md`); ADRs 0001–0003; CONFIRM reviewed; work plan `ws/loopdeck/plan.md` (11 tasks).
- **v1 built (`feat/loopdeck-v1`):** all of plan T1–T11 TDD; 53 tests + lint + typecheck + build green; review panel (no Must-fix in code/security; a11y Must-fix fixed in v1); live UX verified — toggle→diff→write is byte-clean on the folded vakio file. Report: `ws/reports/2026-06-15-loopdeck-v1.md`.

## Next

- **CHECKPOINT — needs you:** create the public **`Jeibniz/loopdeck`** repo → push `feat/loopdeck-v1` → PR → merge. Paused here intentionally (outward-facing action).
- After merge: file `plan.md` Follow-ups as issues (`/tickets bootstrap`).

## Blockers

- Ship gate is a human checkpoint: creating the public GitHub repo under `Jeibniz` (gh is authed as `Jeibniz`).

## Key decisions

- Distribution: run from a GitHub clone for v1; npm publish deferred (out of scope).
- Repo: public, under personal GitHub user `Jeibniz` (outside vakio org).
- Stack: TS + Fastify + `yaml` (eemeli) — reads via Document API, **writes via the CST** (folded-scalar fidelity, ADR 0002 addendum) + vanilla-TS frontend, no CDN.
- ADRs live in `docs/decisions/`.
