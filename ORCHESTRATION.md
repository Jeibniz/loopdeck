# ORCHESTRATION.md — subagents & multi-agent patterns

How to use subagents to develop faster and more reliably. The `/autopilot` loop leans on these; you
can also reach for them directly.

## The roster (`.claude/agents/`)

| Agent | Use it to… | Typical caller |
|-------|-----------|----------------|
| `planner` | turn a goal/spec into an ordered, checkable task plan | `/spec`, autopilot |
| `researcher` | research one domain topic from authoritative sources → cited, confidence-flagged facts | `/research` |
| `implementer` | build one task TDD-style on a branch and verify to green | autopilot, `/ux-cycle` |
| `tester` | write/strengthen tests, find missing edge cases, reproduce a bug as a test | autopilot |
| `debugger` | root-cause a failure systematically before any fix | autopilot, on red |
| `integrator` | wire an external service safely (client, dry-run, smoke test) | `/integrate` |
| `code-reviewer` | correctness/quality/security pass on a diff | review step |
| `security-reviewer` | OWASP-style review when auth/input/data/network changed | review step |
| `verifier` | **adversarially** try to refute a claim/finding | verify step |
| `ux-reviewer` | drive the running web app across viewports, find UX bugs | `/ux-review`, `/ux-cycle` |
| `web-design-reviewer` | static review of changed UI files vs design/a11y/responsive rules | review step |
| `slice-controller` | build one slice (an autopilot phase) to a PR in a **disposable context**, return a compact summary — a context firewall so the driving session stays lean | `/build-project` |

Dispatch with the **Agent** tool (`subagent_type`). A subagent's final message is its return value —
ask for structured output when you'll act on it. Run independent agents **in one message** so they go
in parallel.

## Two levels for building a spec'd project

The build loop is **`/autopilot`** — run it at whichever level fits the slice:

- **Live (one session per slice):** `/autopilot --phase` in a session you watch. You drive, blockers
  surface conversationally, the context lives with you. Best for exploratory/ambiguous/debug work.
- **Orchestrated (many slices unattended):** `/build-project` — a thin session that dispatches one
  disposable `slice-controller` per slice; each controller runs `/autopilot --phase` internally behind
  a **context firewall**, so the driving session stays lean across many slices. Best once the spec is
  locked and slices are `ready`.

Same loop underneath, so the levels are interchangeable mid-project: durable state (`STATUS.md`,
`.superpowers/sdd/progress.md`, `ws/journal.md`) lets you orchestrate one slice, then drop live to
debug the next, and back. Pick per slice by which command you type.

**Where the ready slices come from** — no separate skill produces them; the front door already does:
`superpowers:brainstorming` decomposes the whole project into an ordered slice list **once**, then
`/spec` (frame → `/research` → refine + lock) readies slices **one at a time, just-in-time** — you
can't ready them all up front because each needs its own research + your `CONFIRM` review. `/spec`'s
`## Roadmap / next phases` section *is* that forward slice list (captured, not built). `/build-project`
and `/autopilot --phase` consume whatever goal is `Status: ready`; the rhythm is ready-slice-N while
slice-N-1 builds.

## Model tiering (set it explicitly, every dispatch)

An omitted `model` inherits your session model — often the most capable and most expensive — which
silently defeats cost control. Pick the least powerful tier that fits, and pass it explicitly:

- **cheap** — mechanical transcription: the plan/spec states the code, 1–2 files, no judgment. Most
  well-specified implementation tasks, single-file fixes, and reviews of small mechanical diffs.
- **standard** — multi-file integration, pattern-matching, debugging, most reviews.
- **capable** — design/architecture, subtle concurrency/correctness, and the **final whole-branch
  review** (never run that on the session default — use the most capable tier).

Turn count beats token price: the cheapest models often take 2–3× the turns on multi-step work and
cost more overall. Use a mid-tier as the floor for reviewers and for implementers working from prose;
reserve the cheapest tier for true transcription and single-file fixes.

## Running a plan efficiently (subagent-driven development)

- **Controller stays lean.** Move artifacts as *files* (task brief, report file, `review-package`
  path); never paste diffs or full agent reports into your own context — they're re-read every later
  turn and compound across tasks. Keep only status + commit ranges.
- **Batch trivial cohesive tasks.** Review cost is per-review, not per-line. Group one-field/data-class
  tasks into review-sized units; a fine-grained plan multiplies fixed review overhead.
- **Front-load invariants.** Cross-cutting contracts go in the plan's Global Constraints and each
  reviewer's lens, so they're specified — not discovered as bugs mid-build.
- **No real-time smokes.** Drive time-based flows (a 4-min protocol) with injected data on a compressed
  timeline; a smoke that blocks wall-clock minutes stalls the session.

## Patterns (pick by task; compose freely)

- **Review panel** — fan out N reviewers with *different lenses* (correctness, security, UX, design)
  over the same diff, then synthesize. Diversity beats one generalist. Ready-made:
  `.claude/workflows/review-panel.js` (invoke via the Workflow tool when you've opted into it).
- **Adversarial verify** — for each finding/claim, dispatch `verifier` agents prompted to *refute it*;
  keep it only if it survives. Kills plausible-but-wrong findings before you act on them.
- **Loop-until-dry** — for open-ended discovery (bugs, edge cases), keep dispatching finders until K
  consecutive rounds surface nothing new. Simple counters miss the tail.
- **Pipeline over a work-list** — independent items each run plan→build→verify without a barrier
  between stages (item A can be shipping while item B is still building). Default for batch work.
- **Multi-modal sweep** — several agents search the same space different ways (by file, by behavior,
  by data) when one angle won't find everything.

## When to fan out vs. stay solo

- **Solo** — a single well-scoped task you can hold in context; a quick fix; a conversational answer.
- **Fan out** — independent tasks with no shared state; review from multiple lenses; broad search;
  anything where an adversarial second opinion raises confidence.

## Workflows (deterministic orchestration)

For multi-phase fan-out with loops/conditionals, use the **Workflow** tool (opt-in: say "use a
workflow" / it's in the skill). Saved scripts live in `.claude/workflows/`. Default to `pipeline()`;
use a barrier (`parallel()`) only when a stage genuinely needs *all* prior results at once. Verify
findings adversarially before trusting them.

> Scale effort to the task: a quick check = a couple of agents, single-vote verify. "Audit this
> thoroughly" = a larger finder pool + 3-vote adversarial verify + a synthesis pass. Don't silently
> cap coverage — `log()` what you dropped.
