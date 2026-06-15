# ORCHESTRATION.md — subagents & multi-agent patterns

How to use subagents to develop faster and more reliably. The `/autopilot` loop leans on these; you
can also reach for them directly.

## The roster (`.claude/agents/`)

| Agent                 | Use it to…                                                                             | Typical caller            |
| --------------------- | -------------------------------------------------------------------------------------- | ------------------------- |
| `planner`             | turn a goal/spec into an ordered, checkable task plan                                  | `/spec`, autopilot        |
| `researcher`          | research one domain topic from authoritative sources → cited, confidence-flagged facts | `/research`               |
| `implementer`         | build one task TDD-style on a branch and verify to green                               | autopilot, `/ux-cycle`    |
| `tester`              | write/strengthen tests, find missing edge cases, reproduce a bug as a test             | autopilot                 |
| `debugger`            | root-cause a failure systematically before any fix                                     | autopilot, on red         |
| `integrator`          | wire an external service safely (client, dry-run, smoke test)                          | `/integrate`              |
| `code-reviewer`       | correctness/quality/security pass on a diff                                            | review step               |
| `security-reviewer`   | OWASP-style review when auth/input/data/network changed                                | review step               |
| `verifier`            | **adversarially** try to refute a claim/finding                                        | verify step               |
| `ux-reviewer`         | drive the running web app across viewports, find UX bugs                               | `/ux-review`, `/ux-cycle` |
| `web-design-reviewer` | static review of changed UI files vs design/a11y/responsive rules                      | review step               |

Dispatch with the **Agent** tool (`subagent_type`). A subagent's final message is its return value —
ask for structured output when you'll act on it. Run independent agents **in one message** so they go
in parallel.

## Patterns (pick by task; compose freely)

- **Review panel** — fan out N reviewers with _different lenses_ (correctness, security, UX, design)
  over the same diff, then synthesize. Diversity beats one generalist. Ready-made:
  `.claude/workflows/review-panel.js` (invoke via the Workflow tool when you've opted into it).
- **Adversarial verify** — for each finding/claim, dispatch `verifier` agents prompted to _refute it_;
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
use a barrier (`parallel()`) only when a stage genuinely needs _all_ prior results at once. Verify
findings adversarially before trusting them.

> Scale effort to the task: a quick check = a couple of agents, single-vote verify. "Audit this
> thoroughly" = a larger finder pool + 3-vote adversarial verify + a synthesis pass. Don't silently
> cap coverage — `log()` what you dropped.
