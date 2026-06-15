# STATUS — loopdeck

> North-star + current state. Claude reads this **first** and updates it **last** each iteration.
> Keep it short and current; history lives in `ws/journal.md`.

## Goal
A local `npx`/`pnpm start` web UI (**loopdeck**) to visualize & CRUD the agent-scaffold autonomy YAML (`loops.yaml` + `.claude/agents` & `skills` frontmatter) across a super-folder, with comments preserved on write. See `ws/goals/loopdeck.md`.

## Done
- Project scaffolded from agent-scaffold (2026-06-15).
- `/spec` FRAME → `/research` (4 `docs/domain/` topics + CONFIRM) → `/spec` REFINE.
- Goal **locked: `Status: ready`** (`ws/goals/loopdeck.md`); ADRs 0001–0003; CONFIRM reviewed; work plan `ws/loopdeck/plan.md` (11 tasks).

## Next
- **`/autopilot`** — builds the plan TDD-style → PR (you merge). Queue = `ws/loopdeck/plan.md`.

## Blockers
- (none) — `gh` authed as `Jeibniz`; public repo creation is the T11 ship checkpoint (no remote yet).

## Key decisions
- Distribution: run from a GitHub clone for v1; npm publish deferred (out of scope).
- Repo: public, under personal GitHub user `Jeibniz` (outside vakio org).
- Stack: TS + Fastify + `yaml` (eemeli) Document API (comment-preserving) + vanilla-TS frontend, no CDN.
- ADRs live in `docs/decisions/`.
