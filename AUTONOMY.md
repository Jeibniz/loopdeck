# AUTONOMY.md — how Claude develops a project on its own

This is the operating manual for autonomous development in any project scaffolded from
`agent-scaffold`. It turns the lifecycle in `PLAYBOOK.md` into a **self-driving loop** with durable
memory, mechanical safety gates, and clear human checkpoints.

Read this with `PLAYBOOK.md` (the phases), `ORCHESTRATION.md` (subagents), and `AGENTS.md`
(conventions). A project's own `STATUS.md` + `CLAUDE.md` win over this file.

---

## The loop

```
read STATUS.md + goal + docs/domain (ground every decision; cite it)
  └─ pull the next READY ticket (GitHub Issue queue)   (domain unknown? → targeted /research, don't guess)
     └─ worktree (isolation)  →  TDD: red → green → refactor
        └─ verify: format · lint · typecheck · build · test   (writes ws/.verify/PASS on green)
           └─ review panel: code + security reviewers (+ UX cycle for web UI) → file findings as issues
              └─ ticket's Must-fix done? acceptance criteria met?
                 ├─ YES → commit (no attribution) → PR (Closes #N) → independent /code-review
                 │        → HUMAN merges (default; --auto-merge opt-in) → update STATUS/journal/report
                 └─ NO / blocked / ambiguous / sensitive → STOP, file needs-decision issue, ping human
loop until: goal acceptance met · token budget hit · N iterations with no progress
```

The `/autopilot` skill is the driver. Getting there is a **research-first** sequence so the build
stands on real building blocks, not improvisation:

```
/spec (frame: product goal + research agenda)
  → /research (gather authoritative domain facts → docs/domain/, + your review of CONFIRM.md)
    → /spec (refine: grounded solution spec → Status: ready)
      → /autopilot (build, citing docs/domain; targeted /research on a new gap)
```

`/spec` aligns on what "done" means and only marks `Status: ready` once the spec is **grounded** in the
domain corpus and high-stakes facts are confirmed. **Autopilot refuses to start until `ready`**, so an
unaligned or ungrounded spec can't burn a run. Every iteration **leaves a trace** in `ws/journal.md` so
a fresh session resumes seamlessly.

---

## Durable memory (survives session resets)

| File                       | Role                                                                                                                                                                                                                              |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `STATUS.md` (root)         | North-star + current state: goal, what's done, what's next, blockers, key decisions. **Read first, written last** each iteration.                                                                                                 |
| `ws/goals/<slug>.md`       | A goal: problem, acceptance criteria (machine-checkable where possible), constraints, out-of-scope, checkpoints, **open questions**, **required inputs**, readiness `Status`, definition-of-done. Written by `/spec`.             |
| `ws/journal.md`            | Append-only log: each entry = what was attempted, the result, decisions, next step.                                                                                                                                               |
| `docs/decisions/NNNN-*.md` | ADRs — why a path was chosen (not just what changed).                                                                                                                                                                             |
| `docs/domain/`             | The **building blocks**: curated, cited, confidence-flagged domain facts (`MANIFEST.md` + topic files) from `/research`; `CONFIRM.md` holds high-stakes facts awaiting human sign-off. The build grounds on these and cites them. |
| **GitHub Issues**          | The **work queue** (the agents' Jira) — spec breakdown, reviewer findings, bugs, follow-ups; milestone = goal. See `TICKETS.md`. The queue is the single source of "what's left".                                                 |
| `ws/reports/`              | Skimmable per-milestone **run reports** (built / assumed / deviated / unsure / cost / next).                                                                                                                                      |

Specs/plans from `brainstorming`/`writing-plans` also land in `ws/<topic>/`.

## Work queue, merge policy, reports (see `TICKETS.md`)

- **One queue, but optional.** All open work is **GitHub Issues** (labels = schema, milestone = goal).
  `/spec` files the breakdown; reviewers file findings (`needs-triage`); you triage (`ready`/close) —
  that's the "what actually gets built" checkpoint; `/autopilot` drains `ready` + unblocked,
  highest-priority first. **The queue is an enhancement layered on `plan.md`, never a startup
  dependency:** a project can start local on `ws/<slug>/plan.md` and adopt the queue later
  (`/tickets status` → `bootstrap`); a missing/erroring queue degrades to `plan.md`, and a `gh` failure
  is never read as "done" (see `TICKETS.md`).
- **Human-merge by default.** Autopilot opens a PR (`Closes #N`), an **independent** agent runs
  `/code-review`, and then **you merge** — unless `--auto-merge` is set (for small / early-stage work).
- **Never silent at a stop.** A decision/finish/block files a `needs-decision`/done issue **assigned to
  you** (phone push) + a `ws/reports/` run report.

---

## Modes (compose freely)

- **Interactive autopilot** (default) — you run `/autopilot` in a session; it iterates and pauses at
  real forks. `/loop` or `ScheduleWakeup` pace it.
- **Phase-gated** — `/autopilot --phase` runs one phase to green, then stops for your sign-off before
  the next. Use while you're still building trust in the system.
- **Scheduled background (loops)** — declarative cron loops in **`loops.yaml`** (`/loops apply` →
  `/schedule` routines): _producers_ (ux/tech-debt/dependency/research sweeps) file `needs-triage`
  tickets on their own cadence; a _consumer_ (`/autopilot --once`) drains `ready` ones, **PR-only**.
  Tighter early, looser as the project matures. Always dry-run / PR-only / stops at checkpoints. See
  [LOOPS.md](./LOOPS.md).

---

## Safety: sandbox-first, hard-gated

**Default to safe.** Autonomously, Claude only ever uses paper-trading, dry-run, sandbox/test
endpoints, and test keys. It NEVER performs a live, irreversible, money-moving, or externally-visible
action on its own.

### Always requires a human checkpoint (the loop STOPS and asks)

- Moving real money / placing real orders / live financial-ledger writes.
- Sending real communications (email/SMS/push/social) to real people.
- Deleting data, dropping tables, destructive migrations against real data.
- Deploying to production.
- Adding a paid dependency or a new external account.
- Anything irreversible, or a genuine product trade-off with no obvious right answer.

### Mechanical enforcement (hooks — see `.claude/hooks/`)

| Hook                   | Event            | Enforces                                                                                                                               |
| ---------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `guard-destructive`    | PreToolUse(Bash) | blocks `rm -rf /`, force-push to main, ref-less `reset --hard`                                                                         |
| `guard-sensitive`      | PreToolUse(Bash) | blocks prod deploys, `npm publish`, real-comms, and project-listed live endpoints **unless `LIVE=1`** + the action was human-confirmed |
| `scan-secrets`         | PreToolUse(Bash) | blocks `git commit` if the staged diff contains secret patterns                                                                        |
| `require-verification` | PreToolUse(Bash) | blocks `gh pr create` when source changed since the last green test run                                                                |

Going live is deliberate: the human sets `LIVE=1` (and/or edits `.claude/sensitive-deny.txt`) and
confirms. The loop never sets it for itself.

---

## Web UI projects: UX cycles are built into the loop

For a web UI, UX review isn't an optional afterthought — it's wired into autopilot at two points:

- **Per iteration (mini cycle):** any iteration that changed UI runs `/ux-review` → fix every `Must
fix` UX finding → re-review, until clean (≤2 rounds), alongside the static `web-design-reviewer`.
- **Per milestone (full cycle):** before a web goal is marked **done**, a full `/ux-cycle` runs across
  the affected surfaces (review → fix → re-review to convergence, one PR). A web goal is **not done**
  until live UX passes.

`ux-reviewer` drives a real browser at 375 / 768 / 1440, forcing empty / overflow / loading / error /
locale states and checking a11y + console hygiene.

**Live UX cannot silently degrade.** The driver is chosen in order — **Playwright MCP** (self-installs
Chromium, headless, cloud-friendly) → **chrome-devtools-mcp** → **self-launched headless Playwright**.
If none can run a browser, that's a **loud failure**: a `live-UX pending (no browser)` blocker is
recorded in `STATUS.md` and surfaced to the human. The static `web-design-reviewer` runs regardless but
**does not substitute** for live UX.

---

## Stop conditions (don't churn)

The loop ends — and reports — when: acceptance criteria are met; the token budget is exhausted; a
human checkpoint is hit; or it completes N iterations (default 2) with no net progress. On any stop it
updates `STATUS.md`, appends to `ws/journal.md`, and surfaces a concise summary.
