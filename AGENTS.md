# AGENTS.md — Engineering conventions

Generic working agreement for any project scaffolded from `_agent-scaffold`. It is **symlinked** into each project (`<project>/AGENTS.md → _agent-scaffold/AGENTS.md`), so improving it here improves every project. Project-specific facts live in each project's own `CLAUDE.md`.

> Precedence: a project's `CLAUDE.md` and direct user instructions win over this file; this file wins over tool defaults.

## Core principles

- **Smallest change that fully solves the problem.** No speculative abstraction (YAGNI). No unrelated refactoring riding along — if you spot something, note it, don't detour.
- **Match the surrounding code.** Naming, structure, comment density, error handling — read the neighbours before adding.
- **Files stay focused.** When a file does too many things, that's a signal to split, not to keep piling on.
- **Leave it green.** Don't claim done until you've run the build/tests and seen them pass. Evidence over assertion.
- **Be honest about state.** If tests fail, say so with the output. If a step was skipped, say it. Don't paper over.

## Naming: describe the change, not the schedule

Branches, commits, PR titles, comments, and TODOs describe *what changed*, not internal scheduling labels ("Phase 2", "Sprint 3", "v2 milestone"). Future readers lack that context.

- Branch: `feat/csv-export`, not `phase2/export`.
- TODO: `// TODO: drop once callers migrated (#123)`, not `// fixed later in phase 2`.
- If a follow-up is real, file an issue and reference its number.

## GitHub workflow

- **Branch for any non-trivial change** — don't commit feature work straight to `main`. Use a worktree for multi-file/feature work so the main checkout stays clean (`superpowers:using-git-worktrees`).
- Conventional-commit prefixes (`feat:`/`fix:`/`chore:`/`refactor:`/`test:`/`docs:`) when the repo uses them.
- **No attribution** in commits or PRs — no `Co-Authored-By`, no "Generated with" footer, no tool signature.
- One logical change per PR. Keep the diff reviewable.
- Never force-push `main`/`master`. Never `--no-verify` unless asked.

## Tests

- Cover new behaviour and the edge cases (empty / null / overflow / error path), not just the happy path.
- Prefer fast, deterministic unit tests; reach for integration/e2e where the risk lives.
- **Never block on a real-time run.** A test or smoke that waits wall-clock minutes on a real protocol
  (a 4-min CF test, a real network delay) stalls the session. Compress it with injected/synthetic data
  and config knobs (e.g. `repsAt4Min = 1`) so seconds cover minutes.
- Use `superpowers:test-driven-development` for features and bugfixes — red test first.

## Secrets & safety

- Never commit `.env`, keys, or tokens. They belong in gitignored files / a secret store.
- Don't log secrets.
- The `scan-secrets` hook can false-positive on a token-shaped identifier (a long camelCase test name).
  It denies the **whole** Bash command containing `git commit` — and inline `SECRETS_SKIP=1 git commit`
  doesn't help (the hook reads its own env, not the command's). If it fires on a false positive: rename
  the offending identifier, run any `git add` in a **separate** command, then `git commit` alone.
- The `guard-destructive` hook blocks a few catastrophic commands (`rm -rf /`, force-push to main, `git reset --hard` with no ref). It's a backstop, not a license to be careless.

## Planning artifacts

Specs and implementation plans for multi-step work go in **`ws/<topic>/`** at the project root (not scattered in chat). This is where `brainstorming` and `writing-plans` output should land so a later session or subagent can pick the work back up.

## Autonomy

This project can be driven autonomously — see [AUTONOMY.md](./AUTONOMY.md) for the loop, the durable-memory files (`STATUS.md`, `ws/goals/`, `ws/journal.md`, `docs/decisions/`, `docs/domain/`), and [ORCHESTRATION.md](./ORCHESTRATION.md) for subagent use. It's **research-first**: `/spec` (frame) → `/research` (build a cited `docs/domain/` corpus) → `/spec` (refine, grounded) → `/autopilot`. Two rules override everything when running unattended:

- **Sandbox-first.** Use paper/dry-run/sandbox/test endpoints only. Never perform a live, irreversible, money-moving, or externally-visible action on your own — those are **human checkpoints** (real money, external comms, data deletion, prod deploy, paid deps, ambiguous product calls). Going live needs an explicit `LIVE=1` the human sets.
- **Evidence before done.** Verify (lint/types/test/build green) before claiming completion or opening a PR. The hooks enforce both rules mechanically.

## Driving a multi-task plan with subagents (efficiency)

When executing a plan via subagents (`superpowers:subagent-driven-development`), these keep it fast and cheap. Full detail in [ORCHESTRATION.md](./ORCHESTRATION.md).

- **Controller stays lean.** Hand artifacts as *files* (task brief, report file, `review-package` path), never paste diffs or full agent reports back into your own context — everything you paste is re-read on every later turn and compounds across tasks. Keep only status + commit ranges in context.
- **Tier the model to the task.** Don't default every dispatch to the session model. `cheap` for mechanical transcription (the plan states the code, 1–2 files), `standard` for multi-file integration, `capable` for design and the final whole-branch review. Pass `model` explicitly — an omitted model silently inherits the (often most expensive) session model.
- **Batch trivial cohesive tasks into one dispatch.** Review overhead is per-review, not per-line; reviewing twenty one-field diffs costs far more than reviewing them as a few cohesive units, and cohesive units review better.
- **Front-load invariants.** Cross-cutting contracts (data-flow rules, unit conventions) belong in the plan's Global Constraints and each reviewer's lens — not discovered as bugs mid-build.
