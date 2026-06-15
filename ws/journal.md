# Journal

Append-only. One entry per autopilot iteration (or notable manual step); newest at the bottom.
Format: `## <date> — <task>` then **Attempted / Result / Decisions / Next**.

## 2026-06-15 — project scaffolded

- **Result:** scaffolded from agent-scaffold; skills/hooks/agents wired, autonomy state seeded.
- **Next:** define the first goal with `/spec`.

## 2026-06-15 — /spec FRAME

- **Attempted:** Frame the loopdeck goal from the approved plan + a distribution fork question.
- **Result:** Wrote `ws/goals/loopdeck.md` (Status: draft) — problem, MVP acceptance criteria, scope/YAGNI, a light research agenda (schema verify, `yaml` Document API, cron libs, local-server safety), Open questions empty, inputs deferred. Distribution decided: run from clone, npm deferred.
- **Decisions:** see STATUS Key decisions. Full design in `~/.claude/plans/curried-cooking-wombat.md`.
- **Next:** `/research` the agenda → `docs/domain/`, then `/spec` refine → `ready`.

## 2026-06-15 — /research

- **Attempted:** Answer the 4 agenda items — schema (on-disk), `yaml` Document API, cron libs, local-server safety.
- **Result:** Wrote 4 `docs/domain/` topics + MANIFEST + CONFIRM. **Key finding:** real `loops.yaml` (vakio-mono) is a richer, producer-only schema with `repo`/`reviewer`/`routine` + folded `command` — loopdeck must preserve unknown fields and never clobber `routine` (owned by `/loops apply`). Pinned versions: `yaml@^2.8`, `cron-parser@^5.5` (v5 import changed), `cronstrue@^3.14`.
- **Decisions:** validator = cron-parser (strict OFF); display = cronstrue; writes = parseDocument→setIn→toString({lineWidth:0}), atomic tmp+rename, 409 staleness.
- **Next:** human reviews CONFIRM.md → `/spec` refine → lock → `ready`.

## 2026-06-15 — /spec REFINE + LOCK

- **Attempted:** Resolve CONFIRM, lock grounded testable criteria, write ADRs, plan the work.
- **Result:** CONFIRM resolved (extra fields read-only+preserved, `routine` machine-owned, block-scalar preserved, diff-confirm safeguard). Goal `Status: ready` with corpus-cited (T)/(UX) criteria + technical approach. ADRs 0001 (extensible schema), 0002 (comment-preserving writes), 0003 (local web UI stack). Plan `ws/loopdeck/plan.md` = 11 ordered TDD tasks (T3 loopsDoc = heart).
- **Queue:** local-only, no remote → plan.md IS the queue. `gh` authed as `Jeibniz` (repo scope) for the T11 ship checkpoint.
- **Next:** `/autopilot` to build.
