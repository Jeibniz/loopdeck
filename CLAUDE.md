# Claude Code — loopdeck

> Scaffolded from `~/Projects/_agent-scaffold` on 2026-06-15. This file is project-specific (a real file, not a symlink) — edit it freely as the project takes shape.

## What this is

<!-- One paragraph: what loopdeck is, who it's for, what "done" looks like.
     Fill this in (or let `superpowers:brainstorming` fill it during the idea phase). -->

_TODO: describe the project._

## How to work here

- **Lifecycle**: follow `./PLAYBOOK.md` — idea → spec → plan → build → verify → ship.
- **Autonomy (research-first)**: `/spec` (frame: product goal + research agenda) → `/research` (gather authoritative domain facts → `docs/domain/`, you review `CONFIRM.md`) → `/spec` (refine: grounded spec → `ready`) → `/autopilot` (won't start until `ready`; builds citing `docs/domain/`). State lives in `STATUS.md` (read first / write last), `ws/goals/`, `ws/journal.md`, `docs/decisions/`, `docs/domain/`. See [AUTONOMY.md](./AUTONOMY.md) + [ORCHESTRATION.md](./ORCHESTRATION.md).
- **Safety (non-negotiable)**: sandbox-first — paper/dry-run/test only. Live money/external/deploy/delete actions are **human checkpoints** (need `LIVE=1`). Hooks enforce this.
- **Conventions**: see [AGENTS.md](./AGENTS.md) (vendored from the kit). Highlights:
  - Feature work in a git **worktree**, not on `main`.
  - **No attribution** in commits/PRs.
  - Specs & plans go in **`ws/<topic>/`**.
  - Leave the build/tests green; show the evidence.
- **Language**: respond in English.

## Stack & commands

<!-- Keep the block for your stack; delete the other. -->

**TypeScript/Node** (`--ts` starter):

```bash
pnpm install         # install deps
pnpm dev             # run locally
pnpm test            # run tests
pnpm build           # production build
pnpm lint            # lint
pnpm format          # prettier --write
```

**Python** (`--py` starter):

```bash
source .venv/bin/activate    # activate the venv (created by init.sh)
pytest                       # run tests
ruff format . && ruff check --fix .   # format + lint
python src/greet.py          # run
```

## Automation (active via the vendored .claude/)

| Kind | Name | What it does |
|------|------|--------------|
| Hook | `format-on-edit` | Prettier-formats each file as it's written (venv `ruff` for `.py`). Best-effort, non-blocking. |
| Hook | `guard-destructive` | Blocks `rm -rf /`, force-push to main/master, `git reset --hard` with no ref. |
| Hook | `guard-sensitive` | Sandbox-first gate: blocks prod deploys / publish / project-listed live actions unless `LIVE=1`. |
| Hook | `scan-secrets` | Blocks `git commit` when the staged diff adds an env file or secret-looking content. |
| Hook | `require-verification` | Blocks `gh pr create` when source changed since the last green test run (marker `ws/.verify/PASS`). |
| Skill | `/spec` `/research` `/autopilot` | Frame → research (→ `docs/domain/`) → refine (grounded, gated), then self-drive. |
| Skill | `/commit` `/pr` `/review` `/test` `/format` `/ship` | The build→ship lifecycle. |
| Skill | `/ux-review` `/ux-cycle` | Live UX review of the running web app, and the review→fix→re-review loop to a PR. |
| Skill | `/integrate` | Wire an external service safely (sandbox-first, secrets in env). |
| Skill | `/tickets` | The work queue (GitHub Issues): status · queue · triage · file · bootstrap. See `TICKETS.md`. |
| Skill | `/loops` | Scheduled-autonomy loops from `loops.yaml` → `/schedule` routines. See `LOOPS.md`. |
| Agent | `planner` `researcher` `implementer` `tester` `debugger` `integrator` `verifier` | The research/build/verify roster (see ORCHESTRATION.md). |
| Agent | `code-reviewer` `security-reviewer` `web-design-reviewer` `ux-reviewer` | Review lenses. |
| Workflow | `review-panel` | Multi-lens review → adversarial verify → synthesis. |
| MCP | `context7` · `chrome-devtools-mcp` | Version-correct docs · drive a real browser for UI work. |

Plus the globally-installed **superpowers** skills (brainstorming, writing-plans, executing-plans, TDD, systematic-debugging, verification-before-completion, finishing-a-development-branch). The PLAYBOOK + AUTONOMY chain them.

> Keep this table honest: if you add/remove a skill, hook, or agent for this project, update it.
