# PLAYBOOK — idea → usable product

The lifecycle Claude follows to take a personal project from a one-line idea to something you actually use. It **chains the globally-installed superpowers skills** with this kit's own skills/agents — it does not reinvent them. Read it top to bottom; each phase names the skill to invoke.

The golden rule across every phase: **evidence over assertion.** Don't claim a thing works until you've run it and seen it.

---

## 0. Start a project

```bash
~/Projects/_agent-scaffold/init.sh new <name> [--ts|--py]
cd ~/Projects/<name>
```

Open Claude in the new folder and just describe the idea. `init.sh` has already wired the skills, hooks, agents, and a project `CLAUDE.md`.

**Set up loops (during setup).** `init.sh` seeds `loops.yaml` (all disabled). Once the goal is locked
and the queue is enabled, review it — start with **tight** cadences (you want momentum early) — enable
what fits, and run `/loops apply` to create the scheduled producers/consumer. Loosen the crons as the
project matures. See [LOOPS.md](./LOOPS.md). (Skip until the project can support unattended runs.)

## 1. Idea → design  →  `superpowers:brainstorming`

Turn the rough idea into a small, sharp design. One question at a time; propose approaches; agree on scope. **YAGNI hard** — cut everything not needed for a first usable version. Output: a design/spec written to **`ws/<topic>/`**.

Decompose if it's big: if the idea is really several subsystems, split it and run this playbook per sub-project, simplest-valuable-slice first.

## 2. Design → plan  →  `superpowers:writing-plans`

Turn the approved spec into a step-by-step implementation plan (also in `ws/<topic>/`). Each step should be independently checkable. Fill in the project `CLAUDE.md`'s "What this is" while it's fresh.

## 3. Set up the workspace  →  `superpowers:using-git-worktrees`

Non-trivial work happens in a **worktree**, so `main` stays clean and you can run things side by side.

## 4. Build  →  `superpowers:test-driven-development` (+ `executing-plans` / `subagent-driven-development`)

Work the plan step by step. For each unit: **red test → implement → green → refactor**. Keep units small and well-bounded — easier to reason about and to get right. The `format-on-edit` hook keeps style clean as you go.

- Driving a written plan solo across a session: `superpowers:executing-plans`.
- Independent steps you want to fan out: `superpowers:subagent-driven-development`.
- Hit a bug? `superpowers:systematic-debugging` before guessing at fixes.

## 5. Verify & review  →  `/review` + `code-reviewer` + `superpowers:verification-before-completion`

Before calling anything done:
- `/format`, lint, typecheck, `pnpm build`, `/test` — all green, paste the evidence.
- `/review` (or dispatch the `code-reviewer` agent) on the diff; dispatch `security-reviewer` if it touches auth/input/data/network.
- Resolve `Must fix` items.

## 6. Ship  →  `/ship` (wraps `/commit`, `/pr`, `superpowers:finishing-a-development-branch`)

`/ship` re-verifies, commits (no attribution), and opens a PR or merges to `main`. Clean up the worktree once merged.

## 7. Use it, then iterate

Run the thing for real. Capture what's missing/annoying as the next idea, and loop back to phase 1. "Usable product" is reached by short laps, not one big push.

---

### Quick reference

| Phase | Skill |
|-------|-------|
| Idea → design | `superpowers:brainstorming` |
| Design → plan | `superpowers:writing-plans` |
| Isolate work | `superpowers:using-git-worktrees` |
| Build | `superpowers:test-driven-development`, `executing-plans`, `subagent-driven-development` |
| Debug | `superpowers:systematic-debugging` |
| Verify | `superpowers:verification-before-completion` |
| Review | `/review`, `code-reviewer`, `security-reviewer` |
| Ship | `/ship` → `/commit`, `/pr`, `superpowers:finishing-a-development-branch` |
