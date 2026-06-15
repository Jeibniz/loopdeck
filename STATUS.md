# STATUS — loopdeck

> North-star + current state. Claude reads this **first** and updates it **last** each iteration.
> Keep it short and current; history lives in `ws/journal.md`.

## Goal

A local `npx`/`pnpm start` web UI (**loopdeck**) to visualize & CRUD the agent-scaffold autonomy YAML (`loops.yaml` + `.claude/agents` & `skills` frontmatter) across a super-folder, with comments preserved on write. See `ws/goals/loopdeck.md`.

## Done

- Project scaffolded from agent-scaffold (2026-06-15).
- `/spec` FRAME → `/research` (4 `docs/domain/` topics + CONFIRM) → `/spec` REFINE.
- Goal **locked: `Status: ready`** (`ws/goals/loopdeck.md`); ADRs 0001–0003; CONFIRM reviewed; work plan `ws/loopdeck/plan.md` (11 tasks).
- **v1 built & shipped — LIVE.** PR #1 merged into `main`; public repo **github.com/Jeibniz/loopdeck**. CI green (pinned pnpm@10.33). 53 tests + lint + typecheck + build green; review panel + live UX done. Report: `ws/reports/2026-06-15-loopdeck-v1.md`.

## Next

- **In progress (`feat/cc-assist-and-bodies`):** in-UI "Ask Claude" (local `claude` CLI, diff-confirm) to create/manage loops·agents·skills; editable agent/skill bodies.

## Key decisions

- Distribution: run from a GitHub clone for v1; npm publish deferred (out of scope).
- Repo: public, under personal GitHub user `Jeibniz` (outside vakio org).
- Stack: TS + Fastify + `yaml` (eemeli) — reads via Document API, **writes via the CST** (folded-scalar fidelity, ADR 0002 addendum) + vanilla-TS frontend, no CDN.
- ADRs live in `docs/decisions/`.
